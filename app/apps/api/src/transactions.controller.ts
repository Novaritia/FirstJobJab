import { Body, Controller, Get, Header, NotFoundException, Param, Patch, Post, Query, Req as NestReq, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CATEGORIES } from '@fjm/shared';
import { PrismaService } from './prisma.service.js';
import { AuditService } from './audit.service.js';
import { AuthGuard, UserId, type Req } from './auth.js';
import { rulePattern } from './categorize.js';
import { parse } from './validation.js';
import { buildCsv } from './export.js';
import { exportRows } from './export.controller.js';
import { CATEGORY_TH } from './stats.service.js';
import type { Prisma, Transaction } from './generated/prisma/client.js';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const satang = z.coerce.number().int().min(0).max(1e12);
export const Filter = z.object({
  from: date.optional(), to: date.optional(), accountId: z.string().max(64).optional(),
  q: z.string().trim().max(100).transform((s) => s.normalize('NFC')).optional(), // Thai: NFC so composed vowels/tones match
  direction: z.enum(['in', 'out']).optional(),
  category: z.enum(CATEGORIES).optional(),
  source: z.enum(['statement', 'slip', 'manual']).optional(),
  minAmount: satang.optional(), maxAmount: satang.optional(),
  hidden: z.enum(['include', 'only', 'exclude']).default('include'), // include = previous behaviour
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  page: z.coerce.number().int().min(1).optional(), // alternative to offset
  sort: z.enum(['date_desc', 'date_asc', 'amount_desc', 'amount_asc']).default('date_desc'),
});

/** Filter → Prisma args (pure, unit-tested). */
export function listQuery(userId: string, f: z.infer<typeof Filter>) {
  const cats = f.q ? (Object.keys(CATEGORY_TH) as (keyof typeof CATEGORY_TH)[]).filter((c) => CATEGORY_TH[c].includes(f.q!) || c.includes(f.q!.toLowerCase())) : [];
  const where: Prisma.TransactionWhereInput = {
    userId, accountId: f.accountId, direction: f.direction, category: f.category, source: f.source,
    date: { gte: f.from, lte: f.to },
    amount: { gte: f.minAmount, lte: f.maxAmount },
    hidden: f.hidden === 'include' ? undefined : f.hidden === 'only',
    OR: f.q ? [
      { description: { contains: f.q, mode: 'insensitive' } },
      { note: { contains: f.q, mode: 'insensitive' } },
      ...(cats.length ? [{ category: { in: cats } }] : []),
    ] : undefined,
  };
  const dir = f.sort.endsWith('asc') ? 'asc' as const : 'desc' as const;
  const orderBy: Prisma.TransactionOrderByWithRelationInput[] = f.sort.startsWith('amount')
    ? [{ amount: dir }, { date: 'desc' }, { id: 'asc' }]
    : [{ date: dir }, { time: dir }, { createdAt: dir }, { id: 'asc' }];
  return { where, orderBy, take: f.limit, skip: f.page ? (f.page - 1) * f.limit : f.offset };
}
const PatchBody = z.object({
  category: z.enum(CATEGORIES).optional(),
  note: z.string().max(500).nullable().optional(),
  hidden: z.boolean().optional(),
});
const Manual = z.object({
  date,
  amount: z.number().int().positive().max(1e12),
  direction: z.enum(['in', 'out']),
  description: z.string().trim().min(1).max(200),
  category: z.enum(CATEGORIES),
});

const view = (t: Transaction & { _count?: { edits: number } }) => ({
  id: t.id, accountId: t.accountId, date: t.date, time: t.time ?? undefined, description: t.description, amount: t.amount,
  direction: t.direction, balance: t.balance ?? undefined, category: t.category, note: t.note ?? undefined, source: t.source,
  verified: t.verified, hidden: t.hidden, edited: (t._count?.edits ?? 0) > 0,
});
const withEdits = { _count: { select: { edits: true } } } as const;

@Controller('transactions')
@UseGuards(AuthGuard)
export class TransactionsController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  @Get()
  async list(@UserId() userId: string, @Query() q: unknown) {
    const { where, ...page } = listQuery(userId, parse(Filter, q));
    const [rows, total, accounts] = await Promise.all([
      this.prisma.transaction.findMany({ where, include: withEdits, ...page }),
      this.prisma.transaction.count({ where }),
      this.prisma.account.findMany({ where: { userId }, select: { id: true, bank: true, accountNoMasked: true, accountName: true }, orderBy: { bank: 'asc' } }),
    ]);
    return { transactions: rows.map(view), total, accounts };
  }

  /** Legacy: everything (incl. hidden + own transfers), new accountant columns. Prefer GET /export/statement.csv?from&to. */
  @Get('export.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="firstjobjab-transactions.csv"')
  async exportCsv(@UserId() userId: string, @NestReq() req: Req) {
    const rows = await exportRows(this.prisma, userId, { includeHidden: true, includeTransfers: true });
    await this.audit.log(req, 'export', { after: { kind: 'statement_csv', from: null, to: null, rows: rows.length } });
    return buildCsv(rows);
  }

  @Post()
  async create(@UserId() userId: string, @Body() body: unknown, @NestReq() req: Req) {
    const b = parse(Manual, body);
    const cash = await this.prisma.account.upsert({
      where: { userId_bank_accountNoMasked: { userId, bank: 'CASH', accountNoMasked: 'cash' } },
      create: { userId, bank: 'CASH', accountNoMasked: 'cash', accountName: 'เงินสด / บันทึกเอง' },
      update: {},
    });
    const t = await this.prisma.transaction.create({
      data: { userId, accountId: cash.id, ...b, source: 'manual', verified: false },
    });
    await this.audit.log(req, 'manual_row', { target: t.id });
    return { transaction: view(t) };
  }

  @Patch(':id')
  async update(@UserId() userId: string, @Param('id') id: string, @Body() body: unknown, @NestReq() req: Req) {
    const b = parse(PatchBody, body);
    const t = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!t) throw new NotFoundException('not_found');
    const changes = (['category', 'note', 'hidden'] as const)
      .filter((f) => b[f] !== undefined && b[f] !== t[f])
      .map((f) => ({ field: f, oldValue: t[f] === null ? null : String(t[f]), newValue: b[f] === null ? null : String(b[f]) }));
    if (changes.length) {
      await this.prisma.$transaction([
        this.prisma.transaction.update({ where: { id }, data: { category: b.category, note: b.note, hidden: b.hidden } }),
        this.prisma.edit.createMany({ data: changes.map((c) => ({ ...c, userId, transactionId: id })) }),
        ...(b.category && b.category !== t.category && b.category !== 'own_transfer'
          ? [this.prisma.categoryRule.upsert({
              where: { userId_pattern: { userId, pattern: rulePattern(t.description) } },
              create: { userId, pattern: rulePattern(t.description), category: b.category },
              update: { category: b.category },
            })]
          : []),
      ]);
      for (const c of changes) {
        await this.audit.log(req, c.field === 'hidden' ? 'hide_row' : 'edit_row', { target: id, before: { [c.field]: c.oldValue }, after: { [c.field]: c.newValue } });
      }
    }
    const fresh = await this.prisma.transaction.findUniqueOrThrow({ where: { id }, include: withEdits });
    return { transaction: view(fresh) };
  }

  @Get(':id/edits')
  async edits(@UserId() userId: string, @Param('id') id: string) {
    const edits = await this.prisma.edit.findMany({ where: { transactionId: id, userId }, orderBy: { at: 'asc' } });
    return { edits: edits.map(({ field, oldValue, newValue, at }) => ({ field, oldValue, newValue, at })) };
  }
}

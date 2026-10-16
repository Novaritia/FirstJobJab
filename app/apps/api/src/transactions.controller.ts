import { Body, Controller, Get, Header, NotFoundException, Param, Patch, Post, Query, Req as NestReq, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CATEGORIES } from '@fjm/shared';
import { PrismaService } from './prisma.service.js';
import { AuditService } from './audit.service.js';
import { AuthGuard, UserId, type Req } from './auth.js';
import { rulePattern } from './categorize.js';
import { parse } from './validation.js';
import type { Transaction } from './generated/prisma/client.js';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Filter = z.object({ from: date.optional(), to: date.optional(), accountId: z.string().max(64).optional() });
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

/** Escape for CSV and neutralise spreadsheet formula injection. */
const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

@Controller('transactions')
@UseGuards(AuthGuard)
export class TransactionsController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  @Get()
  async list(@UserId() userId: string, @Query() q: unknown) {
    const f = parse(Filter, q);
    const rows = await this.prisma.transaction.findMany({
      where: { userId, accountId: f.accountId, date: { gte: f.from, lte: f.to } },
      include: withEdits,
      orderBy: [{ date: 'desc' }, { time: 'desc' }, { createdAt: 'desc' }],
    });
    return { transactions: rows.map(view) };
  }

  @Get('export.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="firstjobjab-transactions.csv"')
  async exportCsv(@UserId() userId: string, @NestReq() req: Req) {
    const rows = await this.prisma.transaction.findMany({ where: { userId }, include: { account: true }, orderBy: [{ date: 'asc' }, { time: 'asc' }] });
    const head = ['date', 'time', 'bank', 'account', 'description', 'direction', 'amount_baht', 'balance_baht', 'category', 'note', 'source', 'verified', 'hidden'];
    const lines = rows.map((t) => [
      t.date, t.time, t.account.bank, t.account.accountNoMasked, t.description, t.direction, (t.amount / 100).toFixed(2),
      t.balance === null ? '' : (t.balance / 100).toFixed(2), t.category, t.note, t.source, t.verified, t.hidden,
    ].map(csvCell).join(','));
    await this.audit.log(req, 'export', { after: { rows: rows.length } });
    return '﻿' + [head.join(','), ...lines].join('\r\n'); // BOM so Excel reads Thai
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

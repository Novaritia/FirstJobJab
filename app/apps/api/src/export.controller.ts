import { BadRequestException, ConflictException, Controller, Get, Query, Req as NestReq, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaService } from './prisma.service.js';
import { AuditService } from './audit.service.js';
import { StatsService } from './stats.service.js';
import { ProfileService } from './profile.service.js';
import { AuthGuard, UserId, type Req } from './auth.js';
import { parse } from './validation.js';
import { accountLabel, buildCsv, statementPdf, taxPackPdf, type ExportRow } from './export.js';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(d)), 'invalid date');
const flag = z.enum(['1', '0', 'true', 'false']).transform((v) => v === '1' || v === 'true').default(false);
const MAX_DAYS = 3 * 366;
export const Range = z.object({
  from: date, to: date, accountId: z.string().max(64).optional(),
  includeHidden: flag, includeTransfers: flag,
}).refine((r) => r.from <= r.to, { message: 'from must be ≤ to', path: ['to'] })
  .refine((r) => (Date.parse(r.to) - Date.parse(r.from)) / 86400_000 <= MAX_DAYS, { message: 'range max 3 years', path: ['to'] });
const Year = z.object({ year: z.coerce.number().int().min(2000).max(2100) });

/** "16 ต.ค. 2569 10:42 น." in ICT */
const generatedAt = () => new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }) + ' น.';
/** "20261016-1042" in ICT, for file names. */
const stamp = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 16).replace(/[-:]/g, '').replace(' ', '-');
const send = (res: FastifyReply, type: string, name: string, body: string | Buffer) =>
  res.header('content-type', type).header('content-disposition', `attachment; filename="${name}"`).header('cache-control', 'no-store').send(body);

/** Rows for a range; hidden rows and own transfers excluded unless asked. No range = everything (legacy /transactions/export.csv). */
export async function exportRows(prisma: PrismaService, userId: string, r: Partial<z.infer<typeof Range>>): Promise<ExportRow[]> {
  const rows = await prisma.transaction.findMany({
    where: {
      userId, accountId: r.accountId, date: { gte: r.from, lte: r.to },
      hidden: r.includeHidden ? undefined : false,
      category: r.includeTransfers ? undefined : { not: 'own_transfer' },
    },
    include: { account: { select: { bank: true, accountNoMasked: true } } },
    orderBy: [{ date: 'asc' }, { time: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  });
  return rows.map(({ account, ...t }) => ({ ...t, ...account }));
}

@Controller('export')
@UseGuards(AuthGuard)
export class ExportController {
  constructor(private prisma: PrismaService, private audit: AuditService, private stats: StatsService, private profile: ProfileService) {}

  /** This export's sequence number for the user (all export kinds, from the audit log). */
  private async exportNo(userId: string) {
    return (await this.prisma.auditLog.count({ where: { userId, action: 'export' } })) + 1;
  }

  @Get('statement.csv')
  async statementCsv(@UserId() userId: string, @Query() q: unknown, @NestReq() req: Req, @Res() res: FastifyReply) {
    const r = parse(Range, q);
    const [rows, n] = await Promise.all([exportRows(this.prisma, userId, r), this.exportNo(userId)]);
    await this.audit.log(req, 'export', { after: { kind: 'statement_csv', from: r.from, to: r.to, rows: rows.length, exportNo: n } });
    return send(res, 'text/csv; charset=utf-8', `firstjobjab_statement_${r.from}_to_${r.to}_exported-${stamp()}_no${n}.csv`, buildCsv(rows));
  }

  @Get('statement.pdf')
  async statementPdf(@UserId() userId: string, @Query() q: unknown, @NestReq() req: Req, @Res() res: FastifyReply) {
    const r = parse(Range, q);
    const [rows, p, n] = await Promise.all([exportRows(this.prisma, userId, r), this.profile.decrypted(userId), this.exportNo(userId)]);
    const accounts = [...new Set(rows.map(accountLabel))];
    const pdf = await statementPdf(rows, { holder: p.fullName ?? p.displayName, from: r.from, to: r.to, generatedAt: generatedAt(), accounts, exportNo: n });
    await this.audit.log(req, 'export', { after: { kind: 'statement_pdf', from: r.from, to: r.to, rows: rows.length, exportNo: n } });
    return send(res, 'application/pdf', `firstjobjab_statement_${r.from}_to_${r.to}_exported-${stamp()}_no${n}.pdf`, pdf);
  }

  @Get('tax-pack.pdf')
  async taxPack(@UserId() userId: string, @Query() q: unknown, @NestReq() req: Req, @Res() res: FastifyReply) {
    const { year } = parse(Year, q);
    const [p, n] = await Promise.all([this.profile.decrypted(userId), this.exportNo(userId)]);
    if (!p.nationalId) throw new ConflictException('national_id_required');
    const from = `${year}-01-01`, to = `${year}-12-31`;
    const rows = await this.prisma.transaction.findMany({
      where: { userId, hidden: false, direction: 'in', category: { in: ['salary', 'other_income'] }, date: { gte: from, lte: to } },
      select: { date: true, amount: true, category: true },
    });
    if (!rows.length) throw new BadRequestException('no_income_in_year');
    const monthly = new Map<string, { salary: number; other: number }>();
    for (const r of rows) {
      const m = monthly.get(r.date.slice(0, 7)) ?? { salary: 0, other: 0 };
      if (r.category === 'salary') m.salary += r.amount; else m.other += r.amount;
      monthly.set(r.date.slice(0, 7), m);
    }
    // Same estimate as GET /insights/tax; recover its inputs for the breakdown (only SS is passed as an allowance there).
    const tax = await this.stats.tax(userId, year);
    const monthsSeen = [...monthly.values()].filter((m) => m.salary > 0).length;
    const otherSum = rows.filter((r) => r.category !== 'salary').reduce((s, r) => s + r.amount, 0);
    const otherIncome = Math.round(monthsSeen ? (otherSum / monthsSeen) * 12 : otherSum);
    const pdf = await taxPackPdf(
      { ...tax, otherIncome, salaryIncome: tax.grossIncome - otherIncome, socialSecurity: tax.allowances - 60_000_00 },
      monthly,
      { holder: p.fullName ?? p.displayName, nationalId: p.nationalId, year, generatedAt: generatedAt(), monthsSeen, exportNo: n },
    );
    await this.audit.log(req, 'export', { after: { kind: 'tax_pack_pdf', from, to, rows: rows.length, exportNo: n } });
    return send(res, 'application/pdf', `firstjobjab_tax-pack_${year}_exported-${stamp()}_no${n}.pdf`, pdf);
  }
}

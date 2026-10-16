import { Body, Controller, HttpCode, HttpException, NotFoundException, Param, Post, Req as NestReq, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CATEGORIES } from '@fjm/shared';
import { PrismaService } from './prisma.service.js';
import { AuditService } from './audit.service.js';
import { AuthGuard, UserId, type Req } from './auth.js';
import { sha256 } from './crypto.js';
import { categorize } from './categorize.js';
import { readSlip } from './ocr.js';
import { StatsService } from './stats.service.js';
import { parse } from './validation.js';
import type { Slip } from './generated/prisma/client.js';

const MAX_SLIP_BYTES = 10 * 1024 * 1024;
const MAX_SLIPS = 10;
export const mimeOf = (b: Buffer) =>
  b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? 'image/png'
  : b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? 'image/jpeg' : null;
const minutes = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);

type Row = { id: string; date: string; time: string | null; amount: number };
export const SLIP_MERGED_NOTE = 'รวมกับรายการใน statement';
/** Pair new outgoing statement rows with confirmed slip rows: same amount + date, time ±5 min (unknown time = ok), nearest wins, each slip once. */
export function pairSlipRows(stmt: Row[], slips: Row[]): { slipTxId: string; stmtTxId: string }[] {
  const free = new Set(slips.map((s) => s.id));
  const gap = (a: Row, b: Row) => (a.time && b.time ? Math.abs(minutes(a.time) - minutes(b.time)) : 0);
  return stmt.flatMap((r) => {
    const best = slips
      .filter((s) => free.has(s.id) && s.date === r.date && s.amount === r.amount && gap(s, r) <= 5)
      .sort((a, b) => gap(a, r) - gap(b, r))[0];
    if (!best) return [];
    free.delete(best.id);
    return [{ slipTxId: best.id, stmtTxId: r.id }];
  });
}

const Confirm = z.object({ // optional fixes for OCR misreads before saving
  amount: z.number().int().positive().max(1e12).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  description: z.string().trim().min(1).max(200).optional(),
  category: z.enum(CATEGORIES).optional(),
}).default({});

const view = (s: Slip, fromName?: string) => ({
  id: s.id, amount: s.amount ?? undefined, date: s.date ?? undefined, time: s.time ?? undefined, fromName, toName: s.toName ?? undefined,
  bank: s.bank ?? undefined, ref: s.ref ?? undefined, qrRef: s.qrRef ?? undefined, matchedTransactionId: s.matchedTransactionId ?? undefined,
  status: s.status, confidence: s.confidence,
});

@Controller('slips')
@UseGuards(AuthGuard)
export class SlipsController {
  constructor(private prisma: PrismaService, private audit: AuditService, private stats: StatsService) {}

  /** multipart, repeated field `images` (PNG/JPEG). Image bytes are never stored — only sha256 + extracted fields. */
  @Post()
  @HttpCode(200)
  async upload(@UserId() userId: string, @NestReq() req: Req) {
    const files: Buffer[] = [];
    for await (const part of req.parts({ limits: { fileSize: MAX_SLIP_BYTES, files: MAX_SLIPS } })) {
      if (part.type !== 'file') continue;
      if (part.fieldname !== 'images') { part.file.resume(); continue; }
      files.push(await part.toBuffer()); // throws 413 when over fileSize
    }
    if (!files.length) throw new HttpException('images_required', 400);
    if (files.some((f) => !mimeOf(f))) throw new HttpException('not_an_image', 415);

    const slips = [];
    for (const img of files) {
      const hash = sha256(img);
      const same = await this.prisma.slip.findUnique({ where: { userId_sha256: { userId, sha256: hash } } });
      if (same) { slips.push(view(same)); continue; }
      const r = await readSlip(img);
      // same transfer re-screenshotted: QR ref identifies it exactly
      const dup = r.qrRef ? await this.prisma.slip.findFirst({ where: { userId, qrRef: r.qrRef } }) : null;
      if (dup) { slips.push(view(dup, r.fromName)); continue; }
      const matchedTransactionId = await this.match(userId, r.amount, r.date, r.time);
      const s = await this.prisma.slip.create({
        data: {
          userId, sha256: hash, qrRef: r.qrRef, ref: r.ref, bank: r.bank, date: r.date, time: r.time, amount: r.amount,
          toName: r.toName?.slice(0, 100), confidence: r.confidence, status: matchedTransactionId ? 'matched' : 'unmatched', matchedTransactionId,
        },
      });
      await this.audit.log(req, 'slip_upload', { target: s.id, after: { sha256: hash, status: s.status, confidence: s.confidence } });
      slips.push(view(s, r.fromName));
    }
    return { slips };
  }

  /** Same outgoing amount on the same date, time within ±5 min (if both known); nearest time wins. */
  private async match(userId: string, amount?: number, date?: string, time?: string) {
    if (!amount || !date) return null;
    const taken = (await this.prisma.slip.findMany({ where: { userId, matchedTransactionId: { not: null } }, select: { matchedTransactionId: true } }))
      .map((s) => s.matchedTransactionId!);
    const cands = await this.prisma.transaction.findMany({ where: { userId, date, amount, direction: 'out', id: { notIn: taken } } });
    const near = cands
      .filter((t) => !time || !t.time || Math.abs(minutes(t.time) - minutes(time)) <= 5)
      .sort((a, b) => (time && a.time && b.time ? Math.abs(minutes(a.time) - minutes(time)) - Math.abs(minutes(b.time) - minutes(time)) : 0));
    return near[0]?.id ?? null;
  }

  /** Unmatched slip → manual-like row (source='slip', verified=false). */
  @Post(':id/confirm')
  @HttpCode(200)
  async confirm(@UserId() userId: string, @Param('id') id: string, @Body() body: unknown, @NestReq() req: Req) {
    const fix = parse(Confirm, body ?? {});
    const s = await this.prisma.slip.findFirst({ where: { id, userId } });
    if (!s) throw new NotFoundException('not_found');
    if (s.status !== 'unmatched') throw new HttpException('slip_not_unmatched', 409);
    const amount = fix.amount ?? s.amount, date = fix.date ?? s.date, time = fix.time ?? s.time;
    if (!amount || !date) throw new HttpException('slip_incomplete', 422);
    const description = fix.description ?? (s.toName ? `โอนเงิน ${s.toName}` : 'โอนเงิน (สลิป)');
    const category = fix.category ?? categorize(description, 'out', await this.prisma.categoryRule.findMany({ where: { userId } }));

    const t = await this.prisma.$transaction(async (tx) => {
      // status guard inside the tx: a double-click confirm creates one row
      const claimed = await tx.slip.updateMany({ where: { id, userId, status: 'unmatched' }, data: { status: 'confirmed' } });
      if (claimed.count !== 1) throw new HttpException('slip_not_unmatched', 409);
      const account = await tx.account.upsert({
        where: { userId_bank_accountNoMasked: { userId, bank: s.bank ?? 'SLIP', accountNoMasked: 'slip' } },
        create: { userId, bank: s.bank ?? 'SLIP', accountNoMasked: 'slip', accountName: 'จากสลิปโอนเงิน' },
        update: {},
      });
      // shortcut: slips are assumed outgoing (the user is the payer); add a direction field if users upload slips they received
      const row = await tx.transaction.create({
        data: { userId, accountId: account.id, date, time, description, amount, direction: 'out', category, source: 'slip', verified: false },
      });
      await tx.slip.update({ where: { id }, data: { matchedTransactionId: row.id } });
      return row;
    });
    await this.stats.markOwnTransfers(userId);
    await this.audit.log(req, 'slip_confirm', { target: id, after: { transactionId: t.id, fixed: Object.keys(fix) } });
    return {
      transaction: {
        id: t.id, accountId: t.accountId, date: t.date, time: t.time ?? undefined, description: t.description, amount: t.amount,
        direction: t.direction, category: t.category, source: t.source, verified: t.verified, hidden: t.hidden, edited: false,
      },
    };
  }
}

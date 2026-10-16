import {
  Controller, Get, HttpException, NotFoundException, Param, Patch, Post, Body, Req as NestReq, UseGuards, HttpCode,
} from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import {
  checkBalances, detectBank, parsePassbook, parseStatement, pdfItemsToLines, pdfPasswordCandidates,
  type BalanceCheckResult, type Bank, type Category, type ParsedStatement,
} from '@fjm/shared';
import { PrismaService } from './prisma.service.js';
import { AuditService } from './audit.service.js';
import { AuthGuard, UserId, type Req } from './auth.js';
import { decryptStr, encrypt, envKey, sha256 } from './crypto.js';
import { extractPdfItems, PdfPasswordError, renderPdfPages, type PdfItem } from './pdf.js';
import { ocrPages } from './ocr.js';
import { mimeOf, pairSlipRows, SLIP_MERGED_NOTE } from './slips.controller.js';
import { categorize } from './categorize.js';
import { StatsService } from './stats.service.js';
import { parse } from './validation.js';

export const UPLOAD_DIR = join(process.cwd(), 'uploads');
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_OCR_PAGES = 15; // ~2.5 s/page on CPU
const MAX_PAGE_BYTES = 10 * 1024 * 1024;
const BANKS: Bank[] = ['KBANK', 'BBL'];

interface Parsed { statement: ParsedStatement; categories: Category[] }

const reviewRows = (p: Parsed, check: BalanceCheckResult) =>
  p.statement.rows.map((r, index) => ({ ...r, index, ok: check.rows.find((c) => c.index === index)?.ok ?? false, category: p.categories[index] }));

const RowFix = z.object({
  amount: z.number().int().positive().max(1e12).optional(),
  direction: z.enum(['in', 'out']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  balance: z.number().int().min(-1e12).max(1e12).optional(), // misread printed balance
});

@Controller('uploads')
@UseGuards(AuthGuard)
export class UploadsController {
  constructor(private prisma: PrismaService, private audit: AuditService, private stats: StatsService) {}

  @Get()
  async list(@UserId() userId: string) {
    const ups = await this.prisma.upload.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return { uploads: ups.map(({ id, bank, periodStart, periodEnd, status, rowCount, createdAt }) => ({ id, bank, periodStart, periodEnd, status, rowCount, createdAt })) };
  }

  @Post()
  async upload(@UserId() userId: string, @NestReq() req: Req) {
    let file: Buffer | undefined;
    let password: string | undefined;
    for await (const part of req.parts({ limits: { fileSize: MAX_PDF_BYTES, files: 1 } })) {
      if (part.type === 'file') {
        if (part.fieldname !== 'file') { part.file.resume(); continue; }
        file = await part.toBuffer(); // throws 413 when over fileSize
      } else if (part.fieldname === 'password' && typeof part.value === 'string' && part.value) {
        password = part.value;
      }
    }
    if (!file) throw new HttpException('file_required', 400);
    if (file.subarray(0, 5).toString('latin1') !== '%PDF-') throw new HttpException('not_a_pdf', 415);

    const hash = sha256(file);
    if (await this.prisma.upload.findFirst({ where: { userId, sha256: hash, status: 'confirmed' } })) {
      throw new HttpException('already_imported', 409);
    }

    const opened = await this.openPdf(userId, file, password);
    password = undefined;
    let lines = pdfItemsToLines(opened.pages);
    const ocr = lines.length < 5; // scanned statement: no usable text layer → OCR the rendered pages
    if (ocr) {
      if (opened.pages.length > MAX_OCR_PAGES) throw new HttpException('too_many_pages', 422);
      lines = await ocrPages(await renderPdfPages(file, opened.password));
    }
    opened.password = undefined;
    const bank = detectBank(lines);
    if (!bank) throw new HttpException('unsupported_bank', 422);
    let statement: ParsedStatement;
    try {
      statement = parseStatement(lines);
    } catch {
      throw new HttpException('unsupported_format', 422);
    }
    return this.store(userId, req, statement, hash, file, 'pdf', { ocr });
  }

  /** Passbook page photos (multipart repeated `images`, in page order; optional `bank` KBANK|BBL for pages without a logo) → same review payload as a PDF. */
  @Post('passbook')
  async passbook(@UserId() userId: string, @NestReq() req: Req) {
    const pages: Buffer[] = [];
    let bank: Bank | undefined;
    for await (const part of req.parts({ limits: { fileSize: MAX_PAGE_BYTES, files: MAX_OCR_PAGES } })) {
      if (part.type === 'file') {
        if (part.fieldname !== 'images') { part.file.resume(); continue; }
        pages.push(await part.toBuffer()); // throws 413 when over fileSize
      } else if (part.fieldname === 'bank' && BANKS.includes(part.value as Bank)) bank = part.value as Bank;
    }
    if (!pages.length) throw new HttpException('images_required', 400);
    if (pages.some((p) => !mimeOf(p))) throw new HttpException('not_an_image', 415);

    const hash = sha256(Buffer.concat(pages.map(sha256).map((h) => Buffer.from(h))));
    if (await this.prisma.upload.findFirst({ where: { userId, sha256: hash, status: 'confirmed' } })) {
      throw new HttpException('already_imported', 409);
    }
    let statement: ParsedStatement;
    try {
      statement = parsePassbook(await ocrPages(pages), bank);
    } catch {
      throw new HttpException('unsupported_format', 422);
    }
    // one encrypted blob (u32 length + bytes per page) so account deletion's single unlink still works
    const blob = Buffer.concat(pages.flatMap((p) => { const n = Buffer.alloc(4); n.writeUInt32BE(p.length); return [n, p]; }));
    return this.store(userId, req, statement, hash, blob, 'passbook', { ocr: true, pages: pages.length });
  }

  /** Categorise, check, persist as a pending upload with the encrypted source file, audit; returns the review payload. */
  private async store(userId: string, req: Req, statement: ParsedStatement, hash: string, file: Buffer, ext: string, meta: { ocr: boolean; pages?: number }) {
    const rules = await this.prisma.categoryRule.findMany({ where: { userId } });
    const parsed: Parsed = { statement, categories: statement.rows.map((r) => categorize(r.description, r.direction, rules)) };
    const check = checkBalances(statement);

    const upload = await this.prisma.upload.create({
      data: {
        userId, bank: statement.bank, accountNoMasked: statement.accountNoMasked, periodStart: statement.periodStart,
        periodEnd: statement.periodEnd, sha256: hash, filePath: '', parsed: parsed as object, rowCount: statement.rows.length,
      },
    });
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = join(UPLOAD_DIR, `${upload.id}.${ext}.enc`);
    await writeFile(filePath, encrypt(file, envKey('FILE_KEY')));
    await this.prisma.upload.update({ where: { id: upload.id }, data: { filePath } });
    await this.audit.log(req, ext === 'pdf' ? 'upload' : 'upload_passbook', { target: upload.id, after: { bank: statement.bank, sha256: hash, rows: statement.rows.length, failCount: check.failCount, ...meta } });

    return {
      uploadId: upload.id, bank: statement.bank, period: { start: statement.periodStart, end: statement.periodEnd },
      accountNoMasked: statement.accountNoMasked, rows: reviewRows(parsed, check), check, ...meta,
    };
  }

  /** Try the given password; else candidates from the user's stored PII. The working password is returned only so a scanned PDF can be rendered in the same request; never stored. */
  private async openPdf(userId: string, file: Buffer, password?: string): Promise<{ pages: PdfItem[][]; password?: string }> {
    try {
      return { pages: await extractPdfItems(file, password), password };
    } catch (e) {
      if (!(e instanceof PdfPasswordError)) throw new HttpException('unreadable_pdf', 422);
      if (password) throw new HttpException('password_required', 422);
    }
    const pii = await this.prisma.pii.findUnique({ where: { userId } });
    if (pii) {
      const key = envKey('PII_KEY');
      const dec = (s: string | null) => (s ? decryptStr(s, key) : null);
      const p = { birthDate: dec(pii.birthDateEnc), nationalId: dec(pii.nationalIdEnc) };
      for (const cand of [...new Set(BANKS.flatMap((b) => pdfPasswordCandidates(b, p)))]) {
        try {
          return { pages: await extractPdfItems(file, cand), password: cand };
        } catch (e) {
          if (!(e instanceof PdfPasswordError)) throw new HttpException('unreadable_pdf', 422);
        }
      }
    }
    throw new HttpException('password_required', 422);
  }

  private async pending(userId: string, id: string) {
    const up = await this.prisma.upload.findFirst({ where: { id, userId } });
    if (!up) throw new NotFoundException('not_found');
    if (up.status !== 'pending') throw new HttpException('already_confirmed', 409);
    return { up, parsed: up.parsed as unknown as Parsed };
  }

  @Patch(':id/rows/:index')
  async fixRow(@UserId() userId: string, @Param('id') id: string, @Param('index') idx: string, @Body() body: unknown, @NestReq() req: Req) {
    const fix = parse(RowFix, body);
    const { parsed } = await this.pending(userId, id);
    const index = Number(idx);
    const row = parsed.statement.rows[index];
    if (!Number.isInteger(index) || !row) throw new NotFoundException('row_not_found');
    if (checkBalances(parsed.statement).rows.find((c) => c.index === index)?.ok) throw new HttpException('row_already_ok', 409);
    const before = { amount: row.amount, direction: row.direction, date: row.date, balance: row.balance };
    Object.assign(row, fix);
    const check = checkBalances(parsed.statement);
    await this.prisma.upload.update({ where: { id }, data: { parsed: parsed as object } });
    await this.audit.log(req, 'review_fix_row', { target: `${id}#${index}`, before, after: fix });
    return { rows: reviewRows(parsed, check), check };
  }

  @Post(':id/confirm')
  @HttpCode(200)
  async confirm(@UserId() userId: string, @Param('id') id: string, @NestReq() req: Req) {
    const { parsed } = await this.pending(userId, id);
    const s = parsed.statement;
    const check = checkBalances(s);
    if (check.failCount > 0 || !check.totalsOk) throw new HttpException('balance_check_failed', 409);

    const imported = await this.prisma.$transaction(async (tx) => {
      // status guard inside the tx: a double-click confirm imports once
      const claimed = await tx.upload.updateMany({ where: { id, userId, status: 'pending' }, data: { status: 'confirmed', confirmedAt: new Date() } });
      if (claimed.count !== 1) throw new HttpException('already_confirmed', 409);
      const account = await tx.account.upsert({
        where: { userId_bank_accountNoMasked: { userId, bank: s.bank, accountNoMasked: s.accountNoMasked } },
        create: { userId, bank: s.bank, accountNoMasked: s.accountNoMasked, accountName: s.accountName },
        update: {},
      });
      const existing = await tx.transaction.findMany({
        where: { accountId: account.id, date: { gte: s.periodStart, lte: s.periodEnd } },
        select: { date: true, time: true, amount: true, balance: true },
      });
      const key = (r: { date: string; time?: string | null; amount: number; balance?: number | null }) => `${r.date}|${r.time ?? ''}|${r.amount}|${r.balance ?? ''}`;
      const loose = (r: { date: string; amount: number; balance?: number | null }) => `${r.date}|${r.amount}|${r.balance ?? ''}`;
      const seen = new Set(existing.map(key));
      const seenLoose = new Set(existing.map(loose)); // passbook rows have no time: match on date|amount|balance
      const data = s.rows.flatMap((r, i) => {
        if (seen.has(key(r)) || (!r.time && seenLoose.has(loose(r)))) return [];
        seen.add(key(r));
        seenLoose.add(loose(r));
        return [{
          userId, accountId: account.id, uploadId: id, date: r.date, time: r.time ?? null, description: r.description,
          channel: r.channel ?? null, amount: r.amount, direction: r.direction, balance: r.balance,
          category: parsed.categories[i], source: 'statement', verified: true,
        }];
      });
      const created = await tx.transaction.createManyAndReturn({ data, select: { id: true, date: true, time: true, amount: true, direction: true } });
      // a slip confirmed earlier for the same transfer must not count twice: hide it, link it to the statement row
      const out = created.filter((r) => r.direction === 'out');
      const slipRows = out.length ? await tx.transaction.findMany({
        where: { userId, source: 'slip', hidden: false, direction: 'out', date: { in: [...new Set(out.map((r) => r.date))] } },
        select: { id: true, date: true, time: true, amount: true, note: true },
      }) : [];
      const pairs = pairSlipRows(out, slipRows);
      for (const p of pairs) {
        const old = slipRows.find((r) => r.id === p.slipTxId)!;
        await tx.transaction.update({ where: { id: p.slipTxId }, data: { hidden: true, note: SLIP_MERGED_NOTE } });
        await tx.edit.createMany({ data: [
          { userId, transactionId: p.slipTxId, field: 'hidden', oldValue: 'false', newValue: 'true' },
          { userId, transactionId: p.slipTxId, field: 'note', oldValue: old.note, newValue: SLIP_MERGED_NOTE },
        ] });
        await tx.slip.updateMany({ where: { userId, matchedTransactionId: p.slipTxId }, data: { matchedTransactionId: p.stmtTxId } });
      }
      return { count: data.length, pairs };
    });
    for (const p of imported.pairs) await this.audit.log(req, 'slip_merged', { target: p.slipTxId, after: { statementTransactionId: p.stmtTxId } });
    await this.stats.markOwnTransfers(userId);
    await this.audit.log(req, 'confirm_import', { target: id, after: { imported: imported.count } });
    return { imported: imported.count, streak: await this.stats.streak(userId) };
  }
}

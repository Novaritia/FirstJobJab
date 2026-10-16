// Needs Postgres + migrated schema + app/.env. Upload/delete management without real PDFs: rows are seeded via Prisma.
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../src/main.js';
import { PrismaService } from '../src/prisma.service.js';
import { AuditService } from '../src/audit.service.js';
import { UPLOAD_DIR } from '../src/uploads.controller.js';
import { SLIP_MERGED_NOTE } from '../src/slips.controller.js';
import { PRIVACY_VERSION, TERMS_VERSION } from '../src/security-util.js';

describe('uploads management e2e', () => {
  let app: NestFastifyApplication;
  let db: PrismaService;
  let sid: string;
  let userId: string;
  const parsed = { statement: { bank: 'KBANK', accountNoMasked: 'xxx-x-x0000-x', accountName: 'T', periodStart: '2026-01-01', periodEnd: '2026-01-31', openingBalance: 0, closingBalance: 0, rows: [] }, categories: [] };
  const inject = (method: 'GET' | 'DELETE', url: string, payload?: object) =>
    app.getHttpAdapter().getInstance().inject({ method, url, cookies: { sid }, ...(payload ? { payload } : {}) });
  const upload = async (status: string) => {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const u = await db.upload.create({ data: { userId, bank: 'KBANK', accountNoMasked: 'xxx-x-x0000-x', periodStart: '2026-01-01', periodEnd: '2026-01-31', sha256: `t${Math.random()}`, filePath: '', parsed, rowCount: 2, status, fileName: 'jan.pdf' } });
    const filePath = join(UPLOAD_DIR, `${u.id}.pdf.enc`);
    await writeFile(filePath, 'x');
    return db.upload.update({ where: { id: u.id }, data: { filePath } });
  };

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    db = app.get(PrismaService);
    const reg = await app.getHttpAdapter().getInstance().inject({
      method: 'POST', url: '/auth/register',
      payload: { email: `up-${Date.now()}@firstjobjab.test`, password: 'longpassword1', displayName: 'U', acceptTerms: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION },
    });
    sid = reg.cookies.find((c) => c.name === 'sid')!.value;
    userId = reg.json().user.id;
  });
  afterAll(() => app.close());

  it('cancels a pending upload (row + file gone)', async () => {
    const u = await upload('pending');
    const list = (await inject('GET', '/uploads?limit=10')).json();
    expect(list).toMatchObject({ total: 1, page: 1, limit: 10 });
    expect(list.uploads[0]).toMatchObject({ id: u.id, kind: 'statement', fileName: 'jan.pdf', importedRows: 0, ocr: false, check: { failCount: 0 } });
    expect((await inject('DELETE', `/uploads/${u.id}`)).json()).toEqual({ ok: true, deletedRows: 0 });
    expect(existsSync(u.filePath)).toBe(false);
    expect(await db.upload.findUnique({ where: { id: u.id } })).toBeNull();
  });

  it('deletes a confirmed import with its rows and restores slips', async () => {
    const u = await upload('confirmed');
    const acc = await db.account.create({ data: { userId, bank: 'KBANK', accountNoMasked: 'xxx-x-x0000-x' } });
    const row = (n: number) => ({ userId, accountId: acc.id, uploadId: u.id, date: '2026-01-05', time: `10:0${n}`, description: `r${n}`, amount: 100 * n, direction: 'out', balance: 1000 - n, category: 'food', source: 'statement', verified: true });
    const [t1, t2] = await Promise.all([db.transaction.create({ data: row(1) }), db.transaction.create({ data: row(2) })]);
    // slip A matched at upload; slip B confirmed (own row) then merged into t2
    const slipA = await db.slip.create({ data: { userId, sha256: `a${Math.random()}`, confidence: 1, status: 'matched', matchedTransactionId: t1.id } });
    const slipAcc = await db.account.create({ data: { userId, bank: 'SLIP', accountNoMasked: 'slip' } });
    const slipTx = await db.transaction.create({ data: { userId, accountId: slipAcc.id, date: '2026-01-05', description: 'slip', amount: 200, direction: 'out', category: 'food', source: 'slip', verified: false, hidden: true, note: SLIP_MERGED_NOTE } });
    await db.edit.create({ data: { userId, transactionId: slipTx.id, field: 'note', oldValue: 'mine', newValue: SLIP_MERGED_NOTE } });
    const slipB = await db.slip.create({ data: { userId, sha256: `b${Math.random()}`, confidence: 1, status: 'confirmed', matchedTransactionId: t2.id } });
    await app.get(AuditService).log(null, 'slip_merged', { userId, target: slipTx.id, after: { statementTransactionId: t2.id } });

    expect((await inject('DELETE', `/uploads/${u.id}`)).statusCode).toBe(409);
    expect((await inject('DELETE', `/uploads/${u.id}?withTransactions=1`, {})).statusCode).toBe(400);
    expect((await inject('DELETE', `/uploads/${u.id}?withTransactions=1`, { confirm: true })).json()).toEqual({ ok: true, deletedRows: 2 });

    expect(await db.transaction.count({ where: { uploadId: u.id } })).toBe(0);
    expect(existsSync(u.filePath)).toBe(false);
    expect(await db.transaction.findUnique({ where: { id: slipTx.id } })).toMatchObject({ hidden: false, note: 'mine' });
    expect(await db.slip.findUnique({ where: { id: slipB.id } })).toMatchObject({ status: 'confirmed', matchedTransactionId: slipTx.id });
    expect(await db.slip.findUnique({ where: { id: slipA.id } })).toMatchObject({ status: 'unmatched', matchedTransactionId: null });
    expect((await inject('GET', '/uploads')).json().total).toBe(0);
  });
});

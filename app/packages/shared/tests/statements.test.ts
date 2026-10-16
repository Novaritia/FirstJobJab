import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkBalances, detectBank, detectOwnTransfers, parseStatement, pdfItemsToLines, pdfPasswordCandidates } from '../src';
import { pdfItems } from './pdf-text';

const DIR = resolve(__dirname, '../../../mock-data');
const PII = { birthDate: '1999-03-14', nationalId: '1103700123458' };
// SCANNED_* has no text layer or password; it goes through the api OCR path instead
const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.pdf') && !f.startsWith('SCANNED') && !f.startsWith('TRUEMONEY')) : [];

describe('mock statements (run `pnpm --filter @fjm/shared mock` first)', () => {
  it('mock PDFs exist', () => expect(files.length).toBeGreaterThanOrEqual(13));

  for (const f of files) {
    it(f, async () => {
      const bank = (['BBL', 'SCB', 'KTB'] as const).find((b) => f.includes(b)) ?? 'KBANK';
      const pw = pdfPasswordCandidates(bank, PII)[0];
      expect(pw).toBe('14031999');
      await expect(pdfItems(join(DIR, f), 'wrong')).rejects.toThrow();
      const lines = pdfItemsToLines(await pdfItems(join(DIR, f), pw));
      expect(detectBank(lines)).toBe(bank);
      const s = parseStatement(lines);
      expect(s.accountName).toBe('นางสาวสมหญิง ใจดี');
      expect(s.accountNoMasked).toMatch(/^xxx-x-x\d{4}-x$/);
      expect(s.periodStart).toMatch(/^2026-0[4-9]-01$/);
      expect(s.rows.length).toBeGreaterThan(0);
      const c = checkBalances(s);
      if (f.startsWith('BROKEN')) {
        expect(c.failCount).toBeGreaterThanOrEqual(1);
        expect(c.rows[7].ok).toBe(false);
      } else {
        expect(c.failCount).toBe(0);
        expect(c.totalsOk).toBe(true);
      }
    });
  }

  it('KBank row fields', async () => {
    const s = parseStatement(pdfItemsToLines(await pdfItems(join(DIR, 'KBANK_2026-04.pdf'), '14031999')));
    expect(s.periodEnd).toBe('2026-04-30');
    expect(s.openingBalance).toBe(2423050);
    const salary = s.rows.find((r) => r.description.includes('เงินเดือน'))!;
    expect(salary).toMatchObject({ date: '2026-04-25', time: '06:30', direction: 'in', amount: 2725000, channel: 'Auto' });
    expect(s.rows[0]).toMatchObject({ date: '2026-04-01', direction: 'out', amount: 750000, channel: 'K PLUS' });
    expect(s.rows[0].description).toContain('ค่าห้อง');
  });
});

describe('parseStatement', () => {
  it('rejects unknown formats', () => expect(() => parseStatement(['hello'])).toThrow('unsupported_format'));
});

describe('generic parser (any bank)', () => {
  it('unknown bank, dd-mm-yyyy BE, no opening line, deposit keyword backs out opening', () => {
    const s = parseStatement([
      'Some Cooperative Bank', 'Account No. 123-4-56789-0',
      '01-09-2569 รับโอนเงิน 1,000.00 5,000.00',
      '02-09-2569 ค่าอาหาร 120.00 4,880.00',
      '03-09-2569 Sep 3 wrap line',
      '250.00 4,630.00',
    ]);
    expect(s).toMatchObject({ bank: 'OTHER', accountNoMasked: 'xxx-x-x6789-x', openingBalance: 400000, closingBalance: 463000 });
    expect(s.rows.map((r) => [r.date, r.direction, r.amount])).toEqual([
      ['2026-09-01', 'in', 100000], ['2026-09-02', 'out', 12000], ['2026-09-03', 'out', 25000]]);
    expect(checkBalances(s)).toMatchObject({ failCount: 0, totalsOk: true });
  });
  it('detects many banks; earliest name wins', () => {
    expect(detectBank(['ธนาคารกรุงศรีอยุธยา', 'โอนไป KBANK'])).toBe('BAY');
    expect(detectBank(['ttb all free'])).toBe('TTB');
    expect(detectBank(['ธนาคารออมสิน'])).toBe('GSB');
    expect(detectBank(['hello'])).toBe('OTHER');
  });
});

describe('e-wallet history (no running balance)', () => {
  it('TrueMoney PDF: totals mode reconciles; top-ups pair with SCB rows as own transfers', async () => {
    const w = parseStatement(pdfItemsToLines(await pdfItems(join(DIR, 'TRUEMONEY_2026-09.pdf'), '14031999')));
    expect(w).toMatchObject({ bank: 'TRUEMONEY', accountNoMasked: 'xxx-xxx-4521', accountName: 'นางสาวสมหญิง ใจดี', periodStart: '2026-09-01', openingBalance: 30000 });
    expect(w.rows.every((r) => r.balance === undefined)).toBe(true);
    expect(w.rows.filter((r) => r.direction === 'in').every((r) => r.description.includes('เติมเงิน'))).toBe(true);
    expect(checkBalances(w)).toMatchObject({ mode: 'totals', totalsOk: true, failCount: 0 });

    const scb = parseStatement(pdfItemsToLines(await pdfItems(join(DIR, 'SCB_2026-09.pdf'), '14031999')));
    const tx = (s: typeof w, acc: string) => s.rows.map((r, i) => ({ id: `${acc}${i}`, accountId: acc, date: r.date, time: r.time, amount: r.amount, direction: r.direction }));
    const tops = w.rows.filter((r) => r.direction === 'in').length;
    expect(tops).toBeGreaterThan(0);
    expect(detectOwnTransfers([...tx(scb, 'scb'), ...tx(w, 'tmn')])).toHaveLength(tops);
  });
  it('screenshot-style lines (amount above date, no totals) → mode none, nothing pretends to be verified', () => {
    const s = parseStatement([
      'TrueMoney', 'ประวัติ',
      'จ่าย 7-Eleven -85.00', '16 ก.ย. 69 12:30',
      'เติมเงินจาก SCB +500.00', '17 ก.ย. 69 09:05',
    ]);
    expect(s.rows.map((r) => [r.date, r.time, r.direction, r.amount])).toEqual([
      ['2026-09-16', '12:30', 'out', 8500], ['2026-09-17', '09:05', 'in', 50000]]);
    expect(checkBalances(s)).toMatchObject({ mode: 'none', okCount: 0, failCount: 0, totalsOk: false });
  });
});

import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkBalances, detectBank, parseStatement, pdfItemsToLines, pdfPasswordCandidates } from '../src';
import { pdfItems } from './pdf-text';

const DIR = resolve(__dirname, '../../../mock-data');
const PII = { birthDate: '1999-03-14', nationalId: '1103700123458' };
// SCANNED_* has no text layer or password; it goes through the api OCR path instead
const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.pdf') && !f.startsWith('SCANNED')) : [];

describe('mock statements (run `pnpm --filter @fjm/shared mock` first)', () => {
  it('mock PDFs exist', () => expect(files.length).toBeGreaterThanOrEqual(13));

  for (const f of files) {
    it(f, async () => {
      const bank = f.includes('BBL') ? 'BBL' : 'KBANK';
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

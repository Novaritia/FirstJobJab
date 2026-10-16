import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkBalances, parsePassbook } from '@fjm/shared';
import { ocrPages } from './ocr.js';

const DIR = join(__dirname, '../../../mock-data/passbook');
// tesseract can't read the rotated/speckled p2; the PaddleOCR sidecar (OCR_URL) can
const kbank = process.env.OCR_URL ? ['passbook_kbank_2026-10_p1.png', 'passbook_kbank_2026-10_p2.jpg'] : ['passbook_kbank_2026-10_p1.png'];

describe('passbook photos (real OCR on mock pages)', () => {
  it.each([
    ['KBANK', kbank, kbank.length === 2 ? 11 : 6, 'xxx-x-x4821-x'],
    ['BBL', ['passbook_bbl_2026-10_p1.png'], 3, 'xxx-x-x7305-x'],
  ])('%s pages verify', async (bank, files, rows, acct) => {
    const s = parsePassbook(await ocrPages(files.map((f) => readFileSync(join(DIR, f)))));
    expect(s).toMatchObject({ bank, accountNoMasked: acct, accountName: 'นางสาวสมหญิง ใจดี', periodStart: expect.stringMatching(/^2026-10-/) });
    expect(s.rows).toHaveLength(rows);
    expect(checkBalances(s)).toMatchObject({ failCount: 0, totalsOk: true });
  }, 120_000);
});

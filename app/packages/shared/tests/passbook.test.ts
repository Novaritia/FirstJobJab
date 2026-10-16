import { describe, expect, it } from 'vitest';
import { checkBalances, normalizePassbookLine, parsePassbook } from '../src';

// Fixtures imitate tesseract output on phone photos of passbook pages (noise added by hand).
const KBANK_P1 = [
  'ธนาคารกสิกรไทย KASIKORNBANK',
  'สมุดบัญชีเงินฝากออมทรัพย์',
  'ชื่อบัญชี นางสาวสมหญิง ใจดี',
  'เลขที่บัญชี 063-8-14821-7',
  'วันที่ รายการ ถอน ฝาก คงเหลือ ผู้บันทึก',
  '01/10/69 ยอดยกมา 24,430.50',
  '01/10/69 TRF 7,500.00 16,930.50 K001',
  '03-10-69 ATM 2,OOO.00 14,930.50 K017', // O for 0
  '05/1O/69 TRF 350.00 15,280.50 K001', // TRF in: only the balance says so
  '0810 69 CDM l,500.00 16,780.50 K022', // dropped separators, l for 1
  '10/10/69 TRF 399.00 16.381.50 K001', // comma read as dot
  '12/10/69 ATM1,000.0015,381.50', // gaps lost: code + two cells glued
  'ยอดยกไป 15,381.50',
];
const KBANK_P2 = [
  'B/F 15,381.50',
  '13/10/69 TRF 89 .00 15,292.50 K001', // stray space before the dot
  '15/10/69 DEP 500,00 15,792.50 K003', // comma as decimal
];

describe('parsePassbook', () => {
  it('KBank: two noisy pages verify end to end', () => {
    const s = parsePassbook([...KBANK_P1, ...KBANK_P2]);
    expect(s).toMatchObject({
      bank: 'KBANK', accountNoMasked: 'xxx-x-x4821-x', accountName: 'นางสาวสมหญิง ใจดี',
      periodStart: '2026-10-01', periodEnd: '2026-10-15', openingBalance: 2443050, closingBalance: 1579250,
    });
    expect(s.rows.map((r) => [r.amount, r.direction])).toEqual([
      [750000, 'out'], [200000, 'out'], [35000, 'in'], [150000, 'in'], [39900, 'out'], [100000, 'out'], [8900, 'out'], [50000, 'in'],
    ]);
    expect(s.rows[3].date).toBe('2026-10-08');
    const c = checkBalances(s);
    expect(c.failCount).toBe(0);
    expect(c.totalsOk).toBe(true);
  });

  it('BBL: Thai codes, no B/F row, Thai digits', () => {
    const s = parsePassbook([
      'ธนาคารกรุงเทพ BANGKOK BANK',
      'บัญชีเลขที่ 172-0-87305-4',
      'นางสาวสมหญิง ใจดี',
      '05-10-69 ฝาก 2,000.00 46,251.23 0123',
      '๐๙-๑๐-๖๙ ถอน ๑,๐๐๐.๐๐ ๔๕,๒๕๑.๒๓ ๐๑๒๓',
      '14-10-2569 TRF 500.00 44,751.23 0088',
    ]);
    expect(s).toMatchObject({ bank: 'BBL', accountNoMasked: 'xxx-x-x7305-x', openingBalance: 4425123 });
    expect(s.rows.map((r) => r.direction)).toEqual(['in', 'out', 'out']);
    expect(checkBalances(s).failCount).toBe(0);
  });

  it('balance delta beats the printed code (column ambiguity)', () => {
    const s = parsePassbook(['B/F 1,000.00', '01/10/69 ถอน 200.00 1,200.00'], 'BBL');
    expect(s.rows[0].direction).toBe('in');
    expect(checkBalances(s).failCount).toBe(0);
  });

  it('misread amount fails only its own row; unreadable amount = 0 → review', () => {
    const s = parsePassbook(['ยอดยกมา 1,000.00', '01/10/69 ATM 300.00 800.00', '02/10/69 ATM 100.00 700.00', '03/10/69 ATM 650.00'], 'KBANK');
    const c = checkBalances(s);
    expect(c.rows.map((r) => r.ok)).toEqual([false, true, false]);
    expect(s.rows[2].amount).toBe(0);
  });

  it('bank override for inner pages; rejects junk', () => {
    expect(() => parsePassbook(['01/10/69 TRF 1.00 2.00'])).toThrow('unsupported_format');
    expect(parsePassbook(['01/10/69 TRF 1.00 2.00'], 'KBANK').accountNoMasked).toBe('passbook');
    expect(() => parsePassbook(['กสิกรไทย', 'hello'])).toThrow('unsupported_format');
  });

  it('normalizePassbookLine leaves words alone', () => {
    expect(normalizePassbookLine('Bualuang INT l2,OO1.5O')).toBe('Bualuang INT 12,001.50');
  });
});

// Verbatim PaddleOCR sidecar output (docs/ocr.md) on mock-data/passbook/passbook_kbank_2026-10_p2.jpg (rotated, speckled, JPEG q72).
describe('parsePassbook on real sidecar output', () => {
  it('noisy KBank page 2', () => {
    const s = parsePassbook([
      'ธนาคารกสิกรไทย KASIKORNBANK สมุดบัญชีเงินฝากออมทรัพย์',
      'ชื่อบัญชี นางสาวสมหญิงใจดี เลขที่บัญชี 063-8-14821-7 สาขาเซ็นทรัลุ ลาดพร้าว',
      'วันที่ รายการ ถอน ฝาก คงเหลือ ผู้บันทึก',
      '10-10-69 .ยอดยกมา B/F 38,105.50',
      '10-10-69 TRF: 399.00 37;706.50 K001',
      '11-10-69 ATM 700.00 37,006.50 K017',
      '12-10-69 TRF 1,200.00 35,806.50 K022',
      '14-10-69 CDM 2,000.00 37,806.50 K001',
      '15-10-69 TRF 69.00 37,737.50 K017',
    ]);
    expect(s).toMatchObject({ accountNoMasked: 'xxx-x-x4821-x', openingBalance: 3810550, closingBalance: 3773750 });
    expect(s.rows.map((r) => r.direction)).toEqual(['out', 'out', 'out', 'in', 'out']);
    expect(checkBalances(s)).toMatchObject({ failCount: 0, totalsOk: true });
  });
  it('docs sample: no B/F, unknown code CSH', () => {
    const s = parsePassbook(['วันที รายการ กอน ฝาก คงเหลือ ผู้หา', '01-09-69 CSH 15,000.00 15,250.00 T012', '03-09-69 ATW 2,000.00 13,250.00 A931'], 'KBANK');
    expect(s.rows.map((r) => [r.amount, r.direction])).toEqual([[1500000, 'out'], [200000, 'out']]);
    expect(checkBalances(s).failCount).toBe(0); // first row without B/F can't be verified: opening is backed out of it
  });
});

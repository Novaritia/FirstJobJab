import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSlipQr, parseSlipText, readSlip } from './ocr.js';
import { pairSlipRows } from './slips.controller.js';

const SLIPS = join(__dirname, '../../../mock-data/slips');

describe('parseSlipText', () => {
  it('reads KBank-style slip with 2-digit BE year', () => {
    const f = parseSlipText('โอนเงินสำเร็จ\n16 ต.ค. 69 09:01 น.\nน.ส. สมหญิง ใจดี\nธ.กสิกรไทย\nนาย สมชาย เช่าดี\nเลขที่รายการ: 016244090105ATF07623\nจำนวน: 7,500.00 บาท\nค่าธรรมเนียม: 0.00 บาท');
    expect(f).toMatchObject({ amount: 750000, date: '2026-10-16', time: '09:01', ref: '016244090105ATF07623', bank: 'KBANK', fromName: 'น.ส. สมหญิง ใจดี', toName: 'นาย สมชาย เช่าดี' });
    expect(parseSlipText('1 ก.ุย. 69 09:01 น.').date).toBe('2026-09-01'); // real tesseract misread
  });
  it('reads 4-digit BE year, dropped dots, nikhahit sara am', () => {
    const f = parseSlipText('ธนาคารไทยพาณิชย์\n16 ต ค 2569 - 14:30\nจํานวน: 1,250.00 บาท\nค่าธรรมเนียม: 0.00 บาท');
    expect(f).toMatchObject({ amount: 125000, date: '2026-10-16', time: '14:30', bank: 'SCB' });
  });
  it('reads full month name and dd/mm/yyyy', () => {
    expect(parseSlipText('16 ตุลาคม 2569 08:15\n350.00 บาท').date).toBe('2026-10-16');
    expect(parseSlipText('16/10/2026 08:15\nAmount 350.00 THB')).toMatchObject({ date: '2026-10-16', amount: 35000 });
  });
});

describe('parseSlipQr', () => {
  it('extracts ref + bank from slip-verify mini QR', () => {
    expect(parseSlipQr('0041000600000101030040220016244090105ATF076235102TH91049C3B')).toEqual({ qrRef: '016244090105ATF07623', bank: 'KBANK' });
    expect(parseSlipQr('00020101021129370016A000000677010111')).toBeNull();
  });
});

describe('readSlip (real OCR on mock)', () => {
  it.each([
    ['slip_kbank_rent_2026-09-01.png', { amount: 750000, date: '2026-09-01', time: '09:01', qrRef: '016244090105ATF07623', bank: 'KBANK' }],
    ['slip_kbank_mom_2026-09-28.png', { amount: 200000, date: '2026-09-28', time: '20:12', qrRef: '016271201246BPM04518', bank: 'KBANK' }],
    ['slip_scb_food_2026-09-12.png', { amount: 35000, date: '2026-09-12', time: '14:30', qrRef: '202609121430SCB00017', bank: 'SCB' }],
    ['slip_scb_aircon_2026-09-20.png', { amount: 125000, date: '2026-09-20', time: '16:45', qrRef: '202609201645SCB00342', bank: 'SCB' }],
  ])('reads %s', async (file, want) => {
    const r = await readSlip(readFileSync(join(SLIPS, file)));
    expect(r).toMatchObject(want);
    expect(r.confidence).toBeGreaterThan(0.7);
  }, 60_000);
});

describe('pairSlipRows', () => {
  it('pairs nearest slip within ±5 min, each slip once', () => {
    const stmt = [
      { id: 's1', date: '2026-09-12', time: '14:30', amount: 35000 },
      { id: 's2', date: '2026-09-12', time: '14:33', amount: 35000 },
      { id: 's3', date: '2026-09-20', time: '16:45', amount: 125000 },
    ];
    const slips = [
      { id: 'a', date: '2026-09-12', time: '14:32', amount: 35000 },
      { id: 'b', date: '2026-09-20', time: '16:55', amount: 125000 }, // 10 min off
    ];
    expect(pairSlipRows(stmt, slips)).toEqual([{ slipTxId: 'a', stmtTxId: 's1' }]);
  });
});

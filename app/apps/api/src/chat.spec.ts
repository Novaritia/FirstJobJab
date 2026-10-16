import { forLlm, maskDigits, matchIntent, toTable } from './chat.js';

describe('chat privacy', () => {
  it('masks digit runs ≥4 but keeps years and short numbers', () => {
    expect(maskDigits('โอน x4521 บัตร 1103700123458 โทร 0812345678')).toBe('โอน xxxxx บัตร xxxxxxxxxxxxx โทร xxxxxxxxxx');
    expect(maskDigits('ภาษีปี 2026 วันที่ 2026-04-01 เวลา 09:14 ค่า 750')).toBe('ภาษีปี 2026 วันที่ 2026-04-01 เวลา 09:14 ค่า 750');
  });

  it('user text keeps amounts but masks phone/ID', () => {
    expect(maskDigits('ออมเดือนละ 3000 โทร 0812345678', 7)).toBe('ออมเดือนละ 3000 โทร xxxxxxxxxx');
  });

  it('forLlm masks strings and turns satang into baht, not counters', () => {
    expect(forLlm({ rows: [{ description: 'PromptPay 0812345678', amount: 750000 }], count: 1, current: 6, month: 3 })).toEqual({
      rows: [{ description: 'PromptPay xxxxxxxxxx', amount: 7500 }], count: 1, current: 6, month: 3,
    });
  });
});

describe('matchIntent', () => {
  it.each([
    ['เดือนนี้ใช้ไปเท่าไหร่', 'spend_month'],
    ['ใช้เงินกับอะไรมากสุด', 'top_category'],
    ['ภาษีปีนี้ต้องจ่ายไหม', 'tax'],
    ['streak ฉันกี่เดือนแล้ว', 'streak'],
    ['กู้ได้เท่าไหร่', 'loan'],
    ['สวัสดี', null],
  ])('%s → %s', (q, intent) => expect(matchIntent(q)).toBe(intent));
});

describe('toTable', () => {
  it('flat Thai-keyed rows in baht', () => {
    expect(toTable('search_transactions', { rows: [{ date: '2026-08-01', description: 'ค่าห้อง', category: 'rent', direction: 'out', amount: 750000 }] }))
      .toEqual([{ วันที่: '2026-08-01', รายการ: 'ค่าห้อง', หมวด: 'ค่าเช่า', 'รับ/จ่าย': 'จ่าย', 'จำนวน (฿)': 7500 }]);
  });
});

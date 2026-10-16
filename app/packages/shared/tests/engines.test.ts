import { describe, expect, it } from 'vitest';
import { detectOwnTransfers, estimateTax, guessCategory, maxInstallment, pdfPasswordCandidates, projectGrowth, summarizeMonths, type TxLike } from '../src';

const baht = (n: number) => n * 100;

describe('estimateTax', () => {
  it('25,000/month with SS 750 → 0', () => {
    const r = estimateTax({ year: 2026, salaryIncome: baht(300_000), socialSecurity: baht(9_000) });
    expect(r.netIncome).toBe(baht(131_000));
    expect(r.tax).toBe(0);
  });
  it('35,000/month → 5,050', () => {
    // 420,000 - 100,000 expense - 60,000 personal - 9,000 SS = 251,000; (251,000-150,000)*5%
    const r = estimateTax({ year: 2026, salaryIncome: baht(420_000), socialSecurity: baht(9_000) });
    expect(r.expenseDeduction).toBe(baht(100_000));
    expect(r.allowances).toBe(baht(69_000));
    expect(r.tax).toBe(baht(5_050));
    expect(r.brackets.map((b) => b.tax)).toEqual([0, baht(5_050)]);
  });
  it('tax starts at 26,584 baht/month', () => {
    // 12s - 100,000 - 60,000 - 9,000 > 150,000 → s > 26,583.33
    expect(estimateTax({ year: 2026, salaryIncome: 0, socialSecurity: 0 }).monthlySalaryWhereTaxStarts).toBe(baht(26_584));
  });
  it('caps life insurance and ThaiESG', () => {
    const r = estimateTax({ year: 2026, salaryIncome: baht(600_000), socialSecurity: baht(9_000), lifeInsurance: baht(150_000), thaiEsg: baht(500_000) });
    expect(r.allowances).toBe(baht(60_000 + 9_000 + 100_000 + 180_000));
  });
  it('multi-bracket', () => {
    // net 1,000,000 → 0 + 7,500 + 20,000 + 37,500 + 50,000 = 115,000
    const r = estimateTax({ year: 2026, salaryIncome: baht(1_160_000), socialSecurity: 0 });
    expect(r.netIncome).toBe(baht(1_000_000));
    expect(r.tax).toBe(baht(115_000));
  });
});

describe('projectGrowth', () => {
  it('no return = sum of savings', () => {
    const p = projectGrowth({ monthlySaving: baht(1_000), annualReturn: 0, years: 1 });
    expect(p).toHaveLength(13);
    expect(p[12]).toEqual({ month: 12, contributed: baht(12_000), value: baht(12_000) });
  });
  it('compounds monthly', () => {
    const p = projectGrowth({ monthlySaving: 0, annualReturn: 0.12, years: 1, startBalance: baht(100) });
    expect(p[12].value).toBe(Math.round(10000 * 1.01 ** 12));
  });
});

describe('maxInstallment', () => {
  it('40% DSR minus existing debt', () => {
    expect(maxInstallment(baht(30_000), baht(2_000))).toBe(baht(10_000));
    expect(maxInstallment(baht(10_000), baht(5_000))).toBe(0);
  });
});

describe('own transfers + summary', () => {
  const txs: TxLike[] = [
    { id: 'k1', accountId: 'kb', date: '2026-04-26', time: '10:05', amount: baht(5_000), direction: 'out' },
    { id: 'b1', accountId: 'bbl', date: '2026-04-26', time: '10:07', amount: baht(5_000), direction: 'in' },
    { id: 'k2', accountId: 'kb', date: '2026-04-26', time: '11:00', amount: baht(5_000), direction: 'out' }, // 30 min gap to b2
    { id: 'b2', accountId: 'bbl', date: '2026-04-26', time: '11:30', amount: baht(5_000), direction: 'in' },
    { id: 'k3', accountId: 'kb', date: '2026-04-25', time: '06:30', amount: baht(27_250), direction: 'in', category: 'salary' },
    { id: 'k4', accountId: 'kb', date: '2026-05-01', time: '09:00', amount: baht(7_500), direction: 'out', category: 'rent' },
  ];
  it('pairs within 10 minutes across accounts only', () => {
    expect(detectOwnTransfers(txs)).toEqual([['k1', 'b1']]);
  });
  it('midnight crossing', () => {
    expect(detectOwnTransfers([
      { id: 'a', accountId: 'x', date: '2026-04-30', time: '23:58', amount: 100, direction: 'out' },
      { id: 'b', accountId: 'y', date: '2026-05-01', time: '00:03', amount: 100, direction: 'in' },
    ])).toEqual([['a', 'b']]);
  });
  it('summary excludes own_transfer', () => {
    const tagged = txs.map((t) => (t.id === 'k1' || t.id === 'b1' ? { ...t, category: 'own_transfer' as const } : t));
    const s = summarizeMonths(tagged);
    expect(s.map((m) => m.month)).toEqual(['2026-04', '2026-05']);
    expect(s[0]).toMatchObject({ income: baht(27_250 + 5_000), spend: baht(5_000), net: baht(27_250) });
    expect(s[1].byCategory).toEqual({ rent: baht(7_500) });
  });
});

describe('guessCategory', () => {
  it.each([
    ['ชำระเงิน LINE MAN', 'out', 'food'],
    ['ชำระเงิน GRAB TAXI', 'out', 'transport'],
    ['ชำระเงิน GRAB FOOD', 'out', 'food'],
    ['QR 7-ELEVEN สาขา ลาดพร้าว 71', 'out', 'food'],
    ['โอนเงิน PromptPay x4521 ค่าห้อง', 'out', 'rent'],
    ['AIS ค่าโทรศัพท์', 'out', 'bills'],
    ['SHOPEE', 'out', 'shopping'],
    ['รับโอนเงิน เงินเดือน บจก. ไทยดิจิทัล', 'in', 'salary'],
    ['รับโอนเงิน PromptPay เพื่อน', 'in', 'other_income'],
    ['อะไรก็ไม่รู้', 'out', 'other'],
  ] as const)('%s → %s', (d, dir, cat) => expect(guessCategory(d, dir)).toBe(cat));
});

describe('pdfPasswordCandidates', () => {
  it('birth date formats first, then ID', () => {
    const c = pdfPasswordCandidates('KBANK', { birthDate: '1999-03-14', nationalId: '1-1037-00123-45-8' });
    expect(c.slice(0, 4)).toEqual(['14031999', '14032542', '19990314', '25420314']);
    expect(c).toContain('3458');
    expect(c).toContain('1103700123458');
    expect(new Set(c).size).toBe(c.length);
  });
});

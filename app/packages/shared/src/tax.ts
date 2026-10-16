import type { TaxBracketLine, TaxInput, TaxResult } from './contract';

const B = 100; // satang per baht

/** Thai PIT progressive brackets (baht of net income). */
export const TAX_BRACKETS: { from: number; to: number | null; rate: number }[] = [
  { from: 0, to: 150_000, rate: 0 },
  { from: 150_000, to: 300_000, rate: 0.05 },
  { from: 300_000, to: 500_000, rate: 0.1 },
  { from: 500_000, to: 750_000, rate: 0.15 },
  { from: 750_000, to: 1_000_000, rate: 0.2 },
  { from: 1_000_000, to: 2_000_000, rate: 0.25 },
  { from: 2_000_000, to: 5_000_000, rate: 0.3 },
  { from: 5_000_000, to: null, rate: 0.35 },
];

const PERSONAL_ALLOWANCE = 60_000 * B;
const LIFE_INSURANCE_CAP = 100_000 * B;
const THAI_ESG_CAP = 300_000 * B;
const PVD_CAP = 500_000 * B;
// Social security: 5% of wage, wage ceiling 15,000 → 750/month. Verify if the 2026 ceiling raise (17,500 → 875) applies.
const SS_MONTHLY_CAP = 750 * B;

function core(input: TaxInput) {
  const salary = input.salaryIncome;
  const other = input.otherIncome ?? 0;
  const grossIncome = salary + other;
  // 40(1): 50% capped 100,000. 40(8): flat 60% for MVP (real rate depends on income type).
  const expenseDeduction = Math.min(Math.round(salary * 0.5), 100_000 * B) + Math.round(other * 0.6);
  const allowances =
    PERSONAL_ALLOWANCE +
    input.socialSecurity +
    Math.min(input.providentFund ?? 0, Math.round(salary * 0.15), PVD_CAP) +
    Math.min(input.lifeInsurance ?? 0, LIFE_INSURANCE_CAP) +
    Math.min(input.thaiEsg ?? 0, Math.round(grossIncome * 0.3), THAI_ESG_CAP);
  const netIncome = Math.max(0, grossIncome - expenseDeduction - allowances);
  const brackets: TaxBracketLine[] = [];
  let tax = 0;
  for (const b of TAX_BRACKETS) {
    const from = b.from * B;
    const to = b.to === null ? null : b.to * B;
    if (netIncome <= from) break;
    const portion = (to === null ? netIncome : Math.min(netIncome, to)) - from;
    const t = Math.round(portion * b.rate);
    tax += t;
    brackets.push({ from, to, rate: b.rate, tax: t });
  }
  return { grossIncome, expenseDeduction, allowances, netIncome, tax, brackets };
}

/** Lowest whole-baht monthly salary (salary-only, SS at 5% capped) that owes any tax. */
function salaryWhereTaxStarts(year: number): number {
  const taxAt = (baht: number) => {
    const m = baht * B;
    return core({ year, salaryIncome: m * 12, socialSecurity: Math.min(Math.round(m * 0.05), SS_MONTHLY_CAP) * 12 }).tax;
  };
  let lo = 0;
  let hi = 1_000_000; // baht/month; tax is monotonic in salary so binary search works
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (taxAt(mid) > 0) hi = mid; else lo = mid + 1;
  }
  return lo * B;
}

export function estimateTax(input: TaxInput): TaxResult {
  return { ...core(input), monthlySalaryWhereTaxStarts: salaryWhereTaxStarts(input.year) };
}

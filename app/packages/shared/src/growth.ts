import type { GrowthInput, GrowthPoint } from './contract';

/** Monthly compounding, contribution at end of each month. Point 0 = start. */
export function projectGrowth(input: GrowthInput): GrowthPoint[] {
  const r = input.annualReturn / 12;
  let value = input.startBalance ?? 0;
  let contributed = value;
  const points: GrowthPoint[] = [{ month: 0, contributed, value: Math.round(value) }];
  for (let month = 1; month <= Math.round(input.years * 12); month++) {
    value = value * (1 + r) + input.monthlySaving;
    contributed += input.monthlySaving;
    points.push({ month, contributed, value: Math.round(value) });
  }
  return points;
}

/** Rule of thumb, not a bank's real policy: total debt service ≤ 40% of income (DSR). */
export function maxInstallment(avgMonthlyIncome: number, existingDebtPerMonth: number): number {
  return Math.max(0, Math.round(avgMonthlyIncome * 0.4) - existingDebtPerMonth);
}

/** Split suggestion from real spending: keep what you actually spend (capped 50–70%), rest half emergency, half invest.
 * shortcut: fixed rule of thumb, no emergency-fund target tracking; replace with server-side plan when available. */
export function splitSalary(income: number, spend: number) {
  if (income <= 0) return null;
  const spendPct = Math.min(0.7, Math.max(0.5, Math.round((spend / income) * 20) / 20));
  const rest = 1 - spendPct;
  return { spendPct, emergencyPct: rest / 2, investPct: rest / 2 };
}

type M = { month: string; income: number; spend: number };
/** End-of-month estimate for today's month: daily spend rate so far when the month has data,
 * else the average of past months. Income = max(this month so far, past average). Satang. */
export function forecastMonth(months: M[], today: Date) {
  if (!months.length) return null;
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const cur = months.find((m) => m.month === ym);
  const past = months.filter((m) => m.month !== ym);
  const avg = (k: "income" | "spend") => (past.length ? Math.round(past.reduce((s, m) => s + m[k], 0) / past.length) : 0);
  if (!cur) return { month: ym, income: avg("income"), spend: avg("spend"), net: avg("income") - avg("spend"), basis: "average" as const };
  const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const spend = Math.round((cur.spend / today.getDate()) * days);
  const income = Math.max(cur.income, avg("income"));
  return { month: ym, income, spend, net: income - spend, basis: "daily" as const };
}

/** Employee social security per year: 5% of monthly wage, capped at 750 baht/month. Satang. */
export const ssYear = (monthlySalary: number) => Math.min(Math.round(monthlySalary * 0.05), 750_00) * 12;

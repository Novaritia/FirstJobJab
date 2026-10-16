/** Split suggestion from real spending: keep what you actually spend (capped 50–70%), rest half emergency, half invest.
 * shortcut: fixed rule of thumb, no emergency-fund target tracking; replace with server-side plan when available. */
export function splitSalary(income: number, spend: number) {
  if (income <= 0) return null;
  const spendPct = Math.min(0.7, Math.max(0.5, Math.round((spend / income) * 20) / 20));
  const rest = 1 - spendPct;
  return { spendPct, emergencyPct: rest / 2, investPct: rest / 2 };
}

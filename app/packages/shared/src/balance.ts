import type { BalanceCheckResult, ParsedStatement, RowCheck } from './contract';

/** Each row: previous printed balance ± amount must equal this row's printed balance. */
export function checkBalances(s: ParsedStatement): BalanceCheckResult {
  let prev = s.openingBalance;
  let sumIn = 0;
  let sumOut = 0;
  const rows: RowCheck[] = s.rows.map((r, index) => {
    const expectedBalance = prev + (r.direction === 'in' ? r.amount : -r.amount);
    if (r.direction === 'in') sumIn += r.amount; else sumOut += r.amount;
    prev = r.balance; // compare against printed balance so one bad row doesn't cascade forever
    return { index, ok: expectedBalance === r.balance, expectedBalance };
  });
  const totalsOk =
    s.openingBalance + sumIn - sumOut === s.closingBalance &&
    (s.rows.length === 0 || s.rows[s.rows.length - 1].balance === s.closingBalance) &&
    (s.totalIn === undefined || s.totalIn === sumIn) &&
    (s.totalOut === undefined || s.totalOut === sumOut);
  const okCount = rows.filter((r) => r.ok).length;
  return { rows, totalsOk, okCount, failCount: rows.length - okCount };
}

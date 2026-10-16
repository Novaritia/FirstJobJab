import type { BalanceCheckResult, ParsedStatement, RowCheck } from './contract';

/**
 * per_row: previous printed balance ± amount must equal this row's printed balance.
 * Without any row balance (wallet histories): totals mode if opening/closing or period totals exist, else none.
 */
export function checkBalances(s: ParsedStatement): BalanceCheckResult {
  const sumIn = s.rows.reduce((a, r) => a + (r.direction === 'in' ? r.amount : 0), 0);
  const sumOut = s.rows.reduce((a, r) => a + (r.direction === 'out' ? r.amount : 0), 0);
  const printedTotalsOk = (s.totalIn === undefined || s.totalIn === sumIn) && (s.totalOut === undefined || s.totalOut === sumOut);
  const hasEnds = s.openingBalance !== undefined && s.closingBalance !== undefined;
  const endsOk = !hasEnds || s.openingBalance! + sumIn - sumOut === s.closingBalance;

  if (s.rows.some((r) => r.balance !== undefined) && s.openingBalance !== undefined) {
    let prev = s.openingBalance;
    const rows: RowCheck[] = s.rows.map((r, index) => {
      const expectedBalance = prev + (r.direction === 'in' ? r.amount : -r.amount);
      prev = r.balance ?? expectedBalance; // compare against printed balance so one bad row doesn't cascade forever
      return { index, ok: expectedBalance === r.balance, expectedBalance };
    });
    const last = s.rows[s.rows.length - 1];
    const totalsOk = endsOk && printedTotalsOk && (s.closingBalance === undefined || !last || last.balance === s.closingBalance);
    const okCount = rows.filter((r) => r.ok).length;
    return { mode: 'per_row', rows, totalsOk, okCount, failCount: rows.length - okCount };
  }
  if (hasEnds || s.totalIn !== undefined || s.totalOut !== undefined) {
    const totalsOk = endsOk && printedTotalsOk;
    const rows = s.rows.map((_, index) => ({ index, ok: totalsOk }));
    return { mode: 'totals', rows, totalsOk, okCount: totalsOk ? rows.length : 0, failCount: totalsOk ? 0 : rows.length };
  }
  // nothing printed to check against: not failed, not verified
  return { mode: 'none', rows: s.rows.map((_, index) => ({ index, ok: false })), totalsOk: false, okCount: 0, failCount: 0 };
}

// Shared contract between packages/shared, apps/api and apps/web.
// Money is always integer satang (1 baht = 100) to avoid float errors.

export const BANKS = [
  'KBANK', 'BBL', 'SCB', 'KTB', 'BAY', 'TTB', 'GSB', 'UOB', 'CIMBT', 'KKP', 'LHB', 'BAAC', 'GHB', 'TISCO', 'ICBCT',
  'TRUEMONEY', 'SHOPEEPAY', 'LINEPAY', 'PAOTANG', // e-wallets: histories often have no running balance
  'OTHER',
] as const;
export const WALLETS: readonly Bank[] = ['TRUEMONEY', 'SHOPEEPAY', 'LINEPAY', 'PAOTANG'];
export type Bank = (typeof BANKS)[number];
/** Display names (Thai). */
export const BANK_NAMES: Record<Bank, string> = {
  KBANK: 'กสิกรไทย', BBL: 'กรุงเทพ', SCB: 'ไทยพาณิชย์', KTB: 'กรุงไทย', BAY: 'กรุงศรีอยุธยา', TTB: 'ทีทีบี', GSB: 'ออมสิน',
  UOB: 'ยูโอบี', CIMBT: 'ซีไอเอ็มบี ไทย', KKP: 'เกียรตินาคินภัทร', LHB: 'แลนด์ แอนด์ เฮ้าส์', BAAC: 'ธ.ก.ส.', GHB: 'ธอส.',
  TISCO: 'ทิสโก้', ICBCT: 'ไอซีบีซี (ไทย)',
  TRUEMONEY: 'TrueMoney Wallet', SHOPEEPAY: 'ShopeePay', LINEPAY: 'Rabbit LINE Pay', PAOTANG: 'เป๋าตัง', OTHER: 'บัญชี/วอลเล็ตอื่น',
};
export type Direction = 'in' | 'out';
export type Source = 'statement' | 'slip' | 'manual';

export const CATEGORIES = [
  'salary', 'other_income', 'food', 'transport', 'shopping', 'bills', 'rent',
  'health', 'entertainment', 'education', 'family', 'savings_invest',
  'insurance', 'debt', 'own_transfer', 'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface ParsedRow {
  date: string;            // YYYY-MM-DD
  time?: string;           // HH:mm
  description: string;
  channel?: string;
  amount: number;          // satang, always positive
  direction: Direction;
  balance?: number;        // satang, balance after this row; wallets often don't print one
}

export interface ParsedStatement {
  bank: Bank;
  accountNoMasked: string; // e.g. xxx-x-x1234-x
  accountName: string;
  periodStart: string;     // YYYY-MM-DD
  periodEnd: string;
  openingBalance?: number; // satang; may be missing on wallet histories
  closingBalance?: number;
  totalIn?: number;        // from statement summary, if printed
  totalOut?: number;
  rows: ParsedRow[];
}

export interface RowCheck { index: number; ok: boolean; expectedBalance?: number }
/** per_row: every row checked against its printed balance. totals: no row balances, but opening/closing or period
 *  totals reconcile the sum (rows ok only if it does). none: nothing to check against — rows are unverified (✋),
 *  confirm needs explicit acceptUnverified. */
export type CheckMode = 'per_row' | 'totals' | 'none';
export interface BalanceCheckResult {
  mode: CheckMode;
  rows: RowCheck[];
  totalsOk: boolean;       // sums match summary + closing balance (false in mode none)
  okCount: number;
  failCount: number;
}

export interface TaxInput {
  year: number;
  salaryIncome: number;          // satang, 40(1)
  otherIncome?: number;          // satang, treated as 40(8) at 60% expense for MVP
  socialSecurity: number;        // satang paid in the year
  providentFund?: number;
  lifeInsurance?: number;
  thaiEsg?: number;
}
export interface TaxBracketLine { from: number; to: number | null; rate: number; tax: number }
export interface TaxResult {
  grossIncome: number;
  expenseDeduction: number;
  allowances: number;
  netIncome: number;
  tax: number;
  brackets: TaxBracketLine[];
  monthlySalaryWhereTaxStarts: number; // satang/month for salary-only earner
}

export interface GrowthInput {
  monthlySaving: number;   // satang
  annualReturn: number;    // e.g. 0.05
  years: number;
  startBalance?: number;
}
export interface GrowthPoint { month: number; contributed: number; value: number }

export interface MonthSummary {
  month: string;           // YYYY-MM
  income: number;
  spend: number;
  net: number;
  byCategory: Partial<Record<Category, number>>;
}

export interface TxLike {
  id: string;
  accountId: string;
  date: string;
  time?: string;
  amount: number;
  direction: Direction;
  category?: Category;
}

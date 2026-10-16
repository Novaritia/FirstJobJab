import { Injectable } from '@nestjs/common';
import {
  detectOwnTransfers, estimateTax, maxInstallment, summarizeMonths,
  type Category, type Direction, type MonthSummary, type TxLike,
} from '@fjm/shared';
import { PrismaService } from './prisma.service.js';
import { polishThai } from './llm.js';

export const CATEGORY_TH: Record<Category, string> = {
  salary: 'เงินเดือน', other_income: 'รายได้อื่น', food: 'อาหาร', transport: 'เดินทาง', shopping: 'ช้อปปิ้ง',
  bills: 'ค่าบิล', rent: 'ค่าเช่า', health: 'สุขภาพ', entertainment: 'บันเทิง', education: 'การศึกษา', family: 'ครอบครัว',
  savings_invest: 'ออม/ลงทุน', insurance: 'ประกัน', debt: 'หนี้', own_transfer: 'โอนระหว่างบัญชีตัวเอง', other: 'อื่นๆ',
};

const LOAN_MONTHS = 6;
/** shortcut: assumes banks keep e-statements ~12 months (unverified per bank); gaps older than 10 months are "expiring soon". */
const EXPIRING_AGE = 10;

export const todayIct = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
export const addMonths = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
const monthDiff = (a: string, b: string) => {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (ay - by) * 12 + (am - bm);
};
export const baht = (satang: number) => Math.round(satang / 100).toLocaleString('en-US');

export interface Streak { current: number; best: number; months: { month: string; covered: boolean }[]; missing: string[]; expiringSoon: string[] }

/** Pure streak calc, exported for tests. `covered` = YYYY-MM months with a confirmed statement. */
export function computeStreak(covered: Set<string>, nowMonth: string): Streak {
  const lastFull = addMonths(nowMonth, -1);
  const sorted = [...covered].sort();
  let start = addMonths(lastFull, -(LOAN_MONTHS - 1));
  let end = lastFull;
  if (sorted.length && sorted[0] < start) start = sorted[0];
  if (sorted.length && sorted[sorted.length - 1] > end) end = sorted[sorted.length - 1];
  const months: Streak['months'] = [];
  for (let m = start; m <= end; m = addMonths(m, 1)) months.push({ month: m, covered: covered.has(m) });

  let best = 0;
  let run = 0;
  for (const m of months) {
    run = m.covered ? run + 1 : 0;
    best = Math.max(best, run);
  }
  // current = consecutive run ending at the latest covered month
  let current = 0;
  const lastIdx = months.map((m) => m.covered).lastIndexOf(true);
  for (let i = lastIdx; i >= 0 && months[i].covered; i--) current++;

  const missing = months.filter((m) => !m.covered && m.month <= lastFull).map((m) => m.month);
  const expiringSoon = missing.filter((m) => monthDiff(nowMonth, m) >= EXPIRING_AGE);
  return { current, best, months, missing, expiringSoon };
}

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async streak(userId: string): Promise<Streak> {
    const ups = await this.prisma.upload.findMany({ where: { userId, status: 'confirmed' }, select: { periodStart: true, periodEnd: true } });
    const covered = new Set<string>();
    for (const u of ups) for (let m = u.periodStart.slice(0, 7); m <= u.periodEnd.slice(0, 7); m = addMonths(m, 1)) covered.add(m);
    return computeStreak(covered, todayIct().slice(0, 7));
  }

  /** Visible rows as TxLike. statementOnly = original statement values (loan summary rule). */
  async txLikes(userId: string, opts: { from?: string; to?: string; statementOnly?: boolean } = {}): Promise<TxLike[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId, hidden: false, date: { gte: opts.from, lte: opts.to },
        ...(opts.statementOnly ? { source: 'statement', verified: true } : {}),
      },
      select: { id: true, accountId: true, date: true, time: true, amount: true, direction: true, category: true },
    });
    return rows.map((r) => ({ ...r, time: r.time ?? undefined, direction: r.direction as Direction, category: r.category as Category }));
  }

  /** Re-run own-transfer detection over all rows; matched pairs become category own_transfer. */
  async markOwnTransfers(userId: string) {
    const rows = await this.prisma.transaction.findMany({
      where: { userId, hidden: false },
      select: { id: true, accountId: true, date: true, time: true, amount: true, direction: true, category: true },
    });
    const txs = rows.map((r) => ({ ...r, time: r.time ?? undefined, direction: r.direction as Direction, category: r.category as Category }));
    const ids = detectOwnTransfers(txs).flat();
    if (ids.length) await this.prisma.transaction.updateMany({ where: { userId, id: { in: ids }, category: { not: 'own_transfer' } }, data: { category: 'own_transfer' } });
  }

  private async monthSummaries(userId: string, statementOnly = false): Promise<MonthSummary[]> {
    const txs = (await this.txLikes(userId, { statementOnly })).filter((t) => t.category !== 'own_transfer');
    return summarizeMonths(txs).sort((a, b) => a.month.localeCompare(b.month));
  }

  async summary(userId: string, n: number) {
    const months = (await this.monthSummaries(userId)).slice(-n);
    const totals: Partial<Record<Category, number>> = {};
    for (const m of months) for (const [c, v] of Object.entries(m.byCategory)) totals[c as Category] = (totals[c as Category] ?? 0) + (v ?? 0);
    const topSpend = Object.entries(totals)
      .filter(([c]) => c !== 'own_transfer' && c !== 'salary' && c !== 'other_income')
      .map(([category, amount]) => ({ category: category as Category, amount: amount as number }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    return { months, topSpend, text: await this.summaryText(months, topSpend) };
  }

  private async summaryText(months: MonthSummary[], top: { category: Category; amount: number }[]) {
    if (!months.length) return 'ยังไม่มีข้อมูล ลองอัปโหลด statement เดือนล่าสุดก่อนนะ';
    const k = months.length;
    const avg = (f: (m: MonthSummary) => number) => months.reduce((s, m) => s + f(m), 0) / k;
    const inc = avg((m) => m.income);
    const sp = avg((m) => m.spend);
    let t = `ช่วง ${k} เดือนล่าสุด รายรับเฉลี่ย ${baht(inc)} บาท/เดือน ใช้จ่ายเฉลี่ย ${baht(sp)} บาท/เดือน `;
    t += inc - sp >= 0 ? `เหลือเก็บเฉลี่ย ${baht(inc - sp)} บาท/เดือน` : `ใช้เกินรายรับเฉลี่ย ${baht(sp - inc)} บาท/เดือน`;
    if (top[0]) t += ` จ่ายมากที่สุดคือ${CATEGORY_TH[top[0].category]} ${baht(top[0].amount / k)} บาท/เดือน`;
    if (inc > 0 && top[0]) t += ` (${Math.round((top[0].amount / k / inc) * 100)}% ของรายรับ)`;
    return (await polishThai(t)) ?? t;
  }

  async tax(userId: string, year: number) {
    const rows = await this.prisma.transaction.findMany({
      where: { userId, hidden: false, direction: 'in', category: { in: ['salary', 'other_income'] }, date: { gte: `${year}-01-01`, lte: `${year}-12-31` } },
      select: { date: true, amount: true, category: true },
    });
    const salaryByMonth = new Map<string, number>();
    let other = 0;
    for (const r of rows) {
      if (r.category === 'salary') salaryByMonth.set(r.date.slice(0, 7), (salaryByMonth.get(r.date.slice(0, 7)) ?? 0) + r.amount);
      else other += r.amount;
    }
    const n = salaryByMonth.size;
    const avgSalary = n ? [...salaryByMonth.values()].reduce((a, b) => a + b, 0) / n : 0;
    // Annualise: we usually see only a few months of the year. Social security: 5% of wage, capped at 875 ฿/month (17,500 ฿ wage ceiling from 2026).
    // Statement shows take-home pay (after SS), so gross it back up: net = gross − min(5% gross, cap).
    const gross = Math.min(avgSalary / 0.95, avgSalary + 87_500);
    const ssMonthly = Math.round(gross - avgSalary);
    return estimateTax({
      year,
      salaryIncome: Math.round(gross * 12),
      otherIncome: Math.round(n ? (other / n) * 12 : other),
      socialSecurity: ssMonthly * 12,
    });
  }

  async loanReady(userId: string) {
    const streak = await this.streak(userId);
    const months = (await this.monthSummaries(userId, true)).slice(-LOAN_MONTHS);
    const k = months.length || 1;
    const avgIncome = Math.round(months.reduce((s, m) => s + m.income, 0) / k);
    const avgSpend = Math.round(months.reduce((s, m) => s + m.spend, 0) / k);
    const avgDebt = Math.round(months.reduce((s, m) => s + (m.byCategory.debt ?? 0), 0) / k);
    return { continuousMonths: streak.current, required: LOAN_MONTHS, avgIncome, avgSpend, maxInstallment: maxInstallment(avgIncome, avgDebt) };
  }

  /** Last 7 days ending at the latest row (mock statements are in the past, so "today" would often be empty). */
  async weeklyText(userId: string) {
    const last = await this.prisma.transaction.findFirst({ where: { userId, hidden: false }, orderBy: { date: 'desc' }, select: { date: true } });
    if (!last) return 'สัปดาห์นี้ยังไม่มีรายการ ลองอัปโหลด statement ล่าสุดนะ';
    const to = last.date;
    const from = new Date(Date.parse(to) - 6 * 86400_000).toISOString().slice(0, 10);
    const txs = (await this.txLikes(userId, { from, to })).filter((t) => t.category !== 'own_transfer');
    const spend = txs.filter((t) => t.direction === 'out');
    const income = txs.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0);
    const byCat = new Map<Category, number>();
    for (const t of spend) byCat.set(t.category ?? 'other', (byCat.get(t.category ?? 'other') ?? 0) + t.amount);
    const top = [...byCat].sort((a, b) => b[1] - a[1])[0];
    let t = `สรุป 7 วันล่าสุด ใช้จ่ายไป ${baht(spend.reduce((s, x) => s + x.amount, 0))} บาท ${spend.length} รายการ`;
    if (income) t += ` มีเงินเข้า ${baht(income)} บาท`;
    if (top) t += ` ใช้กับ${CATEGORY_TH[top[0]]}มากที่สุด ${baht(top[1])} บาท`;
    return (await polishThai(t)) ?? t;
  }
}

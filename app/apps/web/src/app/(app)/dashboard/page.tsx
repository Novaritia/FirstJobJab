"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Calculator, CircleCheck, FileSearch, Hand, PartyPopper, PiggyBank, Landmark, TriangleAlert, Upload } from "lucide-react";
import type { Category, MonthSummary } from "@fjm/shared";
import type { Streak, Summary, Tx } from "@/lib/api";
import { CATEGORY_LABEL, baht, dateLabel, monthLabel } from "@/lib/format";
import { CategoryLabel } from "@/lib/category-icons";
import { OTHER_COLOR, chartColor } from "@/lib/chart";
import { ButtonLink, Card, ErrorNote, cx, useApi } from "@/components/ui";
import { useUser } from "@/components/user";
import { VoiceSummary } from "@/components/VoiceSummary";
import { Flame, LiveDot, Money, Stagger } from "@/components/motion";
import { StreakTrack } from "@/components/StreakTrack";

// recharts loads after the streak hero and KPI tiles have painted
const ChartSkel = ({ round }: { round?: boolean }) =>
  <span aria-hidden className={cx("skeleton block", round ? "mx-auto aspect-square w-full max-w-56 rounded-full" : "h-64 rounded-md sm:h-72")} />;
const Donut = dynamic(() => import("@/components/charts").then((m) => m.Donut), { ssr: false, loading: () => <ChartSkel round /> });
const TrendChart = dynamic(() => import("@/components/charts").then((m) => m.TrendChart), { ssr: false, loading: () => <ChartSkel /> });

const NOT_SPEND: Category[] = ["salary", "other_income", "own_transfer"];
const short = (ym: string) => monthLabel(ym).split(" ")[0];
const pct = (v: number, of: number) => (of > 0 ? Math.round((v / of) * 100) : 0);
const plain = (c: Category) => CATEGORY_LABEL[c];

type Row = { name: string; value: number; color: string; cat?: Category };

export default function Dashboard() {
  const user = useUser();
  const streak = useApi<Streak>("/streak");
  const summary = useApi<Summary>("/insights/summary?months=6");
  const txs = useApi<{ transactions: Tx[] }>("/transactions?limit=200");
  const uploads = useApi<{ uploads: { status: string }[] }>("/uploads");
  const [today] = useState(() => new Date()); // client-only: this view renders after data loads
  const [pick, setPick] = useState<number | null>(null);

  if (streak.loading || summary.loading) return <DashboardSkeleton />;
  if (summary.error) return <ErrorNote>{summary.error}</ErrorNote>;
  const s = summary.data!;
  const st = streak.data;
  const hello = <Greeting name={user?.displayName} />;

  if (!s.months.length) return <div className="flex flex-col gap-6">{hello}<Onboarding /></div>;

  const months = s.months;
  const i = pick ?? months.length - 1;
  const month = months[i];
  const prev = months[i - 1];

  // colour follows the category, not its rank: the 5 biggest over all months keep colours 1–5, the rest fold into "อื่น ๆ"
  const totals = new Map<Category, number>();
  for (const m of months) for (const [c, v] of Object.entries(m.byCategory) as [Category, number][])
    if (!NOT_SPEND.includes(c) && c !== "other") totals.set(c, (totals.get(c) ?? 0) + (v ?? 0));
  const palette = new Map([...totals].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c], n) => [c, chartColor(n + 1)]));

  return (
    <Stagger className="flex flex-col gap-8">
      {hello}
      {st && <StreakHero st={st} today={today} />}

      <div className="grid gap-8 lg:grid-cols-2">
        <SpendSection month={month} palette={palette}
          switcher={<MonthSwitch months={months} i={i} onPick={setPick} />} />
        <FlowSection month={month} prev={prev} txs={txs.data?.transactions} />
      </div>

      <Section id="trend" title={`แนวโน้ม ${months.length} เดือน`} sub="แท่งฟ้าคือเงินเข้า แท่งส้มคือเงินออก เส้นคือเงินที่เหลือในแต่ละเดือน">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <TrendChart data={months.map((m) => ({ month: short(m.month), income: m.income, spend: m.spend, net: m.net }))} />
            <TrendTable months={months} />
          </Card>
          <div className="flex flex-col gap-6">
            <Card title="สรุปเป็นคำพูด"><p className="leading-relaxed">{s.text}</p></Card>
            <VoiceSummary />
          </div>
        </div>
      </Section>

      <NextSteps st={st} pending={uploads.data?.uploads.filter((u) => u.status === "pending").length ?? 0} />
    </Stagger>
  );
}

function Greeting({ name }: { name?: string }) {
  return (
    <header className="border-b border-line pb-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold">สวัสดี {name ?? ""} <Hand aria-hidden size={22} className="text-muted" /></h1>
      <p className="mt-0.5 text-muted"><LiveDot />หน้านี้สรุปเงินของคุณจาก statement ที่อัปโหลด อ่านจากบนลงล่างได้เลย</p>
    </header>
  );
}

/** Numbered section: a plain-language heading plus one line saying what the reader is looking at. */
function Section({ id, title, sub, action, children }: { id: string; title: string; sub: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-t`} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 id={`${id}-t`} className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted">{sub}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** 1. The hook: streak first. Current run, the month due with its deadline, progress to loan-ready, one-tap upload. */
function StreakHero({ st, today }: { st: Streak; today: Date }) {
  const track = st.months.slice(-6);
  const last = track.at(-1);
  const due = last && !last.covered ? track.length - 1 : undefined;
  const daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate() + 1;
  const older = st.missing.filter((m) => m !== last?.month);
  const run = Math.min(st.current, 6);
  const ready = run >= 6;
  return (
    <section data-rise aria-labelledby="streak-t" className="grid gap-5 rounded-md border-2 border-primary/30 bg-surface p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center lg:gap-8">
      <div className="flex flex-col gap-3">
        <h2 id="streak-t" className="inline-flex items-center gap-1 text-sm font-semibold text-muted"><Flame /> สตรีคอัปโหลดรายเดือน</h2>
        <p className="flex items-baseline gap-2">
          <span className="text-4xl"><Flame /></span>
          <span className="num text-4xl font-bold">{st.current}<span className="text-xl font-medium text-muted">/6</span></span>
          <span className="font-medium">เดือนติดกัน</span>
        </p>
        <p className="text-sm text-muted">อัปโหลด statement ทุกเดือนให้ครบ 6 เดือนติดกัน ธนาคารจะเห็นรายได้สม่ำเสมอ ใช้ยื่นกู้ได้</p>
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="inline-flex items-center gap-1 font-medium">{ready ? <>พร้อมยื่นกู้แล้ว <CircleCheck aria-hidden size={16} className="text-success" /></> : `อีก ${6 - run} เดือน พร้อมยื่นกู้`}</span>
            <span className="num text-muted">{run}/6</span>
          </div>
          <div role="progressbar" aria-label="ความพร้อมยื่นกู้" aria-valuemin={0} aria-valuemax={6} aria-valuenow={run} className="h-2 overflow-hidden rounded-sm bg-subtle">
            <span className="block h-full rounded-sm bg-primary transition-[width] duration-700" style={{ width: `${(run / 6) * 100}%` }} />
          </div>
          {st.best > st.current && <p className="mt-1 text-xs text-muted">สถิติสูงสุดของคุณ {st.best} เดือน</p>}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <StreakTrack months={track.map((m) => ({ label: short(m.month), covered: m.covered }))} due={due} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className={cx("font-semibold", due !== undefined && daysLeft <= 7 ? "text-warning" : "text-text")}>
              {due !== undefined
                ? <>อัปโหลดเดือนนี้: statement {short(last!.month)} · เหลือ <span className="num">{daysLeft}</span> วัน</>
                : <span className="inline-flex items-center gap-1">เดือนนี้ส่งแล้ว <PartyPopper aria-hidden size={16} className="text-success" /> เดือนถัดไปอัปโหลดได้ต้นเดือนหน้า</span>}
            </p>
            {older.length > 0 && <p className="mt-0.5 flex items-start gap-1 text-xs text-warning"><TriangleAlert aria-hidden size={14} className="mt-px shrink-0" /><span>ยังขาด {older.map(monthLabel).join(", ")}{st.expiringSoon.length > 0 && " ใกล้หมดอายุที่ธนาคาร"}</span></p>}
          </div>
          <ButtonLink href="/upload" className="shrink-0 max-sm:w-full lg:min-h-11"><Upload aria-hidden size={16} /> อัปโหลด statement</ButtonLink>
        </div>
      </div>
    </section>
  );
}

function MonthSwitch({ months, i, onPick }: { months: MonthSummary[]; i: number; onPick: (i: number) => void }) {
  const arrow = "grid size-11 place-items-center rounded text-muted transition-colors duration-150 hover:bg-subtle hover:text-text disabled:opacity-30 lg:size-9";
  return (
    <div className="flex items-center rounded-md border border-line bg-surface">
      <button type="button" className={arrow} disabled={i === 0} onClick={() => onPick(i - 1)} aria-label="เดือนก่อน"><ChevronLeft size={18} aria-hidden /></button>
      <span className="min-w-20 text-center text-sm font-medium" aria-live="polite">{monthLabel(months[i].month)}</span>
      <button type="button" className={arrow} disabled={i === months.length - 1} onClick={() => onPick(i + 1)} aria-label="เดือนถัดไป"><ChevronRight size={18} aria-hidden /></button>
    </div>
  );
}

/** Legend that is also the accessible table behind the donut: swatch, name, baht, share. */
function Legend({ rows, total, caption }: { rows: Row[]; total: number; caption: string }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only"><tr><th>รายการ</th><th>จำนวน</th><th>สัดส่วน</th></tr></thead>
      <tbody className="divide-y divide-line">
        {rows.map((r) => (
          <tr key={r.name}>
            <th scope="row" className="py-1.5 pr-2 text-left font-normal">
              <span aria-hidden className="mr-2 inline-block size-2.5 rounded-sm align-middle" style={{ background: r.color }} />{r.cat ? <CategoryLabel category={r.cat} label={r.name} className="align-middle" /> : r.name}
            </th>
            <td className="num py-1.5 text-right font-medium whitespace-nowrap">{baht(r.value, 0)}</td>
            <td className="num w-12 py-1.5 pl-2 text-right text-muted">{pct(r.value, total)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** 2. Where the money went: spend by category for the picked month. */
function SpendSection({ month, palette, switcher }: { month: MonthSummary; palette: Map<Category, string>; switcher: ReactNode }) {
  const cats = (Object.entries(month.byCategory) as [Category, number][])
    .filter(([c, v]) => !NOT_SPEND.includes(c) && v > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = cats.reduce((a, [, v]) => a + v, 0);
  const rows: Row[] = cats.filter(([c]) => palette.has(c)).map(([c, v]) => ({ name: CATEGORY_LABEL[c], value: v, color: palette.get(c)!, cat: c }));
  const rest = cats.filter(([c]) => !palette.has(c)).reduce((a, [, v]) => a + v, 0);
  if (rest > 0) rows.push({ name: "อื่น ๆ", value: rest, color: OTHER_COLOR, cat: "other" });
  const top = cats.slice(0, 3);
  return (
    <Section id="spend" title="เดือนนี้เงินไปไหน" sub="วงกลมแบ่งรายจ่ายตามหมวด ยิ่งชิ้นใหญ่ยิ่งใช้เยอะ" action={switcher}>
      <Card className="flex h-full flex-col gap-4">
        {total === 0 ? <p className="text-muted">เดือนนี้ยังไม่มีรายจ่าย</p> : (
          <>
            <p className="font-medium">
              {plain(top[0][0])} <span className="num">{pct(top[0][1], total)}%</span> มากสุด
              {top.length > 1 && <span className="text-muted"> · รองลงมา {top.slice(1).map(([c, v]) => `${plain(c)} ${pct(v, total)}%`).join(" · ")}</span>}
            </p>
            <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
              <Donut data={rows} centre={baht(total, 0)} centreLabel="ใช้ไปทั้งหมด" label={`รายจ่าย ${monthLabel(month.month)} แยกตามหมวด`} />
              <Legend rows={rows} total={total} caption={`รายจ่าย ${monthLabel(month.month)} แยกตามหมวด`} />
            </div>
            <Link href="/transactions" className="mt-auto text-sm font-medium text-primary hover:underline">ดูรายการทั้งหมด →</Link>
          </>
        )}
      </Card>
    </Section>
  );
}

/** Latest known balance per account (transactions come newest first). */
function balanceOf(txs: Tx[]) {
  const seen = new Map<string, Tx>();
  for (const t of txs) if (t.balance != null && !seen.has(t.accountId)) seen.set(t.accountId, t);
  const list = [...seen.values()];
  return list.length ? { total: list.reduce((a, t) => a + t.balance!, 0), accounts: list.length, asOf: list.map((t) => t.date).sort().at(-1)! } : null;
}

/** 3. In – out – left: how this month's income was split, plus KPI tiles with month-over-month change. */
function FlowSection({ month, prev, txs }: { month: MonthSummary; prev?: MonthSummary; txs?: Tx[] }) {
  const saved = Math.min(month.byCategory.savings_invest ?? 0, month.spend);
  const spentOnly = month.spend - saved;
  const left = Math.max(month.net, 0);
  const rows: Row[] = [
    { name: "ใช้จ่าย", value: spentOnly, color: chartColor(3) },
    { name: "เก็บ / ลงทุน", value: saved, color: chartColor(2) },
    { name: "คงเหลือ", value: left, color: chartColor(5) },
  ].filter((r) => r.value > 0);
  const base = rows.reduce((a, r) => a + r.value, 0);
  const bal = txs ? balanceOf(txs) : null;
  return (
    <Section id="flow" title="เงินเข้า–ออก–คงเหลือ" sub={`รายรับ ${monthLabel(month.month)} ถูกแบ่งไปใช้ เก็บ และเหลือเท่าไร`}>
      <Card className="flex h-full flex-col gap-5">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line [&>div]:bg-surface">
          <Kpi label="รายรับ" value={month.income} prev={prev?.income} good="up" />
          <Kpi label="รายจ่าย" value={month.spend} prev={prev?.spend} good="down" />
          <Kpi label="เหลือเก็บ" value={month.net} prev={prev?.net} good="up" tone={month.net < 0 ? "text-danger" : "text-primary"} />
          <div className="px-4 py-3">
            <dt className="text-sm text-muted">ยอดคงเหลือรวม</dt>
            <dd className="mt-0.5 text-lg font-semibold sm:text-xl">{bal ? <Money value={bal.total} digits={0} /> : "–"}</dd>
            <dd className="mt-0.5 text-xs text-muted">{bal ? `${bal.accounts} บัญชี ณ ${dateLabel(bal.asOf)}` : "ยังไม่มียอดในบัญชี"}</dd>
          </div>
        </dl>
        {base > 0 && (
          <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
            <Donut data={rows} centre={`${pct(month.spend, month.income)}%`} centreLabel="ใช้ไปของรายรับ" label={`การแบ่งรายรับ ${monthLabel(month.month)}`} />
            <div className="flex flex-col gap-2">
              <Legend rows={rows} total={base} caption={`การแบ่งรายรับ ${monthLabel(month.month)}`} />
              {month.net < 0 && <p className="flex items-center gap-1 text-sm font-medium text-danger"><TriangleAlert aria-hidden size={16} className="shrink-0" />ใช้เกินรายรับ {baht(-month.net, 0)} เดือนนี้</p>}
            </div>
          </div>
        )}
      </Card>
    </Section>
  );
}

/** KPI tile; the delta says better/worse in words, colour only backs it up. */
function Kpi({ label, value, prev, good, tone = "text-text" }: { label: string; value: number; prev?: number; good: "up" | "down"; tone?: string }) {
  const d = prev === undefined ? 0 : value - prev;
  const better = good === "up" ? d > 0 : d < 0;
  return (
    <div className="px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={cx("mt-0.5 text-lg font-semibold sm:text-xl", tone)}><Money value={value} digits={0} /></dd>
      {prev !== undefined && (
        <dd className={cx("num mt-0.5 text-xs font-medium", d === 0 ? "text-muted" : better ? "text-success" : "text-danger")}>
          {d === 0 ? "เท่าเดือนก่อน" : `${d > 0 ? "↑" : "↓"} ${baht(Math.abs(d), 0)} ${better ? "ดีขึ้น" : "แย่ลง"}`}
        </dd>
      )}
    </div>
  );
}

/** The numbers behind the trend chart, for screen readers and anyone who wants exact figures. */
function TrendTable({ months }: { months: MonthSummary[] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-primary">ดูเป็นตาราง</summary>
      <table className="mt-2 w-full">
        <thead className="text-left text-muted">
          <tr><th scope="col" className="py-1.5 font-medium">เดือน</th><th scope="col" className="py-1.5 text-right font-medium">รายรับ</th><th scope="col" className="py-1.5 text-right font-medium">รายจ่าย</th><th scope="col" className="py-1.5 text-right font-medium">เหลือ</th></tr>
        </thead>
        <tbody className="num divide-y divide-line">
          {months.map((m) => (
            <tr key={m.month}>
              <th scope="row" className="py-1.5 text-left font-medium">{monthLabel(m.month)}</th>
              <td className="py-1.5 text-right">{baht(m.income, 0)}</td>
              <td className="py-1.5 text-right">{baht(m.spend, 0)}</td>
              <td className={cx("py-1.5 text-right font-semibold", m.net < 0 ? "text-danger" : "text-success")}>{baht(m.net, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** 5. What to do next. */
function NextSteps({ st, pending }: { st?: Streak; pending: number }) {
  const steps = [
    pending > 0
      ? { href: "/upload", icon: FileSearch, title: "ตรวจแถวที่ไม่ตรง", text: `มี ${pending} ไฟล์รอตรวจก่อนนำเข้า`, urgent: true }
      : { href: "/transactions", icon: FileSearch, title: "ตรวจรายการ", text: "เช็กว่าหมวดของแต่ละรายการถูกต้อง", urgent: false },
    { href: "/tax", icon: Calculator, title: "ภาษีโดยประมาณ", text: "ดูว่าปีนี้ต้องจ่ายภาษีเท่าไร", urgent: false },
    { href: "/plan", icon: PiggyBank, title: "แผนเก็บเงิน", text: "ลองว่าออมเดือนละเท่าไร แล้วเงินจะโตแค่ไหน", urgent: false },
    { href: "/loan-ready", icon: Landmark, title: "พร้อมกู้", text: st && st.current >= 6 ? "ครบ 6 เดือนแล้ว ดูวงเงินที่ผ่อนไหว" : `ส่งครบแล้ว ${st?.current ?? 0}/6 เดือน`, urgent: false },
  ];
  return (
    <Section id="next" title="ทำต่อ" sub="ขั้นต่อไปที่ช่วยให้เงินของคุณชัดขึ้น">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((t) => (
          <li key={t.href} data-rise>
            <Link href={t.href} className="group flex h-full items-start gap-3 rounded-md border border-line bg-surface p-4 transition-colors duration-150 hover:border-primary/40 hover:bg-subtle">
              <t.icon aria-hidden size={20} className="mt-0.5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t.urgent && <span className="mr-1.5 text-warning">ด่วน</span>}{t.title}</span>
                <span className="block text-sm text-muted">{t.text}</span>
              </span>
              <ChevronRight aria-hidden size={16} className="mt-1 shrink-0 text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transform-none" />
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** New user: three steps and one button, never empty charts. */
function Onboarding() {
  const steps = [
    { t: "อัปโหลด statement", d: "ไฟล์ PDF จากแอปธนาคาร (KBank, กรุงเทพ) ย้อนหลัง 3–6 เดือน" },
    { t: "ตรวจรายการ", d: "เราอ่านให้และเช็กยอดทุกแถว แถวไหนไม่ตรงจะบอกให้แก้" },
    { t: "ดูแผน", d: "เห็นว่าเงินเดือนไปไหน เหลือเก็บเท่าไร และอีกกี่เดือนพร้อมยื่นกู้" },
  ];
  return (
    <Card className="mx-auto w-full max-w-2xl p-6 sm:p-8">
      <h2 className="text-xl font-semibold">เริ่มใช้ใน 3 ขั้น</h2>
      <p className="mt-1 text-muted">ยังไม่มีข้อมูล อัปโหลด statement ไฟล์แรกแล้วหน้านี้จะมีกราฟสรุปเงินของคุณ และเริ่มนับสตรีค <Flame /></p>
      <ol className="mt-5 flex flex-col gap-4">
        {steps.map((s, n) => (
          <li key={s.t} className="flex gap-3">
            <span className="num grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-primary">{n + 1}</span>
            <span><span className="block font-semibold">{s.t}</span><span className="block text-sm text-muted">{s.d}</span></span>
          </li>
        ))}
      </ol>
      <ButtonLink href="/upload" className="mt-6 max-sm:w-full"><Upload aria-hidden size={16} /> อัปโหลด statement ไฟล์แรก</ButtonLink>
    </Card>
  );
}

/** Skeleton in the page's own shape so nothing jumps when data lands. */
function DashboardSkeleton() {
  const bar = (w: string, h = "h-3") => <span aria-hidden className={cx("skeleton block rounded-sm", h)} style={{ width: w }} />;
  return (
    <div role="status" className="flex flex-col gap-8">
      <span className="sr-only">กำลังโหลด…</span>
      <div className="flex flex-col gap-2 border-b border-line pb-4">{bar("40%", "h-6")}{bar("70%")}</div>
      <div className="grid gap-5 rounded-md border-2 border-line bg-surface p-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">{bar("30%")}{bar("50%", "h-10")}{bar("90%")}{bar("100%", "h-2")}</div>
        <div className="grid grid-cols-6 gap-1.5">{Array.from({ length: 6 }, (_, k) => <span key={k} aria-hidden className="skeleton h-11 rounded" />)}</div>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        {[0, 1].map((k) => (
          <div key={k} className="flex flex-col gap-3">
            {bar("45%", "h-5")}
            <div className="grid items-center gap-5 rounded-md border border-line bg-surface p-5 sm:grid-cols-2">
              <ChartSkel round />
              <div className="flex flex-col gap-3">{bar("100%")}{bar("85%")}{bar("70%")}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-line bg-surface p-5"><ChartSkel /></div>
    </div>
  );
}

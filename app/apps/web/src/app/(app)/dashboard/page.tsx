"use client";
import Link from "next/link";
import { FileUp, House, Landmark, List, ReceiptText, TrendingUp } from "lucide-react";
import type { Category } from "@fjm/shared";
import type { Streak, Summary } from "@/lib/api";
import { CATEGORY_LABEL, baht, monthLabel } from "@/lib/format";
import { ButtonLink, Card, ErrorNote, Loading, useApi } from "@/components/ui";
import { useUser } from "@/components/user";
import { CategoryBars } from "@/components/charts";
import { VoiceSummary } from "@/components/VoiceSummary";

export default function Dashboard() {
  const user = useUser();
  const streak = useApi<Streak>("/streak");
  const summary = useApi<Summary>("/insights/summary?months=3");

  if (streak.loading || summary.loading) return <Loading />;
  if (summary.error) return <ErrorNote>{summary.error}</ErrorNote>;
  const s = summary.data!;
  const st = streak.data;
  const month = s.months.at(-1);

  if (!month) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <FileUp aria-hidden size={48} className="mx-auto text-primary" />
        <h1 className="mt-3 text-2xl font-bold">สวัสดี {user?.displayName} 👋</h1>
        <p className="mt-2 text-muted">ยังไม่มีข้อมูล อัปโหลด statement 3–6 เดือนล่าสุด แล้วเราจะสรุปให้ว่าเงินเดือนไปไหน</p>
        <ButtonLink href="/upload" className="mt-6">อัปโหลด statement</ButtonLink>
      </Card>
    );
  }

  const cats = Object.entries(month.byCategory)
    .map(([c, v]) => ({ name: CATEGORY_LABEL[c as Category] ?? c, value: v ?? 0 }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold sm:text-3xl">สวัสดี {user?.displayName} 👋</h1>

      {st && st.missing.length > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-warning-bg p-4 text-warning">
          <p className="font-semibold">
            ⚠️ ยังขาด statement เดือน {st.missing.map(monthLabel).join(", ")}
            {st.expiringSoon.length > 0 && <> — {st.expiringSoon.every((m) => st.missing.includes(m)) ? "" : `${st.expiringSoon.map(monthLabel).join(", ")} `}ใกล้หมดอายุที่ธนาคาร รีบขอก่อนหาย</>}
          </p>
          <ButtonLink href="/upload">อัปโหลดเดือนที่ขาด</ButtonLink>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {/* column 1: money */}
        <div className="flex flex-col gap-5">
          <section className="glass-hero rounded-3xl p-6" aria-labelledby="net-t">
            <p id="net-t" className="text-sm opacity-90">เหลือเก็บ {monthLabel(month.month)}</p>
            <p className="num mt-1 font-display text-4xl font-bold sm:text-5xl">{baht(month.net)}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/15 p-3">
                <dt className="text-sm opacity-90">⬇️ เงินเข้า</dt>
                <dd className="num text-lg font-semibold">{baht(month.income, 0)}</dd>
              </div>
              <div className="rounded-2xl bg-white/15 p-3">
                <dt className="text-sm opacity-90">⬆️ ใช้ไป</dt>
                <dd className="num text-lg font-semibold">{baht(month.spend, 0)}</dd>
              </div>
            </dl>
          </section>

          {st && <StreakCard st={st} />}
        </div>

        {/* column 2: words */}
        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><ReceiptText aria-hidden size={20} className="text-primary" /> เงินเดือนไปไหน</h2>
            <p className="leading-relaxed">{s.text}</p>
          </Card>
          <VoiceSummary />
        </div>

        {/* column 3: chart + links */}
        <div className="flex flex-col gap-5 md:col-span-2 xl:col-span-1">
          <Card>
            <h2 className="mb-3 text-lg font-bold">ใช้จ่ายตามหมวด · {monthLabel(month.month)}</h2>
            {cats.length ? <CategoryBars data={cats} /> : <p className="text-muted">เดือนนี้ยังไม่มีรายจ่าย</p>}
          </Card>
          <nav aria-label="ทางลัด" className="grid grid-cols-2 gap-3">
            {[
              { href: "/transactions", label: "รายการทั้งหมด", icon: List },
              { href: "/plan", label: "แผนเงินโต", icon: TrendingUp },
              { href: "/tax", label: "ภาษีปีนี้", icon: Landmark },
              { href: "/loan-ready", label: "พร้อมกู้ไหม", icon: House },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex min-h-16 items-center gap-3 rounded-3xl bg-surface p-4 font-semibold shadow-neu active:shadow-neu-in">
                <Icon aria-hidden size={22} className="shrink-0 text-primary" /> {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function StreakCard({ st }: { st: Streak }) {
  const n = Math.min(st.current, 6);
  return (
    <Card aria-labelledby="streak-t">
      <h2 id="streak-t" className="text-lg font-bold">🔥 {st.current}/6 เดือน → {st.current >= 6 ? "พร้อมยื่นกู้แล้ว ✅" : "พร้อมยื่นกู้"}</h2>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={6} aria-valuenow={n} aria-label="เดือนต่อเนื่อง"
        className="mt-3 h-3 overflow-hidden rounded-full bg-surface shadow-neu-in">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(n / 6) * 100}%` }} />
      </div>
      <ul className="mt-4 flex flex-wrap gap-2" aria-label="เดือนที่ส่งแล้ว">
        {st.months.map((m) => (
          <li key={m.month} className={`rounded-full px-3 py-1 text-sm font-medium ${m.covered ? "bg-success-bg text-success" : "bg-warning-bg text-warning"}`}>
            {m.covered ? "✅" : "⚠️"} {monthLabel(m.month)}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">สถิติสูงสุด {st.best} เดือน · ส่ง statement ทุกเดือนหลังเงินเดือนเข้า</p>
    </Card>
  );
}

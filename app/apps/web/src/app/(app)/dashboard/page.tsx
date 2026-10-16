"use client";
import Link from "next/link";
import { ChevronRight, FileUp, Upload } from "lucide-react";
import type { Category } from "@fjm/shared";
import type { Streak, Summary } from "@/lib/api";
import { CATEGORY_LABEL, baht, monthLabel } from "@/lib/format";
import { ButtonLink, Card, ErrorNote, Loading, PageTitle, cx, useApi } from "@/components/ui";
import { useUser } from "@/components/user";
import { useState } from "react";
import { forecastMonth } from "@/lib/plan";
import { CategoryBars } from "@/components/charts";
import { VoiceSummary } from "@/components/VoiceSummary";
import { Money, Stagger } from "@/components/motion";

export default function Dashboard() {
  const user = useUser();
  const streak = useApi<Streak>("/streak");
  const [today] = useState(() => new Date()); // client-only: this view renders after data loads
  const summary = useApi<Summary>("/insights/summary?months=3");
  const upload = <ButtonLink href="/upload"><Upload aria-hidden size={16} /> อัปโหลด statement</ButtonLink>;

  if (streak.loading || summary.loading) return <Loading />;
  if (summary.error) return <ErrorNote>{summary.error}</ErrorNote>;
  const s = summary.data!;
  const st = streak.data;
  const month = s.months.at(-1);

  if (!month) {
    return (
      <>
        <PageTitle title="ภาพรวม" sub={`สวัสดี ${user?.displayName ?? ""}`} />
        <Card className="mx-auto max-w-lg text-center">
          <FileUp aria-hidden size={36} className="mx-auto text-primary" />
          <h2 className="mt-3 text-lg font-semibold">ยังไม่มีข้อมูล</h2>
          <p className="mt-1 text-muted">อัปโหลด statement 3–6 เดือนล่าสุด แล้วเราจะสรุปให้ว่าเงินเดือนไปไหน</p>
          <div className="mt-5">{upload}</div>
        </Card>
      </>
    );
  }

  const cats = Object.entries(month.byCategory)
    .map(([c, v]) => ({ name: CATEGORY_LABEL[c as Category] ?? c, value: v ?? 0 }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  const prev = s.months.at(-2);
  const spentPct = month.income > 0 ? Math.round((month.spend / month.income) * 100) : 0;
  const fc = forecastMonth(s.months, today);

  const tasks = [
    ...(st?.missing ?? []).map((m) => ({ href: "/upload", text: `อัปโหลด statement เดือน ${monthLabel(m)}`, urgent: st!.expiringSoon.includes(m) })),
    { href: "/transactions", text: "ตรวจหมวดของรายการเดือนนี้", urgent: false },
    { href: "/tax", text: "ดูภาษีที่ต้องจ่ายปีนี้", urgent: false },
    { href: "/loan-ready", text: "เช็กความพร้อมยื่นกู้", urgent: false },
  ];

  return (
    <Stagger className="flex flex-col gap-6">
      <PageTitle title="ภาพรวม" sub={`สวัสดี ${user?.displayName ?? ""} · ข้อมูลถึง ${monthLabel(month.month)}`} action={upload} />

      {st && st.missing.length > 0 && (
        <div role="status" className="-mt-2 flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning">
          <p className="font-medium">
            ⚠️ ยังขาด statement เดือน {st.missing.map(monthLabel).join(", ")}
            {st.expiringSoon.length > 0 && " — ใกล้หมดอายุที่ธนาคาร รีบขอก่อนหาย"}
          </p>
          <Link href="/upload" className="font-semibold underline">อัปโหลดเดือนที่ขาด</Link>
        </div>
      )}

      {/* the one thing to read first */}
      <section aria-labelledby="ov-t" className="flex flex-col gap-4">
        <h2 id="ov-t" className="text-xl font-semibold sm:text-2xl">
          {monthLabel(month.month)} เหลือ <span className={month.net >= 0 ? "text-success" : "text-danger"}><Money value={month.net} digits={0} /></span>
          {month.income > 0 && (
            <> · ใช้ไป <span className={cx("num", spentPct > 100 ? "text-danger" : spentPct > 90 ? "text-warning" : "text-text")}>{spentPct}%</span> ของรายรับ</>
          )}
        </h2>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-4 [&>div]:bg-surface">
          <Kpi label="เหลือเก็บ" value={month.net} prev={prev?.net} good="up" tone={month.net >= 0 ? "text-primary" : "text-danger"} />
          <Kpi label="เงินเข้า" value={month.income} prev={prev?.income} good="up" tone="text-success" />
          <Kpi label="ใช้ไป" value={month.spend} prev={prev?.spend} good="down" tone={month.spend > month.income ? "text-danger" : "text-text"} />
          {fc && (
            <div className="px-4 py-3.5 sm:px-5">
              <dt className="text-sm text-muted">คาดสิ้นเดือน {monthLabel(fc.month).split(" ")[0]} <span className="text-xs">(ประมาณการ)</span></dt>
              <dd className={cx("mt-1 text-xl font-semibold sm:text-2xl", fc.net >= 0 ? "text-text" : "text-danger")}><Money value={fc.net} digits={0} /></dd>
              <dd className="mt-0.5 text-xs text-muted">{fc.basis === "daily" ? "จากค่าใช้จ่ายต่อวันเดือนนี้" : "จากค่าเฉลี่ยเดือนก่อน ๆ"}</dd>
            </div>
          )}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="ใช้จ่ายตามหมวด" action={<Link href="/transactions" className="text-sm font-medium text-primary hover:underline">ดูรายการ</Link>}>
            {cats.length ? <CategoryBars data={cats} total={month.spend} /> : <p className="text-muted">เดือนนี้ยังไม่มีรายจ่าย</p>}
          </Card>

          <Card title="ย้อนหลัง 3 เดือน" className="overflow-hidden">
            <div className="-m-5">
              <table className="w-full text-sm">
                <thead className="bg-subtle text-left text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-2 font-medium">เดือน</th>
                    <th scope="col" className="px-5 py-2 text-right font-medium">เงินเข้า</th>
                    <th scope="col" className="px-5 py-2 text-right font-medium">ใช้ไป</th>
                    <th scope="col" className="px-5 py-2 text-right font-medium">เหลือ</th>
                  </tr>
                </thead>
                <tbody className="num divide-y divide-line">
                  {[...s.months].reverse().map((m) => (
                    <tr key={m.month} className="transition-colors duration-150 hover:bg-subtle">
                      <th scope="row" className="px-5 py-2.5 text-left font-medium">{monthLabel(m.month)}</th>
                      <td className="px-5 py-2.5 text-right text-success">{baht(m.income, 0)}</td>
                      <td className={cx("px-5 py-2.5 text-right", m.spend > m.income && "text-danger")}>{baht(m.spend, 0)}</td>
                      <td className={cx("px-5 py-2.5 text-right font-semibold", m.net < 0 ? "text-danger" : "text-success")}>{baht(m.net, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {st && <StreakCard st={st} />}
          <Card title="เงินเดือนไปไหน">
            <p className="leading-relaxed">{s.text}</p>
          </Card>
          <VoiceSummary />
          <Card title="สิ่งที่ควรทำ" className="overflow-hidden">
            <ul className="-m-5 divide-y divide-line">
              {tasks.map((t) => (
                <li key={t.text}>
                  <Link href={t.href} className="flex min-h-11 items-center justify-between gap-3 px-5 py-2.5 text-sm transition-colors duration-150 hover:bg-subtle">
                    <span>{t.urgent && <span className="mr-1.5 font-semibold text-warning">ด่วน</span>}{t.text}</span>
                    <ChevronRight aria-hidden size={16} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </Stagger>
  );
}

/** KPI tile with month-over-month delta; arrow colour says good (green) or bad (red), not direction. */
function Kpi({ label, value, prev, good, tone }: { label: string; value: number; prev?: number; good: "up" | "down"; tone: string }) {
  const d = prev === undefined ? 0 : value - prev;
  const better = good === "up" ? d > 0 : d < 0;
  return (
    <div className="px-4 py-3.5 sm:px-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={cx("mt-1 text-xl font-semibold sm:text-2xl", tone)}><Money value={value} digits={0} /></dd>
      {prev !== undefined && (
        <dd className={cx("num mt-0.5 text-xs font-medium", d === 0 ? "text-muted" : better ? "text-success" : "text-danger")}>
          {d === 0 ? "เท่าเดือนก่อน" : `${d > 0 ? "↑" : "↓"} ${baht(Math.abs(d), 0)} จากเดือนก่อน`}
        </dd>
      )}
    </div>
  );
}

function StreakCard({ st }: { st: Streak }) {
  const ready = st.current >= 6;
  return (
    <Card title={<>🔥 {st.current}/6 เดือน → {ready ? "พร้อมยื่นกู้แล้ว ✅" : "พร้อมยื่นกู้"}</>}>
      <ol className="grid grid-cols-6 gap-1" aria-label="เดือนที่ส่ง statement แล้ว">
        {st.months.slice(-6).map((m) => (
          <li key={m.month} className="text-center">
            <span className={cx("block h-2 rounded-sm", m.covered ? "bg-primary" : "bg-warning/40")} aria-hidden />
            <span className="mt-1.5 block text-[11px] text-muted">{monthLabel(m.month).split(" ")[0]}</span>
            <span className="sr-only">{m.covered ? "ส่งแล้ว" : "ยังขาด"}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-muted">สถิติสูงสุด {st.best} เดือน · ส่ง statement ทุกเดือนหลังเงินเดือนเข้า</p>
    </Card>
  );
}

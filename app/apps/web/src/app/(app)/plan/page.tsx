"use client";
import { useEffect, useState } from "react";
import { api, errorText, json, type GrowthPoint, type Summary } from "@/lib/api";
import { baht } from "@/lib/format";
import { splitSalary } from "@/lib/plan";
import { ButtonLink, Card, ErrorNote, Loading, PageTitle, useApi } from "@/components/ui";
import { GrowthChart } from "@/components/charts";

export default function Plan() {
  const summary = useApi<Summary>("/insights/summary?months=3");
  const [saving, setSaving] = useState(3000);
  const [ret, setRet] = useState(5);
  const [years, setYears] = useState(10);
  const [points, setPoints] = useState<GrowthPoint[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      api<{ points: GrowthPoint[] }>("/insights/growth", json("POST", { monthlySaving: saving * 100, annualReturn: ret / 100, years }))
        .then((r) => { setPoints(r.points); setError(""); }, (e) => setError(errorText(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [saving, ret, years]);

  const months = summary.data?.months ?? [];
  const avgIncome = months.length ? months.reduce((s, m) => s + m.income, 0) / months.length : 0;
  const avgSpend = months.length ? months.reduce((s, m) => s + m.spend, 0) / months.length : 0;
  const split = splitSalary(avgIncome, avgSpend);
  const yearly = (points ?? []).filter((p) => p.month % 12 === 0).map((p) => ({ year: p.month / 12, value: p.value, contributed: p.contributed }));
  const last = points?.at(-1);

  return (
    <div>
      <PageTitle title="แผนเงินโต" sub="ลองเลื่อนดูว่าออมแบบไหน แล้วเงินจะโตเท่าไร" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <h2 className="sr-only">กราฟเงินโต</h2>
          {last && (
            <p className="mb-1 text-muted" aria-live="polite">
              อีก {years} ปี จะมีประมาณ <span className="num block font-display text-4xl font-bold text-text sm:text-5xl">{baht(last.value, 0)}</span>
              <span className="text-sm">ออมเอง {baht(last.contributed, 0)} · ได้ผลตอบแทน <span className="font-semibold text-success">{baht(last.value - last.contributed, 0)}</span></span>
            </p>
          )}
          {error ? <ErrorNote>{error}</ErrorNote> : points ? <GrowthChart data={yearly} /> : <Loading />}
        </Card>

        <Card className="flex flex-col gap-6">
          <Slider label="ออมต่อเดือน" value={saving} min={500} max={30000} step={500} onChange={setSaving} display={baht(saving * 100, 0)} />
          <Slider label="ผลตอบแทนต่อปี" value={ret} min={0} max={10} step={0.5} onChange={setRet} display={`${ret}%`}
            hint="เงินฝาก ~1–2% · กองทุนผสม ~4–6% · หุ้นระยะยาว ~6–8% (ไม่การันตี)" />
          <Slider label="ระยะเวลา" value={years} min={1} max={30} step={1} onChange={setYears} display={`${years} ปี`} />
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="text-lg font-bold">แบ่งเงินเดือนยังไงดี</h2>
        {summary.loading ? <Loading /> : !split ? (
          <div className="mt-2">
            <p className="text-muted">อัปโหลด statement อย่างน้อย 1 เดือน เราจะคำนวณจากรายจ่ายจริงของคุณ</p>
            <ButtonLink href="/upload" className="mt-4">อัปโหลด statement</ButtonLink>
          </div>
        ) : (
          <>
            <p className="mt-1 text-muted">จากรายได้เฉลี่ย <span className="num font-semibold text-text">{baht(avgIncome, 0)}</span>/เดือน และใช้จริงเฉลี่ย <span className="num font-semibold text-text">{baht(avgSpend, 0)}</span></p>
            <div className="mt-4 flex h-4 overflow-hidden rounded-full shadow-neu-in" aria-hidden>
              <div className="bg-muted/60" style={{ width: `${split.spendPct * 100}%` }} />
              <div className="bg-accent" style={{ width: `${split.emergencyPct * 100}%` }} />
              <div className="bg-primary" style={{ width: `${split.investPct * 100}%` }} />
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: "ใช้จ่าย", pct: split.spendPct, dot: "bg-muted/60", note: "ค่าห้อง กิน เดินทาง" },
                { label: "เงินสำรองฉุกเฉิน", pct: split.emergencyPct, dot: "bg-accent", note: "เก็บให้ถึง 3–6 เท่าของรายจ่าย" },
                { label: "ลงทุน", pct: split.investPct, dot: "bg-primary", note: "ใช้ตัวเลขนี้ในกราฟด้านบน" },
              ].map((x) => (
                <li key={x.label} className="rounded-2xl bg-surface-2 p-4">
                  <p className="flex items-center gap-2 font-semibold"><span className={`size-3 rounded-full ${x.dot}`} aria-hidden />{x.label} {Math.round(x.pct * 100)}%</p>
                  <p className="num mt-1 text-2xl font-bold">{baht(avgIncome * x.pct, 0)}</p>
                  <p className="text-sm text-muted">{x.note}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      <p className="mt-4 text-sm text-muted">ตัวเลขเป็นการประมาณ ผลตอบแทนจริงขึ้นลงได้ ไม่ใช่คำแนะนำการลงทุน</p>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, display, hint }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string; hint?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{label}</span>
        <span className="num text-xl font-bold text-primary">{display}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full" />
      {hint && <span className="text-sm text-muted">{hint}</span>}
    </label>
  );
}

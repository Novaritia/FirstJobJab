"use client";
import { useState } from "react";
import { estimateTax } from "@fjm/shared";
import { baht, toSatang } from "@/lib/format";
import { ssYear } from "@/lib/plan";
import { Card, Field } from "./ui";
import { Money } from "./motion";

/** "If my salary rises X%, what's my tax?" Salary-only, instant. */
export function RaiseCalc({ monthlySalary }: { monthlySalary: number }) {
  const [salary, setSalary] = useState(String(Math.round(monthlySalary / 100)));
  const [pct, setPct] = useState(10);
  const now = Math.max(0, toSatang(salary) ?? 0);
  const after = Math.round(now * (1 + pct / 100));
  const tax = (m: number) => estimateTax({ year: 2026, salaryIncome: m * 12, socialSecurity: ssYear(m) }).tax;
  const t0 = tax(now), t1 = tax(after);

  return (
    <Card title="ถ้าเงินเดือนขึ้น ภาษีจะเป็นเท่าไหร่">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Field label="เงินเดือนตอนนี้ (บาท/เดือน)"><input inputMode="decimal" className="num" value={salary} onChange={(e) => setSalary(e.target.value)} /></Field>
          <label className="flex flex-col gap-2">
            <span className="flex justify-between text-sm font-medium">ขึ้นเงินเดือน <span className="num font-semibold text-primary">{pct}%</span></span>
            <input type="range" min={0} max={50} step={1} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="h-11" />
          </label>
        </div>
        <table className="w-full self-start text-sm">
          <thead className="text-left text-muted">
            <tr><th scope="col" className="pb-2 font-medium"></th><th scope="col" className="pb-2 text-right font-medium">ตอนนี้</th><th scope="col" className="pb-2 text-right font-medium">หลังขึ้น</th></tr>
          </thead>
          <tbody className="num divide-y divide-line">
            <tr><th scope="row" className="py-2 text-left font-normal text-muted">เงินเดือน</th><td className="py-2 text-right">{baht(now, 0)}</td><td className="py-2 text-right">{baht(after, 0)}</td></tr>
            <tr><th scope="row" className="py-2 text-left font-normal text-muted">ภาษีทั้งปี</th><td className="py-2 text-right">{baht(t0, 0)}</td>
              <td className="py-2 text-right text-lg font-semibold text-primary"><Money value={t1} digits={0} /></td></tr>
            <tr><th scope="row" className="py-2 text-left font-normal text-muted">ได้เพิ่มจริง/ปี (หลังภาษี)</th><td></td>
              <td className="py-2 text-right font-semibold text-success">{baht((after - now) * 12 - (t1 - t0), 0)}</td></tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

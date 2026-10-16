"use client";
import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { estimateTax } from "@fjm/shared";
import { baht, toSatang } from "@/lib/format";
import { ssYear } from "@/lib/plan";
import { Card, Field } from "./ui";
import { Money } from "./motion";

const ESG_CAP = 300_000_00;
const B = (v: string) => Math.max(0, toSatang(v) ?? 0);

/** What-if tax calculator: instant, client-side, shows each step. Inputs in baht. */
export function TaxCalc({ year, monthlySalary }: { year: number; monthlySalary: number }) {
  const [f, setF] = useState({
    salary: String(Math.round(monthlySalary / 100)), other: "0", ss: "", pvd: "0", life: "0", esg: "0",
  });
  const salaryM = B(f.salary);
  const input = {
    year,
    salaryIncome: salaryM * 12,
    otherIncome: B(f.other),
    socialSecurity: f.ss === "" ? ssYear(salaryM) : B(f.ss),
    providentFund: B(f.pvd),
    lifeInsurance: B(f.life),
    thaiEsg: B(f.esg),
  };
  const r = estimateTax(input);
  // nudge: ThaiESG room (30% of income, cap 300k), suggest up to 50k baht
  const room = Math.max(0, Math.min(Math.round((input.salaryIncome + input.otherIncome) * 0.3), ESG_CAP) - input.thaiEsg);
  const extra = Math.min(room, 50_000_00);
  const saved = extra > 0 ? r.tax - estimateTax({ ...input, thaiEsg: input.thaiEsg + extra }).tax : 0;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Card title="ลองคำนวณเอง (what-if)">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Field label="เงินเดือน (บาท/เดือน)"><input inputMode="decimal" className="num" value={f.salary} onChange={set("salary")} /></Field>
          <Field label="รายได้อื่น (บาท/ปี)"><input inputMode="decimal" className="num" value={f.other} onChange={set("other")} /></Field>
          <Field label="ประกันสังคม (บาท/ปี)" hint="เว้นว่าง = คิด 5% สูงสุด 750/เดือน">
            <input inputMode="decimal" className="num" value={f.ss} placeholder={String(input.socialSecurity / 100)} onChange={set("ss")} />
          </Field>
          <Field label="กองทุนสำรองเลี้ยงชีพ (บาท/ปี)"><input inputMode="decimal" className="num" value={f.pvd} onChange={set("pvd")} /></Field>
          <Field label="ประกันชีวิต (บาท/ปี)"><input inputMode="decimal" className="num" value={f.life} onChange={set("life")} /></Field>
          <Field label="ThaiESG (บาท/ปี)"><input inputMode="decimal" className="num" value={f.esg} onChange={set("esg")} /></Field>
        </div>

        <div>
          <table className="w-full text-sm">
            <tbody className="num divide-y divide-line">
              <Step label="รายได้ทั้งปี" v={r.grossIncome} />
              <Step label="หักค่าใช้จ่าย" v={-r.expenseDeduction} />
              <Step label="ลดหย่อนรวม" v={-r.allowances} />
              <Step label="เงินได้สุทธิ" v={r.netIncome} strong />
              {r.brackets.filter((b) => b.rate > 0).map((b) => (
                <tr key={b.from} className="text-muted">
                  <td className="py-1.5 pl-3">ขั้น {Math.round(b.rate * 100)}% ({baht(b.from, 0)}–{b.to === null ? "" : baht(b.to, 0)})</td>
                  <td className="py-1.5 text-right">{baht(b.tax, 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line-strong">
                <th scope="row" className="py-2.5 text-left font-semibold">ภาษีทั้งปี</th>
                <td className="py-2.5 text-right text-2xl font-semibold text-primary"><Money value={r.tax} digits={0} /></td>
              </tr>
            </tfoot>
          </table>
          {saved > 0 && (
            <p className="mt-3 flex gap-1.5 rounded border border-success/30 bg-success-bg px-3 py-2 text-sm text-success">
              <CircleCheck aria-hidden size={16} className="mt-0.5 shrink-0" /><span>ลดหย่อนเพิ่มอีก <span className="num font-semibold">{baht(extra, 0)}</span> (เช่น ThaiESG) จะประหยัดภาษี <span className="num font-semibold">{baht(saved, 0)}</span></span>
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function Step({ label, v, strong }: { label: string; v: number; strong?: boolean }) {
  return (
    <tr>
      <th scope="row" className={strong ? "py-2 text-left font-semibold" : "py-2 text-left font-normal text-muted"}>{label}</th>
      <td className={strong ? "py-2 text-right font-semibold" : "py-2 text-right"}>{v < 0 ? `− ${baht(-v, 0)}` : baht(v, 0)}</td>
    </tr>
  );
}

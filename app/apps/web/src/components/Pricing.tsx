"use client";
import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";
import { cx } from "./ui";

const FREE = ["เก็บข้อมูลย้อนหลัง 2 ปี", "อัปโหลด statement + ตรวจยอดคงเหลือ", "แดชบอร์ดเงินเดือนไปไหน", "ประมาณภาษีปีนี้"];
const PLUS = ["เก็บประวัติไม่จำกัด", "อ่านสลิปและสมุดบัญชี (OCR)", "ผู้ช่วย AI + สรุปด้วยเสียง", "แผนเงินโต", "เช็กความพร้อมยื่นกู้"];
const ADDONS = [
  { t: "รายงานยื่นกู้", d: "สรุปรายได้ 6 เดือนพร้อมยื่นธนาคาร", p: "฿149" },
  { t: "ชุดยื่นภาษี", d: "ตัวเลขพร้อมกรอก ภ.ง.ด.90/91", p: "฿99" },
];

/** No payment yet: paid actions stay focusable and say why they do nothing. */
const Soon = ({ className }: { className: string }) => (
  <button type="button" aria-disabled="true" aria-describedby="pricing-soon" onClick={(e) => e.preventDefault()}
    className={cx("inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-md px-4 text-sm font-semibold lg:min-h-10", className)}>
    เร็ว ๆ นี้
  </button>
);

const List = ({ items, tone }: { items: string[]; tone: string }) => (
  <ul className="mt-5 flex flex-col gap-2.5 text-sm">
    {items.map((x) => <li key={x} className="flex gap-2"><Check aria-hidden size={16} className={cx("mt-0.5 shrink-0", tone)} />{x}</li>)}
  </ul>
);

export function Pricing() {
  const [yearly, setYearly] = useState(false);
  const seg = (on: boolean) => cx("min-h-11 rounded-sm px-3 text-sm font-medium sm:min-h-9 transition-colors duration-150", on ? "bg-surface text-text" : "text-[color:var(--on-band-muted)] hover:text-[color:var(--on-band)]");
  return (
    <>
      <div className="mt-6 inline-flex max-w-full rounded-md border border-[color:var(--band-line)] p-0.5" role="group" aria-label="รอบการจ่าย Plus">
        <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)} className={seg(!yearly)}>รายเดือน</button>
        <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)} className={seg(yearly)}>รายปี <span className="text-xs">(ประหยัด ~17%)</span></button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-[1fr_1fr_0.85fr]">
        <section aria-labelledby="p-free" className="flex flex-col rounded-lg border border-[color:var(--band-line)] p-5 sm:p-6">
          <h3 id="p-free" className="font-semibold">Free</h3>
          <p className="mt-3"><span className="num text-4xl font-bold">฿0</span></p>
          <p className="mt-1 text-sm text-[color:var(--on-band-muted)]">สำหรับเริ่มดูว่าเงินเดือนไปไหน</p>
          <List items={FREE} tone="text-[color:var(--on-band-muted)]" />
          <div className="mt-auto pt-8"><Link href="/register" className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[color:var(--band-line)] px-4 text-sm font-semibold transition-colors duration-150 hover:bg-[color:var(--band-line)] lg:min-h-10">เริ่มฟรี</Link></div>
        </section>

        <section aria-labelledby="p-plus" className="flex flex-col rounded-lg border-2 border-primary bg-surface p-5 text-text shadow-card sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 id="p-plus" className="font-semibold">Plus</h3>
            <span className="rounded-sm bg-primary-soft px-1.5 py-0.5 text-xs font-semibold text-primary">แนะนำ</span>
          </div>
          <p className="mt-3">
            <span className="num text-4xl font-bold">{yearly ? "฿590" : "฿59"}</span>
            <span className="text-muted"> / {yearly ? "ปี" : "เดือน"}</span>
          </p>
          <p className="mt-1 text-sm text-muted">{yearly ? "ตกเดือนละ ~฿49 ประหยัด ~17%" : "หรือ ฿590 ต่อปี ประหยัด ~17%"}</p>
          <p className="mt-5 text-sm font-medium">ทุกอย่างใน Free และ</p>
          <ul className="mt-2.5 flex flex-col gap-2.5 text-sm">
            {PLUS.map((x) => <li key={x} className="flex gap-2"><Check aria-hidden size={16} className="mt-0.5 shrink-0 text-primary" />{x}</li>)}
          </ul>
          <div className="mt-auto pt-8"><Soon className="bg-primary/15 text-primary" /></div>
        </section>

        <section aria-labelledby="p-addon" className="flex flex-col md:col-span-2 lg:col-span-1">
          <h3 id="p-addon" className="font-semibold">ซื้อครั้งเดียว</h3>
          <p className="mt-1 text-sm text-[color:var(--on-band-muted)]">ไม่ต้องสมัคร Plus จ่ายเฉพาะตอนต้องใช้</p>
          <ul className="mt-5 divide-y divide-[color:var(--band-line)] border-y border-[color:var(--band-line)]">
            {ADDONS.map((a) => (
              <li key={a.t} className="flex items-start justify-between gap-4 py-4">
                <div><p className="font-medium">{a.t}</p><p className="mt-0.5 text-sm text-[color:var(--on-band-muted)]">{a.d}</p></div>
                <p className="num shrink-0 text-lg font-semibold">{a.p}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6"><Soon className="border border-[color:var(--band-line)] text-[color:var(--on-band-muted)]" /></div>
        </section>
      </div>
      <p id="pricing-soon" className="mt-6 text-sm text-[color:var(--on-band-muted)]">ยังไม่เปิดชำระเงิน แพ็กเกจที่ต้องจ่ายจะเปิดเร็ว ๆ นี้ ระหว่างนี้ใช้ Free ได้ครบ</p>
    </>
  );
}

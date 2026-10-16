"use client";
import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { baht } from "@/lib/format";
import { EASE, Flame, Rolling, useActive } from "./motion";

// Synthetic statements (labelled on the page). Amounts in satang; `misread` is what the PDF reader got wrong.
type Row = { d: string; t: string; a: number; misread?: number };
const SCENES: { bank: string; rows: Row[]; save: number; tax: number; streak: number }[] = [
  { bank: "KBank · ก.ย. 69", save: 1124000, tax: 85000, streak: 4, rows: [
    { d: "1 ก.ย.", t: "SALARY ACME CO", a: 2800000 },
    { d: "4 ก.ย.", t: "โอนค่าห้อง", a: -650000 },
    { d: "6 ก.ย.", t: "GRAB FOOD", a: -21500, misread: -2150 },
    { d: "8 ก.ย.", t: "โอนให้แม่", a: -300000 },
  ] },
  { bank: "BBL · ต.ค. 69", save: 1286000, tax: 92000, streak: 5, rows: [
    { d: "1 ต.ค.", t: "SALARY ACME CO", a: 2800000 },
    { d: "3 ต.ค.", t: "ค่าไฟ MEA", a: -84000 },
    { d: "5 ต.ค.", t: "SHOPEE PAY", a: -45000, misread: -4500 },
    { d: "9 ต.ค.", t: "โอนเข้าออม", a: -500000 },
  ] },
  { bank: "KBank · พ.ย. 69", save: 1350000, tax: 98000, streak: 6, rows: [
    { d: "1 พ.ย.", t: "SALARY ACME CO", a: 2850000 },
    { d: "2 พ.ย.", t: "LINE MAN", a: -18900 },
    { d: "4 พ.ย.", t: "BTS RABBIT", a: -30000, misread: -3000 },
    { d: "7 พ.ย.", t: "โอนค่าห้อง", a: -650000 },
  ] },
];

type Phase = "reset" | "check" | "bad" | "fix" | "done";
type Step = { scan: number; phase: Phase; ms: number };
const stepsFor = (rows: Row[]): Step[] => [
  { scan: -1, phase: "reset", ms: 700 },
  ...rows.flatMap((r, i): Step[] => r.misread
    ? [{ scan: i, phase: "check", ms: 600 }, { scan: i, phase: "bad", ms: 1100 }, { scan: i, phase: "fix", ms: 1300 }]
    : [{ scan: i, phase: "check", ms: 600 }]),
  { scan: rows.length, phase: "done", ms: 3200 },
];

const amt = (v: number) => `${v < 0 ? "−" : "+"}${baht(Math.abs(v)).slice(1)}`;

/** Landing hero figure: a statement audited row by row on a loop. SSR / reduced motion = the resolved state. */
export function LiveAudit() {
  const reduce = useReducedMotion();
  const fig = useRef<HTMLElement>(null);
  const scanEl = useRef<HTMLDivElement>(null);
  const rowEls = useRef<(HTMLTableRowElement | null)[]>([]);
  const active = useActive(fig);
  const [{ scene, step }, set] = useState({ scene: 0, step: stepsFor(SCENES[0].rows).length - 1 });
  const s = SCENES[scene];
  const steps = stepsFor(s.rows);
  const { scan, phase, ms } = steps[step];
  const done = phase === "done";

  // advance the timeline while visible
  useEffect(() => {
    if (reduce || !active) return;
    const id = setTimeout(() => set(step + 1 < steps.length ? { scene, step: step + 1 } : { scene: (scene + 1) % SCENES.length, step: 0 }), ms);
    return () => clearTimeout(id);
  }, [reduce, active, scene, step, steps.length, ms]);

  // move the scan highlight onto the current row
  useEffect(() => {
    const el = scanEl.current, row = rowEls.current[scan];
    if (!el) return;
    if (!row) { animate(el, { opacity: 0 }, { duration: 0.3 }); return; }
    el.style.height = `${row.offsetHeight}px`;
    animate(el, { y: row.offsetTop, opacity: 1 }, { duration: 0.45, ease: EASE });
  }, [scan, scene]);

  const bad = s.rows.find((r) => r.misread)!;
  const msg = phase === "bad" ? "bad" : done || (scan > s.rows.indexOf(bad)) || phase === "fix" ? "fixed" : "scan";
  const checked = Math.min(Math.max(scan, 0), s.rows.length);

  return (
    <figure ref={fig} aria-label="ตัวอย่าง: statement ถูกตรวจทีละแถวแล้วกลายเป็นแผน (ข้อมูลสมมติ)" className="w-full min-w-0 overflow-hidden rounded-lg border border-line bg-surface shadow-pop">
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2.5 text-sm sm:px-4">
        <span key={scene} className="audit-fade font-semibold">{s.bank}</span>
        <span className="num whitespace-nowrap text-muted">{done ? `ตรวจครบ ${s.rows.length}/${s.rows.length} แถว` : `กำลังตรวจ ${checked}/${s.rows.length}`}</span>
      </div>
      <div className="relative">
        <table className="w-full text-sm">
          <thead className="bg-subtle text-left text-muted">
            <tr>
              <th scope="col" className="py-2 pr-1 pl-3 font-medium sm:px-4">วันที่</th>
              <th scope="col" className="px-2 py-2 font-medium">รายการ</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">จำนวน</th>
              <th scope="col" className="py-2 pr-3 pl-1 text-right font-medium sm:w-24 sm:px-4">ตรวจ</th>
            </tr>
          </thead>
          <tbody key={scene} className="num divide-y divide-line">
            {s.rows.map((r, i) => {
              const state = i < scan ? "ok" : i > scan ? "pending" : phase === "check" ? "pending" : phase === "bad" ? "bad" : "ok";
              const corrected = !r.misread || i < scan || (i === scan && phase === "fix");
              return (
                <tr key={r.d} ref={(el) => { rowEls.current[i] = el; }}
                  className={`transition-colors duration-300 ${state === "bad" ? "bg-warning-bg" : i === scan && phase === "fix" ? "bg-success-bg" : ""}`}>
                  <td className="py-2.5 pr-1 pl-3 whitespace-nowrap text-muted sm:px-4">{r.d}</td>
                  <td className="max-w-0 truncate px-2 py-2.5">{r.t}</td>
                  <td className="px-2 py-2.5 text-right whitespace-nowrap">
                    {r.misread ? <Rolling value={corrected ? r.a : r.misread} from={corrected ? r.a : r.misread} format={amt} /> : amt(r.a)}
                  </td>
                  <td className={`py-2.5 pr-3 pl-1 text-right text-xs sm:px-4 font-semibold whitespace-nowrap ${state === "bad" ? "text-warning" : "text-success"}`}>
                    {state === "pending"
                      ? <span aria-hidden className="mr-1 inline-block size-1.5 rounded-full bg-line-strong align-middle" />
                      : <span key={state} className="audit-fade inline-flex items-center gap-1">{state === "ok" ? <><CircleCheck aria-hidden size={14} />ตรง</> : <><TriangleAlert aria-hidden size={14} />ไม่ตรง</>}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div ref={scanEl} aria-hidden className="audit-scan pointer-events-none absolute inset-x-0 top-0 opacity-0" />
      </div>
      {/* all three messages share one grid cell so the height never changes */}
      <div className={`grid border-t border-line px-3 py-2 text-xs sm:px-4 transition-colors duration-300 ${msg === "bad" ? "bg-warning-bg" : msg === "fixed" ? "bg-success-bg" : "bg-subtle"}`}>
        <p className={`col-start-1 row-start-1 text-muted transition-opacity duration-300 ${msg === "scan" ? "" : "opacity-0"}`}>กำลังตรวจ: ยอดก่อนหน้า ± จำนวนเงิน ต้องเท่ายอดคงเหลือทุกแถว</p>
        <p className={`col-start-1 row-start-1 text-warning transition-opacity duration-300 ${msg === "bad" ? "" : "opacity-0"}`}><TriangleAlert aria-hidden size={14} className="mr-1 inline align-[-3px]" />{bad.t} อ่านได้ {amt(bad.misread!).slice(1)} ยอดคงเหลือไม่ตรง กำลังแก้แถวนี้</p>
        <p className={`col-start-1 row-start-1 text-success transition-opacity duration-300 ${msg === "fixed" ? "" : "opacity-0"}`}><CircleCheck aria-hidden size={14} className="mr-1 inline align-[-3px]" />{bad.t} อ่านได้ {amt(bad.misread!).slice(1)} → แก้เป็น {amt(bad.a).slice(1)} ยอดคงเหลือตรง แถวผ่าน</p>
      </div>
      <dl key={scene} className="grid grid-cols-3 divide-x divide-line border-t border-line">
        <div className="min-w-0 px-3 py-3 sm:px-4"><dt className="text-xs text-muted">เหลือเก็บ</dt><dd className="text-lg font-semibold sm:text-xl text-primary"><Rolling value={done ? s.save : 0} from={done ? s.save : 0} format={(v) => baht(v, 0)} /></dd></div>
        <div className="min-w-0 px-3 py-3 sm:px-4"><dt className="text-xs text-muted">ภาษีปีนี้</dt><dd className="text-lg font-semibold sm:text-xl"><Rolling value={done ? s.tax : 0} from={done ? s.tax : 0} format={(v) => baht(v, 0)} /></dd></div>
        <div className="min-w-0 px-3 py-3 sm:px-4"><dt className="text-xs text-muted">พร้อมกู้</dt><dd className="text-lg font-semibold sm:text-xl whitespace-nowrap"><Flame /> <Rolling value={done ? s.streak : s.streak - 1} from={done ? s.streak : s.streak - 1} format={String} />/6</dd></div>
      </dl>
      <figcaption className="border-t border-line px-3 py-1.5 text-right sm:px-4 text-xs text-muted">ข้อมูลตัวอย่าง (สมมติ)</figcaption>
    </figure>
  );
}

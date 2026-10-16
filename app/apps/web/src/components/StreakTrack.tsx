"use client";
import Link from "next/link";
import { Flame as FlameIcon } from "lucide-react";
import { useApi, cx } from "./ui";
import { Flame, Loop } from "./motion";
import type { Streak } from "@/lib/api";

/** History coverage (loan-ready), 6 month cells: a flame when a statement is in, the month due pulses "อัปโหลด", older gaps say ขาด. */
export function StreakTrack({ months, due }: { months: { label: string; covered: boolean }[]; due?: number }) {
  return (
    <Loop className="w-full">
      <ol className="grid grid-cols-6 gap-1.5" aria-label="เดือนที่ส่ง statement แล้ว">
        {months.map((m, i) => (
          <li key={m.label} data-rise className="min-w-0 text-center">
            <span className={cx("relative grid h-11 place-items-center rounded border text-lg",
              m.covered ? "border-primary/25 bg-primary-soft" : i === due ? "streak-due border-dashed border-primary bg-surface text-primary" : "border-warning/30 bg-warning-bg")}>
              {m.covered ? <FlameIcon aria-hidden size={18} className="fill-current text-streak" /> : <span className={cx("text-[11px] font-semibold", i === due ? "text-primary" : "text-warning")}>{i === due ? "อัปโหลด" : "ขาด"}</span>}
            </span>
            <span className="mt-1.5 block truncate text-[11px] text-muted">{m.label}</span>
            <span className="sr-only">{m.covered ? "ส่งแล้ว" : i === due ? "ถึงเวลาอัปโหลด" : "ยังขาด"}</span>
          </li>
        ))}
      </ol>
    </Loop>
  );
}

/** Deadline colour: amber at ≤7 days, red at ≤2 (or out). */
export const fireTone = (s: Pick<Streak, "current" | "daysLeft">) =>
  s.current === 0 || s.daysLeft <= 2 ? "text-danger" : s.daysLeft <= 7 ? "text-warning" : "text-muted";

/** "อัปเดตครั้งถัดไปภายใน X วัน ไม่งั้นไฟดับ" (or how to relight). */
export function FireDeadline({ s, className }: { s: Pick<Streak, "current" | "daysLeft">; className?: string }) {
  return (
    <p className={cx("text-sm font-medium", fireTone(s), className)}>
      {s.current > 0 ? <>อัปเดตครั้งถัดไปภายใน <span className="num">{s.daysLeft}</span> วัน ไม่งั้นไฟดับ</> : "ไฟดับแล้ว อัปโหลด statement หรือสลิปใหม่เพื่อจุดไฟอีกครั้ง"}
    </p>
  );
}

/** Compact 🔥 counter for the app shell (no maximum); links to /upload. */
export function StreakBadge({ className }: { className?: string }) {
  const { data } = useApi<Streak>("/streak");
  const warn = data && data.current > 0 && data.daysLeft <= 7;
  return (
    <Link href="/upload" title={data?.current ? `อัปเดตภายใน ${data.daysLeft} วัน ไม่งั้นไฟดับ` : "อัปเดตข้อมูลเพื่อจุดไฟ"} aria-label={`streak ${data?.current ?? 0} อัปเดตข้อมูล`}
      className={cx("inline-flex min-h-9 items-center gap-1 rounded border px-2.5 text-sm font-semibold transition-colors duration-150",
        warn ? (data.daysLeft <= 2 ? "border-danger/40 bg-danger-bg text-danger" : "border-warning/40 bg-warning-bg text-warning") : "border-primary/25 bg-primary-soft text-primary hover:border-primary/50", className)}>
      <Flame /> <span className="num inline-block min-w-[1ch]">{data ? data.current : "–"}</span>
    </Link>
  );
}

"use client";
import Link from "next/link";
import { Flame as FlameIcon } from "lucide-react";
import { useApi, cx } from "./ui";
import { Flame, Loop } from "./motion";
import type { Streak } from "@/lib/api";

/** 6 month cells: a flame when a statement is in, the month due pulses "อัปโหลด", older gaps say ขาด. */
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

/** Compact flame + N counter for the app shell; links to /upload. */
export function StreakBadge({ className }: { className?: string }) {
  const { data } = useApi<Streak>("/streak");
  return (
    <Link href="/upload" title="streak: อัปโหลด statement ทุกเดือน" aria-label={`streak ${data?.current ?? 0} เดือน อัปโหลด statement`}
      className={cx("inline-flex min-h-9 items-center gap-1 rounded border border-primary/25 bg-primary-soft px-2.5 text-sm font-semibold text-primary transition-colors duration-150 hover:border-primary/50", className)}>
      <Flame /> <span className="num inline-block min-w-[1ch]">{data ? data.current : "–"}</span><span className="text-xs font-medium">/6</span>
    </Link>
  );
}

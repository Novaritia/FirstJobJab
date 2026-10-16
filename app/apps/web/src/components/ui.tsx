"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { ApiError, api, errorText } from "@/lib/api";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Bordered panel. With `title`, gets a labelled header row split by a hairline. */
export function Card({ title, action, className, children, ...p }: Omit<ComponentProps<"section">, "title"> & { title?: ReactNode; action?: ReactNode }) {
  return (
    <section data-rise className={cx("rounded-md border border-line bg-surface", !title && "p-5", className)} {...p}>
      {title ? (
        <>
          <header className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-5 py-2.5">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            {action}
          </header>
          <div className="p-5">{children}</div>
        </>
      ) : children}
    </section>
  );
}

type Variant = "primary" | "soft" | "danger" | "ghost";
const btn = (v: Variant = "primary", className?: string) =>
  cx(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded px-4 text-sm font-semibold transition-[background-color,transform] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 lg:min-h-9",
    "disabled:cursor-not-allowed disabled:opacity-50",
    v === "primary" && "bg-primary text-on-primary hover:bg-primary-hover",
    v === "soft" && "border border-line-strong bg-surface text-text hover:bg-subtle",
    v === "danger" && "border border-line-strong bg-surface text-danger hover:bg-danger-bg",
    v === "ghost" && "px-2 text-primary hover:underline",
    className,
  );

export function Button({ variant, className, ...p }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={btn(variant, className)} {...p} />;
}
export function ButtonLink({ variant, className, ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={btn(variant, className)} {...p} />;
}

type BadgeKind = "ok" | "warn" | "manual" | "edited" | "info";
const BADGE: Record<BadgeKind, string> = {
  ok: "bg-success-bg text-success",
  warn: "bg-warning-bg text-warning",
  manual: "bg-subtle text-text",
  edited: "bg-primary-soft text-primary",
  info: "bg-subtle text-muted",
};
/** Badges always carry text, never colour alone. */
export function Badge({ kind, children }: { kind: BadgeKind; children: ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", BADGE[kind])}>{children}</span>;
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        {sub && <p className="mt-0.5 text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

/** Label above a group of panels. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold text-muted">{children}</h2>;
}

export const Req = () => <span aria-hidden className="ml-0.5 font-semibold text-danger">*</span>;
export const RequiredLegend = () => <p className="text-sm text-muted"><Req /> จำเป็นต้องกรอก</p>;

export function Field({ label, hint, required, children }: { label: string; hint?: ReactNode; required?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}{required && <Req />}</span>
      {children}
      {hint && <span className="text-sm text-muted">{hint}</span>}
    </label>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded border border-danger/30 bg-danger-bg px-4 py-3 text-sm font-medium text-danger">⚠️ {children}</p>;
}

export function Loading({ label = "กำลังโหลด…" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-md border border-line bg-surface p-5">
      <span className="sr-only">{label}</span>
      {[60, 90, 75].map((w) => (
        <span key={w} aria-hidden className="h-3 animate-pulse rounded-sm bg-subtle motion-reduce:animate-none" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

/** GET on mount + reload(). Errors become Thai text plus `status` for callers that special-case codes. */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{ data?: T; error?: string; status?: number; loading: boolean }>({ loading: true });
  const reload = useCallback(() => {
    if (!path) return;
    api<T>(path).then(
      (data) => setState({ data, loading: false }),
      (e) => setState({ error: errorText(e), status: e instanceof ApiError ? e.status : 0, loading: false }),
    );
  }, [path]);
  useEffect(reload, [reload]);
  return { ...state, reload, setData: (data: T) => setState({ data, loading: false }) };
}

export { cx };

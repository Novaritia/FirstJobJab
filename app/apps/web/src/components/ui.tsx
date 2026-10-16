"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { ApiError, api, errorText } from "@/lib/api";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ className, ...p }: ComponentProps<"section">) {
  return <section className={cx("rounded-3xl bg-surface p-5 shadow-neu sm:p-6", className)} {...p} />;
}

type Variant = "primary" | "soft" | "danger" | "ghost";
const btn = (v: Variant = "primary", className?: string) =>
  cx(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 font-semibold transition",
    "disabled:cursor-not-allowed disabled:opacity-50",
    v === "primary" && "bg-primary text-on-primary hover:brightness-110 active:brightness-95",
    v === "soft" && "bg-surface text-primary shadow-neu active:shadow-neu-in",
    v === "danger" && "bg-surface text-danger shadow-neu active:shadow-neu-in",
    v === "ghost" && "text-primary underline-offset-4 hover:underline",
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
  manual: "bg-surface-2 text-text",
  edited: "bg-surface-2 text-primary",
  info: "bg-surface-2 text-muted",
};
/** Badges always carry text, never colour alone. */
export function Badge({ kind, children }: { kind: BadgeKind; children: ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", BADGE[kind])}>{children}</span>;
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-sm text-muted">{hint}</span>}
    </label>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-2xl bg-danger-bg px-4 py-3 font-medium text-danger">⚠️ {children}</p>;
}

export function Loading({ label = "กำลังโหลด…" }: { label?: string }) {
  return (
    <div role="status" className="animate-pulse rounded-3xl bg-surface p-6 text-muted shadow-neu motion-reduce:animate-none">
      {label}
    </div>
  );
}

/** GET on mount + reload(). Data errors become text; 503s are left to the caller via `status`. */
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

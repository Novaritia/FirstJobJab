"use client";
/**
 * App-level building blocks, implemented on the shadcn/ui primitives in `@/components/shadcn/*`.
 * The props/API are unchanged from the pre-shadcn version, so every page picks up the theme without edits.
 * For anything not here (Tabs, Switch, Select, Dialog, Sheet, Tooltip, Table, Progress, Chart, toast ...)
 * import the primitive directly from "@/components/shadcn/<name>".
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { CircleAlert, Loader2 } from "lucide-react";
import { ApiError, api, errorText } from "@/lib/api";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/shadcn/button";
import { Badge as UiBadge } from "@/components/shadcn/badge";
import { Label } from "@/components/shadcn/label";
import { Skeleton } from "@/components/shadcn/skeleton";

/** Class joiner (tailwind-merge aware, so a later class overrides an earlier one). */
const cx = cn;

/** Bordered white panel (shadcn Card look). With `title`, gets a labelled header row split by a hairline. */
export function Card({ title, action, className, children, ...p }: Omit<ComponentProps<"section">, "title"> & { title?: ReactNode; action?: ReactNode }) {
  return (
    <section data-rise data-slot="card" className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-card", !title && "p-5", className)} {...p}>
      {title ? (
        <>
          <header data-slot="card-header" className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-5 py-3">
            <h2 data-slot="card-title" className="text-[15px] font-semibold leading-snug">{title}</h2>
            {action}
          </header>
          <div data-slot="card-content" className="p-5">{children}</div>
        </>
      ) : children}
    </section>
  );
}

/** App variants map onto shadcn's: primary=default, soft=outline, danger=outlined destructive, ghost=quiet text button. shadcn names are accepted too. */
type Variant = "primary" | "soft" | "danger" | "ghost" | "default" | "outline" | "secondary" | "destructive" | "link";
const VARIANT: Record<Variant, string> = {
  primary: cn(buttonVariants({ variant: "default" }), "hover:bg-primary-hover"),
  default: cn(buttonVariants({ variant: "default" }), "hover:bg-primary-hover"),
  soft: cn(buttonVariants({ variant: "outline" }), "border-input bg-card shadow-none hover:bg-accent hover:text-accent-foreground"),
  outline: cn(buttonVariants({ variant: "outline" }), "border-input bg-card shadow-none hover:bg-accent hover:text-accent-foreground"),
  secondary: buttonVariants({ variant: "secondary" }),
  danger: cn(buttonVariants({ variant: "outline" }), "border-input bg-card text-danger shadow-none hover:border-danger/40 hover:bg-danger-bg hover:text-danger"),
  destructive: buttonVariants({ variant: "destructive" }),
  ghost: cn(buttonVariants({ variant: "ghost" }), "px-2.5 text-primary hover:bg-accent hover:text-accent-foreground"),
  link: buttonVariants({ variant: "link" }),
};
const btn = (v: Variant = "primary", className?: string) =>
  cn(
    VARIANT[v],
    // 44px touch target on mobile, 36px on desktop; a subtle press.
    "relative h-auto max-md:h-auto min-h-11 px-4 text-center font-semibold whitespace-normal transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 lg:min-h-9",
    "disabled:cursor-not-allowed disabled:pointer-events-auto aria-busy:cursor-wait",
    v === "ghost" && "px-2.5",
    className,
  );

/** Spinner layered over invisible children, so a pending button keeps its exact size. */
function withPending(pending: boolean | undefined, children: ReactNode) {
  if (!pending) return children;
  return (
    <>
      <span className="invisible inline-flex items-center gap-2">{children}</span>
      <span className="absolute inset-0 grid place-items-center"><Loader2 aria-hidden className="size-4 animate-spin" /></span>
    </>
  );
}

/** `pending`: disables, sets aria-busy, shows a spinner without changing the size. */
export function Button({ variant, className, pending, disabled, children, ...p }: ComponentProps<"button"> & { variant?: Variant; pending?: boolean }) {
  return (
    <button type="button" data-slot="button" className={btn(variant, className)} disabled={disabled || pending} aria-busy={pending || undefined} {...p}>
      {withPending(pending, children)}
    </button>
  );
}
export function ButtonLink({ variant, className, ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link data-slot="button" className={btn(variant, className)} {...p} />;
}

type BadgeKind = "ok" | "warn" | "manual" | "edited" | "info";
const BADGE: Record<BadgeKind, string> = {
  ok: "border-success/20 bg-success-bg text-success",
  warn: "border-warning/25 bg-warning-bg text-warning",
  manual: "border-border bg-secondary text-foreground",
  edited: "border-primary/20 bg-primary-soft text-primary",
  info: "border-border bg-secondary text-muted",
};
/** Badges always carry text, never colour alone. */
export function Badge({ kind, children, className }: { kind: BadgeKind; children: ReactNode; className?: string }) {
  return <UiBadge variant="outline" className={cn("rounded-md px-2 font-medium", BADGE[kind], className)}>{children}</UiBadge>;
}

export function PageTitle({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-muted">{sub}</p>}
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

/** Label + control + hint. Wraps the control, so any <input>/<select>/shadcn Input works without ids. */
export function Field({ label, hint, required, children }: { label: string; hint?: ReactNode; required?: boolean; children: ReactNode }) {
  return (
    <Label className="flex-col items-stretch gap-1.5 leading-normal select-auto">
      <span className="text-sm font-medium">{label}{required && <Req />}</span>
      {children}
      {hint && <span className="text-sm font-normal text-muted">{hint}</span>}
    </Label>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function Loading({ label = "กำลังโหลด…" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-card">
      <span className="sr-only">{label}</span>
      {[60, 90, 75].map((w) => (
        <Skeleton key={w} aria-hidden className="h-3 rounded-sm bg-secondary" style={{ width: `${w}%` }} />
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

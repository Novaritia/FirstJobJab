"use client";
import { animate, motion, stagger, useAnimate, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { baht } from "@/lib/format";

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Panels (Card = [data-rise]) inside fade up once on mount, staggered in DOM order. Runs before paint, so no flash. */
export function Stagger({ className, children }: { className?: string; children: ReactNode }) {
  const [scope, run] = useAnimate();
  const reduce = useReducedMotion();
  useLayoutEffect(() => {
    if (reduce) return;
    const els = scope.current.querySelectorAll("[data-rise]");
    if (els.length) run(els, { opacity: [0, 1], y: [6, 0] }, { duration: 0.4, ease: EASE, delay: stagger(0.05) });
  }, [scope, run, reduce]);
  return <div ref={scope} className={className}>{children}</div>;
}

/** Number that rolls from its previous value (0 on first load) to `value`. */
export function Rolling({ value, from = 0, format, className }: { value: number; from?: number; format: (v: number) => string; className?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : from);
  const text = useTransform(mv, (v) => format(Math.round(v)));
  useEffect(() => {
    if (reduce) return mv.set(value);
    const c = animate(mv, value, { duration: 0.8, ease: EASE });
    return () => c.stop();
  }, [mv, value, reduce]);
  return <motion.span className={className ? `num ${className}` : "num"}>{text}</motion.span>;
}

export const Money = ({ value, digits = 2, className }: { value: number; digits?: 0 | 2; className?: string }) =>
  <Rolling value={value} format={(v) => baht(v, digits)} className={className} />;

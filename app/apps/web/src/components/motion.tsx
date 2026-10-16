"use client";
import { animate, motion, stagger, useAnimate, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Flame as FlameIcon } from "lucide-react";
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

/** True while `ref` is on screen and the tab is visible. Loops use it to pause. */
export function useActive(ref: RefObject<Element | null>) {
  const [onScreen, setOnScreen] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    const vis = () => setVisible(!document.hidden);
    vis();
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, [ref]);
  return onScreen && visible;
}

/** Wrapper for CSS-keyframe loops: pauses every animation inside while offscreen or the tab is hidden. */
export function Loop({ as: Tag = "div", className, children }: { as?: "div" | "span"; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useActive(ref);
  return <Tag ref={ref} data-paused={active ? undefined : ""} className={className}>{children}</Tag>;
}

/** One-shot reveal: [data-rise] children fade up the first time the block scrolls into view. Visible without JS. */
export function Reveal({ className, children }: { className?: string; children: ReactNode }) {
  const [scope, run] = useAnimate();
  const reduce = useReducedMotion();
  const inView = useInView(scope, { once: true, margin: "0px 0px -15% 0px" });
  const armed = useRef(false);
  useLayoutEffect(() => {
    if (reduce || armed.current) return;
    const els = scope.current.querySelectorAll("[data-rise]");
    if (els.length) { run(els, { opacity: 0, y: 8 }, { duration: 0 }); armed.current = true; }
  }, [scope, run, reduce]);
  useEffect(() => {
    if (armed.current && inView) run(scope.current.querySelectorAll("[data-rise]"), { opacity: 1, y: 0 }, { duration: 0.5, ease: EASE, delay: stagger(0.08) });
  }, [inView, run, scope]);
  return <div ref={scope} className={className}>{children}</div>;
}

/** Small "live" indicator: a dot with a slow ring. Static under reduced motion. */
export const LiveDot = () => (
  <Loop as="span" className="live-dot relative mr-1.5 inline-block size-2 align-middle"><span aria-hidden className="absolute inset-0 rounded-full bg-success" /></Loop>
);

/** The streak flame (lucide Flame, orange) with a gentle idle flicker; sized to the surrounding text (1em). */
export const Flame = ({ className }: { className?: string }) => <Loop as="span" className="inline-flex items-center align-[-0.125em]"><FlameIcon aria-hidden className={`flame size-[1em] fill-current text-streak ${className ?? ""}`} /></Loop>;

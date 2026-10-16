"use client";
import { useEffect, useRef } from "react";
import { busy } from "@/lib/busy";

const DELAY = 150; // fast actions never show the bar

/** NProgress-style 3px bar: route navigation + any lib/api request. Imperative so trickle ticks don't re-render. */
export function TopLoader() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current!;
    let p = 0, on = false;
    let show: ReturnType<typeof setTimeout> | undefined, hide: ReturnType<typeof setTimeout> | undefined;
    let tick: ReturnType<typeof setInterval> | undefined;
    const set = (scale: number, opacity: number) => { el.style.transform = `scaleX(${scale})`; el.style.opacity = String(opacity); };
    const reset = () => { el.style.transition = "none"; set(0, 0); void el.offsetWidth; el.style.transition = ""; };

    const update = () => {
      const active = busy.active();
      if (active) document.body.setAttribute("aria-busy", "true");
      else document.body.removeAttribute("aria-busy");

      if (active && !on && !show) {
        show = setTimeout(() => {
          show = undefined;
          on = true;
          clearTimeout(hide);
          reset();
          if (matchMedia("(prefers-reduced-motion: reduce)").matches) return set(1, 1); // static bar, no trickle
          set((p = 0.15), 1);
          tick = setInterval(() => set((p += (0.92 - p) * 0.12), 1), 300);
        }, DELAY);
      } else if (!active) {
        clearTimeout(show);
        show = undefined;
        clearInterval(tick);
        if (on) {
          on = false;
          set(1, 1);
          hide = setTimeout(() => { set(1, 0); hide = setTimeout(reset, 300); }, 200);
        }
      }
    };

    const unsub = busy.subscribe(update);
    update();
    return () => { unsub(); clearTimeout(show); clearTimeout(hide); clearInterval(tick); };
  }, []);

  return (
    <div ref={ref} aria-hidden style={{ transform: "scaleX(0)", opacity: 0 }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-primary transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none" />
  );
}

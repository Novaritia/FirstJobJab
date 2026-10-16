"use client";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { baht } from "@/lib/format";
import { EASE } from "./motion";

const tick = { fill: "var(--text-muted)", fontSize: 12 };
const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 4, color: "var(--text)", boxShadow: "var(--pop-shadow)" };

/** Category spend as a table with inline share bars: readable, exact, screen-reader friendly. */
export function CategoryBars({ data, total }: { data: { name: string; value: number }[]; total: number }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <table className="w-full text-sm">
      <thead className="sr-only"><tr><th>หมวด</th><th>สัดส่วน</th><th>จำนวน</th></tr></thead>
      <tbody>
        {data.map((d, i) => (
          <tr key={d.name}>
            <th scope="row" className="w-28 py-1.5 pr-3 sm:w-36 text-left font-normal whitespace-nowrap">{d.name}</th>
            <td className="py-1.5">
              <motion.span className="block h-2 origin-left rounded-sm bg-primary" style={{ width: `${(d.value / max) * 100}%` }} aria-hidden
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, ease: EASE, delay: 0.15 + i * 0.04 }} />
              <span className="sr-only">{Math.round((d.value / total) * 100)}%</span>
            </td>
            <td className="num w-12 py-1.5 pl-3 text-right text-muted max-sm:hidden" aria-hidden>{Math.round((d.value / total) * 100)}%</td>
            <td className="num w-24 py-1.5 pl-3 text-right font-medium">{baht(d.value, 0)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Growth projection: total value vs money put in. Points are satang. */
export function GrowthChart({ data }: { data: { year: number; value: number; contributed: number }[] }) {
  const reduce = useReducedMotion();
  const [scope, run] = useAnimate();
  // draw-in wipe once; slider changes update instantly (the headline figure rolls instead)
  useEffect(() => {
    if (!reduce) run(scope.current, { clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)"] }, { duration: 0.7, ease: EASE });
  }, [reduce, run, scope]);
  return (
    <div ref={scope} className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} accessibilityLayer>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" tick={tick} tickFormatter={(y) => `ปี ${y}`} axisLine={false} tickLine={false} />
          <YAxis tick={tick} width={64} axisLine={false} tickLine={false}
            tickFormatter={(v) => `฿${Intl.NumberFormat("th-TH", { notation: "compact" }).format(Number(v) / 100)}`} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => baht(Number(v), 0)} labelFormatter={(y) => `ปีที่ ${y}`} />
          <Legend wrapperStyle={{ color: "var(--text)" }} />
          <Area type="monotone" dataKey="value" name="มูลค่ารวม" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.08} strokeWidth={2} isAnimationActive={false} />
          <Area type="monotone" dataKey="contributed" name="เงินที่ออมเอง" stroke="var(--text-muted)" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

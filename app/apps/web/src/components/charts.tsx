"use client";
import { Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/shadcn/chart";
import { useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { baht } from "@/lib/format";
import { chartColor } from "@/lib/chart";
import { EASE } from "./motion";

const tick = { fill: "var(--text-muted)", fontSize: 12 };
const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 4, color: "var(--text)", boxShadow: "var(--pop-shadow)" };


/** Animate once on first mount; later data changes (month switch) update instantly. Off under reduced motion. */
function useOnce() {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);
  return { active: !reduce && !done, end: () => setDone(true) };
}

export type Slice = { name: string; value: number; color: string };

/** Tooltip row: swatch + name + baht (values are satang). */
const money = (v: unknown, name: unknown, item: { color?: string; payload?: { fill?: string; color?: string } }) => (
  <>
    <span aria-hidden className="size-2.5 shrink-0 rounded-[2px]" style={{ background: item.payload?.color ?? item.color ?? item.payload?.fill }} />
    <span className="text-muted-foreground">{String(name)}</span>
    <span className="num ml-auto pl-3 font-medium text-foreground">{baht(Number(v), 0)}</span>
  </>
);

/** Donut with the total in the hole. Pair it with a legend/table: the ring alone is decoration for screen readers. */
export function Donut({ data, centre, centreLabel, label }: { data: Slice[]; centre: string; centreLabel: string; label: string }) {
  const once = useOnce();
  const config = Object.fromEntries(data.map((d) => [d.name, { label: d.name, color: d.color }])) satisfies ChartConfig;
  return (
    <figure className="relative mx-auto aspect-square w-full max-w-56" aria-label={label}>
      <ChartContainer config={config} className="aspect-square size-full">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="96%" startAngle={90} endAngle={-270}
            stroke="var(--surface)" strokeWidth={2} isAnimationActive={once.active} animationDuration={700} onAnimationEnd={once.end}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent hideLabel formatter={money} />} />
        </PieChart>
      </ChartContainer>
      <figcaption className="pointer-events-none absolute inset-0 grid place-content-center text-center">
        <span className="text-xs text-muted">{centreLabel}</span>
        <span className="num text-lg font-semibold sm:text-xl">{centre}</span>
      </figcaption>
    </figure>
  );
}

const trendConfig = {
  income: { label: "รายรับ", color: chartColor(1) },
  spend: { label: "รายจ่าย", color: chartColor(3) },
  net: { label: "เหลือเก็บ", color: "var(--text)" },
} satisfies ChartConfig;

/** Income vs spending bars per month with the left-over line. One axis: all three are baht. */
export function TrendChart({ data }: { data: { month: string; income: number; spend: number; net: number }[] }) {
  const once = useOnce();
  const anim = { isAnimationActive: once.active, animationDuration: 700 };
  return (
    <ChartContainer config={trendConfig} className="aspect-auto h-64 w-full sm:h-72" aria-hidden>
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={tick} axisLine={false} tickLine={false} />
        <YAxis tick={tick} width={56} axisLine={false} tickLine={false}
          tickFormatter={(v) => `฿${Intl.NumberFormat("th-TH", { notation: "compact" }).format(Number(v) / 100)}`} />
        <ReferenceLine y={0} stroke="var(--line-strong)" />
        <ChartTooltip cursor={{ fill: "var(--subtle)" }} content={<ChartTooltipContent formatter={money} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="income" name="รายรับ" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={28} {...anim} />
        <Bar dataKey="spend" name="รายจ่าย" fill="var(--color-spend)" radius={[4, 4, 0, 0]} maxBarSize={28} {...anim} onAnimationEnd={once.end} />
        <Line dataKey="net" name="เหลือเก็บ" stroke="var(--color-net)" strokeWidth={2} dot={{ r: 4, fill: "var(--surface)", strokeWidth: 2 }} {...anim} />
      </ComposedChart>
    </ChartContainer>
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

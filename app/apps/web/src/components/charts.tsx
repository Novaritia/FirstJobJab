"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { baht } from "@/lib/format";

const tick = { fill: "var(--text-muted)", fontSize: 12 };
const tooltipStyle = { background: "var(--glass-solid)", border: "1px solid var(--glass-border)", borderRadius: 14, color: "var(--text)" };

/** Horizontal bars, one series, values labelled (no legend needed). */
export function CategoryBars({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div style={{ height: Math.max(160, data.length * 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 72, top: 0, bottom: 0 }} accessibilityLayer>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={118} tick={{ ...tick, fill: "var(--text)" }} axisLine={false} tickLine={false} />
          <Bar dataKey="value" fill="var(--accent)" radius={[0, 8, 8, 0]} barSize={18} isAnimationActive={false}>
            <LabelList dataKey="value" position="right" formatter={(v) => baht(Number(v), 0)} style={{ fill: "var(--text)", fontSize: 12, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Growth projection: total value vs money put in. Points are satang. */
export function GrowthChart({ data }: { data: { year: number; value: number; contributed: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} accessibilityLayer>
          <CartesianGrid stroke="var(--shadow-dark)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" tick={tick} tickFormatter={(y) => `ปี ${y}`} axisLine={false} tickLine={false} />
          <YAxis tick={tick} width={64} axisLine={false} tickLine={false}
            tickFormatter={(v) => `฿${Intl.NumberFormat("th-TH", { notation: "compact" }).format(Number(v) / 100)}`} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => baht(Number(v), 0)} labelFormatter={(y) => `ปีที่ ${y}`} />
          <Legend wrapperStyle={{ color: "var(--text)" }} />
          <Area type="monotone" dataKey="value" name="มูลค่ารวม" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.18} strokeWidth={2.5} isAnimationActive={false} />
          <Area type="monotone" dataKey="contributed" name="เงินที่ออมเอง" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.12} strokeWidth={2} strokeDasharray="5 4" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

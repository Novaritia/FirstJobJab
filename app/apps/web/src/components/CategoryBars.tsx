"use client";
import { motion } from "motion/react";
import { baht } from "@/lib/format";
import { EASE } from "./motion";

const cat = (i: number) => `var(--cat-${(i % 6) + 1})`;

/** Category spend as a table with inline share bars: readable, exact, screen-reader friendly. Recharts-free on purpose. */
export function CategoryBars({ data, total }: { data: { name: string; value: number }[]; total: number }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <table className="w-full text-sm">
      <thead className="sr-only"><tr><th>หมวด</th><th>สัดส่วน</th><th>จำนวน</th></tr></thead>
      <tbody>
        {data.map((d, i) => (
          <tr key={d.name}>
            <th scope="row" className="w-28 py-1.5 pr-3 sm:w-36 text-left font-normal whitespace-nowrap">
              <span aria-hidden className="mr-2 inline-block size-2 rounded-sm align-middle" style={{ background: cat(i) }} />{d.name}
            </th>
            <td className="py-1.5">
              <motion.span className="block h-2 origin-left rounded-sm" style={{ width: `${(d.value / max) * 100}%`, background: cat(i) }} aria-hidden
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

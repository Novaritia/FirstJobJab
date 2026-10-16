"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/shadcn/button";

/** "1–10 จาก 57" + ‹ ›, optional page-size select. `page` is 1-based. Renders nothing when everything fits on one page at the smallest size. */
export function MiniPager({ page, size, total, onPage, onSize, sizes = [10, 25] }: {
  page: number; size: number; total: number; onPage: (p: number) => void; onSize?: (s: number) => void; sizes?: number[];
}) {
  if (total <= Math.min(size, ...sizes)) return null;
  const last = Math.max(1, Math.ceil(total / size));
  const from = total ? (page - 1) * size + 1 : 0;
  return (
    <nav aria-label="เปลี่ยนหน้า" className="mt-3 flex items-center justify-end gap-2 text-sm text-muted">
      {onSize && (
        <select aria-label="จำนวนต่อหน้า" value={size} onChange={(e) => onSize(Number(e.target.value))} className="mr-auto h-9 w-auto text-sm">
          {sizes.map((s) => <option key={s} value={s}>{s} / หน้า</option>)}
        </select>
      )}
      <span className="num whitespace-nowrap" aria-live="polite">{from}–{Math.min(page * size, total)} จาก {total}</span>
      <Button variant="outline" size="icon" className="size-9 max-lg:size-11" aria-label="หน้าก่อน" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft aria-hidden /></Button>
      <Button variant="outline" size="icon" className="size-9 max-lg:size-11" aria-label="หน้าถัดไป" disabled={page >= last} onClick={() => onPage(page + 1)}><ChevronRight aria-hidden /></Button>
    </nav>
  );
}

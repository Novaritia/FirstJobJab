"use client";
import { useState } from "react";
import { toast } from "sonner";
import { BANK_NAMES } from "@fjm/shared";
import { api, dataChanged, errorText, json, type UploadLog, type UploadResult } from "@/lib/api";
import { dateLabel } from "@/lib/format";
import { MiniPager } from "./MiniPager";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./shadcn/dialog";
import { Badge, Button, ErrorNote, Loading, cx, useApi } from "./ui";

const KIND: Record<string, string> = { statement: "statement", pdf: "PDF", scan: "PDF สแกน", passbook: "รูปสมุดบัญชี", wallet: "e-wallet" };
const when = (iso: string) => new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
const bankName = (b: string) => (BANK_NAMES as Record<string, string>)[b] ?? b;

/** "ประวัติการอัปโหลด": resume or cancel pending uploads, delete a confirmed import (and its transactions). */
export function UploadHistory({ onResume }: { onResume: (r: UploadResult, name: string) => void }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const list = useApi<{ uploads: UploadLog[]; total?: number }>(`/uploads?limit=${size}&page=${page}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [del, setDel] = useState<UploadLog | null>(null);

  async function run(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(id);
    try {
      await fn();
      toast.success(ok);
      dataChanged(); // list, navbar 🔥, dashboard all refetch
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function resume(u: UploadLog) {
    setBusy(u.id);
    try {
      onResume(await api<UploadResult>(`/uploads/${u.id}`), u.fileName ?? `${bankName(u.bank)} ${u.periodStart}`);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  const rows = list.data?.uploads ?? [];
  const total = list.data?.total ?? rows.length;

  return (
    <section aria-labelledby="hist-t" className="overflow-hidden rounded-md border border-line bg-surface">
      <header className="border-b border-line px-5 py-3">
        <h2 id="hist-t" className="font-semibold">ประวัติการอัปโหลด</h2>
        <p className="text-sm text-muted">ไฟล์ที่ยังไม่ยืนยันทำต่อได้ ไฟล์ที่นำเข้าแล้วลบได้ถ้าอัปผิด</p>
      </header>
      {list.loading ? <div className="p-4"><Loading /></div> : list.error ? <div className="p-4"><ErrorNote>{list.error}</ErrorNote></div> : !rows.length ? (
        <p className="px-5 py-6 text-sm text-muted">ยังไม่มีไฟล์ที่อัปโหลด เริ่มจากลากไฟล์ด้านบน</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((u) => {
            const pending = u.status === "pending";
            const ok = u.check?.okCount ?? u.okCount, fail = u.check?.failCount ?? u.failCount;
            const unverified = u.check?.mode === "none" ? u.rowCount : u.unverifiedCount;
            return (
              <li key={u.id} className="grid gap-x-4 gap-y-2 px-5 py-3 transition-colors duration-150 hover:bg-subtle/60 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate font-medium">{u.fileName ?? bankName(u.bank)}</span>
                    {pending ? <Badge kind="warn">รอยืนยัน</Badge> : <Badge kind="ok">นำเข้าแล้ว</Badge>}
                  </p>
                  <p className="text-sm text-muted">
                    {bankName(u.bank)}{u.kind && ` · ${KIND[u.kind] ?? u.kind}`}{u.ocr && " (OCR)"} · {dateLabel(u.periodStart)} – {dateLabel(u.periodEnd)} · อัปโหลด {when(u.createdAt)}
                  </p>
                  <p className="num mt-0.5 flex flex-wrap gap-x-3 text-xs">
                    <span>{pending ? u.rowCount : u.importedRows ?? u.importedCount ?? u.rowCount} แถว{pending ? "" : "ที่นำเข้า"}</span>
                    {ok != null && <span className="text-success">✅ {ok}</span>}
                    {!!fail && <span className="text-warning">⚠️ {fail}</span>}
                    {!!unverified && <span className="text-muted">✋ {unverified}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {pending ? (
                    <>
                      <Button onClick={() => resume(u)} disabled={busy === u.id}>ดำเนินการต่อ</Button>
                      <Button variant="soft" disabled={busy === u.id}
                        onClick={() => run(u.id, () => api(`/uploads/${u.id}`, json("DELETE")), "ยกเลิกไฟล์นี้แล้ว ไม่มีรายการถูกนำเข้า")}>
                        ยกเลิก ไม่นำเข้า
                      </Button>
                    </>
                  ) : (
                    <Button variant="danger" disabled={busy === u.id} onClick={() => setDel(u)}>ลบการนำเข้านี้</Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className={cx(total > size && "border-t border-line px-5 py-2")}>
        <MiniPager page={page} size={size} total={total} onPage={setPage} onSize={(s) => { setSize(s); setPage(1); }} />
      </div>

      <Dialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบการนำเข้านี้?</DialogTitle>
            <DialogDescription>
              รายการ {del?.importedRows ?? del?.importedCount ?? del?.rowCount} แถวจาก {del && bankName(del.bank)} ({del && dateLabel(del.periodStart)} – {del && dateLabel(del.periodEnd)}) จะถูกลบออกจากบัญชีของคุณ รวมถึงหมวดและโน้ตที่แก้ไว้ ไฟ 🔥 ที่ได้ไปแล้วไม่ถูกหัก ลบแล้วกู้คืนไม่ได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="soft">ไม่ลบ</Button></DialogClose>
            <Button variant="danger" disabled={busy === del?.id}
              onClick={() => { const u = del!; setDel(null); run(u.id, () => api(`/uploads/${u.id}?withTransactions=1`, json("DELETE", { confirm: true })), "ลบการนำเข้าและรายการที่เกี่ยวข้องแล้ว"); }}>
              ลบการนำเข้านี้
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

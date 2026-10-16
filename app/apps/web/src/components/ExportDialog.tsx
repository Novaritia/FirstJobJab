"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { BANK_NAMES, type Bank } from "@fjm/shared";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shadcn/dialog";
import { Button, Field, cx } from "@/components/ui";
import { ApiError, api, apiRaw, errorText, type Profile } from "@/lib/api";

type Account = { id: string; bank: string; accountNoMasked: string; accountName?: string | null };
type Format = "csv" | "pdf" | "tax";
const FORMATS: [Format, string, string][] = [
  ["csv", "ตาราง CSV", "เปิดใน Excel / โปรแกรมบัญชี รายรับ-รายจ่ายแยกคอลัมน์"],
  ["pdf", "รายงาน PDF", "สรุปรายรับ–รายจ่าย พร้อมรายการทั้งหมด"],
  ["tax", "ชุดข้อมูลภาษี PDF", "ประกอบการยื่น ภ.ง.ด.90/91 ทั้งปี"],
];
const PRESETS = ["เดือนนี้", "เดือนก่อน", "3 เดือน", "6 เดือน", "ปีภาษีนี้", "กำหนดเอง"] as const;
type Preset = (typeof PRESETS)[number];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function range(p: Preset): [string, string] {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  if (p === "เดือนก่อน") return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
  if (p === "3 เดือน") return [iso(new Date(y, m - 2, 1)), iso(now)];
  if (p === "6 เดือน") return [iso(new Date(y, m - 5, 1)), iso(now)];
  if (p === "ปีภาษีนี้") return [`${y}-01-01`, iso(now)];
  return [iso(new Date(y, m, 1)), iso(now)];
}

/** Self-contained export dialog. Pass `trigger` to replace the default "ส่งออก" button. */
export function ExportDialog({ trigger, accounts = [] }: { trigger?: ReactNode; accounts?: Account[] }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>("csv");
  const [preset, setPreset] = useState<Preset>("6 เดือน");
  const [[from, to], setRange] = useState(() => range("6 เดือน"));
  const [year, setYear] = useState(new Date().getFullYear());
  const [accountId, setAccountId] = useState("");
  const [hidden, setHidden] = useState(false);
  const [hasId, setHasId] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open && hasId === null) api<Profile>("/profile").then((p) => setHasId(p.hasNationalId), () => setHasId(true)); // unknown → let the 409 explain
  }, [open, hasId]);

  const pick = (p: Preset) => { setPreset(p); if (p !== "กำหนดเอง") setRange(range(p)); };
  const bad = format !== "tax" && (!from || !to || from > to);

  async function download() {
    setPending(true);
    try {
      const q = new URLSearchParams(format === "tax" ? { year: String(year) } : { from, to, ...(accountId && { accountId }), ...(hidden && { includeHidden: "1" }) });
      const path = format === "tax" ? "/export/tax-pack.pdf" : `/export/statement.${format}`;
      const res = await apiRaw(`${path}?${q}`);
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? `firstjobjab_${format}.${format === "csv" ? "csv" : "pdf"}`;
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(await res.blob()), download: name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast.success(`ดาวน์โหลด ${name} แล้ว`);
      setOpen(false);
    } catch (e) {
      if (e instanceof ApiError && e.message === "national_id_required") { setHasId(false); toast.error("ต้องกรอกเลขประจำตัวประชาชนก่อน"); }
      else if (e instanceof ApiError && e.message === "no_income_in_year") toast.error(`ไม่พบรายได้ในปี ${year + 543}`);
      else toast.error(`ส่งออกไม่สำเร็จ: ${errorText(e)}`);
    } finally {
      setPending(false);
    }
  }

  const thisYear = new Date().getFullYear();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button variant="soft"><Download aria-hidden size={18} /> ส่งออก</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ส่งออกข้อมูลให้ผู้ทำบัญชี</DialogTitle>
          <DialogDescription>ไม่รวมรายการโอนระหว่างบัญชีตัวเอง ยอดเงินเป็นบาท ทศนิยม 2 ตำแหน่ง</DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="รูปแบบ" className="grid gap-2">
          {FORMATS.map(([f, label, sub]) => {
            const off = f === "tax" && hasId === false;
            return (
              <button key={f} type="button" role="radio" aria-checked={format === f} disabled={off} onClick={() => setFormat(f)}
                className={cx("min-w-0 rounded border p-3 text-left disabled:cursor-not-allowed disabled:opacity-60",
                  format === f ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-line hover:bg-subtle")}>
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm text-muted">{sub}</span>
              </button>
            );
          })}
          {hasId === false && (
            <p className="text-sm text-muted">
              ชุดข้อมูลภาษีต้องมีเลขประจำตัวประชาชน 13 หลัก <Link href="/settings" className="font-medium text-primary underline">ไปกรอกที่ตั้งค่า</Link>
            </p>
          )}
        </div>

        {format === "tax" ? (
          <Field label="ปีภาษี">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>{y + 543} ({y})</option>)}
            </select>
          </Field>
        ) : (
          <>
            <fieldset className="min-w-0">
              <legend className="mb-1.5 text-sm font-medium">ช่วงวันที่</legend>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button key={p} type="button" aria-pressed={preset === p} onClick={() => pick(p)}
                    className={cx("min-h-9 rounded-full border px-3 text-sm", preset === p ? "border-primary bg-primary text-on-primary" : "border-line hover:bg-subtle")}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="ตั้งแต่"><input type="date" value={from} max={to || undefined} onChange={(e) => { setPreset("กำหนดเอง"); setRange([e.target.value, to]); }} /></Field>
                <Field label="ถึง"><input type="date" value={to} min={from || undefined} onChange={(e) => { setPreset("กำหนดเอง"); setRange([from, e.target.value]); }} /></Field>
              </div>
            </fieldset>
            {accounts.length > 1 && (
              <Field label="บัญชี">
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  <option value="">ทุกบัญชี</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.bank === "CASH" ? a.accountName ?? "เงินสด" : `${BANK_NAMES[a.bank as Bank] ?? a.bank} ${a.accountNoMasked}`}</option>)}
                </select>
              </Field>
            )}
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> รวมแถวที่ซ่อนไว้
            </label>
          </>
        )}

        <DialogFooter>
          <Button onClick={download} pending={pending} disabled={bad} className="w-full sm:w-auto">
            <Download aria-hidden size={18} /> ดาวน์โหลด {format === "csv" ? "CSV" : "PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

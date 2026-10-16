"use client";
import { useRef, useState } from "react";
import { BookOpen, Camera, CircleCheck, FileUp, Hand, ImagePlus, KeyRound, Loader2, TriangleAlert, X } from "lucide-react";
import { motion } from "motion/react";
import { EASE, Flame, Rolling } from "@/components/motion";
import { BANK_NAMES, type Direction } from "@fjm/shared";
import { ApiError, api, errorText, json, type ReviewRow, type Slip, type Streak, type UploadResult } from "@/lib/api";
import { baht, dateLabel, toSatang } from "@/lib/format";
import { Badge, Button, ButtonLink, Card, ErrorNote, Field, PageTitle, RequiredLegend, cx } from "@/components/ui";

type Item = {
  key: string;
  file: File;
  pages?: File[]; // passbook photos, in page order
  status: "uploading" | "password" | "error" | "review" | "done";
  error?: string;
  result?: UploadResult;
  imported?: number;
};

const nameOf = (it: Item) => (it.pages ? `สมุดบัญชี ${it.pages.length} หน้า` : it.file.name);

export default function UploadPage() {
  const [mode, setMode] = useState<"pdf" | "passbook">("pdf");
  const [pages, setPages] = useState<File[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const [slips, setSlips] = useState<(Slip & { confirmed?: boolean })[]>([]);
  const [slipState, setSlipState] = useState<{ busy?: boolean; error?: string }>({});
  const seq = useRef(0);

  const patch = (key: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));

  async function send(item: Item, password?: string) {
    patch(item.key, { status: "uploading", error: undefined });
    const form = new FormData();
    if (item.pages) item.pages.forEach((p) => form.append("images", p));
    else form.append("file", item.file);
    if (password) form.append("password", password);
    try {
      const result = await api<UploadResult>(item.pages ? "/uploads/passbook" : "/uploads", { method: "POST", body: form });
      patch(item.key, { status: "review", result });
      setAnnounce(`${nameOf(item)}: อ่าน ${result.rows.length} รายการ ตรง ${result.check.okCount} ไม่ตรง ${result.check.failCount}`);
    } catch (e) {
      if (e instanceof ApiError && e.message === "password_required") {
        patch(item.key, { status: "password", error: password ? "รหัสไม่ถูกต้อง ลองอีกครั้ง" : undefined });
        setAnnounce(`${nameOf(item)}: ต้องใส่รหัส PDF`);
      } else {
        patch(item.key, { status: "error", error: errorText(e) });
        setAnnounce(`${nameOf(item)}: ${errorText(e)}`);
      }
    }
  }

  async function sendSlips(images: File[]) {
    setSlipState({ busy: true });
    const form = new FormData();
    images.forEach((f) => form.append("images", f));
    try {
      const r = await api<{ slips: Slip[] }>("/slips", { method: "POST", body: form });
      setSlips((xs) => [...r.slips, ...xs]);
      setSlipState({});
      setAnnounce(`อ่านสลิป ${r.slips.length} ใบ ตรงกับ statement ${r.slips.filter((x) => x.status === "matched").length} ใบ`);
    } catch (e) {
      setSlipState({ error: errorText(e) });
    }
  }

  async function confirmSlip(id: string) {
    try {
      await api(`/slips/${id}/confirm`, json("POST"));
      setSlips((xs) => xs.map((x) => (x.id === id ? { ...x, confirmed: true } : x)));
      setAnnounce("เพิ่มรายการจากสลิปแล้ว");
    } catch (e) {
      setSlipState({ error: errorText(e) });
    }
  }

  function addPages(list: FileList | null) {
    const imgs = [...(list ?? [])].filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png)$/i.test(f.name));
    if (!imgs.length) return setAnnounce("เลือกรูปหน้าสมุดบัญชี JPG/PNG");
    // gallery picks arrive unordered; camera/file names are usually chronological
    setPages((xs) => [...xs, ...imgs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))]);
  }

  async function sendPassbook() {
    const it: Item = { key: `${seq.current++}`, file: pages[0], pages, status: "uploading" };
    setPages([]);
    setItems((xs) => [...xs, it]);
    await send(it);
  }

  async function addFiles(list: FileList | null) {
    const files = [...(list ?? [])];
    const images = files.filter((f) => /^image\/(jpeg|png)$/.test(f.type) || /\.(jpe?g|png)$/i.test(f.name));
    const pdfs = files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!pdfs.length && !images.length) return setAnnounce("รองรับไฟล์ PDF และรูปสลิป JPG/PNG");
    if (images.length) sendSlips(images);
    const added = pdfs.map((file) => ({ key: `${seq.current++}`, file, status: "uploading" as const }));
    setItems((xs) => [...xs, ...added]);
    for (const it of added) await send(it); // sequential: one parse at a time on the server
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="อัปโหลด statement / สลิป" sub="PDF จาก KBank หรือ Bangkok Bank (รวมไฟล์สแกน), รูปสลิป JPG/PNG หรือรูปถ่ายสมุดบัญชี" />

      <div role="group" aria-label="ประเภทไฟล์" className="mb-4 inline-flex rounded border border-line bg-surface p-0.5">
        {([["pdf", "PDF e-statement / สลิป", FileUp], ["passbook", "รูปสมุดบัญชี", BookOpen]] as const).map(([m, label, Icon]) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
            className={cx("flex min-h-11 items-center gap-2 rounded-sm px-3 text-sm font-medium sm:min-h-9",
              mode === m ? "bg-primary-soft text-primary" : "text-muted hover:bg-subtle")}>
            <Icon aria-hidden size={16} /> {label}
          </button>
        ))}
      </div>

      {mode === "passbook" ? (
        <Card title="ถ่ายรูปสมุดบัญชี">
          <p className="text-sm text-muted">ถ่ายทีละหน้าให้เห็นทุกแถว เรียงจากหน้าเก่าไปใหม่ ให้มีแถว ยอดยกมา (B/F) เพื่อให้ตรวจแถวแรกได้ — KBank หรือ Bangkok Bank</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border border-line-strong px-3 font-medium hover:bg-subtle focus-within:outline-2 focus-within:outline-primary sm:min-h-9">
              <Camera aria-hidden size={18} /> ถ่ายรูป
              <input type="file" accept="image/*" capture="environment" className="sr-only"
                onChange={(e) => { addPages(e.target.files); e.target.value = ""; }} />
            </label>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border border-line-strong px-3 font-medium hover:bg-subtle focus-within:outline-2 focus-within:outline-primary sm:min-h-9">
              <ImagePlus aria-hidden size={18} /> เลือกรูป
              <input type="file" accept="image/*" multiple className="sr-only"
                onChange={(e) => { addPages(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
          {pages.length > 0 && (
            <>
              <ol className="mt-4 divide-y divide-line rounded border border-line">
                {pages.map((p, i) => (
                  <li key={`${i}-${p.name}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate"><span className="num text-muted">หน้า {i + 1}</span> · {p.name}</span>
                    <button type="button" aria-label={`ลบหน้า ${i + 1}`} onClick={() => setPages((xs) => xs.filter((_, j) => j !== i))}
                      className="grid size-9 place-items-center rounded text-muted hover:bg-subtle"><X aria-hidden size={16} /></button>
                  </li>
                ))}
              </ol>
              <Button onClick={sendPassbook} className="mt-4 max-sm:w-full">อ่านสมุดบัญชี ({pages.length} หน้า)</Button>
            </>
          )}
        </Card>
      ) : (
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        className={cx(
          "flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-8 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary sm:p-10",
          drag ? "border-primary bg-primary-soft" : "border-line-strong bg-surface hover:bg-subtle",
        )}
      >
        <FileUp aria-hidden size={28} className="text-primary" />
        <span className="text-lg font-semibold">ลาก statement PDF หรือรูปสลิปมาวางที่นี่</span>
        <span className="text-muted">หรือ <span className="font-semibold text-primary underline">เลือกไฟล์</span> จากเครื่อง</span>
        <input type="file" accept="application/pdf,.pdf,image/jpeg,image/png,.jpg,.jpeg,.png" multiple className="sr-only"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </label>
      )}

      <p aria-live="polite" className="sr-only">{announce}</p>

      {(slips.length > 0 || slipState.busy || slipState.error) && (
        <section className="mt-8 overflow-hidden rounded-md border border-line bg-surface" aria-labelledby="slip-t">
          <header className="border-b border-line px-5 py-3">
            <h2 id="slip-t" className="font-semibold">สลิป ({slips.length})</h2>
            <p className="text-sm text-muted">สลิปที่ตรงกับ statement จะไม่ถูกนับซ้ำ</p>
          </header>
          {slipState.busy && <p role="status" className="flex items-center gap-1.5 animate-pulse px-5 py-3 text-sm text-muted motion-reduce:animate-none"><Loader2 aria-hidden size={14} className="animate-spin motion-reduce:animate-none" />กำลังอ่านสลิป…</p>}
          {slipState.error && <div className="p-4"><ErrorNote>{slipState.error}</ErrorNote></div>}
          <ul className="divide-y divide-line">
            {slips.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="num font-semibold">{x.amount != null ? baht(x.amount) : <span className="text-warning">อ่านยอดไม่ได้</span>} <span className="font-normal text-muted">{x.date && `· ${dateLabel(x.date)}`}{x.time && ` ${x.time}`}</span></p>
                  <p className="truncate text-sm text-muted">{[x.fromName, x.toName].filter(Boolean).join(" → ")}{x.ref && ` · ref ${x.ref}`}</p>
                  {x.confidence < 0.9 && <p className="text-xs text-warning">อ่านได้ไม่ชัด ({Math.round(x.confidence * 100)}%) ตรวจยอดก่อนยืนยัน</p>}
                </div>
                {x.status === "matched" ? (
                  <Badge kind="ok"><CircleCheck aria-hidden size={14} /> ตรงกับรายการใน statement (ไม่นับซ้ำ)</Badge>
                ) : x.confirmed || x.status === "confirmed" ? (
                  <Badge kind="ok"><CircleCheck aria-hidden size={14} /> เพิ่มแล้ว</Badge>
                ) : (
                  <Button variant="soft" onClick={() => confirmSlip(x.id)}><Hand aria-hidden size={16} /> ยืนยันเพื่อเพิ่มรายการ</Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="mt-8 flex flex-col gap-6">
        {items.map((it) => (
          <li key={it.key}>
            <UploadItem item={it} onRetry={(pw) => send(it, pw)}
              onConfirmed={(imported, streak) => {
                patch(it.key, { status: "done", imported });
                setCelebrate(streak);
                setAnnounce(`ยืนยันแล้ว นำเข้า ${imported} รายการ`);
              }}
              onUpdate={(result) => patch(it.key, { result })} />
          </li>
        ))}
      </ul>

      {celebrate !== null && <Celebration streak={celebrate} onClose={() => setCelebrate(null)} />}
    </div>
  );
}

function UploadItem({ item, onRetry, onConfirmed, onUpdate }: {
  item: Item;
  onRetry: (password?: string) => void;
  onConfirmed: (imported: number, streak: number) => void;
  onUpdate: (r: UploadResult) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const r = item.result;

  if (item.status === "uploading") return <Card aria-busy><p className="flex items-center gap-1.5 animate-pulse motion-reduce:animate-none"><Loader2 aria-hidden size={16} className="shrink-0 animate-spin motion-reduce:animate-none" />กำลังอ่าน {nameOf(item)}…</p></Card>;
  if (item.status === "error") {
    return (
      <Card>
        <p className="mb-3 font-semibold">{nameOf(item)}</p>
        <ErrorNote>{item.error}</ErrorNote>
      </Card>
    );
  }
  if (item.status === "password") {
    return (
      <Card>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); onRetry(String(new FormData(e.currentTarget).get("password"))); }}>
          <p className="flex items-center gap-2 font-semibold"><KeyRound aria-hidden size={20} /> {nameOf(item)} ถูกล็อก</p>
          <Field label="รหัสผ่าน PDF" required hint="ส่วนใหญ่เป็นวันเกิด (เช่น DDMMYYYY) หรือเลขบัตรประชาชน — ดูในอีเมลจากธนาคาร">
            <input name="password" type="password" required autoComplete="off" />
          </Field>
          <RequiredLegend />
          {item.error && <ErrorNote>{item.error}</ErrorNote>}
          <Button type="submit" className="self-start">ปลดล็อกและอ่าน</Button>
        </form>
      </Card>
    );
  }
  if (!r) return null;
  if (item.status === "done") {
    return <Card><p className="flex items-center gap-1.5 font-semibold"><CircleCheck aria-hidden size={16} className="shrink-0 text-success" />{nameOf(item)} — นำเข้า {item.imported} รายการแล้ว</p></Card>;
  }

  const failing = r.rows.filter((row) => !row.ok);
  const passing = r.rows.filter((row) => row.ok);
  const expected = new Map(r.check.rows.map((c) => [c.index, c.expectedBalance]));
  // wallet histories: no per-row balance → verified only if printed totals reconcile, else the user accepts in bulk
  const unverified = !!r.check.mode && r.check.mode !== "per_row" && !r.check.totalsOk;
  const allOk = r.check.failCount === 0 && !unverified;

  async function confirm(acceptUnverified = false) {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ imported: number; streak: Streak | number }>(`/uploads/${r!.uploadId}/confirm`, json("POST", acceptUnverified ? { acceptUnverified } : undefined));
      onConfirmed(res.imported, typeof res.streak === "number" ? res.streak : res.streak.current);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? "ยังมีแถวที่ยอดไม่ตรง แก้ให้ครบก่อนยืนยัน" : errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-md border border-line bg-surface">
      <header className="border-b border-line px-5 py-3">
        <h2 className="font-semibold">
          อ่าน <span className="num">{r.rows.length}</span> รายการ{" "}
          {unverified ? (
            <span className="inline-flex items-center gap-1 text-warning"><Hand aria-hidden size={14} />ตรวจยอดไม่ได้ <span className="num">{r.rows.length}</span> แถว</span>
          ) : (<>
            <span className="inline-flex items-center gap-1 text-success"><CircleCheck aria-hidden size={14} />{r.check.mode === "totals" ? "ยอดรวมตรง" : "ยอดคงเหลือตรง"} <span className="num">{r.check.okCount}</span> แถว</span>{" "}
            <span className={cx("inline-flex items-center gap-1", allOk ? "text-muted" : "text-warning")}><TriangleAlert aria-hidden size={14} />ไม่ตรง <span className="num">{r.check.failCount}</span> แถว</span>
          </>)}
        </h2>
        <p className="mt-0.5 flex flex-wrap gap-x-2 text-sm text-muted">
          <span>{BANK_NAMES[r.bank] ?? r.bank}</span>
          <span>{r.accountNoMasked}</span>
          <span>{dateLabel(r.period.start)} – {dateLabel(r.period.end)}</span>
          <span className="truncate">· {nameOf(item)}</span>
        </p>
      </header>
      {/* each row ticks as its balance check lands: ~30ms apart, whole strip capped near 1s */}
      <ol aria-hidden className="flex flex-wrap gap-1 border-b border-line px-5 py-2.5">
        {r.rows.map((row, i) => (
          <motion.li key={row.index} title={`แถว ${row.index + 1}`}
            className={cx("size-2.5 rounded-[2px] transition-colors duration-300", unverified ? "bg-line" : row.ok ? "bg-success" : "bg-warning")}
            initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, ease: EASE, delay: i * Math.min(0.03, 1 / r.rows.length) }} />
        ))}
      </ol>
      {!r.check.totalsOk && allOk && <p className="flex items-center gap-1.5 border-b border-line bg-warning-bg px-5 py-2 text-sm text-warning"><TriangleAlert aria-hidden size={14} className="shrink-0" />ยอดรวมยังไม่ตรงกับสรุปท้าย statement</p>}

      {unverified && (
        <p className="flex items-start gap-1.5 border-b border-line bg-warning-bg px-5 py-2 text-sm text-warning">
          <Hand aria-hidden size={14} className="mt-0.5 shrink-0" />
          {r.check.mode === "none"
            ? "✋ ตรวจยอดไม่ได้ (ไม่มียอดคงเหลือ) — ไฟล์นี้ไม่มียอดคงเหลือหรือยอดรวมให้เทียบ ตรวจรายการด้านล่างเองแล้วกดยืนยันทั้งหมด รายการจะถูกบันทึกว่า ยังไม่ตรวจยอด"
            : "✋ ยอดรวมไม่ตรงกับยอดต้นงวด/ปลายงวด — ตรวจรายการด้านล่าง ถ้าถูกแล้วกดยืนยันทั้งหมด รายการจะถูกบันทึกว่า ยังไม่ตรวจยอด"}
        </p>
      )}

      {!unverified && failing.length > 0 && (
        <div className="flex flex-col gap-3 border-b border-line p-5">
          <p className="text-sm text-muted">แก้ตัวเลขให้ตรงกับ PDF หรือสมุดบัญชี แถวจะผ่านเมื่อ ยอดก่อนหน้า ± จำนวนเงิน = ยอดคงเหลือ</p>
          {failing.map((row) => (
            <FailRow key={`${row.index}-${row.amount}-${row.direction}-${row.date}`} row={row}
              expected={expected.get(row.index)} uploadId={r.uploadId}
              onResult={(rows, check) => onUpdate({ ...r, rows, check })} />
          ))}
        </div>
      )}

      {(unverified ? r.rows : passing).length > 0 && (
        <details className="border-b border-line" open={unverified}>
          <summary className="flex min-h-11 cursor-pointer items-center px-5 text-sm font-medium text-primary hover:bg-subtle">{unverified ? `ดูทุกแถว (${r.rows.length})` : `ดูแถวที่ผ่าน (${passing.length})`}</summary>
          <table className="w-full text-sm">
            <thead className="bg-subtle text-left text-muted">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium">วันที่</th>
                <th scope="col" className="px-2 py-2 font-medium">รายการ</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">จำนวน</th>
                <th scope="col" className="px-5 py-2 text-right font-medium max-sm:hidden">ยอดคงเหลือ</th>
              </tr>
            </thead>
            <tbody className="num divide-y divide-line">
              {(unverified ? r.rows : passing).map((row) => (
                <tr key={row.index}>
                  <td className="px-5 py-2 whitespace-nowrap text-muted">{dateLabel(row.date)}</td>
                  <td className="max-w-0 truncate px-2 py-2">{row.description}</td>
                  <td className={cx("px-2 py-2 text-right font-medium whitespace-nowrap", row.direction === "in" && "text-success")}>
                    {row.direction === "in" ? "+" : "−"}{baht(row.amount)}
                  </td>
                  <td className="px-5 py-2 text-right whitespace-nowrap text-muted max-sm:hidden">{row.balance == null ? "–" : baht(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      <footer className="flex flex-wrap items-center justify-end gap-3 bg-subtle px-5 py-3">
        {error && <div className="w-full"><ErrorNote>{error}</ErrorNote></div>}
        {unverified ? (
          <Button onClick={() => confirm(true)} disabled={busy} className="max-sm:w-full">ยืนยันทั้งหมด {r.rows.length} แถว (ยังไม่ตรวจยอด)</Button>
        ) : (
          <Button onClick={() => confirm()} disabled={!allOk || busy} className="max-sm:w-full">
            {allOk ? "ยืนยันนำเข้า" : `แก้อีก ${r.check.failCount} แถวก่อนยืนยัน`}
          </Button>
        )}
      </footer>
    </section>
  );
}

function FailRow({ row, expected, uploadId, onResult }: {
  row: ReviewRow;
  expected?: number;
  uploadId: string;
  onResult: (rows: ReviewRow[], check: UploadResult["check"]) => void;
}) {
  const [amount, setAmount] = useState((row.amount / 100).toFixed(2));
  const [direction, setDirection] = useState<Direction>(row.direction);
  const [date, setDate] = useState(row.date);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = `r${uploadId}-${row.index}`;

  async function recheck(e: React.FormEvent) {
    e.preventDefault();
    const satang = toSatang(amount);
    if (satang === null || satang <= 0) return setError("จำนวนเงินไม่ถูกต้อง");
    const body: Record<string, unknown> = {};
    if (satang !== row.amount) body.amount = satang;
    if (direction !== row.direction) body.direction = direction;
    if (date !== row.date) body.date = date;
    if (!Object.keys(body).length) return setError("ยังไม่ได้แก้อะไร");
    setBusy(true);
    setError("");
    try {
      const res = await api<{ rows: ReviewRow[]; check: UploadResult["check"] }>(`/uploads/${uploadId}/rows/${row.index}`, json("PATCH", body));
      if (!res.rows.find((x) => x.index === row.index)?.ok) setError("ยังไม่ตรง ลองเทียบกับต้นฉบับอีกครั้ง");
      onResult(res.rows, res.check);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={recheck} className="rounded border border-warning/30 bg-warning-bg p-4" aria-labelledby={`${id}-t`}>
      <p id={`${id}-t`} className="font-semibold"><Badge kind="warn"><TriangleAlert aria-hidden size={14} /> ไม่ตรง</Badge> <span className="ml-1">แถว {row.index + 1}: {row.description}</span></p>
      <p className="mt-1 text-sm text-muted">
        ยอดคงเหลือใน PDF <span className="num font-semibold text-text">{row.balance == null ? "–" : baht(row.balance)}</span>
        {expected !== undefined && <> แต่คำนวณได้ <span className="num font-semibold text-text">{baht(expected)}</span></>}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <Field label="จำนวนเงิน (บาท)">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="num" />
        </Field>
        <Field label="ประเภท">
          <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
            <option value="out">เงินออก</option>
            <option value="in">เงินเข้า</option>
          </select>
        </Field>
        <Field label="วันที่">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Button type="submit" variant="soft" disabled={busy}>{busy ? "กำลังตรวจ…" : "ตรวจใหม่"}</Button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-danger">{error}</p>}
    </form>
  );
}

function Celebration({ streak, onClose }: { streak: number; onClose: () => void }) {
  return (
    <motion.div role="dialog" aria-modal="true" aria-labelledby="cel-t" className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(10_15_25/0.45)] p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <motion.section className="relative w-full max-w-sm overflow-hidden rounded-md border border-line bg-surface p-6 text-center shadow-pop"
        initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, ease: EASE }}>
        {/* one-pass gold-to-blue sheen across the panel */}
        <motion.span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12"
          style={{ background: "linear-gradient(90deg, transparent, rgb(212 175 55 / 0.28), rgb(122 162 247 / 0.28), transparent)" }}
          initial={{ x: "0%" }} animate={{ x: "420%" }} transition={{ duration: 1.1, delay: 0.25, ease: [0.4, 0, 0.2, 1] }} />
        <p className="text-sm font-medium text-muted">Streak เพิ่มขึ้น</p>
        <h2 id="cel-t" className="mt-1 text-4xl font-semibold text-primary">
          <Flame /> <Rolling value={streak} from={streak - 1} format={(v) => `${v}`} />/6 <span className="text-lg font-medium text-text">เดือน</span>
        </h2>
        <ol className="mt-4 grid grid-cols-6 gap-1" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="h-1.5 overflow-hidden rounded-sm bg-subtle">
              {i < streak && (
                <motion.span className="block h-full origin-left bg-primary" initial={{ scaleX: i === streak - 1 ? 0 : 1 }} animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.5, ease: EASE }} />
              )}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-muted">{streak >= 6 ? <span className="inline-flex items-center gap-1">ครบแล้ว พร้อมยื่นกู้ <CircleCheck aria-hidden size={16} className="text-success" /></span> : `อีก ${6 - streak} เดือนพร้อมยื่นกู้`}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/dashboard">ไปหน้าหลัก</ButtonLink>
          <Button variant="soft" onClick={onClose} autoFocus>อัปโหลดต่อ</Button>
        </div>
      </motion.section>
    </motion.div>
  );
}

"use client";
import { useRef, useState } from "react";
import { FileUp, KeyRound } from "lucide-react";
import type { Direction } from "@fjm/shared";
import { ApiError, api, errorText, json, type ReviewRow, type Streak, type UploadResult } from "@/lib/api";
import { baht, dateLabel, toSatang } from "@/lib/format";
import { Badge, Button, ButtonLink, Card, ErrorNote, Field, PageTitle, cx } from "@/components/ui";

type Item = {
  key: string;
  file: File;
  status: "uploading" | "password" | "error" | "review" | "done";
  error?: string;
  result?: UploadResult;
  imported?: number;
};

export default function UploadPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const seq = useRef(0);

  const patch = (key: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));

  async function send(item: Item, password?: string) {
    patch(item.key, { status: "uploading", error: undefined });
    const form = new FormData();
    form.append("file", item.file);
    if (password) form.append("password", password);
    try {
      const result = await api<UploadResult>("/uploads", { method: "POST", body: form });
      patch(item.key, { status: "review", result });
      setAnnounce(`${item.file.name}: อ่าน ${result.rows.length} รายการ ตรง ${result.check.okCount} ไม่ตรง ${result.check.failCount}`);
    } catch (e) {
      if (e instanceof ApiError && e.message === "password_required") {
        patch(item.key, { status: "password", error: password ? "รหัสไม่ถูกต้อง ลองอีกครั้ง" : undefined });
        setAnnounce(`${item.file.name}: ต้องใส่รหัส PDF`);
      } else {
        patch(item.key, { status: "error", error: errorText(e) });
        setAnnounce(`${item.file.name}: ${errorText(e)}`);
      }
    }
  }

  async function addFiles(list: FileList | null) {
    const pdfs = [...(list ?? [])].filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!pdfs.length) return setAnnounce("รองรับเฉพาะไฟล์ PDF");
    const added = pdfs.map((file) => ({ key: `${seq.current++}`, file, status: "uploading" as const }));
    setItems((xs) => [...xs, ...added]);
    for (const it of added) await send(it); // sequential: one parse at a time on the server
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="อัปโหลด statement" sub="PDF จาก KBank หรือ Bangkok Bank ได้หลายไฟล์พร้อมกัน แนะนำ 3–6 เดือนล่าสุด" />

      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        className={cx(
          "flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed p-8 text-center transition focus-within:outline focus-within:outline-3 focus-within:outline-primary sm:p-12",
          drag ? "border-primary bg-surface-2 shadow-neu-in" : "border-muted/40 bg-surface shadow-neu",
        )}
      >
        <FileUp aria-hidden size={44} className="text-primary" />
        <span className="text-lg font-semibold">ลากไฟล์ PDF มาวางที่นี่</span>
        <span className="text-muted">หรือ <span className="font-semibold text-primary underline">เลือกไฟล์</span> จากเครื่อง</span>
        <input type="file" accept="application/pdf,.pdf" multiple className="sr-only"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </label>

      <p aria-live="polite" className="sr-only">{announce}</p>

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

  if (item.status === "uploading") return <Card aria-busy><p className="animate-pulse motion-reduce:animate-none">⏳ กำลังอ่าน {item.file.name}…</p></Card>;
  if (item.status === "error") {
    return (
      <Card>
        <p className="mb-3 font-semibold">{item.file.name}</p>
        <ErrorNote>{item.error}</ErrorNote>
      </Card>
    );
  }
  if (item.status === "password") {
    return (
      <Card>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); onRetry(String(new FormData(e.currentTarget).get("password"))); }}>
          <p className="flex items-center gap-2 font-semibold"><KeyRound aria-hidden size={20} /> {item.file.name} ถูกล็อก</p>
          <Field label="รหัสผ่าน PDF" hint="ส่วนใหญ่เป็นวันเกิด (เช่น DDMMYYYY) หรือเลขบัตรประชาชน — ดูในอีเมลจากธนาคาร">
            <input name="password" type="password" required autoComplete="off" />
          </Field>
          {item.error && <ErrorNote>{item.error}</ErrorNote>}
          <Button type="submit" className="self-start">ปลดล็อกและอ่าน</Button>
        </form>
      </Card>
    );
  }
  if (!r) return null;
  if (item.status === "done") {
    return <Card><p className="font-semibold">✅ {item.file.name} — นำเข้า {item.imported} รายการแล้ว</p></Card>;
  }

  const failing = r.rows.filter((row) => !row.ok);
  const passing = r.rows.filter((row) => row.ok);
  const expected = new Map(r.check.rows.map((c) => [c.index, c.expectedBalance]));
  const allOk = r.check.failCount === 0;

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ imported: number; streak: Streak | number }>(`/uploads/${r!.uploadId}/confirm`, json("POST"));
      onConfirmed(res.imported, typeof res.streak === "number" ? res.streak : res.streak.current);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? "ยังมีแถวที่ยอดไม่ตรง แก้ให้ครบก่อนยืนยัน" : errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
        <Badge kind="info">{r.bank === "KBANK" ? "KBank" : "Bangkok Bank"}</Badge>
        <span>{r.accountNoMasked}</span>
        <span>• {dateLabel(r.period.start)} – {dateLabel(r.period.end)}</span>
      </div>
      <h2 className="text-lg font-bold sm:text-xl">
        อ่าน <span className="num">{r.rows.length}</span> รายการ{" "}
        <span className="text-success">✅ ยอดคงเหลือตรง <span className="num">{r.check.okCount}</span> แถว</span>{" "}
        <span className={allOk ? "text-muted" : "text-warning"}>⚠️ ไม่ตรง <span className="num">{r.check.failCount}</span> แถว</span>
      </h2>
      {!r.check.totalsOk && allOk && <p className="mt-1 text-sm text-warning">⚠️ ยอดรวมยังไม่ตรงกับสรุปท้าย statement</p>}

      {failing.length > 0 && (
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-sm text-muted">แก้ตัวเลขให้ตรงกับ PDF แถวจะผ่านเมื่อ ยอดก่อนหน้า ± จำนวนเงิน = ยอดคงเหลือ</p>
          {failing.map((row) => (
            <FailRow key={`${row.index}-${row.amount}-${row.direction}-${row.date}`} row={row}
              expected={expected.get(row.index)} uploadId={r.uploadId}
              onResult={(rows, check) => onUpdate({ ...r, rows, check })} />
          ))}
        </div>
      )}

      {passing.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer font-medium text-primary">ดูแถวที่ผ่าน ({passing.length})</summary>
          <ul className="mt-2 divide-y divide-muted/20 text-sm">
            {passing.map((row) => (
              <li key={row.index} className="flex justify-between gap-3 py-2">
                <span className="min-w-0 truncate">{dateLabel(row.date)} · {row.description}</span>
                <span className={cx("num shrink-0 font-semibold", row.direction === "in" ? "text-success" : "text-text")}>
                  {row.direction === "in" ? "+" : "−"}{baht(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
      <Button onClick={confirm} disabled={!allOk || busy} className="mt-5 w-full sm:w-auto">
        {allOk ? "ยืนยันนำเข้า" : `แก้อีก ${r.check.failCount} แถวก่อนยืนยัน`}
      </Button>
    </Card>
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
      if (!res.rows.find((x) => x.index === row.index)?.ok) setError("ยังไม่ตรง ลองเทียบกับ PDF อีกครั้ง");
      onResult(res.rows, res.check);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={recheck} className="rounded-2xl bg-warning-bg/60 p-4" aria-labelledby={`${id}-t`}>
      <p id={`${id}-t`} className="font-semibold"><Badge kind="warn">⚠️ ไม่ตรง</Badge> <span className="ml-1">แถว {row.index + 1}: {row.description}</span></p>
      <p className="mt-1 text-sm text-muted">
        ยอดคงเหลือใน PDF <span className="num font-semibold text-text">{baht(row.balance)}</span>
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

const COLORS = ["#1D4ED8", "#0EA5E9", "#F59E0B", "#22C55E", "#EF4444", "#A855F7"];
function Celebration({ streak, onClose }: { streak: number; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="cel-t" className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(8_15_30/0.5)] p-4">
      {Array.from({ length: 36 }, (_, i) => (
        <span key={i} aria-hidden className="confetti-piece"
          style={{ left: `${(i * 37) % 100}%`, background: COLORS[i % COLORS.length], animationDelay: `${(i % 9) * 0.12}s` }} />
      ))}
      <section className="glass pop w-full max-w-sm rounded-3xl p-6 text-center">
        <p className="text-6xl" aria-hidden>🔥</p>
        <h2 id="cel-t" className="mt-2 text-2xl font-bold">Streak +1!</h2>
        <p className="num mt-1 text-4xl font-bold text-primary">{streak}/6 เดือน</p>
        <p className="mt-2 text-muted">{streak >= 6 ? "ครบแล้ว พร้อมยื่นกู้ ✅" : `อีก ${6 - streak} เดือนพร้อมยื่นกู้`}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/dashboard">ไปหน้าหลัก</ButtonLink>
          <Button variant="soft" onClick={onClose} autoFocus>อัปโหลดต่อ</Button>
        </div>
      </section>
    </div>
  );
}

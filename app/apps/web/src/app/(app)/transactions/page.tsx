"use client";
import { useRef, useState } from "react";
import { Download, Eye, EyeOff, History, Plus, X } from "lucide-react";
import { CATEGORIES, type Category, type Direction } from "@fjm/shared";
import { api, apiRaw, errorText, json, type Tx, type TxEdit } from "@/lib/api";
import { CATEGORY_LABEL, baht, dateLabel, toSatang } from "@/lib/format";
import { Badge, Button, ButtonLink, Card, ErrorNote, Field, Loading, PageTitle, cx, useApi } from "@/components/ui";

const FIELD_LABEL: Record<string, string> = { category: "หมวด", note: "โน้ต", hidden: "ซ่อน" };

function monthRange(ym: string) {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `?from=${ym}-01&to=${ym}-${last}`;
}

export default function Transactions() {
  const [month, setMonth] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const list = useApi<{ transactions: Tx[] }>(`/transactions${monthRange(month)}`);
  const [historyOf, setHistoryOf] = useState<Tx | null>(null);
  const historyRef = useRef<HTMLDialogElement>(null);
  const addRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");

  async function update(t: Tx, body: Partial<Pick<Tx, "category" | "note" | "hidden">>) {
    setError("");
    try {
      const { transaction } = await api<{ transaction: Tx }>(`/transactions/${t.id}`, json("PATCH", body));
      list.setData({ transactions: list.data!.transactions.map((x) => (x.id === t.id ? transaction : x)) });
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function exportCsv() {
    try {
      const blob = await (await apiRaw("/transactions/export.csv")).blob();
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "firstjobjab-transactions.csv" });
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(errorText(e));
    }
  }

  const rows = (list.data?.transactions ?? []).filter((t) => showHidden || !t.hidden);

  return (
    <div>
      <PageTitle title="รายการเงินเข้า-ออก" sub="แก้หมวดและโน้ตได้ทุกแถว ระบบเก็บประวัติการแก้ไว้ให้"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" onClick={exportCsv}><Download aria-hidden size={18} /> CSV</Button>
            <Button onClick={() => addRef.current?.showModal()}><Plus aria-hidden size={18} /> เพิ่มรายการเอง</Button>
          </div>
        } />

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <Field label="เดือน">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        {month && <Button variant="ghost" onClick={() => setMonth("")}>ดูทั้งหมด</Button>}
        <label className="flex min-h-11 cursor-pointer items-center gap-2">
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} /> แสดงแถวที่ซ่อน
        </label>
      </div>

      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}
      {list.loading ? <Loading /> : list.error ? <ErrorNote>{list.error}</ErrorNote> : rows.length === 0 ? (
        <Card className="text-center">
          <p className="font-semibold">{month ? "เดือนนี้ยังไม่มีรายการ" : "ยังไม่มีรายการ"}</p>
          <p className="mt-1 text-muted">อัปโหลด statement ของเดือนนั้น แล้วรายการจะขึ้นที่นี่</p>
          <ButtonLink href="/upload" className="mt-4">อัปโหลด statement</ButtonLink>
        </Card>
      ) : (
        <Card className="p-0 sm:p-0">
          <div aria-hidden="true" className="hidden grid-cols-[6.5rem_minmax(0,1fr)_11rem_minmax(0,12rem)_8rem_5.5rem] gap-3 border-b border-muted/20 px-5 py-3 text-sm font-semibold text-muted lg:grid">
            <span>วันที่</span><span>รายการ</span><span>หมวด</span><span>โน้ต</span><span className="text-right">จำนวน</span><span className="sr-only">จัดการ</span>
          </div>
          <ul className="divide-y divide-muted/15">
            {rows.map((t) => (
              <li key={t.id} className={cx("grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-4 sm:px-5 lg:grid-cols-[6.5rem_minmax(0,1fr)_11rem_minmax(0,12rem)_8rem_5.5rem] lg:items-center", t.hidden && "opacity-60")}>
                <span className="order-1 text-sm text-muted lg:order-none">{dateLabel(t.date)}{t.time && ` ${t.time}`}</span>
                <span className={cx("num order-2 text-right font-bold lg:order-none lg:hidden", t.direction === "in" ? "text-success" : "text-text")}>
                  {t.direction === "in" ? "+" : "−"}{baht(t.amount)}
                </span>
                <div className="order-3 col-span-2 min-w-0 lg:order-none lg:col-span-1">
                  <p className="truncate font-medium">{t.description}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.verified && <Badge kind="ok">✅ ยืนยันจาก statement</Badge>}
                    {t.source === "manual" && <Badge kind="manual">✋ เพิ่มเอง</Badge>}
                    {t.edited && <Badge kind="edited">✏️ แก้ไข</Badge>}
                    {t.hidden && <Badge kind="info">ซ่อนอยู่</Badge>}
                  </div>
                </div>
                <select aria-label={`หมวดของ ${t.description}`} value={t.category} className="order-4 col-span-2 lg:order-none lg:col-span-1"
                  onChange={(e) => update(t, { category: e.target.value as Category })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </select>
                <input aria-label={`โน้ตของ ${t.description}`} placeholder="เพิ่มโน้ต" defaultValue={t.note ?? ""} className="order-5 col-span-2 lg:order-none lg:col-span-1"
                  onBlur={(e) => e.target.value !== (t.note ?? "") && update(t, { note: e.target.value })} />
                <span className={cx("num hidden text-right font-bold lg:block", t.direction === "in" ? "text-success" : "text-text")}>
                  {t.direction === "in" ? "+" : "−"}{baht(t.amount)}
                </span>
                <div className="order-6 col-span-2 flex justify-end gap-1 lg:order-none lg:col-span-1">
                  <button type="button" className="grid size-11 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
                    aria-label={`ประวัติการแก้ ${t.description}`} onClick={() => { setHistoryOf(t); historyRef.current?.showModal(); }}>
                    <History aria-hidden size={20} />
                  </button>
                  <button type="button" className="grid size-11 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
                    aria-label={`${t.hidden ? "เลิกซ่อน" : "ซ่อน"} ${t.description}`} onClick={() => update(t, { hidden: !t.hidden })}>
                    {t.hidden ? <Eye aria-hidden size={20} /> : <EyeOff aria-hidden size={20} />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <dialog ref={historyRef} aria-labelledby="hist-t" onClose={() => setHistoryOf(null)}
        className="glass m-0 ml-auto h-dvh max-h-dvh w-full max-w-md rounded-l-3xl p-0 text-text">
        {historyOf && <EditHistory tx={historyOf} onClose={() => historyRef.current?.close()} />}
      </dialog>

      <dialog ref={addRef} aria-labelledby="add-t" className="glass m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl p-0 text-text">
        <AddManual onClose={() => addRef.current?.close()} onAdded={(t) => { list.setData({ transactions: [t, ...(list.data?.transactions ?? [])] }); addRef.current?.close(); }} />
      </dialog>
    </div>
  );
}

function EditHistory({ tx, onClose }: { tx: Tx; onClose: () => void }) {
  const h = useApi<{ edits: TxEdit[] }>(`/transactions/${tx.id}/edits`);
  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="hist-t" className="text-xl font-bold">ประวัติการแก้ไข</h2>
          <p className="text-muted">{tx.description}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="ปิด" className="grid size-11 place-items-center rounded-full hover:bg-surface-2"><X aria-hidden /></button>
      </div>
      <p className="mb-4 rounded-2xl bg-surface-2 p-3 text-sm text-muted">ข้อมูลต้นฉบับจาก statement ไม่ถูกเปลี่ยน ระบบเก็บทุกการแก้ต่อท้ายไว้</p>
      {h.loading ? <Loading /> : h.error ? <ErrorNote>{h.error}</ErrorNote> : !h.data?.edits.length ? (
        <p className="text-muted">ยังไม่เคยแก้แถวนี้</p>
      ) : (
        <ol className="flex flex-col gap-3 overflow-y-auto">
          {h.data.edits.map((e, i) => (
            <li key={i} className="rounded-2xl bg-surface p-4 shadow-neu">
              <p className="font-semibold">{FIELD_LABEL[e.field] ?? e.field}</p>
              <p className="text-sm"><span className="text-muted line-through">{fmtVal(e.field, e.oldValue)}</span> → {fmtVal(e.field, e.newValue)}</p>
              <p className="mt-1 text-xs text-muted">{new Date(e.at).toLocaleString("th-TH")}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const fmtVal = (field: string, v: string | null) =>
  !v ? "—" : field === "category" ? CATEGORY_LABEL[v as Category] ?? v : field === "hidden" ? (v === "true" ? "ซ่อน" : "แสดง") : v;

function AddManual({ onClose, onAdded }: { onClose: () => void; onAdded: (t: Tx) => void }) {
  const [direction, setDirection] = useState<Direction>("out");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const amount = toSatang(String(f.get("amount")));
    if (!amount || amount <= 0) return setError("ใส่จำนวนเงินมากกว่า 0");
    setBusy(true);
    setError("");
    try {
      const res = await api<{ transaction?: Tx } & Partial<Tx>>("/transactions", json("POST", {
        date: f.get("date"), amount, direction, description: f.get("description"), category: f.get("category"),
      }));
      onAdded((res.transaction ?? res) as Tx); // API.md doesn't name the wrapper; accept both
      form.reset();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between">
        <h2 id="add-t" className="text-xl font-bold">เพิ่มรายการเอง</h2>
        <button type="button" onClick={onClose} aria-label="ปิด" className="grid size-11 place-items-center rounded-full hover:bg-surface-2"><X aria-hidden /></button>
      </div>
      <p className="text-sm text-muted">เช่น จ่ายเงินสด รายการนี้จะติดป้าย ✋ เพิ่มเอง และไม่นับในสรุปยื่นกู้</p>
      <div role="radiogroup" aria-label="ประเภท" className="grid grid-cols-2 gap-2 rounded-full bg-surface p-1 shadow-neu-in">
        {(["out", "in"] as const).map((d) => (
          <button key={d} type="button" role="radio" aria-checked={direction === d} onClick={() => setDirection(d)}
            className={cx("min-h-11 rounded-full font-semibold", direction === d ? "bg-primary text-on-primary" : "text-muted")}>
            {d === "out" ? "เงินออก" : "เงินเข้า"}
          </button>
        ))}
      </div>
      <Field label="จำนวนเงิน (บาท)"><input name="amount" inputMode="decimal" required className="num text-lg" placeholder="0.00" /></Field>
      <Field label="รายการ"><input name="description" required placeholder="เช่น ข้าวมันไก่" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="วันที่"><input name="date" type="date" required /></Field>
        <Field label="หมวด">
          <select name="category" defaultValue="food">
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        </Field>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button type="submit" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึก"}</Button>
    </form>
  );
}

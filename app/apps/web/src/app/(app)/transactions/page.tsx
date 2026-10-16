"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/shadcn/sheet";
import { BadgeCheck, ChevronLeft, ChevronRight, Eye, EyeOff, Hand, History, Pencil, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES, type Category, type Direction } from "@fjm/shared";
import { api, apiRaw, errorText, json, type Tx, type TxEdit } from "@/lib/api";
import { CATEGORY_LABEL, baht, dateLabel, toSatang } from "@/lib/format";
import { ExportDialog } from "@/components/ExportDialog";
import { Badge, Button, ButtonLink, Card, ErrorNote, Field, Loading, PageTitle, RequiredLegend, cx, useApi } from "@/components/ui";

type Account = { id: string; bank: string; accountNoMasked: string; accountName?: string | null };
type List = { transactions: Tx[]; total?: number; accounts?: Account[] };

/** Category names without the leading emoji (icons over emoji on this page). */
const FIELD_LABEL: Record<string, string> = { category: "หมวด", note: "โน้ต", hidden: "ซ่อน" };
const SIZES = ["20", "50", "100"];
const SORTS = { date_desc: "ใหม่สุดก่อน", date_asc: "เก่าสุดก่อน", amount_desc: "ยอดมากสุดก่อน", amount_asc: "ยอดน้อยสุดก่อน" };
const FILTER_KEYS = ["q", "direction", "category", "accountId", "from", "to", "min", "max", "hidden"];
const nf = new Intl.NumberFormat("th-TH");
const HIDDEN_NOTE = "ซ่อนแล้ว: ไม่นับในสรุปและกราฟ แต่ยังเก็บไว้เป็นหลักฐาน";
const acctLabel = (a: Account) => (a.bank === "CASH" ? a.accountName ?? "เงินสด" : `${a.bank} ${a.accountNoMasked}`);

/** URL query → API query. The URL keeps amounts in baht (min/max) so it reads well; the API wants satang. */
function apiQuery(sp: URLSearchParams) {
  const p = new URLSearchParams();
  for (const k of ["q", "direction", "category", "accountId", "from", "to", "sort", "page", "limit"]) if (sp.get(k)) p.set(k, sp.get(k)!);
  for (const [k, a] of [["min", "minAmount"], ["max", "maxAmount"]]) {
    const s = toSatang(sp.get(k) ?? "");
    if (s !== null && s >= 0) p.set(a, String(s));
  }
  p.set("hidden", sp.get("hidden") === "1" ? "include" : "exclude");
  if (!p.has("limit")) p.set("limit", "50");
  return p.toString();
}

export default function TransactionsPage() {
  return <Suspense fallback={<Loading />}><Transactions /></Suspense>; // useSearchParams needs a Suspense boundary
}

function Transactions() {
  const sp = useSearchParams();
  const get = (k: string) => sp.get(k) ?? "";
  const query = apiQuery(sp);
  const [nonce, setNonce] = useState(0);
  const [res, setRes] = useState<{ key: string; data?: List; error?: string }>({ key: "" });
  const loading = res.key !== `${query}#${nonce}`;
  const [historyOf, setHistoryOf] = useState<Tx | null>(null);
  const historyRef = useRef<HTMLDialogElement>(null);
  const addRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState(false);
  const [more, setMore] = useState(() => ["from", "to", "min", "max", "hidden"].some((k) => sp.get(k)));

  useEffect(() => {
    const ac = new AbortController(); // a newer filter/page cancels the one in flight
    const key = `${query}#${nonce}`;
    // apiRaw, not api(): api() shares identical in-flight GETs, so an aborted one would leak into the next effect
    apiRaw(`/transactions?${query}`, { signal: ac.signal }).then((r) => r.json() as Promise<List>).then(
      (data) => setRes({ key, data }),
      (e) => { if (!ac.signal.aborted) setRes((r) => ({ key, data: r.data, error: errorText(e) })); },
    );
    return () => ac.abort();
  }, [query, nonce]);

  /** Filters live in the URL so refresh/back keep them. Any change except paging goes back to page 1. */
  function set(patch: Record<string, string>, push = true) {
    const p = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) if (v) p.set(k, v); else p.delete(k);
    if (!("page" in patch)) p.delete("page");
    if (p.toString() === sp.toString()) return;
    window.history[push ? "pushState" : "replaceState"](null, "", `?${p}`);
  }
  const clearAll = () => set(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  const goPage = (n: number) => { set({ page: n > 1 ? String(n) : "" }); listRef.current?.scrollIntoView({ block: "start" }); };

  /** Optimistic: apply now, swap in the server row when the PATCH returns, roll back on failure. */
  async function update(t: Tx, body: Partial<Pick<Tx, "category" | "note" | "hidden">>) {
    setError("");
    const drop = body.hidden === true && get("hidden") !== "1"; // hidden rows aren't in this view: remove right away
    const at = rows.findIndex((x) => x.id === t.id);
    const patch = (f: (rs: Tx[]) => Tx[], dTotal = 0) =>
      setRes((r) => ({ ...r, data: r.data && { ...r.data, transactions: f(r.data.transactions), total: r.data.total === undefined ? undefined : r.data.total + dTotal } }));
    const swap = (row: Tx) => (rs: Tx[]) => rs.map((x) => (x.id === t.id ? row : x));
    patch(drop ? (rs) => rs.filter((x) => x.id !== t.id) : swap({ ...t, ...body, edited: true }), drop ? -1 : 0);
    try {
      const { transaction } = await api<{ transaction: Tx }>(`/transactions/${t.id}`, json("PATCH", body));
      if (!drop) patch(swap(transaction));
    } catch (e) {
      patch(drop ? (rs) => (rs.some((x) => x.id === t.id) ? rs : rs.toSpliced(Math.max(0, at), 0, t)) : swap(t), drop ? 1 : 0);
      setError(`บันทึกไม่สำเร็จ: ${errorText(e)}`);
    }
  }

  const data = res.data;
  const rows = data?.transactions ?? [];
  const accounts = data?.accounts ?? [];
  const limit = Number(get("limit")) || 50;
  const page = Math.max(1, Number(get("page")) || 1);
  const total = data?.total ?? rows.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const first = (page - 1) * limit;
  const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const acct = accounts.find((a) => a.id === get("accountId"));
  const chips = ([
    [["q"], get("q") && `“${get("q")}”`],
    [["direction"], get("direction") && (get("direction") === "in" ? "รายรับ" : "รายจ่าย")],
    [["category"], get("category") && CATEGORY_LABEL[get("category") as Category]],
    [["accountId"], get("accountId") && (acct ? acctLabel(acct) : "บัญชีที่เลือก")],
    [["from", "to"], (get("from") || get("to")) && `${get("from") ? dateLabel(get("from")) : "…"} – ${get("to") ? dateLabel(get("to")) : "…"}`],
    [["min", "max"], (get("min") || get("max")) && `฿${get("min") || "0"} – ${get("max") ? `฿${get("max")}` : "ขึ้นไป"}`],
    [["hidden"], get("hidden") && "รวมแถวที่ซ่อน"],
  ] as [string[], string][]).filter(([, label]) => label);

  const controls = (
    <>
      <div role="radiogroup" aria-label="ประเภท" className="grid grid-cols-3 gap-1 rounded border border-line bg-subtle p-1 md:w-60">
        {([["", "ทั้งหมด"], ["in", "รายรับ"], ["out", "รายจ่าย"]] as const).map(([d, label]) => (
          <button key={d} type="button" role="radio" aria-checked={get("direction") === d} onClick={() => set({ direction: d })}
            className={cx("min-h-10 rounded-sm text-sm font-semibold lg:min-h-7", get("direction") === d ? "bg-surface text-text shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-muted hover:text-text")}>
            {label}
          </button>
        ))}
      </div>
      <select aria-label="หมวด" value={get("category")} onChange={(e) => set({ category: e.target.value })} className="md:w-48">
        <option value="">ทุกหมวด</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
      </select>
      <select aria-label="บัญชี" value={get("accountId")} onChange={(e) => set({ accountId: e.target.value })} className="md:w-48">
        <option value="">ทุกบัญชี</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{acctLabel(a)}</option>)}
      </select>
      <details open={more} onToggle={(e) => setMore(e.currentTarget.open)} className="group md:contents">
        <summary className="flex min-h-11 cursor-pointer items-center rounded px-2 text-sm font-medium text-primary hover:bg-subtle lg:min-h-9">
          ตัวกรองเพิ่มเติม
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 md:mt-0 md:flex md:w-full md:flex-wrap md:items-end">
          <Field label="ตั้งแต่วันที่"><input type="date" value={get("from")} max={get("to") || undefined} onChange={(e) => set({ from: e.target.value })} /></Field>
          <Field label="ถึงวันที่"><input type="date" value={get("to")} min={get("from") || undefined} onChange={(e) => set({ to: e.target.value })} /></Field>
          <Field label="ยอดตั้งแต่ (บาท)"><Commit value={get("min")} onCommit={(min) => set({ min })} /></Field>
          <Field label="ถึง (บาท)"><Commit value={get("max")} onCommit={(max) => set({ max })} /></Field>
          <Field label="เรียงตาม">
            <select value={get("sort") || "date_desc"} onChange={(e) => set({ sort: e.target.value === "date_desc" ? "" : e.target.value })}>
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <label className="col-span-2 flex min-h-11 cursor-pointer items-center gap-2 lg:min-h-9">
            <input type="checkbox" checked={get("hidden") === "1"} onChange={(e) => set({ hidden: e.target.checked ? "1" : "" })} /> แสดงแถวที่ซ่อน
          </label>
        </div>
      </details>
    </>
  );

  return (
    <div>
      <PageTitle title="รายรับ–รายจ่าย" sub="ค้นหา กรอง แก้หมวดและโน้ตได้ทุกแถว ระบบเก็บประวัติการแก้ไว้ให้"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportDialog accounts={accounts} />
            <Button onClick={() => addRef.current?.showModal()}><Plus aria-hidden size={18} /> เพิ่มรายการเอง</Button>
          </div>
        } />

      <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-line bg-bg/95 px-4 py-3 sm:-mx-6 sm:px-6 md:top-0 lg:-mx-8 lg:px-8">
        <div className="flex gap-2">
          <SearchBox value={get("q")} onSearch={(q) => set({ q }, false)} />
          <Button variant="soft" className="shrink-0 md:hidden" aria-haspopup="dialog" onClick={() => setSheet(true)}>
            <SlidersHorizontal aria-hidden size={18} /> ตัวกรอง{chips.length > 0 && <span className="num">({chips.length})</span>}
          </Button>
        </div>

        <div className="mt-3 hidden md:flex md:flex-wrap md:items-center md:gap-3">{controls}</div>
        <Sheet open={sheet} onOpenChange={setSheet}>
          <SheetContent side="bottom" showCloseButton={false} aria-describedby={undefined}
            className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-md border-line bg-surface text-text md:hidden">
            <div className="flex items-center justify-between px-4 pt-3">
              <SheetTitle className="text-lg font-bold">ตัวกรอง</SheetTitle>
              <SheetClose className="grid size-11 place-items-center rounded hover:bg-subtle" aria-label="ปิด"><X aria-hidden /></SheetClose>
            </div>
            <div className="flex flex-col gap-4 p-4 pb-6">
              {controls}
              <Button onClick={() => setSheet(false)}>ดู {nf.format(total)} รายการ</Button>
            </div>
          </SheetContent>
        </Sheet>

        {chips.length > 0 && (
          <ul aria-label="ตัวกรองที่ใช้อยู่" className="mt-3 flex flex-wrap items-center gap-2">
            {chips.map(([keys, label]) => (
              <li key={keys[0]} className="flex max-w-full items-center gap-1 rounded-sm border border-line bg-surface py-0.5 pl-2 text-sm">
                <span className="truncate">{label}</span>
                <button type="button" aria-label={`เอาตัวกรอง ${label} ออก`} onClick={() => set(Object.fromEntries(keys.map((k) => [k, ""])))}
                  className="grid size-7 shrink-0 place-items-center rounded-sm text-muted hover:bg-subtle hover:text-text">
                  <X aria-hidden size={14} />
                </button>
              </li>
            ))}
            <li><button type="button" onClick={clearAll} className="min-h-9 px-2 text-sm font-medium text-primary hover:underline">ล้างตัวกรอง</button></li>
          </ul>
        )}
      </div>

      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}
      {!data && loading ? <Loading /> : res.error && !loading ? <ErrorNote>{res.error}</ErrorNote> : rows.length === 0 ? (
        <Card className={cx("text-center transition-opacity", loading && "opacity-60")}>
          {chips.length ? (
            <>
              <p className="font-semibold">ไม่พบรายการที่ตรงกับตัวกรอง</p>
              <p className="mt-1 text-muted">ลองคำค้นที่สั้นลง หรือเอาตัวกรองบางอันออก</p>
              <Button variant="soft" className="mt-4" onClick={clearAll}>ล้างตัวกรอง</Button>
            </>
          ) : page > 1 ? (
            <>
              <p className="font-semibold">หน้านี้ไม่มีรายการแล้ว</p>
              <Button variant="soft" className="mt-4" onClick={() => goPage(1)}>กลับไปหน้าแรก</Button>
            </>
          ) : (
            <>
              <p className="font-semibold">ยังไม่มีรายการ</p>
              <p className="mt-1 text-muted">อัปโหลด statement ของเดือนนั้น แล้วรายการจะขึ้นที่นี่</p>
              <ButtonLink href="/upload" className="mt-4">อัปโหลด statement</ButtonLink>
            </>
          )}
        </Card>
      ) : (
        <>
        <section ref={listRef} aria-busy={loading} className={cx("scroll-mt-40 overflow-hidden rounded-md border border-line bg-surface transition-opacity duration-150", loading && "opacity-60")}>
          <div aria-hidden="true" className="hidden grid-cols-[6.5rem_minmax(0,1fr)_11rem_minmax(0,12rem)_8rem_9.5rem] gap-3 border-b border-line bg-subtle px-5 py-2 text-sm font-medium text-muted lg:grid">
            <span>วันที่</span><span>รายการ</span><span>หมวด</span><span>โน้ต</span><span className="text-right">จำนวน</span><span className="sr-only">จัดการ</span>
          </div>
          <ul className="divide-y divide-line">
            {rows.map((t) => (
              <li key={t.id} className={cx("grid transition-colors duration-150 hover:bg-subtle/60 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3 sm:px-5 lg:py-2 lg:grid-cols-[6.5rem_minmax(0,1fr)_11rem_minmax(0,12rem)_8rem_9.5rem] lg:items-center", t.hidden && "bg-subtle/40 opacity-50 transition-[opacity,background-color] hover:opacity-80 focus-within:opacity-80")}>
                <span className="order-1 text-sm text-muted lg:order-none">{dateLabel(t.date)}{t.time && ` ${t.time}`}</span>
                <span className={cx("num order-2 text-right font-bold lg:order-none lg:hidden", t.hidden ? "text-muted" : t.direction === "in" ? "text-success" : "text-text")}>
                  {t.direction === "in" ? "+" : "−"}{baht(t.amount)}
                </span>
                <div className="order-3 col-span-2 min-w-0 lg:order-none lg:col-span-1">
                  <p className="truncate font-medium">{t.description}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.verified && <Badge kind="ok"><BadgeCheck aria-hidden size={14} /> ยืนยันจาก statement</Badge>}
                    {t.source === "manual" && <Badge kind="manual"><Hand aria-hidden size={14} /> เพิ่มเอง</Badge>}
                    {t.edited && <Badge kind="edited"><Pencil aria-hidden size={14} /> แก้ไข</Badge>}
                    {t.hidden && <span title={HIDDEN_NOTE}><Badge kind="info"><EyeOff aria-hidden size={14} /> ซ่อนแล้ว<span className="sr-only">: ไม่นับในสรุปและกราฟ แต่ยังเก็บไว้เป็นหลักฐาน</span></Badge></span>}
                  </div>
                </div>
                <select aria-label={`หมวดของ ${t.description}`} value={t.category} className="order-4 col-span-2 lg:order-none lg:col-span-1"
                  onChange={(e) => update(t, { category: e.target.value as Category })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </select>
                <input aria-label={`โน้ตของ ${t.description}`} placeholder="เพิ่มโน้ต" defaultValue={t.note ?? ""} className="order-5 lg:order-none"
                  onBlur={(e) => e.target.value !== (t.note ?? "") && update(t, { note: e.target.value })} />
                <span className={cx("num hidden text-right font-bold lg:block", t.hidden ? "text-muted" : t.direction === "in" ? "text-success" : "text-text")}>
                  {t.direction === "in" ? "+" : "−"}{baht(t.amount)}
                </span>
                <div className="order-6 flex justify-end gap-1 lg:order-none">
                  <button type="button" className="grid size-11 place-items-center rounded text-muted hover:bg-subtle hover:text-text"
                    aria-label={`ประวัติการแก้ ${t.description}`} onClick={() => { setHistoryOf(t); historyRef.current?.showModal(); }}>
                    <History aria-hidden size={20} />
                  </button>
                  <button type="button" className="inline-flex min-h-11 items-center gap-1 rounded px-2 text-sm font-medium text-muted hover:bg-subtle hover:text-text"
                    aria-label={`${t.hidden ? "เลิกซ่อน" : "ซ่อน"} ${t.description}`} title={t.hidden ? "เลิกซ่อน: นับในสรุปและกราฟอีกครั้ง" : "ซ่อน: ไม่นับในสรุปและกราฟ"} onClick={() => update(t, { hidden: !t.hidden })}>
                    {t.hidden ? <Eye aria-hidden size={18} /> : <EyeOff aria-hidden size={18} />}<span aria-hidden>{t.hidden ? "เลิกซ่อน" : "ซ่อน"}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label="แบ่งหน้า" className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className="num text-sm text-muted" aria-live="polite">
            แสดง {nf.format(first + 1)}–{nf.format(first + rows.length)} จาก {nf.format(total)} รายการ
          </p>
          <div className="flex items-center gap-1">
            <PageBtn label="หน้าก่อน" disabled={page <= 1} onClick={() => goPage(page - 1)}><ChevronLeft aria-hidden size={18} /></PageBtn>
            <span className="num px-2 text-sm sm:hidden">{page} / {pages}</span>
            {nums.map((n, i) => (
              <span key={n} className="hidden items-center gap-1 sm:flex">
                {i > 0 && n - nums[i - 1] > 1 && <span aria-hidden className="px-1 text-muted">…</span>}
                <PageBtn label={`หน้า ${n}`} current={n === page} onClick={() => goPage(n)}>{nf.format(n)}</PageBtn>
              </span>
            ))}
            <PageBtn label="หน้าถัดไป" disabled={page >= pages} onClick={() => goPage(page + 1)}><ChevronRight aria-hidden size={18} /></PageBtn>
          </div>
          <PageSize limit={limit} onChange={(v) => set({ limit: v === "50" ? "" : v })} />
        </nav>
        </>
      )}

      <dialog ref={historyRef} aria-labelledby="hist-t" onClose={() => setHistoryOf(null)}
        className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-md border-l border-line bg-surface p-0 text-text">
        {historyOf && <EditHistory tx={historyOf} onClose={() => historyRef.current?.close()} />}
      </dialog>

      <dialog ref={addRef} aria-labelledby="add-t" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-md border border-line bg-surface p-0 text-text">
        <AddManual onClose={() => addRef.current?.close()} onAdded={() => { setNonce((n) => n + 1); addRef.current?.close(); }} />
      </dialog>
    </div>
  );
}

/** Debounced search. Ignores keystrokes while a Thai IME is composing, then searches once composition ends. */
function SearchBox({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  const [composing, setComposing] = useState(false);
  if (value !== prev) { // URL changed from outside (back button, chip ×): follow it
    setPrev(value);
    if (text.trim() !== value) setText(value);
  }
  useEffect(() => {
    if (composing || text.trim() === value) return;
    const t = setTimeout(() => onSearch(text.trim()), 250);
    return () => clearTimeout(t);
  }, [text, composing, value, onSearch]);
  return (
    <form role="search" className="relative min-w-0 flex-1" onSubmit={(e) => { e.preventDefault(); onSearch(text.trim()); }}>
      <Search aria-hidden size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
      <input type="search" aria-label="ค้นหารายการ" placeholder="ค้นหา รายการ โน้ต หรือหมวด" value={text} maxLength={100}
        className="w-full" style={{ paddingLeft: "2.25rem" }}
        onChange={(e) => setText(e.target.value)}
        onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} />
    </form>
  );
}

/** Text input that reports on blur/Enter, not every keystroke (amounts). */
function Commit({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  return (
    <input key={value} inputMode="decimal" className="num md:w-32" placeholder="0.00" defaultValue={value}
      onBlur={(e) => { const s = toSatang(e.target.value); onCommit(s !== null && s >= 0 ? e.target.value.replace(/,/g, "").trim() : ""); }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
  );
}

function PageBtn({ label, current, ...p }: React.ComponentProps<"button"> & { label: string; current?: boolean }) {
  return (
    <button type="button" aria-label={label} aria-current={current ? "page" : undefined} {...p}
      className={cx("num grid min-w-11 h-11 place-items-center rounded px-2 text-sm lg:h-9 lg:min-w-9 disabled:opacity-40",
        current ? "bg-primary-soft font-semibold text-primary" : "text-text enabled:hover:bg-subtle")} />
  );
}

/** Rows per page: 20 / 50 / 100 or a custom 1–500. */
function PageSize({ limit, onChange }: { limit: number; onChange: (v: string) => void }) {
  const [custom, setCustom] = useState(!SIZES.includes(String(limit)));
  const apply = (el: HTMLInputElement) => {
    const n = Math.min(500, Math.max(1, Math.round(Number(el.value)) || limit));
    el.value = String(n);
    onChange(String(n));
  };
  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="flex items-center gap-2 text-muted">
        แถวต่อหน้า
        <select value={custom ? "custom" : String(limit)} className="text-text"
          onChange={(e) => { const v = e.target.value; setCustom(v === "custom"); if (v !== "custom") onChange(v); }}>
          {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="custom">กำหนดเอง</option>
        </select>
      </label>
      {custom && (
        <input key={limit} type="number" min={1} max={500} defaultValue={limit} aria-label="จำนวนแถวต่อหน้า (1–500)" className="num w-20"
          onBlur={(e) => apply(e.currentTarget)} onKeyDown={(e) => e.key === "Enter" && apply(e.currentTarget)} />
      )}
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
        <button type="button" onClick={onClose} aria-label="ปิด" className="grid size-11 place-items-center rounded hover:bg-subtle"><X aria-hidden /></button>
      </div>
      <p className="mb-4 rounded bg-subtle p-3 text-sm text-muted">ข้อมูลต้นฉบับจาก statement ไม่ถูกเปลี่ยน ระบบเก็บทุกการแก้ต่อท้ายไว้</p>
      {h.loading ? <Loading /> : h.error ? <ErrorNote>{h.error}</ErrorNote> : !h.data?.edits.length ? (
        <p className="text-muted">ยังไม่เคยแก้แถวนี้</p>
      ) : (
        <ol className="flex flex-col gap-3 overflow-y-auto">
          {h.data.edits.map((e, i) => (
            <li key={i} className="rounded bg-surface p-4 border border-line">
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
        <button type="button" onClick={onClose} aria-label="ปิด" className="grid size-11 place-items-center rounded hover:bg-subtle"><X aria-hidden /></button>
      </div>
      <p className="text-sm text-muted">เช่น จ่ายเงินสด รายการนี้จะติดป้าย “เพิ่มเอง” และไม่นับในสรุปยื่นกู้</p>
      <div role="radiogroup" aria-label="ประเภท" className="grid grid-cols-2 gap-1 rounded bg-subtle p-1 border border-line">
        {(["out", "in"] as const).map((d) => (
          <button key={d} type="button" role="radio" aria-checked={direction === d} onClick={() => setDirection(d)}
            className={cx("min-h-10 rounded-sm text-sm font-semibold", direction === d ? "bg-primary text-on-primary" : "text-muted")}>
            {d === "out" ? "รายจ่าย" : "รายรับ"}
          </button>
        ))}
      </div>
      <Field label="จำนวนเงิน (บาท)" required><input name="amount" inputMode="decimal" required className="num text-lg" placeholder="0.00" /></Field>
      <Field label="รายการ" required><input name="description" required placeholder="เช่น ข้าวมันไก่" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="วันที่" required><input name="date" type="date" required /></Field>
        <Field label="หมวด">
          <select name="category" defaultValue="food">
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        </Field>
      </div>
      <RequiredLegend />
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button type="submit" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึก"}</Button>
    </form>
  );
}

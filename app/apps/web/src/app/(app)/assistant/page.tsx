"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square, TriangleAlert } from "lucide-react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { EASE } from "@/components/motion";
import { ApiError, api, errorText, json, type ChatMsg, type ChatReply, type DataRow, type VoiceReply } from "@/lib/api";
import { Button, ErrorNote, PageTitle, cx } from "@/components/ui";

const STARTERS = ["เดือนนี้ใช้ไปเท่าไหร่", "ใช้เงินกับอะไรมากสุด", "ภาษีปีนี้", "กู้ได้เท่าไหร่", "streak ตอนนี้"];
type Msg = ChatMsg & { data?: DataRow[] };

export default function Assistant() {
  const [mode, setMode] = useState<"chat" | "voice">("chat");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // braces: scrollIntoView may return a Promise, which React would treat as a cleanup fn and crash
  useEffect(() => { if (msgs.length) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [msgs]);
  const history = (extra: Msg[] = []) => [...msgs, ...extra].map(({ role, content }) => ({ role, content }));

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setBusy(true);
    setError("");
    try {
      const r = await api<ChatReply>("/chat", json("POST", { messages: next.map(({ role, content }) => ({ role, content })) }));
      setMsgs([...next, { role: "assistant", content: r.reply, data: r.data }]);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function sendVoice(blob: Blob) {
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("audio", blob, "voice.webm");
    form.append("history", JSON.stringify(history()));
    try {
      const r = await api<VoiceReply>("/chat/voice", { method: "POST", body: form });
      setMsgs((m) => [...m, { role: "user", content: r.transcript }, { role: "assistant", content: r.reply, data: r.data }]);
      if (r.audio) new Audio(`data:audio/mpeg;base64,${r.audio}`).play().catch(() => {});
    } catch (e) {
      if (e instanceof ApiError && (e.status === 503 || e.message === "voice_unavailable")) {
        setNotice("ยังไม่ได้ตั้งค่าเสียง ใช้แชทแทนได้");
        setMode("chat");
      } else setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageTitle title="ผู้ช่วย" sub="ถามเรื่องเงินในบัญชีของคุณเอง ตอบจากข้อมูล statement ที่ยืนยันแล้ว"
        action={
          <div role="radiogroup" aria-label="โหมด" className="grid grid-cols-2 gap-1 rounded border border-line bg-subtle p-1">
            {(["chat", "voice"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => { setMode(m); setNotice(""); }}
                className={cx("min-h-9 rounded-sm px-4 text-sm font-semibold", mode === m ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-text")}>
                {m === "chat" ? "แชท" : "เสียง"}
              </button>
            ))}
          </div>
        } />

      {notice && <p role="status" className="mb-4 flex gap-1.5 rounded border border-warning/30 bg-warning-bg px-4 py-2.5 text-sm text-warning"><TriangleAlert aria-hidden size={16} className="mt-0.5 shrink-0" />{notice}</p>}

      <section aria-label="บทสนทนา" aria-live="polite" className="flex min-h-64 flex-col gap-4 rounded-md border border-line bg-surface p-4 sm:p-5">
        {msgs.length === 0 && (
          <div>
            <p className="text-muted">ลองถาม</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {STARTERS.map((q) => (
                <li key={q}>
                  <button type="button" onClick={() => { setMode("chat"); ask(q); }}
                    className="min-h-10 rounded border border-line-strong px-3 text-sm hover:border-primary hover:text-primary">{q}</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {msgs.map((m, i) => (
          <motion.div key={i} className={cx("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            <p className={cx("max-w-[85%] rounded px-3.5 py-2.5 whitespace-pre-wrap", m.role === "user" ? "bg-primary text-on-primary" : "border border-line bg-subtle")}>
              <span className="sr-only">{m.role === "user" ? "คุณ: " : "ผู้ช่วย: "}</span>{m.content}
            </p>
            {m.data && m.data.length > 0 && <DataTable rows={m.data} />}
          </motion.div>
        ))}
        {busy && (
          <p role="status" className="flex items-center gap-1 rounded border border-line bg-subtle px-3.5 py-3 self-start">
            <span className="sr-only">กำลังคิด…</span>
            {[0, 1, 2].map((d) => (
              <motion.span key={d} aria-hidden className="size-1.5 rounded-full bg-muted"
                animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }} />
            ))}
          </p>
        )}
        <div ref={endRef} />
      </section>

      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}

      <div className="sticky bottom-16 mt-4 md:bottom-4">
        {mode === "chat" ? (
          <form className="flex gap-2 rounded-md border border-line bg-surface p-2 shadow-pop"
            onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; ask(String(new FormData(f).get("q"))); f.reset(); }}>
            <input name="q" aria-label="พิมพ์คำถาม" placeholder="เช่น เดือนนี้ใช้ไปเท่าไหร่" autoComplete="off" className="flex-1" />
            <Button type="submit" disabled={busy}><Send aria-hidden size={16} /> ส่ง</Button>
          </form>
        ) : (
          <Recorder disabled={busy} onDone={sendVoice} onError={setError} />
        )}
      </div>
    </div>
  );
}

function DataTable({ rows }: { rows: DataRow[] }) {
  const cols = Object.keys(rows[0]);
  return (
    <div className="max-w-full overflow-x-auto rounded border border-line">
      <table className="text-sm">
        <thead className="bg-subtle text-left text-muted">
          <tr>{cols.map((c) => <th key={c} scope="col" className="px-3 py-1.5 font-medium">{c}</th>)}</tr>
        </thead>
        <tbody className="num divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c} className={cx("px-3 py-1.5 whitespace-nowrap", typeof r[c] === "number" && "text-right")}>
                  {typeof r[c] === "number" ? (r[c] as number).toLocaleString("th-TH") : r[c] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Tap to start, tap to stop (more accessible than hold-to-talk). */
function Recorder({ disabled, onDone, onError }: { disabled: boolean; onDone: (b: Blob) => void; onError: (s: string) => void }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const level = useMotionValue(0); // 0..1 mic loudness
  const ring = useTransform(level, (v) => 1 + v * 0.45);

  async function toggle() {
    if (rec) return rec.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      // audio-level ring: RMS of the mic signal, sampled per frame while recording
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      let raf = 0;
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (const b of buf) sum += ((b - 128) / 128) ** 2;
        level.set(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        raf = requestAnimationFrame(tick);
      };
      tick();
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        cancelAnimationFrame(raf);
        ctx.close();
        level.set(0);
        stream.getTracks().forEach((t) => t.stop());
        setRec(null);
        onDone(new Blob(chunks, { type: r.mimeType || "audio/webm" }));
      };
      r.start();
      setRec(r);
    } catch {
      onError("เปิดไมโครโฟนไม่ได้ อนุญาตการใช้ไมค์ในเบราว์เซอร์ หรือใช้แชทแทน");
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-line bg-surface p-5 shadow-pop">
      <div className="relative grid place-items-center">
      {rec && <motion.span aria-hidden className="absolute size-20 rounded-full border-2 border-danger/60" style={{ scale: ring }} />}
      <button type="button" onClick={toggle} disabled={disabled} aria-pressed={!!rec}
        className={cx("relative grid size-20 place-items-center rounded-full text-on-primary transition-[background-color,transform] duration-150 active:scale-95 disabled:opacity-50",
          rec ? "bg-danger" : "bg-primary hover:bg-primary-hover")}>
        {rec ? <Square aria-hidden size={28} /> : <Mic aria-hidden size={30} />}
        <span className="sr-only">{rec ? "หยุดอัดเสียงและส่ง" : "เริ่มอัดเสียง"}</span>
      </button>
      </div>
      <p className="text-sm text-muted" aria-live="polite">{rec ? "กำลังฟัง… แตะอีกครั้งเพื่อส่ง" : disabled ? "กำลังตอบ…" : "แตะเพื่อพูดคำถาม"}</p>
    </div>
  );
}

"use client";
import { useState } from "react";
import { CircleAlert, CircleCheck, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { isThaiNationalId, normalizeThaiPhone } from "@fjm/shared";
import { ApiError, api, errorText, json, type Profile } from "@/lib/api";
import { Input } from "@/components/shadcn/input";
import { Button, ErrorNote, Field, RequiredLegend } from "./ui";

/** Thai national ID checksum (13 digits). */
export const validThaiId = isThaiNationalId;

const digits = (s: string, max: number) => s.replace(/\D/g, "").slice(0, max);
/** 1-2345-67890-12-3 */
export const fmtThaiId = (s: string) => [[0, 1], [1, 5], [5, 10], [10, 12], [12, 13]].map(([a, b]) => s.slice(a, b)).filter(Boolean).join("-");
/** 081-234-5678 */
export const fmtPhone = (s: string) => [s.slice(0, 3), s.slice(3, 6), s.slice(6)].filter(Boolean).join("-");

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const THIS_YEAR = new Date().getFullYear();

/** Day / Thai month / พ.ศ. year selects → `YYYY-MM-DD` (ค.ศ.) or "" until complete. Renders a hidden input for FormData. */
export function ThaiDateInput({ name, value, onChange, required, id }: { name?: string; value: string; onChange: (iso: string) => void; required?: boolean; id?: string }) {
  const [parts, setParts] = useState(() => value.split("-"));
  const [seen, setSeen] = useState(value);
  if (value !== seen) { setSeen(value); if (value) setParts(value.split("-")); } // external reset (adjust-during-render, no effect)
  const [y = "", m = "", d = ""] = parts;
  function set(i: number, v: string) {
    const next = [y, m, d];
    next[i] = v;
    setParts(next);
    const [ny, nm, nd] = next;
    const iso = ny && nm && nd ? `${ny}-${nm}-${nd}` : "";
    onChange(iso && !Number.isNaN(Date.parse(iso)) && new Date(iso).getUTCDate() === Number(nd) ? iso : "");
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="grid grid-cols-[4.5rem_1fr_6rem] gap-2">
      {name && <input type="hidden" name={name} value={value} />}
      <select id={id} aria-label="วัน" required={required} value={d} onChange={(e) => set(2, e.target.value)}>
        <option value="">วัน</option>
        {Array.from({ length: 31 }, (_, i) => <option key={i} value={pad(i + 1)}>{i + 1}</option>)}
      </select>
      <select aria-label="เดือน" required={required} value={m} onChange={(e) => set(1, e.target.value)}>
        <option value="">เดือน</option>
        {MONTHS.map((t, i) => <option key={t} value={pad(i + 1)}>{t}</option>)}
      </select>
      <select aria-label="ปี พ.ศ." required={required} value={y} onChange={(e) => set(0, e.target.value)}>
        <option value="">ปี พ.ศ.</option>
        {Array.from({ length: 80 }, (_, i) => THIS_YEAR - 15 - i).map((ce) => <option key={ce} value={String(ce)}>{ce + 543}</option>)}
      </select>
    </div>
  );
}

export function PiiForm({ onDone, onSkip, submitLabel = "บันทึก", skipLabel = "ข้าม — ถามรหัสทุกครั้ง", hideWhy }: { onDone: () => void; onSkip?: () => void; submitLabel?: string; skipLabel?: string; hideWhy?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [birthDate, setBirthDate] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nationalId = String(f.get("nationalId")).replace(/\D/g, "");
    if (!birthDate) return setError("เลือกวันเกิดให้ครบ วัน เดือน ปี");
    if (!validThaiId(nationalId)) return setError("เลขบัตรประชาชนไม่ถูกต้อง (13 หลัก)");
    setBusy(true);
    setError("");
    try {
      await api("/profile/pii", json("PUT", { birthDate, nationalId }));
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {!hideWhy && <div className="rounded bg-subtle p-4 text-sm">
        <p className="flex items-center gap-1.5 font-semibold"><LockKeyhole aria-hidden size={16} />ทำไมถึงขอข้อมูลนี้?</p>
        <p className="mt-1 text-muted">
          ไฟล์ statement จากธนาคารล็อกด้วยรหัสที่มาจากวันเกิดหรือเลขบัตรประชาชน เราใช้ข้อมูลนี้<strong className="text-text">เพื่อปลดล็อก PDF เท่านั้น</strong> เก็บแบบเข้ารหัส ไม่แสดงใน log และไม่ส่งให้ AI ไม่อยากให้จำ? กดข้ามแล้วกรอกรหัส PDF เองทุกครั้งได้
        </p>
      </div>}
      <Field label="วันเกิด" required>
        <ThaiDateInput value={birthDate} onChange={setBirthDate} required />
      </Field>
      <Field label="เลขบัตรประชาชน" required hint="13 หลัก ไม่ต้องใส่ขีด">
        <input name="nationalId" inputMode="numeric" required autoComplete="off" maxLength={17} pattern="[\d\- ]{13,17}" />
      </Field>
      <RequiredLegend />
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" pending={busy}>{submitLabel}</Button>
        {onSkip && <Button variant="soft" onClick={onSkip}>{skipLabel}</Button>}
      </div>
    </form>
  );
}

export const CONSENTS = [
  { purpose: "terms", title: "ข้อกำหนดการใช้งาน", text: "ยอมรับตอนสมัคร", required: true },
  { purpose: "privacy", title: "นโยบายความเป็นส่วนตัว", text: "ยอมรับตอนสมัคร", required: true },
  { purpose: "planning", title: "ใช้ข้อมูลเพื่อวางแผนการเงินของฉัน", text: "จำเป็นต่อการใช้งาน: อ่าน statement สรุปรายรับรายจ่าย ภาษี และกราฟเงินโต", required: true },
  { purpose: "loan_summary", title: "สรุปประวัติเพื่อยื่นกู้", text: "สร้างสรุป 6 เดือนจาก statement ต้นฉบับ เมื่อฉันกดขอเท่านั้น", required: false },
  { purpose: "improve", title: "ช่วยพัฒนาระบบ (ไม่ระบุตัวตน)", text: "ใช้ข้อมูลแบบลบชื่อและเลขบัญชีแล้ว เพื่อปรับปรุงการอ่าน statement และหมวดหมู่", required: false },
] as const;

const FIELD_ERR: Record<string, string> = {
  required: "กรอกช่องนี้", too_short: "สั้นเกินไป", too_long: "ยาวเกินไป", invalid_phone: "เบอร์มือถือ 10 หลัก ขึ้นต้น 06 08 หรือ 09",
  invalid_national_id: "เลขบัตรไม่ถูกต้อง ตรวจทีละหลักอีกครั้ง", invalid_date: "เลือกวันเกิดให้ครบ", invalid_salary: "ใส่จำนวนเงินที่ถูกต้อง",
};

/** Settings › บัญชีของฉัน: whole personal-info form (GET/PUT /profile). */
export function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: (p: Profile) => void }) {
  const [v, setV] = useState({
    displayName: profile.displayName, fullName: profile.fullName ?? "", phone: profile.phone ?? "", birthDate: profile.birthDate ?? "",
    nationalId: "", salary: profile.monthlySalary == null ? "" : String(Math.round(profile.monthlySalary / 100)),
  });
  const [clearId, setClearId] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErr, setServerErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (x: string) => { setV((o) => ({ ...o, [k]: x })); setServerErr((e) => ({ ...e, [k === "salary" ? "monthlySalary" : k]: "" })); };
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  const err: Record<string, string> = {
    displayName: v.displayName.trim() ? "" : FIELD_ERR.required,
    fullName: v.fullName.trim() && v.fullName.trim().length < 2 ? FIELD_ERR.too_short : "",
    phone: v.phone && !normalizeThaiPhone(v.phone) ? FIELD_ERR.invalid_phone : "",
    nationalId: v.nationalId && !isThaiNationalId(v.nationalId) ? (v.nationalId.length < 13 ? "ต้องมี 13 หลัก" : FIELD_ERR.invalid_national_id) : "",
  };
  const show = (k: string) => serverErr[k === "salary" ? "monthlySalary" : k] || (touched[k] ? err[k] : "");
  const willHaveId = isThaiNationalId(v.nationalId) || (profile.hasNationalId && !clearId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ displayName: true, fullName: true, phone: true, nationalId: true });
    if (Object.values(err).some(Boolean)) return toast.error("ตรวจช่องที่มีสีแดงอีกครั้ง");
    const body: Record<string, unknown> = {
      displayName: v.displayName.trim(), fullName: v.fullName.trim() || null, phone: v.phone ? normalizeThaiPhone(v.phone) : null,
      birthDate: v.birthDate || null, monthlySalary: v.salary ? Number(v.salary) : null,
    };
    if (v.nationalId) body.nationalId = v.nationalId;
    else if (clearId) body.nationalId = null;
    setBusy(true);
    try {
      const p = await api<Profile>("/profile", json("PUT", body));
      setV((o) => ({ ...o, nationalId: "" }));
      setClearId(false);
      onSaved(p);
      toast.success("บันทึกข้อมูลส่วนตัวแล้ว");
    } catch (x) {
      const fields = x instanceof ApiError ? x.fields : undefined;
      if (fields) setServerErr(Object.fromEntries(Object.entries(fields).map(([k, c]) => [k, FIELD_ERR[c] ?? c])));
      toast.error(fields ? "ตรวจช่องที่มีสีแดงอีกครั้ง" : errorText(x));
    } finally {
      setBusy(false);
    }
  }

  const msg = (k: string) => show(k) && <span id={`pf-${k}-e`} className="text-sm font-medium text-danger">{show(k)}</span>;
  const aria = (k: string) => ({ "aria-invalid": !!show(k) || undefined, "aria-describedby": show(k) ? `pf-${k}-e` : undefined });

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Field label="ชื่อแสดงผล (ชื่อเล่น)" required>
        <Input value={v.displayName} onChange={(e) => set("displayName")(e.target.value)} onBlur={blur("displayName")} maxLength={60} autoComplete="nickname" className="h-11 lg:h-10" {...aria("displayName")} />
        {msg("displayName")}
      </Field>
      <Field label="ชื่อจริง-นามสกุล" hint={!show("fullName") && "ตามบัตรประชาชน ใช้กรอกแบบยื่นภาษีให้"}>
        <Input value={v.fullName} onChange={(e) => set("fullName")(e.target.value)} onBlur={blur("fullName")} maxLength={120} autoComplete="name" placeholder="เช่น สมหญิง ใจดี" className="h-11 lg:h-10" {...aria("fullName")} />
        {msg("fullName")}
      </Field>
      <Field label="เบอร์โทรศัพท์มือถือ">
        <Input value={fmtPhone(digits(v.phone.replace(/^\+?66/, "0"), 10))} onChange={(e) => set("phone")(digits(e.target.value, 10))} onBlur={blur("phone")}
          inputMode="tel" autoComplete="tel-national" placeholder="08x-xxx-xxxx" className="num h-11 lg:h-10" {...aria("phone")} />
        {msg("phone")}
      </Field>
      <Field label="อีเมล" hint="ใช้เข้าสู่ระบบ ยังเปลี่ยนเองไม่ได้ ติดต่อทีมงานถ้าต้องการเปลี่ยน">
        <Input value={profile.email} readOnly aria-readonly className="h-11 bg-subtle text-muted lg:h-10" />
      </Field>
      <Field label="วันเกิด" hint="ใช้ปลดล็อกไฟล์ statement และคำนวณภาษี">
        <ThaiDateInput value={v.birthDate} onChange={set("birthDate")} />
        {msg("birthDate")}
      </Field>
      <Field label="เงินเดือน (ต่อเดือน)" hint={!show("salary") && "ไม่บังคับ ใช้ประมาณภาษีก่อนมี statement"}>
        <span className="relative block">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">฿</span>
          <Input value={v.salary ? Number(v.salary).toLocaleString("en-US") : ""} onChange={(e) => set("salary")(digits(e.target.value, 8))}
            inputMode="numeric" placeholder="25,000" className="num h-11 pl-7 lg:h-10" {...aria("salary")} />
        </span>
        {msg("salary")}
      </Field>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Field label="เลขประจำตัวประชาชน 13 หลัก" hint={profile.hasNationalId && !clearId ? `บันทึกไว้แล้ว: ${profile.nationalIdMasked} · กรอกใหม่เพื่อเปลี่ยน` : "ไม่บังคับ เก็บแบบเข้ารหัส"}>
          <Input value={fmtThaiId(v.nationalId)} onChange={(e) => { set("nationalId")(digits(e.target.value, 13)); setClearId(false); }} onBlur={blur("nationalId")}
            inputMode="numeric" autoComplete="off" placeholder={profile.hasNationalId && !clearId ? profile.nationalIdMasked! : "1-2345-67890-12-3"} className="num h-11 lg:h-10" {...aria("nationalId")} />
          {msg("nationalId")}
        </Field>
        {willHaveId ? (
          <p className="flex items-start gap-2 rounded-md bg-success-bg px-3 py-2.5 text-sm text-success">
            <CircleCheck aria-hidden size={16} className="mt-0.5 shrink-0" />
            <span>ส่งออกได้ทั้ง statement และชุดยื่นภาษีเงินได้บุคคลธรรมดาแบบกรอกข้อมูลให้แล้ว
              {profile.hasNationalId && !v.nationalId && <> · <button type="button" className="underline" onClick={() => setClearId(true)}>ลบเลขบัตรออก</button></>}</span>
          </p>
        ) : (
          <p className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-bg px-3 py-2.5 text-sm text-warning">
            <CircleAlert aria-hidden size={16} className="mt-0.5 shrink-0" />
            <span>ถ้าไม่ใส่เลขบัตร จะส่งออกได้<strong>เฉพาะ statement</strong> ยังสร้างชุดยื่นภาษีเงินได้บุคคลธรรมดาแบบกรอกให้ไม่ได้{clearId && " (จะลบเมื่อกดบันทึก)"}</span>
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <RequiredLegend />
        <Button type="submit" pending={busy} className="max-sm:w-full">บันทึกข้อมูล</Button>
      </div>
    </form>
  );
}

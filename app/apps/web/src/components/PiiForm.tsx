"use client";
import { useState } from "react";
import { api, errorText, json } from "@/lib/api";
import { Button, ErrorNote, Field, RequiredLegend } from "./ui";

/** Thai national ID checksum (13 digits). */
export function validThaiId(id: string) {
  if (!/^\d{13}$/.test(id)) return false;
  const sum = [...id.slice(0, 12)].reduce((s, d, i) => s + Number(d) * (13 - i), 0);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

export function PiiForm({ onDone, onSkip, submitLabel = "บันทึก" }: { onDone: () => void; onSkip?: () => void; submitLabel?: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nationalId = String(f.get("nationalId")).replace(/\D/g, "");
    if (!validThaiId(nationalId)) return setError("เลขบัตรประชาชนไม่ถูกต้อง (13 หลัก)");
    setBusy(true);
    setError("");
    try {
      await api("/profile/pii", json("PUT", { birthDate: f.get("birthDate"), nationalId }));
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="rounded bg-subtle p-4 text-sm">
        <p className="font-semibold">🔐 ทำไมถึงขอข้อมูลนี้?</p>
        <p className="mt-1 text-muted">
          ไฟล์ statement จากธนาคารล็อกด้วยรหัสที่มาจากวันเกิดหรือเลขบัตรประชาชน เราใช้ข้อมูลนี้<strong className="text-text">เพื่อปลดล็อก PDF เท่านั้น</strong> เก็บแบบเข้ารหัส ไม่แสดงใน log และไม่ส่งให้ AI ไม่อยากให้จำ? กดข้ามแล้วกรอกรหัส PDF เองทุกครั้งได้
        </p>
      </div>
      <Field label="วันเกิด" required>
        <input name="birthDate" type="date" required autoComplete="bday" />
      </Field>
      <Field label="เลขบัตรประชาชน" required hint="13 หลัก ไม่ต้องใส่ขีด">
        <input name="nationalId" inputMode="numeric" required autoComplete="off" maxLength={17} pattern="[\d\- ]{13,17}" />
      </Field>
      <RequiredLegend />
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>{busy ? "กำลังบันทึก…" : submitLabel}</Button>
        {onSkip && <Button variant="soft" onClick={onSkip}>ข้าม — ถามรหัสทุกครั้ง</Button>}
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

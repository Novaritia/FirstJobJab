"use client";
import Link from "next/link";
import { useState } from "react";
import { api, errorText, json } from "@/lib/api";
import { LEGAL_VERSION } from "./LegalPage";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./shadcn/dialog";
import { Button, ErrorNote } from "./ui";

/** Blocking: shown when /auth/me says the accepted terms/privacy are older than the current version. */
export function Reconsent({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    setError("");
    try {
      await api("/profile/reconsent", json("POST", { termsVersion: LEGAL_VERSION, privacyVersion: LEGAL_VERSION }));
      onDone();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Dialog open>
      <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>ข้อกำหนดและนโยบายมีการเปลี่ยนแปลง</DialogTitle>
          <DialogDescription>ฉบับใหม่ ({LEGAL_VERSION}) อ่านก่อนใช้งานต่อ</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>ระบุผู้ประมวลผลข้อมูลและการส่งข้อมูลไปต่างประเทศ (cloud, Google Gemini, ElevenLabs)</li>
          <li>ระยะเวลาเก็บข้อมูล: แพ็กเกจฟรี 2 ปี ประวัติการเข้าสู่ระบบ 90 วัน</li>
          <li>สิทธิของคุณ: ขอดู ส่งออก แก้ไข ลบ และถอนความยินยอม</li>
        </ul>
        <p className="text-sm">
          อ่านฉบับเต็ม: <Link href="/terms" target="_blank" className="font-medium text-primary underline">ข้อกำหนดการใช้งาน</Link> ·{" "}
          <Link href="/privacy" target="_blank" className="font-medium text-primary underline">นโยบายความเป็นส่วนตัว</Link>
        </p>
        {error && <ErrorNote>{error}</ErrorNote>}
        <DialogFooter className="gap-2 sm:justify-between">
          <Link href="/settings" className="inline-flex min-h-11 items-center text-sm font-medium text-danger hover:underline">ไม่ยอมรับ — ลบบัญชี</Link>
          <Button onClick={accept} disabled={busy}>{busy ? "กำลังบันทึก…" : "ยอมรับและใช้งานต่อ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { api, errorText, json, type AuditEntry, type Consent, type Purpose } from "@/lib/api";
import { CONSENTS, PiiForm } from "@/components/PiiForm";
import { Button, Card, ErrorNote, Loading, PageTitle, cx, useApi } from "@/components/ui";
import { useUser } from "@/components/user";

const ACTION_LABEL: Record<string, string> = {
  login_ok: "เข้าสู่ระบบ", login_fail: "เข้าสู่ระบบไม่สำเร็จ", logout: "ออกจากระบบ", register: "สมัครสมาชิก",
  upload: "อัปโหลดไฟล์", review_fix_row: "แก้ยอดที่อ่านผิด", confirm_import: "ยืนยันนำเข้า statement",
  pii_change: "อัปเดตข้อมูลปลดล็อก PDF", consent_give: "ให้ความยินยอม", consent_withdraw: "ถอนความยินยอม",
  edit_row: "แก้ไขรายการ", hide_row: "ซ่อนรายการ", manual_row: "เพิ่มรายการเอง", export: "ดาวน์โหลด CSV",
};

export default function Settings() {
  const router = useRouter();
  const user = useUser();
  const consents = useApi<{ consents: Consent[] }>("/profile/consents");
  const audit = useApi<{ entries: AuditEntry[] }>("/audit");
  const [editPii, setEditPii] = useState(false);
  const [piiSaved, setPiiSaved] = useState(false);
  const [error, setError] = useState("");

  async function toggle(purpose: Purpose, granted: boolean) {
    setError("");
    try {
      await api("/profile/consents", json("PUT", { purpose, granted }));
      consents.reload();
      audit.reload();
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function logout() {
    await api("/auth/logout", json("POST")).catch(() => {});
    router.replace("/login");
  }

  const granted = (p: Purpose) => consents.data?.consents.find((c) => c.purpose === p)?.granted ?? false;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="ตั้งค่า" sub={user?.email} action={<Button variant="danger" onClick={logout}><LogOut aria-hidden size={18} /> ออกจากระบบ</Button>} />

      <div className="flex flex-col gap-5">
        <Card>
          <h2 className="mb-1 text-lg font-bold">ความยินยอม (PDPA)</h2>
          <p className="mb-4 text-sm text-muted">ถอนได้ทุกเมื่อ ถ้าถอน &ldquo;วางแผนการเงิน&rdquo; ระบบจะหยุดวิเคราะห์ข้อมูลของคุณ</p>
          {error && <div className="mb-3"><ErrorNote>{error}</ErrorNote></div>}
          {consents.loading ? <Loading /> : (
            <ul className="flex flex-col gap-3">
              {CONSENTS.map((c) => {
                const on = granted(c.purpose);
                return (
                  <li key={c.purpose} className="flex items-center justify-between gap-4 rounded-2xl bg-surface-2 p-4">
                    <span id={`c-${c.purpose}`}>
                      <span className="font-semibold">{c.title}</span>
                      <span className="block text-sm text-muted">{c.text}</span>
                    </span>
                    <button type="button" role="switch" aria-checked={on} aria-labelledby={`c-${c.purpose}`} onClick={() => toggle(c.purpose, !on)}
                      className={cx("relative h-8 w-14 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-surface shadow-neu-in")}>
                      <span aria-hidden className={cx("absolute top-1 size-6 rounded-full bg-white shadow-neu transition-all motion-reduce:transition-none", on ? "left-7" : "left-1")} />
                      <span className="sr-only">{on ? "เปิด" : "ปิด"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-bold">ข้อมูลปลดล็อก PDF</h2>
          <p className="mb-4 text-sm text-muted">
            {user?.hasPii || piiSaved ? "✅ บันทึกไว้แล้ว (เข้ารหัส) — ระบบจะลองปลดล็อก statement ให้อัตโนมัติ" : "ยังไม่ได้บันทึก — ต้องกรอกรหัส PDF เองทุกครั้ง"}
          </p>
          {editPii ? (
            <PiiForm onDone={() => { setEditPii(false); setPiiSaved(true); audit.reload(); }} />
          ) : (
            <Button variant="soft" onClick={() => setEditPii(true)}>{user?.hasPii || piiSaved ? "อัปเดตข้อมูล" : "บันทึกข้อมูล"}</Button>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-bold">ประวัติการใช้งานบัญชี</h2>
          <p className="mb-4 text-sm text-muted">ทุกครั้งที่มีการเข้าถึงหรือเปลี่ยนข้อมูลของคุณ</p>
          {audit.loading ? <Loading /> : audit.error ? <ErrorNote>{audit.error}</ErrorNote> : (
            <ol className="flex flex-col divide-y divide-muted/15">
              {[...(audit.data?.entries ?? [])].reverse().map((e, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
                  <span className="font-medium">{ACTION_LABEL[e.action] ?? e.action}</span>
                  <span className="text-sm text-muted">{new Date(e.at).toLocaleString("th-TH")}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

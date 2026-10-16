"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, LogOut, ShieldCheck } from "lucide-react";
import { ApiError, api, errorText, json, type AuditEntry, type Consent, type Purpose } from "@/lib/api";
import { CONSENTS, PiiForm } from "@/components/PiiForm";
import { Badge, Button, Card, ErrorNote, Field, Loading, PageTitle, RequiredLegend, cx, useApi } from "@/components/ui";
import { useUser } from "@/components/user";
import { logout } from "@/components/session";

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

  async function doLogout() {
    await logout(router);
  }

  const granted = (p: Purpose) => consents.data?.consents.find((c) => c.purpose === p)?.granted ?? false;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="ตั้งค่า" sub={user?.email} action={<Button variant="danger" onClick={doLogout}><LogOut aria-hidden size={18} /> ออกจากระบบ</Button>} />

      <div className="flex flex-col gap-5">
        <Card>
          <h2 className="mb-1 text-lg font-bold">ความยินยอม (PDPA)</h2>
          <p className="mb-4 text-sm text-muted">ข้อที่ไม่บังคับ เปิด/ปิดได้ทุกเมื่อ</p>
          {error && <div className="mb-3"><ErrorNote>{error}</ErrorNote></div>}
          {consents.loading ? <Loading /> : (
            <ul className="flex flex-col gap-3">
              {CONSENTS.map((c) => {
                const on = granted(c.purpose);
                if (c.required) return (
                  <li key={c.purpose} className="flex items-center justify-between gap-4 rounded bg-subtle p-4">
                    <span>
                      <span className="font-semibold">{c.title}</span>
                      <span className="block text-sm text-muted">จำเป็นต่อการใช้งาน · หากไม่ต้องการ ให้ลบบัญชี</span>
                    </span>
                    <Badge kind="ok">✅ ยอมรับแล้ว</Badge>
                  </li>
                );
                return (
                  <li key={c.purpose} className="flex items-center justify-between gap-4 rounded bg-subtle p-4">
                    <span id={`c-${c.purpose}`}>
                      <span className="font-semibold">{c.title}</span>
                      <span className="block text-sm text-muted">{c.text}</span>
                    </span>
                    <button type="button" role="switch" aria-checked={on} aria-labelledby={`c-${c.purpose}`} onClick={() => toggle(c.purpose, !on)}
                      className={cx("relative h-6 w-11 shrink-0 rounded-full border transition-colors after:absolute after:-inset-2.5 after:content-['']", on ? "border-primary bg-primary" : "border-line-strong bg-subtle")}>
                      <span aria-hidden className={cx("absolute top-0.5 size-4.5 rounded-full bg-white shadow-sm transition-all motion-reduce:transition-none", on ? "left-5.5" : "left-0.5")} />
                      <span className="sr-only">{on ? "เปิด" : "ปิด"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Link href="/settings/security" className="flex min-h-16 items-center justify-between gap-3 rounded-md border border-line bg-surface px-5 py-4 transition-colors duration-150 hover:bg-subtle">
          <span className="flex items-center gap-3">
            <ShieldCheck aria-hidden size={20} className="text-primary" />
            <span><span className="block font-semibold">ความปลอดภัย</span><span className="block text-sm text-muted">ประวัติการเข้าสู่ระบบ และอุปกรณ์ที่ใช้อยู่</span></span>
          </span>
          <ChevronRight aria-hidden size={18} className="text-muted" />
        </Link>

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
            <ol className="flex flex-col divide-y divide-line">
              {[...(audit.data?.entries ?? [])].reverse().map((e, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
                  <span className="font-medium">{ACTION_LABEL[e.action] ?? e.action}</span>
                  <span className="text-sm text-muted">{new Date(e.at).toLocaleString("th-TH")}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <DeleteAccount />
      </div>
    </div>
  );
}

function DeleteAccount() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/account", json("DELETE", { password: new FormData(e.currentTarget).get("password") }));
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "รหัสผ่านไม่ถูกต้อง" : err instanceof ApiError && err.status === 429 ? "ลองผิดหลายครั้งเกินไป รอสักครู่แล้วลองใหม่" : errorText(err));
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="del-t" className="rounded-md border border-danger/40 bg-surface">
      <header className="border-b border-danger/30 px-5 py-3"><h2 id="del-t" className="font-semibold text-danger">ลบบัญชี</h2></header>
      <form onSubmit={submit} className="flex flex-col gap-4 p-5">
        <p className="text-sm text-muted">ลบถาวร: ข้อมูลส่วนตัว รายการ ไฟล์ statement สลิป และประวัติการเข้าสู่ระบบ กู้คืนไม่ได้ (เก็บเฉพาะบันทึกความยินยอมแบบไม่ระบุตัวตนตามกฎหมาย)</p>
        <Field label='พิมพ์ "ลบบัญชี" เพื่อยืนยัน' required>
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="รหัสผ่าน" required>
          <input name="password" type="password" required autoComplete="current-password" />
        </Field>
        <RequiredLegend />
        {error && <ErrorNote>{error}</ErrorNote>}
        <button type="submit" disabled={confirm !== "ลบบัญชี" || busy}
          className="inline-flex min-h-11 items-center justify-center self-start rounded bg-danger px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-9 dark:text-bg">
          {busy ? "กำลังลบ…" : "ลบบัญชีถาวร"}
        </button>
      </form>
    </section>
  );
}

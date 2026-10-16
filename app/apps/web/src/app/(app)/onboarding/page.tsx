"use client";
import { useState } from "react";
import { FileUp } from "lucide-react";
import { api, errorText, json } from "@/lib/api";
import { CONSENTS, PiiForm } from "@/components/PiiForm";
import { Badge, Button, ButtonLink, Card, ErrorNote, PageTitle } from "@/components/ui";

const STEPS = ["ความยินยอม", "ปลดล็อก PDF", "อัปโหลด"];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({ planning: false, loan_summary: false, improve: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // PDPA: consent is asked before any personal data is collected.
  async function saveConsents(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      for (const c of CONSENTS.filter((x) => !x.required)) await api("/profile/consents", json("PUT", { purpose: c.purpose, granted: checked[c.purpose] }));
      setStep(1);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="เริ่มต้นใช้งาน" sub="3 ขั้นตอนสั้น ๆ" />
      <ol className="mb-6 flex gap-2" aria-label="ขั้นตอน">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined}
            className={`flex-1 border-b-2 px-1 pb-2 text-sm font-semibold ${i === step ? "border-primary text-primary" : i < step ? "border-success text-success" : "border-line text-muted"}`}>
            {i < step ? "✅ " : `${i + 1}. `}{s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <h2 className="mb-4 text-xl font-bold">ขอความยินยอม (PDPA)</h2>
          <form onSubmit={saveConsents} className="flex flex-col gap-3">
            <ul className="flex flex-col divide-y divide-line rounded border border-line">
              {CONSENTS.filter((c) => c.required).map((c) => (
                <li key={c.purpose} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span>{c.title}</span><Badge kind="ok">✅ ยอมรับแล้ว</Badge>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">ข้อที่จำเป็นยอมรับแล้วตอนสมัคร หากไม่ต้องการ ให้ลบบัญชีในหน้าตั้งค่า</p>
            {CONSENTS.filter((c) => !c.required).map((c) => (
              <label key={c.purpose} className="flex cursor-pointer gap-3 rounded bg-subtle p-4">
                <input type="checkbox" className="mt-1 shrink-0" checked={checked[c.purpose]}
                  onChange={(e) => setChecked({ ...checked, [c.purpose]: e.target.checked })} />
                <span>
                  <span className="font-semibold">{c.title}</span>{" "}
                  <span className="text-sm text-muted">(ไม่บังคับ)</span>
                  <span className="block text-sm text-muted">{c.text}</span>
                </span>
              </label>
            ))}
            <p className="text-sm text-muted">ถอนความยินยอมได้ทุกเมื่อในหน้าตั้งค่า</p>
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" disabled={busy} className="self-start">ถัดไป</Button>
          </form>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <h2 className="mb-4 text-xl font-bold">ให้เราปลดล็อก PDF ให้อัตโนมัติ</h2>
          <PiiForm onDone={() => setStep(2)} onSkip={() => setStep(2)} submitLabel="บันทึกแล้วไปต่อ" />
        </Card>
      )}

      {step === 2 && (
        <Card className="text-center">
          <FileUp aria-hidden size={48} className="mx-auto text-primary" />
          <h2 className="mt-3 text-xl font-bold">อัปโหลด statement ย้อนหลัง 3–6 เดือน</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            ขอ e-statement จากแอปธนาคาร (KBank / Bangkok Bank) แล้วอัปโหลดทีเดียวหลายไฟล์ได้ ยิ่งครบหลายเดือน streak ยิ่งเริ่มสูง 🔥
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/upload">อัปโหลดเลย</ButtonLink>
            <ButtonLink href="/dashboard" variant="soft">ไว้ทีหลัง</ButtonLink>
          </div>
        </Card>
      )}
    </div>
  );
}

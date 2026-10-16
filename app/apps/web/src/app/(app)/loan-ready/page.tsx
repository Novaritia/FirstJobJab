"use client";
import type { LoanReady } from "@/lib/api";
import { baht } from "@/lib/format";
import { ButtonLink, Card, ErrorNote, Loading, PageTitle, useApi } from "@/components/ui";

export default function LoanReadyPage() {
  const r = useApi<LoanReady>("/insights/loan-ready");
  if (r.loading) return <Loading />;
  if (r.error) return <ErrorNote>{r.error}</ErrorNote>;
  const d = r.data!;
  const ready = d.continuousMonths >= d.required;
  const left = d.required - d.continuousMonths;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="พร้อมยื่นกู้แค่ไหน" sub="ธนาคารมักขอ statement ต่อเนื่อง 6 เดือน" />
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="md:col-span-2">
          <h2 className="text-xl font-bold">
            🔥 {d.continuousMonths}/{d.required} เดือนต่อเนื่อง {ready ? "→ พร้อมยื่นกู้แล้ว ✅" : `→ อีก ${left} เดือน`}
          </h2>
          <ol className="mt-4 grid grid-cols-6 gap-2" aria-label={`ส่งแล้ว ${d.continuousMonths} จาก ${d.required} เดือน`}>
            {Array.from({ length: d.required }, (_, i) => (
              <li key={i} className={`grid h-12 place-items-center rounded-2xl text-sm font-bold ${i < d.continuousMonths ? "bg-primary text-on-primary" : "bg-surface text-muted shadow-neu-in"}`}>
                {i + 1}
              </li>
            ))}
          </ol>
          {!ready && <ButtonLink href="/upload" className="mt-5">อัปโหลดเดือนถัดไป</ButtonLink>}
        </Card>

        <Card>
          <h2 className="text-sm text-muted">รายได้เฉลี่ย/เดือน</h2>
          <p className="num text-3xl font-bold">{baht(d.avgIncome, 0)}</p>
          <h2 className="mt-4 text-sm text-muted">ใช้จ่ายเฉลี่ย/เดือน</h2>
          <p className="num text-3xl font-bold">{baht(d.avgSpend, 0)}</p>
        </Card>

        <section className="glass-hero rounded-3xl p-6">
          <h2 className="text-sm opacity-90">ผ่อนได้ไม่เกินประมาณ</h2>
          <p className="num font-display text-4xl font-bold">{baht(d.maxInstallment, 0)}<span className="text-lg font-medium">/เดือน</span></p>
          <p className="mt-3 text-sm opacity-90">ใช้หลักทั่วไป: ภาระหนี้ทั้งหมดไม่ควรเกิน ~40% ของรายได้ ธนาคารแต่ละแห่งพิจารณาต่างกัน</p>
        </section>
      </div>
      <p className="mt-5 text-sm text-muted">นับเฉพาะข้อมูลจาก statement ต้นฉบับ รายการที่ ✋ เพิ่มเองไม่ถูกนับ</p>
    </div>
  );
}

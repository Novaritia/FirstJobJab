"use client";
import { useEffect, useState } from "react";
import { api, errorText, type TaxResult } from "@/lib/api";
import { baht } from "@/lib/format";
import { Money, Stagger } from "@/components/motion";
import { TaxCalc } from "@/components/TaxCalc";
import { ButtonLink, Card, ErrorNote, Loading, PageTitle } from "@/components/ui";

export default function Tax() {
  const [res, setRes] = useState<{ year: number; data?: TaxResult; error?: string } | null>(null);

  useEffect(() => {
    const year = new Date().getFullYear(); // read in effect, not render (prerender-safe)
    api<TaxResult>(`/insights/tax?year=${year}`).then((data) => setRes({ year, data }), (e) => setRes({ year, error: errorText(e) }));
  }, []);

  if (!res) return <Loading />;
  if (res.error) return <ErrorNote>{res.error}</ErrorNote>;
  const t = res.data!;

  return (
    <Stagger className="mx-auto max-w-5xl">
      <PageTitle title={`ภาษีปี ${res.year + 543}`} sub="ประมาณจากเงินเดือนใน statement และประกันสังคม" />

      {t.grossIncome === 0 ? (
        <Card className="text-center">
          <p className="font-semibold">ยังไม่เจอเงินเดือนใน statement</p>
          <p className="mt-1 text-muted">อัปโหลด statement ที่มีเงินเดือนเข้า แล้วเราจะประมาณภาษีให้</p>
          <ButtonLink href="/upload" className="mt-4">อัปโหลด statement</ButtonLink>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-md border border-line bg-surface p-5 md:col-span-2">
            <h2 className="text-sm text-muted">ภาษีที่น่าจะต้องจ่ายทั้งปี</h2>
            <p className="mt-1 text-4xl font-semibold text-primary"><Money value={t.tax} digits={0} /></p>
            <p className="mt-2 text-muted">
              {t.tax === 0 ? "ปีนี้ยังไม่ต้องเสียภาษี แต่ยังต้องยื่นแบบ ภ.ง.ด.91 นะ" : `เฉลี่ยเดือนละ ${baht(t.tax / 12, 0)}`}
            </p>
          </section>

          <Card>
            <h2 className="mb-3 text-lg font-bold">คำนวณยังไง</h2>
            <dl className="flex flex-col gap-2">
              <Row label="รายได้ทั้งปี" value={baht(t.grossIncome, 0)} />
              <Row label="หักค่าใช้จ่าย" value={`− ${baht(t.expenseDeduction, 0)}`} />
              <Row label="ลดหย่อน (ส่วนตัว + ประกันสังคม ฯลฯ)" value={`− ${baht(t.allowances, 0)}`} />
              <div className="my-1 border-t border-line" />
              <Row label="เงินได้สุทธิ" value={baht(t.netIncome, 0)} strong />
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-bold">ขั้นบันไดภาษี</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr><th className="pb-2 font-medium">เงินได้สุทธิ</th><th className="pb-2 font-medium">อัตรา</th><th className="pb-2 text-right font-medium">ภาษี</th></tr>
              </thead>
              <tbody className="num">
                {t.brackets.map((b) => (
                  <tr key={b.from} className="border-t border-line">
                    <td className="py-2">{baht(b.from, 0)} – {b.to === null ? "ขึ้นไป" : baht(b.to, 0)}</td>
                    <td className="py-2">{Math.round(b.rate * 100)}%</td>
                    <td className="py-2 text-right font-semibold">{baht(b.tax, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="md:col-span-2">
            <p className="text-lg">
              เริ่มเสียภาษีเมื่อเงินเดือนถึง <span className="num font-bold text-primary">{baht(t.monthlySalaryWhereTaxStarts, 0)}</span>/เดือน
            </p>
            <p className="mt-1 text-sm text-muted">คิดจากเงินเดือนอย่างเดียว หักค่าใช้จ่าย ลดหย่อนส่วนตัว และประกันสังคม</p>
          </Card>
        </div>
      )}
      <div className="mt-5"><TaxCalc year={res.year} monthlySalary={Math.round(t.grossIncome / 12)} /></div>
      <p role="note" className="mt-5 rounded bg-warning-bg p-4 text-sm font-medium text-warning">
        ⚠️ ประมาณการ ไม่ใช่คำแนะนำทางภาษี ตรวจสอบกับกรมสรรพากรก่อนยื่นจริง
      </p>
    </Stagger>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={strong ? "font-semibold" : "text-muted"}>{label}</dt>
      <dd className={`num text-right ${strong ? "font-bold" : "font-semibold"}`}>{value}</dd>
    </div>
  );
}

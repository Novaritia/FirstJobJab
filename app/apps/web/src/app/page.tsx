import Link from "next/link";
import "./landing.css";
import { Camera, Check, FileText, Receipt, ShieldCheck, Upload } from "lucide-react";
import { LiveAudit } from "@/components/LiveAudit";
import { Flame, Loop, Reveal } from "@/components/motion";
import { StreakTrack } from "@/components/StreakTrack";
import { Pricing } from "@/components/Pricing";
import { HeroCta, SessionNav } from "@/components/session";

// Synthetic ticker of checked rows (decorative, aria-hidden).
const TICKER = [
  ["SALARY ACME CO", "+28,000.00"], ["โอนค่าห้อง", "−6,500.00"], ["GRAB FOOD", "−215.00"], ["ค่าไฟ MEA", "−840.00"],
  ["SHOPEE PAY", "−450.00"], ["โอนให้แม่", "−3,000.00"], ["BTS RABBIT", "−300.00"], ["LINE MAN", "−189.00"], ["โอนเข้าออม", "−5,000.00"],
];

const EXAMPLE_TRACK = ["พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค."].map((label, i) => ({ label, covered: i < 5 }));
const UPLOADS = [
  { icon: FileText, t: "PDF e-statement", d: "จากแอป KBank หรือ Bangkok Bank ทีเดียว 3–6 เดือน" },
  { icon: Receipt, t: "สลิปโอนเงิน", d: "รูปสลิปจากแอปธนาคาร อ่านยอดและวันที่ให้" },
  { icon: Camera, t: "ถ่ายรูปสมุดบัญชี", d: "ใช้กล้องมือถือถ่ายหน้าที่อัปเดตแล้ว" },
];

const STEPS = [
  { t: "อัปโหลด statement", d: "PDF จาก KBank หรือ Bangkok Bank ทีเดียว 3–6 เดือน ไฟล์ล็อกรหัสก็ปลดให้" },
  { t: "ตรวจทุกแถว", d: "ยอดก่อนหน้า ± จำนวนเงิน ต้องเท่ายอดคงเหลือ แถวไหนไม่ตรง แก้แค่แถวนั้น" },
  { t: "ได้แผนการเงิน", d: "เงินเดือนไปไหน แบ่งเก็บเท่าไร ภาษีเท่าไร และอีกกี่เดือนพร้อมยื่นกู้" },
];

export default function Landing() {
  return (
    <div className="lp flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6" aria-label="หลัก">
          <Link href="/" className="font-bold">FirstJobJab</Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <a href="#pricing" className="inline-flex min-h-11 items-center px-2 text-sm font-medium hover:text-primary sm:px-3">ราคา</a>
            <SessionNav />
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* hero on canvas, over a faint ledger grid */}
        <section className="relative isolate overflow-hidden">
          <Loop className="pointer-events-none absolute inset-0 -z-10"><div aria-hidden className="ledger-grid absolute inset-0" /><span aria-hidden className="ledger-pulse-x max-md:hidden" /><span aria-hidden className="ledger-pulse-y max-md:hidden" /></Loop>
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:py-20">
            <div>
              <h1 className="text-[2rem] font-bold leading-[1.2] sm:text-5xl sm:leading-[1.15]">
                อัปโหลดทุกเดือน<br /><span className="text-primary"><span className="whitespace-nowrap">ครบ 6 เดือน</span> <span className="whitespace-nowrap">พร้อมยื่นกู้</span></span>
              </h1>
              <p className="mt-5 max-w-[34rem] text-base text-muted sm:text-lg">
                ส่ง e-statement สลิป หรือรูปสมุดบัญชี แล้วเราตรวจยอดคงเหลือทุกแถว บอกว่าเงินเดือนไปไหน ควรเก็บเท่าไร ภาษีเท่าไร ส่งต่อเนื่องทุกเดือนเพื่อเก็บ streak <Flame /> ครบ 6/6 คือหลักฐานรายได้พร้อมยื่นกู้
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3"><HeroCta /></div>
              <p className="mt-6 flex items-start gap-2 text-sm text-muted">
                <ShieldCheck aria-hidden size={16} className="mt-0.5 shrink-0 text-success" /> ไฟล์และข้อมูลส่วนตัวเข้ารหัส · ขอความยินยอมแยกตามวัตถุประสงค์ (PDPA)
              </p>
            </div>
            {/* the mechanism: a statement checked row by row, then the plan it produces */}
            <LiveAudit />
          </div>
        </section>

        {/* ticker: a white band of rows that passed the check */}
        <div className="flex items-stretch border-y border-line bg-surface text-sm">
          <p className="hidden shrink-0 items-center border-r border-line px-4 font-medium text-muted sm:flex sm:px-6">ตรวจแล้ว (ตัวอย่าง)</p>
          <Loop className="min-w-0 flex-1 overflow-hidden">
            <div aria-hidden className="marquee">
              {[0, 1].map((k) => TICKER.map(([t, a]) => (
                <span key={`${k}${t}`} className="num flex shrink-0 items-center gap-2 border-r border-line px-5 py-3 whitespace-nowrap">
                  <Check aria-hidden size={14} className="text-success" />{t}<span className="text-muted">{a}</span>
                </span>
              )))}
            </div>
          </Loop>
        </div>

        {/* the hook: upload every month, keep the streak */}
        <section id="streak" aria-labelledby="streak-t" className="border-b border-line bg-[color:var(--lp-tint)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
            <div>
              <h2 id="streak-t" className="text-2xl font-bold">ส่งทุกเดือน เก็บ streak</h2>
              <p className="mt-2 max-w-md text-muted">เหมือนเก็บวันต่อเนื่องในแอปเรียนภาษา ส่ง statement หลังเงินเดือนเข้าทุกเดือน ครบ 6 เดือนติดกันคือหลักฐานรายได้ที่ธนาคารอยากเห็น</p>
              <div className="mt-6 rounded-lg border border-line bg-surface p-4 shadow-card sm:p-5">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-semibold"><Flame /> <span className="num">5</span>/6 เดือนติดกัน</span>
                  <span className="text-sm text-muted">อีก 1 เดือนพร้อมยื่นกู้</span>
                </p>
                <Reveal className="mt-4"><StreakTrack months={EXAMPLE_TRACK} due={5} /></Reveal>
                <p className="mt-3 text-right text-xs text-muted">ข้อมูลตัวอย่าง (สมมติ)</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold">อัปโหลดได้ 3 แบบ</h3>
              <p className="mt-1 text-sm text-muted">ไฟล์ล็อกรหัสก็ปลดให้ ทุกแถวผ่านการตรวจยอดก่อนเข้าแผน</p>
              <Link href="/upload" className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-primary/50 bg-surface px-5 py-8 text-center transition-colors duration-150 hover:border-primary hover:bg-primary-soft">
                <Upload aria-hidden size={28} className="text-primary" />
                <span className="font-semibold">ลากไฟล์มาวาง หรือเลือกไฟล์</span>
                <span className="text-sm text-muted">PDF · JPG · PNG หลายไฟล์พร้อมกันได้</span>
              </Link>
              <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface text-sm shadow-card">
                {UPLOADS.map(({ icon: Icon, t, d }) => (
                  <li key={t} className="flex items-start gap-3 px-4 py-3">
                    <Icon aria-hidden size={18} className="mt-0.5 shrink-0 text-primary" />
                    <span><span className="font-medium">{t}</span><span className="block text-muted">{d}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="how" aria-labelledby="how-t" className="bg-subtle">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-[1fr_1.6fr] md:py-20">
            <div>
              <h2 id="how-t" className="text-2xl font-bold">ทำงานยังไง</h2>
              <p className="mt-2 max-w-sm text-muted">สามขั้น จาก PDF ของธนาคารเป็นตัวเลขที่ใช้วางแผนได้จริง ทุกแถวตรวจได้ย้อนกลับ</p>
            </div>
            <Reveal>
              <ol className="divide-y divide-line rounded-lg border border-line bg-surface shadow-card">
                {STEPS.map((s, i) => (
                  <li key={s.t} data-rise className="grid grid-cols-[2rem_1fr] gap-x-3 p-4 sm:grid-cols-[2.5rem_1fr] sm:p-5">
                    <span className="num text-sm font-semibold text-primary">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="font-semibold">{s.t}</h3>
                      <p className="mt-1 text-sm text-muted">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </section>

        <section id="pricing" aria-labelledby="pricing-t" className="bg-[color:var(--band)] text-[color:var(--on-band)]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
            <h2 id="pricing-t" className="text-2xl font-bold">ราคา</h2>
            <p className="mt-2 max-w-xl text-[color:var(--on-band-muted)]">เริ่มฟรีได้เลย ไม่ต้องใส่บัตร อัปเกรดเมื่ออยากได้ผู้ช่วย AI และประวัติไม่จำกัด</p>
            <Pricing />
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:px-6 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr]">
          <div className="sm:col-span-2 md:col-span-1">
            <p className="font-bold">FirstJobJab</p>
            <p className="mt-2 max-w-sm text-muted">ตัวเลขทั้งหมดเป็นการประมาณ ไม่ใช่คำแนะนำทางการเงินหรือภาษี ตรวจกับเอกสารจริงก่อนตัดสินใจ</p>
          </div>
          <nav aria-label="ผลิตภัณฑ์">
            <p className="font-semibold">ผลิตภัณฑ์</p>
            <ul className="mt-2 flex flex-col text-muted sm:gap-1">
              <li><a href="#how" className="inline-flex min-h-11 items-center hover:text-primary sm:min-h-9">ทำงานยังไง</a></li>
              <li><a href="#pricing" className="inline-flex min-h-11 items-center hover:text-primary sm:min-h-9">ราคา</a></li>
              <li><Link href="/register" className="inline-flex min-h-11 items-center hover:text-primary sm:min-h-9">สมัครฟรี</Link></li>
            </ul>
          </nav>
          <nav aria-label="กฎหมาย">
            <p className="font-semibold">กฎหมาย</p>
            <ul className="mt-2 flex flex-col text-muted sm:gap-1">
              <li><Link href="/terms" className="inline-flex min-h-11 items-center hover:text-primary sm:min-h-9">ข้อกำหนดการใช้งาน</Link></li>
              <li><Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-primary sm:min-h-9">นโยบายความเป็นส่วนตัว (PDPA)</Link></li>
            </ul>
          </nav>
        </div>
        <p className="border-t border-line px-4 py-4 text-center text-xs text-muted">© 2569 FirstJobJab · ข้อมูลในหน้านี้เป็นตัวอย่างสมมติ</p>
      </footer>
    </div>
  );
}

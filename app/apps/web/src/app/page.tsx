import Link from "next/link";
import { ArrowDown, ArrowRight, ShieldCheck } from "lucide-react";

// Synthetic demo rows (labelled on the page) showing the balance check: prev ± amount = balance.
const ROWS = [
  { d: "1 ก.ย.", t: "SALARY ACME CO", a: "+28,000.00", b: "43,000.00", ok: true },
  { d: "4 ก.ย.", t: "โอนค่าห้อง", a: "−6,500.00", b: "36,500.00", ok: true },
  { d: "6 ก.ย.", t: "GRAB FOOD", a: "−21.50", b: "36,285.00", ok: false },
  { d: "8 ก.ย.", t: "โอนให้แม่", a: "−3,000.00", b: "33,285.00", ok: true },
];

export default function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 sm:px-6">
      <nav className="glass sticky top-3 z-30 flex items-center justify-between gap-3 rounded-full py-1.5 pl-5 pr-1.5" aria-label="หลัก">
        <span className="font-display text-lg font-bold text-primary sm:text-xl">FirstJobJab</span>
        <Link href="/login" className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold text-primary hover:underline">เข้าสู่ระบบ</Link>
      </nav>

      <section className="grid flex-1 content-center items-center gap-10 py-10 md:grid-cols-[1.05fr_1fr] md:py-16">
        <div>
          <h1 className="text-4xl font-bold leading-[1.15] sm:text-6xl">
            Statement ของคุณ<br /><span className="text-primary">→ แผนการเงิน</span>
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg text-muted">
            เพิ่งเริ่มทำงาน เงินเดือนออกแล้วหายไปไหนไม่รู้? อัปโหลด e-statement จาก KBank หรือ Bangkok Bank เราตรวจยอดคงเหลือทีละแถว แล้วบอกว่าเงินไปไหน ควรแบ่งเก็บเท่าไร ภาษีเท่าไร และอีกกี่เดือนพร้อมยื่นกู้
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href="/register" className="inline-flex min-h-13 items-center gap-2 rounded-full bg-primary px-8 text-lg font-semibold text-on-primary shadow-[0_8px_20px_rgb(29_78_216/0.35)] hover:brightness-110">
              เริ่มฟรี <ArrowRight aria-hidden size={20} />
            </Link>
            <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-primary underline">มีบัญชีแล้ว</Link>
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-muted">
            <ShieldCheck aria-hidden size={18} className="shrink-0 text-success" /> ไฟล์และข้อมูลส่วนตัวเข้ารหัส · ขอความยินยอมแยกตามวัตถุประสงค์ (PDPA)
          </p>
        </div>

        {/* The mechanism: a statement being checked row by row, feeding the plan. */}
        <figure className="relative" aria-label="ตัวอย่าง: statement ถูกตรวจทีละแถวแล้วกลายเป็นแผน (ข้อมูลสมมติ)">
          <div className="rounded-3xl bg-surface p-4 shadow-neu sm:p-5">
            <p className="mb-3 flex justify-between text-sm text-muted"><span>KBank · ก.ย. 69</span><span>ตรวจยอดคงเหลือ</span></p>
            <ul className="flex flex-col gap-2 text-sm">
              {ROWS.map((r) => (
                <li key={r.d} className={`grid grid-cols-[3.2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl px-3 py-2 ${r.ok ? "bg-surface-2" : "bg-warning-bg"}`}>
                  <span className="text-muted">{r.d}</span>
                  <span className="min-w-0 truncate font-medium">{r.t}</span>
                  <span className="num text-right font-semibold">{r.a}</span>
                  <span className={`col-span-3 text-xs font-semibold ${r.ok ? "text-success" : "text-warning"}`}>
                    {r.ok ? `✅ ยอดคงเหลือตรง ฿${r.b}` : "⚠️ ไม่ตรง — อ่านได้ 21.50 แก้เป็น 215.00 แล้วผ่าน"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <ArrowDown aria-hidden className="mx-auto my-2 text-primary" size={28} />
          <div className="glass-hero rounded-3xl p-5 sm:p-6">
            <p className="text-sm opacity-90">เหลือเก็บเดือนนี้</p>
            <p className="num font-display text-4xl font-bold sm:text-5xl">฿11,240</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-2xl bg-white/15 p-2.5"><dt className="opacity-90">ลงทุนได้</dt><dd className="num font-semibold">฿3,000/ด.</dd></div>
              <div className="rounded-2xl bg-white/15 p-2.5"><dt className="opacity-90">ภาษีปีนี้</dt><dd className="num font-semibold">฿850</dd></div>
              <div className="rounded-2xl bg-white/15 p-2.5"><dt className="opacity-90">พร้อมกู้</dt><dd className="font-semibold">🔥 4/6</dd></div>
            </dl>
          </div>
          <figcaption className="mt-2 text-center text-xs text-muted">ข้อมูลตัวอย่าง (สมมติ)</figcaption>
        </figure>
      </section>
    </main>
  );
}

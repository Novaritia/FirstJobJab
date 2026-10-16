import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

// Synthetic demo rows (labelled on the page) showing the balance check: prev ± amount = balance.
const ROWS = [
  { d: "1 ก.ย.", t: "SALARY ACME CO", a: "+28,000.00", b: "43,000.00", ok: true },
  { d: "4 ก.ย.", t: "โอนค่าห้อง", a: "−6,500.00", b: "36,500.00", ok: true },
  { d: "6 ก.ย.", t: "GRAB FOOD", a: "−21.50", b: "36,285.00", ok: false },
  { d: "8 ก.ย.", t: "โอนให้แม่", a: "−3,000.00", b: "33,285.00", ok: true },
];

const STEPS = [
  { t: "อัปโหลด statement", d: "PDF จาก KBank หรือ Bangkok Bank ทีเดียว 3–6 เดือน ไฟล์ล็อกรหัสก็ปลดให้" },
  { t: "ตรวจทุกแถว", d: "ยอดก่อนหน้า ± จำนวนเงิน ต้องเท่ายอดคงเหลือ แถวไหนไม่ตรง แก้แค่แถวนั้น" },
  { t: "ได้แผนการเงิน", d: "เงินเดือนไปไหน แบ่งเก็บเท่าไร ภาษีเท่าไร และอีกกี่เดือนพร้อมยื่นกู้" },
];

export default function Landing() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="หลัก">
          <span className="font-bold">FirstJobJab</span>
          <div className="flex items-center gap-1">
            <Link href="/login" className="inline-flex min-h-11 items-center px-3 text-sm font-medium hover:text-primary">เข้าสู่ระบบ</Link>
            <Link href="/register" className="inline-flex min-h-9 items-center rounded bg-primary px-3 text-sm font-semibold text-on-primary hover:bg-primary-hover max-sm:hidden">สมัครฟรี</Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <section className="grid items-center gap-10 py-12 md:grid-cols-[1fr_1.05fr] md:py-20">
          <div>
            <h1 className="text-4xl font-bold leading-[1.15] sm:text-5xl">
              Statement ของคุณ<br /><span className="text-primary">→ แผนการเงิน</span>
            </h1>
            <p className="mt-5 max-w-[34rem] text-lg text-muted">
              เพิ่งเริ่มทำงาน เงินเดือนออกแล้วหายไปไหนไม่รู้? อัปโหลด e-statement แล้วเราตรวจยอดคงเหลือทีละแถว บอกว่าเงินไปไหน ควรแบ่งเก็บเท่าไร ภาษีเท่าไร และอีกกี่เดือนพร้อมยื่นกู้
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/register" className="inline-flex min-h-11 items-center gap-2 rounded bg-primary px-5 font-semibold text-on-primary hover:bg-primary-hover">
                เริ่มฟรี <ArrowRight aria-hidden size={18} />
              </Link>
              <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">มีบัญชีแล้ว เข้าสู่ระบบ</Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted">
              <ShieldCheck aria-hidden size={16} className="shrink-0 text-success" /> ไฟล์และข้อมูลส่วนตัวเข้ารหัส · ขอความยินยอมแยกตามวัตถุประสงค์ (PDPA)
            </p>
          </div>

          {/* The mechanism: a statement checked row by row, then the plan it produces. */}
          <figure aria-label="ตัวอย่าง: statement ถูกตรวจทีละแถวแล้วกลายเป็นแผน (ข้อมูลสมมติ)" className="overflow-hidden rounded-md border border-line bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-sm">
              <span className="font-semibold">KBank · ก.ย. 69</span>
              <span className="text-muted">ตรวจยอดคงเหลือ</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-subtle text-left text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">วันที่</th>
                  <th scope="col" className="px-2 py-2 font-medium">รายการ</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">จำนวน</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">ตรวจ</th>
                </tr>
              </thead>
              <tbody className="num divide-y divide-line">
                {ROWS.map((r) => (
                  <tr key={r.d} className={r.ok ? undefined : "bg-warning-bg"}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted">{r.d}</td>
                    <td className="max-w-0 truncate px-2 py-2.5">{r.t}</td>
                    <td className="px-2 py-2.5 text-right whitespace-nowrap">{r.a}</td>
                    <td className={`px-4 py-2.5 text-right text-xs font-semibold whitespace-nowrap ${r.ok ? "text-success" : "text-warning"}`}>
                      {r.ok ? "✅ ตรง" : "⚠️ ไม่ตรง"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-line bg-warning-bg px-4 py-2 text-xs text-warning">⚠️ GRAB FOOD อ่านได้ 21.50 → แก้เป็น 215.00 ยอดคงเหลือตรง แถวผ่าน</p>
            <dl className="grid grid-cols-3 divide-x divide-line border-t border-line">
              <div className="px-4 py-3"><dt className="text-xs text-muted">เหลือเก็บ</dt><dd className="num text-xl font-semibold text-primary">฿11,240</dd></div>
              <div className="px-4 py-3"><dt className="text-xs text-muted">ภาษีปีนี้</dt><dd className="num text-xl font-semibold">฿850</dd></div>
              <div className="px-4 py-3"><dt className="text-xs text-muted">พร้อมกู้</dt><dd className="text-xl font-semibold">🔥 4/6</dd></div>
            </dl>
            <figcaption className="border-t border-line px-4 py-1.5 text-right text-xs text-muted">ข้อมูลตัวอย่าง (สมมติ)</figcaption>
          </figure>
        </section>

        <section aria-labelledby="how-t" className="border-t border-line py-12">
          <h2 id="how-t" className="text-xl font-bold">ทำงานยังไง</h2>
          <ol className="mt-6 grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.t} className="bg-surface p-5">
                <p className="num text-sm font-semibold text-primary">ขั้นที่ {i + 1}</p>
                <h3 className="mt-1 font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-sm text-muted">FirstJobJab · ตัวเลขทั้งหมดเป็นการประมาณ ไม่ใช่คำแนะนำทางการเงินหรือภาษี</footer>
    </div>
  );
}

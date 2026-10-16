import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";

/** Must match TERMS_VERSION / PRIVACY_VERSION in apps/api/src/security-util.ts (and LEGAL_VERSION in AuthForm). */
export const LEGAL_VERSION = "2026-10-16";
export const LEGAL_EFFECTIVE = "16 ตุลาคม 2569";
export const CONTACT_EMAIL = "privacy@firstjobjab.example";

export type LegalSection = { id: string; title: string; body: ReactNode };

/** Public legal page shell: minimal header, draft banner, table of contents, ~70ch body, footer. */
export function LegalPage({ title, intro, sections, other }: {
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  other: { href: string; label: string };
}) {
  return (
    <div className="flex flex-1 flex-col bg-bg text-text">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6" aria-label="หลัก">
          <Link href="/" className="flex items-center gap-2 font-bold"><BrandMark size={32} />FirstJobJab</Link>
          <Link href="/" className="-mr-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium hover:text-primary sm:px-3"><ArrowLeft aria-hidden size={16} /> กลับหน้าแรก</Link>
        </nav>
      </header>

      <main className="flex-1 px-4 py-10 sm:px-6 md:py-14">
        <article className="mx-auto max-w-[70ch] leading-relaxed">
          <p role="note" className="rounded-lg border border-warning bg-warning-bg px-4 py-3 text-sm font-medium text-warning">
            ฉบับร่าง — ยังไม่ผ่านการตรวจโดยนักกฎหมาย จัดทำสำหรับต้นแบบ (prototype) ในงานแฮกกาธอน
          </p>

          <h1 className="mt-6 text-[1.75rem] font-bold leading-snug text-balance sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted">
            เวอร์ชัน <span className="num font-medium text-text">{LEGAL_VERSION}</span> · มีผลตั้งแต่ {LEGAL_EFFECTIVE}
          </p>
          <div className="mt-5 text-muted">{intro}</div>

          <nav aria-labelledby="toc-t" className="mt-8 rounded-lg border border-line bg-surface p-4 shadow-card">
            <p id="toc-t" className="font-semibold">สารบัญ</p>
            <ol className="mt-2 list-decimal pl-6 text-sm">
              {sections.map((s) => (
                <li key={s.id}><a href={`#${s.id}`} className="inline-block py-1 text-primary hover:underline">{s.title}</a></li>
              ))}
            </ol>
          </nav>

          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`} className="mt-10 scroll-mt-20">
              <h2 id={`${s.id}-t`} className="text-xl font-bold leading-snug text-balance">{i + 1}. {s.title}</h2>
              <div className="mt-3 space-y-3 [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_table]:w-full [&_table]:text-sm [&_td]:border-t [&_td]:border-line [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_th]:py-2 [&_th]:pr-3 [&_th]:text-left [&_th]:font-semibold [&_ul]:list-disc [&_ul]:pl-6">
                {s.body}
              </div>
            </section>
          ))}

          <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
            ดูเพิ่มเติม: <Link href={other.href} className="font-medium text-primary hover:underline">{other.label}</Link>
          </p>
        </article>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
          <p>© 2569 FirstJobJab · ตัวเลขทั้งหมดเป็นการประมาณ ไม่ใช่คำแนะนำทางการเงินหรือภาษี</p>
          <ul className="flex flex-wrap gap-x-4">
            <li><Link href="/terms" className="inline-flex min-h-11 sm:min-h-9 items-center hover:text-primary">ข้อกำหนดการใช้งาน</Link></li>
            <li><Link href="/privacy" className="inline-flex min-h-11 sm:min-h-9 items-center hover:text-primary">นโยบายความเป็นส่วนตัว</Link></li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

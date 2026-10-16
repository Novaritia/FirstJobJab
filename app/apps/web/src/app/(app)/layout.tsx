"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { House, Landmark, LayoutDashboard, List, MessageCircle, PanelLeft, Settings, TrendingUp, Upload } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import { ApiError, MOCK, api, type User } from "@/lib/api";
import { Loading, cx } from "@/components/ui";
import { UserCtx } from "@/components/user";
import { Initial } from "@/components/session";
import { Reconsent } from "@/components/Reconsent";
import { StreakBadge } from "@/components/StreakTrack";

const GROUPS = [
  { label: "ภาพรวม", items: [{ href: "/dashboard", label: "หน้าหลัก", icon: LayoutDashboard }, { href: "/assistant", label: "ผู้ช่วย", icon: MessageCircle }] },
  { label: "ข้อมูล", items: [{ href: "/transactions", label: "รายการ", icon: List }, { href: "/upload", label: "อัปโหลด", icon: Upload }] },
  { label: "วางแผน", items: [{ href: "/plan", label: "แผนเงินโต", icon: TrendingUp }, { href: "/tax", label: "ภาษี", icon: Landmark }, { href: "/loan-ready", label: "พร้อมกู้", icon: House }] },
  { label: "บัญชี", items: [{ href: "/settings", label: "ตั้งค่า", icon: Settings }] },
];
const TABS = ["/dashboard", "/transactions", "/upload", "/plan", "/settings"];
const ALL = GROUPS.flatMap((g) => g.items);

export default function AppLayout({ children }: LayoutProps<"/">) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false); // tablet: sidebar expanded

  useEffect(() => {
    api<{ user: User }>("/auth/me").then(
      (r) => setUser(r.user),
      (e) => { if (e instanceof ApiError && e.status === 401) router.replace("/login"); },
    );
  }, [router]);

  const active = (href: string) => path === href || path.startsWith(href + "/");
  const wide = open ? "" : "md:max-lg:sr-only"; // labels hidden on collapsed tablet rail

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary">
        ข้ามไปเนื้อหา
      </a>

      {/* sidebar: icon rail on tablet (expandable), full on desktop */}
      <nav aria-label="เมนูหลัก" className={cx("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-shell md:flex", open ? "w-60" : "w-16 lg:w-60")}>
        <div className="flex h-14 items-center justify-between border-b border-line px-4">
          <Link href="/dashboard" className={cx("font-bold text-text", wide)}>FirstJobJab</Link>
          <StreakBadge className={open ? "" : "max-lg:hidden"} />
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "ย่อเมนู" : "ขยายเมนู"}
            className="grid size-9 place-items-center rounded text-muted hover:bg-subtle lg:hidden">
            <PanelLeft aria-hidden size={18} />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 py-4">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <p className={cx("mb-1 px-3 text-xs font-medium text-muted", wide)}>{g.label}</p>
              <ul className="flex flex-col gap-0.5">
                {g.items.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link href={href} aria-current={active(href) ? "page" : undefined} title={label}
                      className={cx("relative flex h-9 items-center gap-3 rounded px-3 text-sm font-medium transition-colors duration-150",
                        active(href) ? "text-primary" : "text-text hover:bg-subtle")}>
                      {active(href) && <motion.span layoutId="nav-active" aria-hidden className="absolute inset-0 rounded bg-primary-soft" />}
                      <Icon aria-hidden size={17} className="relative shrink-0" />
                      <span className={cx("relative", wide)}>{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {MOCK && <p className={cx("border-t border-line px-4 py-3 text-xs text-muted", wide)}>โหมดข้อมูลตัวอย่าง (mock)</p>}
        {user && (
          <Link href="/settings" title={user.displayName} className="flex min-h-14 items-center gap-2.5 border-t border-line px-4 text-sm hover:bg-subtle">
            <Initial name={user.displayName} />
            <span className={cx("min-w-0", wide)}><span className="block truncate font-medium">{user.displayName}</span><span className="block truncate text-xs text-muted">{user.email}</span></span>
          </Link>
        )}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4 md:hidden">
          <Link href="/dashboard" className="font-bold">FirstJobJab</Link>
          <div className="flex items-center gap-1">
            <StreakBadge />
            <Link href="/assistant" className="flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-primary"><MessageCircle aria-hidden size={16} /> ถามผู้ช่วย</Link>
            {user && <Link href="/settings" aria-label={`บัญชี ${user.displayName}`} className="grid size-11 place-items-center"><Initial name={user.displayName} /></Link>}
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:px-8 lg:pt-8">
          {user ? <UserCtx.Provider value={user}>{children}</UserCtx.Provider> : <Loading label="กำลังตรวจสอบการเข้าสู่ระบบ…" />}
          {user?.needsReconsent && !path.startsWith("/settings") && <Reconsent onDone={() => setUser({ ...user, needsReconsent: false })} />}
        </main>
      </div>

      {/* mobile bottom tabs */}
      <nav aria-label="เมนูหลัก" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="flex">
          {ALL.filter((n) => TABS.includes(n.href)).map(({ href, label, icon: Icon }) => (
            <li key={href} className="flex-1">
              <Link href={href} aria-current={active(href) ? "page" : undefined}
                className={cx("relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors duration-150",
                  active(href) ? "text-primary" : "text-muted")}>
                {active(href) && <motion.span layoutId="tab-active" aria-hidden className="absolute inset-x-4 top-0 h-0.5 rounded-sm bg-primary" />}
                <Icon aria-hidden size={20} strokeWidth={active(href) ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
    </MotionConfig>
  );
}

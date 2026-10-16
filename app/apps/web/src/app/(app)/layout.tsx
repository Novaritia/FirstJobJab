"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { House, Landmark, LayoutDashboard, List, Settings, TrendingUp, Upload } from "lucide-react";
import { ApiError, MOCK, api, type User } from "@/lib/api";
import { Loading, cx } from "@/components/ui";
import { UserCtx } from "@/components/user";


const NAV = [
  { href: "/dashboard", label: "หน้าหลัก", icon: LayoutDashboard, mobile: true },
  { href: "/transactions", label: "รายการ", icon: List, mobile: true },
  { href: "/upload", label: "อัปโหลด", icon: Upload, mobile: true },
  { href: "/plan", label: "แผนเงินโต", icon: TrendingUp, mobile: true },
  { href: "/tax", label: "ภาษี", icon: Landmark, mobile: false },
  { href: "/loan-ready", label: "พร้อมกู้", icon: House, mobile: false },
  { href: "/settings", label: "ตั้งค่า", icon: Settings, mobile: true },
] as const;

export default function AppLayout({ children }: LayoutProps<"/">) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api<{ user: User }>("/auth/me").then(
      (r) => setUser(r.user),
      (e) => { if (e instanceof ApiError && e.status === 401) router.replace("/login"); },
    );
  }, [router]);

  const active = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary">
        ข้ามไปเนื้อหา
      </a>
      {/* desktop side nav */}
      <nav aria-label="เมนูหลัก" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 p-5 lg:flex">
        <Link href="/dashboard" className="mb-6 px-3 text-xl font-display font-bold text-primary">FirstJobJab</Link>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
            className={cx("flex items-center gap-3 rounded-2xl px-4 py-3 font-medium",
              active(href) ? "bg-surface text-primary shadow-neu" : "text-muted hover:text-text")}>
            <Icon aria-hidden size={20} /> {label}
          </Link>
        ))}
        {MOCK && <p className="mt-auto px-3 text-xs text-muted">โหมดข้อมูลตัวอย่าง (mock)</p>}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex items-center justify-between rounded-b-3xl px-5 py-3 lg:hidden">
          <Link href="/dashboard" className="text-lg font-display font-bold text-primary">FirstJobJab</Link>
          <Link href="/tax" className="flex min-h-11 items-center px-2 text-sm font-medium text-muted">ภาษี · พร้อมกู้</Link>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-10">
          {user ? <UserCtx.Provider value={user}>{children}</UserCtx.Provider> : <Loading label="กำลังตรวจสอบการเข้าสู่ระบบ…" />}
        </main>
      </div>

      {/* mobile/tablet bottom tab bar */}
      <nav aria-label="เมนูหลัก" className="fixed inset-x-0 bottom-0 z-40 glass rounded-t-3xl pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="mx-auto flex max-w-xl justify-around">
          {NAV.filter((n) => n.mobile).map(({ href, label, icon: Icon }) => (
            <li key={href} className="flex-1">
              <Link href={href} aria-current={active(href) ? "page" : undefined}
                className={cx("flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium",
                  active(href) ? "text-primary" : "text-muted")}>
                <Icon aria-hidden size={22} strokeWidth={active(href) ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

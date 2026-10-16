"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, LogOut } from "lucide-react";
import { api, json, type User } from "@/lib/api";

/** undefined = checking, null = signed out. Session cookie lasts 30 days; we never auto-redirect. */
export function useMe() {
  const [me, setMe] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    api<{ user: User }>("/auth/me").then((r) => setMe(r.user), () => setMe(null));
  }, []);
  return me;
}

export async function logout(router: ReturnType<typeof useRouter>) {
  await api("/auth/logout", json("POST")).catch(() => {});
  router.replace("/");
  router.refresh();
}

export const Initial = ({ name }: { name: string }) => (
  <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
    {name.trim().charAt(0).toUpperCase() || "?"}
  </span>
);

/** Landing navbar right side. */
export function SessionNav() {
  const me = useMe();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (me === undefined) return <span className="h-9 w-40" aria-hidden />; // reserve space: no layout shift
  if (!me) {
    return (
      <div className="flex items-center gap-1">
        <Link href="/login" className="inline-flex min-h-11 items-center px-3 text-sm font-medium hover:text-primary">เข้าสู่ระบบ</Link>
        <Link href="/register" className="inline-flex min-h-9 items-center rounded bg-primary px-3 text-sm font-semibold text-on-primary hover:bg-primary-hover max-sm:hidden">สมัครฟรี</Link>
      </div>
    );
  }
  return (
    <div className="relative flex items-center gap-2">
      <Link href="/dashboard" className="inline-flex min-h-9 items-center rounded bg-primary px-3 text-sm font-semibold text-on-primary hover:bg-primary-hover max-sm:hidden">ไปที่แดชบอร์ด</Link>
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}
        className="flex min-h-11 items-center gap-2 rounded px-2 text-sm font-medium hover:bg-subtle">
        <Initial name={me.displayName} /> <span className="max-w-28 truncate max-sm:sr-only">{me.displayName}</span>
        <ChevronDown aria-hidden size={14} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-52 rounded-md border border-line bg-surface py-1 shadow-pop">
          <p className="truncate px-3 py-2 text-xs text-muted">{me.email}</p>
          <Link role="menuitem" href="/dashboard" className="flex min-h-10 items-center px-3 text-sm hover:bg-subtle">ไปที่แดชบอร์ด</Link>
          <button role="menuitem" type="button" onClick={() => logout(router)} className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm text-danger hover:bg-danger-bg">
            <LogOut aria-hidden size={14} /> ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}

/** Hero primary CTA: "เข้าแอป" when signed in. */
export function HeroCta({ className }: { className: string }) {
  const me = useMe();
  return me ? (
    <Link href="/dashboard" className={className}>เข้าแอป <ArrowRight aria-hidden size={18} /></Link>
  ) : (
    <Link href="/register" className={className}>เริ่มฟรี <ArrowRight aria-hidden size={18} /></Link>
  );
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/shadcn/dropdown-menu";
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

export const Initial = ({ name, className = "size-7 text-sm" }: { name: string; className?: string }) => (
  <span aria-hidden className={`grid ${className} shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-primary`}>
    {name.trim().charAt(0).toUpperCase() || "?"}
  </span>
);

/** Landing navbar right side. */
export function SessionNav() {
  const me = useMe();
  const router = useRouter();
  if (me === undefined) return <span className="h-11 w-40 max-sm:w-24" aria-hidden />; // reserve space: no layout shift
  if (!me) {
    return (
      <div className="flex items-center gap-1 sm:gap-2">
        <Link href="/login" className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium whitespace-nowrap hover:text-primary sm:px-3">เข้าสู่ระบบ</Link>
        <Link href="/register" className="inline-flex min-h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold whitespace-nowrap text-on-primary hover:bg-primary-hover max-sm:hidden">สมัครฟรี</Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link href="/dashboard" className="inline-flex min-h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold whitespace-nowrap text-on-primary hover:bg-primary-hover max-sm:hidden">ไปที่แดชบอร์ด</Link>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger aria-label={`บัญชี ${me.displayName}`}
          className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-subtle">
          <Initial name={me.displayName} /> <span className="max-w-28 truncate max-sm:sr-only">{me.displayName}</span>
          <ChevronDown aria-hidden size={14} className="text-muted" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4} className="w-56 max-w-[calc(100vw-2rem)]">
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate font-semibold">{me.displayName}</span>
            <span className="block truncate text-xs text-muted">{me.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="min-h-11 sm:min-h-9"><Link href="/dashboard"><LayoutDashboard aria-hidden />ไปที่แดชบอร์ด</Link></DropdownMenuItem>
          <DropdownMenuItem variant="destructive" className="min-h-11 sm:min-h-9" onSelect={() => logout(router)}><LogOut aria-hidden />ออกจากระบบ</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Hero CTAs: one "ไปที่แดชบอร์ด" when signed in; เริ่มฟรี + เข้าสู่ระบบ otherwise (also while checking). */
export function HeroCta() {
  const me = useMe();
  const primary = "inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 font-semibold text-on-primary transition-[background-color,transform] duration-150 hover:bg-primary-hover active:scale-[0.98] motion-reduce:active:scale-100";
  return me ? (
    <Link href="/dashboard" className={primary}>ไปที่แดชบอร์ด <ArrowRight aria-hidden size={18} /></Link>
  ) : (
    <>
      <Link href="/register" className={primary}>เริ่มฟรี <ArrowRight aria-hidden size={18} /></Link>
      <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">มีบัญชีแล้ว เข้าสู่ระบบ</Link>
    </>
  );
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MOCK, api, errorText, json } from "@/lib/api";

const DEMO = { email: "demo@firstjobjab.app", password: "demo1234" };
const SHOW_DEMO = MOCK || process.env.NEXT_PUBLIC_SHOW_DEMO === "1" || process.env.NODE_ENV !== "production";
export const LEGAL_VERSION = "2026-10-16";
import { Button, ButtonLink, Card, ErrorNote, Field, Req, RequiredLegend } from "./ui";
import { Initial, logout, useMe } from "./session";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const reg = mode === "register";
  const me = useMe();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f: Record<string, unknown> = Object.fromEntries(new FormData(e.currentTarget));
    if (reg) Object.assign(f, { acceptTerms: f.acceptTerms === "on", termsVersion: LEGAL_VERSION, privacyVersion: LEGAL_VERSION });
    await go(`/auth/${mode}`, f);
  }

  async function go(path: string, f: unknown) {
    setBusy(true);
    setError("");
    try {
      await api(path, json("POST", f));
      router.push(reg ? "/onboarding" : "/dashboard");
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 text-center text-xl font-bold text-primary">FirstJobJab</Link>
      {me ? (
        <Card className="text-center">
          <div className="flex justify-center"><Initial name={me.displayName} /></div>
          <h1 className="mt-3 text-xl font-semibold">คุณเข้าสู่ระบบแล้วในชื่อ {me.displayName}</h1>
          <p className="mt-1 text-sm text-muted">{me.email}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/dashboard">ไปที่แดชบอร์ด</ButtonLink>
            <Button variant="danger" onClick={() => logout(router)}>ออกจากระบบ</Button>
          </div>
        </Card>
      ) : me === undefined ? <Card aria-busy className="h-64" /> : (
      <Card>
        <h1 className="mb-1 text-2xl font-bold">{reg ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</h1>
        <p className="mb-6 text-muted">{reg ? "เริ่มจาก statement ไม่กี่ไฟล์ ใช้เวลา 2 นาที" : "ยินดีต้อนรับกลับ 👋"}</p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {reg && (
            <Field label="ชื่อเล่น" required>
              <input name="displayName" required autoComplete="nickname" />
            </Field>
          )}
          <Field label="อีเมล" required>
            <input name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="รหัสผ่าน" required hint={reg ? "อย่างน้อย 8 ตัวอักษร" : undefined}>
            <input name="password" type="password" required minLength={reg ? 8 : undefined}
              autoComplete={reg ? "new-password" : "current-password"} />
          </Field>
          {reg && (
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" name="acceptTerms" required className="mt-0.5 shrink-0" />
              <span>ยอมรับ<a href="/terms" target="_blank" className="font-medium text-primary underline">ข้อกำหนดการใช้งาน</a> และ<a href="/privacy" target="_blank" className="font-medium text-primary underline">นโยบายความเป็นส่วนตัว</a><Req /></span>
            </label>
          )}
          <RequiredLegend />
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button type="submit" disabled={busy} className="mt-2 w-full">
            {busy ? "กำลังดำเนินการ…" : reg ? "สมัคร" : "เข้าสู่ระบบ"}
          </Button>
        </form>
        {!reg && SHOW_DEMO && (
          <div className="mt-5 rounded bg-subtle p-4 text-sm">
            <p className="text-muted">บัญชีเดโม: <span className="font-semibold text-text">{DEMO.email}</span> / <span className="font-semibold text-text">{DEMO.password}</span></p>
            <Button variant="soft" disabled={busy} className="mt-3 w-full" onClick={() => go("/auth/login", DEMO)}>เข้าด้วยบัญชีเดโม</Button>
          </div>
        )}
        <p className="mt-6 text-center text-muted">
          {reg ? "มีบัญชีแล้ว? " : "ยังไม่มีบัญชี? "}
          <Link href={reg ? "/login" : "/register"} className="font-semibold text-primary underline">
            {reg ? "เข้าสู่ระบบ" : "สมัครฟรี"}
          </Link>
        </p>
      </Card>
      )}
    </main>
  );
}

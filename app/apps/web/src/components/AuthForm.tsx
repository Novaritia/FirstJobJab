"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MOCK, api, errorText, json } from "@/lib/api";

const DEMO = { email: "demo@firstjobjab.app", password: "demo1234" };
const SHOW_DEMO = MOCK || process.env.NEXT_PUBLIC_SHOW_DEMO === "1" || process.env.NODE_ENV !== "production";
import { Button, Card, ErrorNote, Field } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const reg = mode === "register";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await go(`/auth/${mode}`, Object.fromEntries(new FormData(e.currentTarget)));
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
      <Link href="/" className="mb-6 text-center text-xl font-display font-bold text-primary">FirstJobJab</Link>
      <Card>
        <h1 className="mb-1 text-2xl font-bold">{reg ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</h1>
        <p className="mb-6 text-muted">{reg ? "เริ่มจาก statement ไม่กี่ไฟล์ ใช้เวลา 2 นาที" : "ยินดีต้อนรับกลับ 👋"}</p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {reg && (
            <Field label="ชื่อเล่น">
              <input name="displayName" required autoComplete="nickname" />
            </Field>
          )}
          <Field label="อีเมล">
            <input name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="รหัสผ่าน" hint={reg ? "อย่างน้อย 8 ตัวอักษร" : undefined}>
            <input name="password" type="password" required minLength={reg ? 8 : undefined}
              autoComplete={reg ? "new-password" : "current-password"} />
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button type="submit" disabled={busy} className="mt-2 w-full">
            {busy ? "กำลังดำเนินการ…" : reg ? "สมัคร" : "เข้าสู่ระบบ"}
          </Button>
        </form>
        {!reg && SHOW_DEMO && (
          <div className="mt-5 rounded-2xl bg-surface-2 p-4 text-sm">
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
    </main>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import { api, errorText, json, type LoginRow, type SessionRow } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Loading, PageTitle, cx, useApi } from "@/components/ui";

const when = (iso: string) => new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

export default function Security() {
  const logins = useApi<{ logins: LoginRow[] }>("/security/logins");
  const sessions = useApi<{ sessions: SessionRow[] }>("/security/sessions");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const fails = (logins.data?.logins ?? []).filter((l) => !l.success).length;

  async function act(path: string, method: string, done: string) {
    setError("");
    try {
      await api(path, json(method));
      setMsg(done);
      sessions.reload();
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title="ความปลอดภัย" sub="ใครเข้าบัญชีคุณ เมื่อไหร่ จากที่ไหน"
        action={<Link href="/settings" className="text-sm font-medium text-primary hover:underline">← กลับไปตั้งค่า</Link>} />
      <div className="flex flex-col gap-6">
        {fails > 0 && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
            ⚠️ มีการเข้าสู่ระบบไม่สำเร็จ {fails} ครั้ง ถ้าไม่ใช่คุณ ให้ออกจากระบบทุกเครื่องอื่นและเปลี่ยนรหัสผ่าน
          </p>
        )}
        {msg && <p role="status" className="rounded-md border border-success/30 bg-success-bg px-4 py-3 text-sm text-success">✅ {msg}</p>}
        {error && <ErrorNote>{error}</ErrorNote>}

        <Card title="อุปกรณ์ที่เข้าสู่ระบบอยู่" className="overflow-hidden"
          action={<Button variant="danger" onClick={() => act("/security/sessions/revoke-others", "POST", "ออกจากระบบทุกเครื่องอื่นแล้ว")}>ออกจากระบบทุกเครื่องอื่น</Button>}>
          {sessions.loading ? <Loading /> : sessions.error ? <ErrorNote>{sessions.error}</ErrorNote> : (
            <ul className="-m-5 divide-y divide-line">
              {sessions.data!.sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{s.device} {s.current && <Badge kind="edited">เครื่องนี้</Badge>}</p>
                    <p className="text-sm text-muted">{s.location} · ใช้งานล่าสุด {when(s.lastSeenAt)}</p>
                  </div>
                  {!s.current && (
                    <Button variant="soft" onClick={() => act(`/security/sessions/${s.id}`, "DELETE", `ออกจากระบบ ${s.device} แล้ว`)}>ออกจากระบบเครื่องนี้</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="ประวัติการเข้าสู่ระบบ (90 วัน)" className="overflow-hidden">
          {logins.loading ? <Loading /> : logins.error ? <ErrorNote>{logins.error}</ErrorNote> : (
            <div className="-m-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-subtle text-left text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-2 font-medium">เวลา</th>
                    <th scope="col" className="px-3 py-2 font-medium">ผล</th>
                    <th scope="col" className="px-3 py-2 font-medium">อุปกรณ์</th>
                    <th scope="col" className="px-3 py-2 font-medium max-md:hidden">ตำแหน่งโดยประมาณ</th>
                    <th scope="col" className="px-5 py-2 font-medium max-md:hidden">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {logins.data!.logins.map((l, i) => (
                    <tr key={i} className={cx("transition-colors duration-150", l.success ? "hover:bg-subtle" : "bg-danger-bg")}>
                      <td className="num px-5 py-2.5 whitespace-nowrap">{when(l.at)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {l.success ? <Badge kind="ok">✅ สำเร็จ</Badge> : <span className="inline-flex rounded-sm bg-danger/10 px-1.5 py-0.5 text-xs font-medium text-danger">✋ ล้มเหลว</span>}
                      </td>
                      <td className="px-3 py-2.5">{l.device} {l.current && <Badge kind="edited">เครื่องนี้</Badge>}</td>
                      <td className="px-3 py-2.5 text-muted max-md:hidden">{l.location}</td>
                      <td className="num px-5 py-2.5 text-muted max-md:hidden">{l.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

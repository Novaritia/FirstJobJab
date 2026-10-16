"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Database, Lock, LogOut, MonitorSmartphone, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { ApiError, api, errorText, json, type AuditEntry, type Consent, type LoginRow, type Profile, type Purpose, type SessionRow } from "@/lib/api";
import { CONSENTS, ProfileForm } from "@/components/PiiForm";
import { MiniPager } from "@/components/MiniPager";
import { ExportDialog } from "@/components/ExportDialog";
import { ErrorNote, Loading, PageTitle, cx, useApi } from "@/components/ui";
import { useUser } from "@/components/user";
import { logout } from "@/components/session";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shadcn/dialog";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Switch } from "@/components/shadcn/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs";

const ACTION_LABEL: Record<string, string> = {
  login_ok: "เข้าสู่ระบบ", login_fail: "เข้าสู่ระบบไม่สำเร็จ", logout: "ออกจากระบบ", register: "สมัครสมาชิก",
  upload: "อัปโหลดไฟล์", review_fix_row: "แก้ยอดที่อ่านผิด", confirm_import: "ยืนยันนำเข้า statement",
  pii_change: "อัปเดตข้อมูลปลดล็อก PDF", profile_change: "แก้ไขข้อมูลส่วนตัว", chat: "ถามผู้ช่วย", session_revoke: "สั่งออกจากระบบเครื่องอื่น", session_revoke_others: "ออกจากระบบเครื่องอื่นทั้งหมด", consent_give: "ให้ความยินยอม", consent_withdraw: "ถอนความยินยอม",
  edit_row: "แก้ไขรายการ", hide_row: "ซ่อนรายการ", manual_row: "เพิ่มรายการเอง", export: "ดาวน์โหลด CSV",
};
const LEGAL: Partial<Record<Purpose, string>> = { terms: "/terms", privacy: "/privacy" };
const SECTIONS = [
  { id: "account", label: "บัญชีของฉัน", icon: UserRound },
  { id: "security", label: "ความปลอดภัย", icon: ShieldCheck },
  { id: "privacy", label: "ความเป็นส่วนตัว", icon: Lock },
  { id: "data", label: "ข้อมูลของฉัน", icon: Database },
];

const when = (iso: string) => new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
/** Show only the network part: 203.150.•••.••• / 2001:db8:•••• */
const maskIp = (ip: string) => ip.includes(".") ? ip.split(".").slice(0, 2).concat("•••", "•••").join(".") : ip.split(":").slice(0, 2).concat("••••").join(":");
const tall = "max-lg:h-11"; // 44px touch targets on mobile

export default function Settings() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title="ตั้งค่า" sub="บัญชี ความปลอดภัย และสิทธิ์ในข้อมูลของคุณ"
        action={<Button variant="outline" className="max-lg:hidden" onClick={() => logout(router)}><LogOut aria-hidden /> ออกจากระบบ</Button>} />
      {/* `!` beats the shadcn group-data orientation variants (fixed h-9, flex-col) that made the nav overlap the content */}
      <Tabs defaultValue="account" className="grid! gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
        <TabsList variant="line" aria-label="หมวดการตั้งค่า"
          className="grid! h-auto! w-full grid-cols-2 gap-1 p-0 lg:sticky lg:top-6 lg:flex! lg:flex-col lg:items-stretch">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id}
              className="h-11 justify-start gap-2 rounded px-3 text-[15px] after:hidden hover:bg-subtle data-[state=active]:bg-primary-soft data-[state=active]:text-primary lg:h-10">
              <Icon aria-hidden /> {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="min-w-0 flex-1">
          <TabsContent value="account"><Account /></TabsContent>
          <TabsContent value="security"><Security /></TabsContent>
          <TabsContent value="privacy"><Privacy /></TabsContent>
          <TabsContent value="data"><MyData /></TabsContent>
        </div>
      </Tabs>
      <Button variant="outline" className="mt-8 h-11 w-full text-danger lg:hidden" onClick={() => logout(router)}><LogOut aria-hidden /> ออกจากระบบ</Button>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <header>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{sub}</p>
      </header>
      {children}
    </section>
  );
}

function Panel({ title, sub, action, className, children }: { title: string; sub?: ReactNode; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <Card className={cx("gap-4 py-5 shadow-none", className)}>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3 px-5">
        <div className="min-w-0">
          <CardTitle className="text-[15px]">{title}</CardTitle>
          {sub && <CardDescription className="mt-1">{sub}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
    </Card>
  );
}

/* 1. บัญชีของฉัน */
function Account() {
  const user = useUser();
  const profile = useApi<Profile>("/profile");
  const name = profile.data?.displayName ?? user?.displayName;

  return (
    <Section title="บัญชีของฉัน" sub="ข้อมูลส่วนตัวที่ใช้ระบุตัวคุณ ปลดล็อกไฟล์ statement และกรอกแบบยื่นภาษีให้">
      <Card className="flex-row items-center gap-4 px-5 py-5 shadow-none">
        <Avatar className="size-12">
          <AvatarFallback className="bg-primary-soft text-lg font-semibold text-primary">{name?.trim().charAt(0).toUpperCase() || "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name ?? "…"}</p>
          <p className="truncate text-sm text-muted">{user?.email}</p>
          {user && <p className="text-xs text-muted">สมาชิกตั้งแต่ {new Date(user.createdAt).toLocaleDateString("th-TH", { dateStyle: "medium" })}</p>}
        </div>
      </Card>

      <Panel title="ข้อมูลส่วนตัว" sub="กรอกเท่าที่สะดวก ช่องที่มี * เท่านั้นที่จำเป็น">
        {profile.loading ? <Loading /> : profile.error ? <ErrorNote>{profile.error}</ErrorNote> : (
          <ProfileForm profile={profile.data!} onSaved={profile.setData} />
        )}
        <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-sm text-muted">
          <Lock aria-hidden size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>ชื่อจริง เบอร์โทร วันเกิด และเลขบัตรเก็บแบบเข้ารหัส ไม่มีใครเห็นค่าเต็ม (รวมถึงทีมงาน) ไม่แสดงใน log และไม่ส่งให้ AI</span>
        </p>
      </Panel>
    </Section>
  );
}

/* 2. ความปลอดภัย */
function Security() {
  const [lp, setLp] = useState({ page: 1, size: 10 });
  const logins = useApi<{ logins: LoginRow[]; total: number }>(`/security/logins?limit=${lp.size}&page=${lp.page}`);
  const sessions = useApi<{ sessions: SessionRow[] }>("/security/sessions");
  const [sp, setSp] = useState(1);
  const [pending, setPending] = useState("");
  const fails = (logins.data?.logins ?? []).filter((l) => !l.success).length;
  const others = (sessions.data?.sessions ?? []).filter((s) => !s.current).length;

  async function act(key: string, path: string, method: string, done: string) {
    setPending(key);
    try {
      await api(path, json(method));
      toast.success(done);
      sessions.reload();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setPending("");
    }
  }

  return (
    <Section title="ความปลอดภัย" sub="ดูว่าใครเข้าบัญชีคุณ จากเครื่องไหน และสั่งออกจากระบบได้ทันที">
      {fails > 0 && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
          มีการเข้าสู่ระบบไม่สำเร็จ {fails} ครั้ง ถ้าไม่ใช่คุณ ให้กด “ออกจากระบบเครื่องอื่นทั้งหมด” ทันที
        </p>
      )}

      <Panel title="อุปกรณ์ที่เข้าสู่ระบบอยู่" sub="ไม่รู้จักเครื่องไหน กดออกจากระบบได้เลย"
        action={others > 0 && (
          <Button variant="outline" className={cx(tall, "text-danger")} disabled={pending !== ""}
            onClick={() => act("others", "/security/sessions/revoke-others", "POST", "ออกจากระบบเครื่องอื่นทั้งหมดแล้ว")}>
            {pending === "others" ? "กำลังออกจากระบบ…" : "ออกจากระบบเครื่องอื่นทั้งหมด"}
          </Button>
        )}>
        {sessions.loading ? <Loading /> : sessions.error ? <ErrorNote>{sessions.error}</ErrorNote> : (
          <ul className="divide-y divide-line border-y border-line">
            {sessions.data!.sessions.slice((sp - 1) * 10, sp * 10).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <MonitorSmartphone aria-hidden size={20} className="shrink-0 text-muted" />
                  <div className="min-w-0">
                    <p className="font-medium">{s.device} {s.current && <Badge variant="secondary" className="bg-primary-soft text-primary">เครื่องนี้</Badge>}</p>
                    <p className="text-sm text-muted">{s.location} · ใช้งานล่าสุด {when(s.lastSeenAt)}</p>
                  </div>
                </div>
                {!s.current && (
                  <Button variant="outline" size="sm" className={tall} disabled={pending !== ""}
                    onClick={() => act(s.id, `/security/sessions/${s.id}`, "DELETE", `ออกจากระบบ ${s.device} แล้ว`)}>
                    {pending === s.id ? "กำลังออก…" : "ออกจากระบบ"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {sessions.data && <MiniPager page={sp} size={10} sizes={[10]} total={sessions.data.sessions.length} onPage={setSp} />}
      </Panel>

      <Panel title="ประวัติการเข้าสู่ระบบ" sub="ย้อนหลัง 90 วัน · ตำแหน่งเป็นค่าประมาณจาก IP">
        {logins.loading ? <Loading /> : logins.error ? <ErrorNote>{logins.error}</ErrorNote> : (
          <table className="w-full text-sm">
            <thead className="border-y border-line bg-subtle text-left text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">เวลา</th>
                <th scope="col" className="px-3 py-2 font-medium">อุปกรณ์</th>
                <th scope="col" className="px-3 py-2 font-medium max-md:hidden">ตำแหน่งโดยประมาณ</th>
                <th scope="col" className="px-3 py-2 font-medium max-md:hidden">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logins.data!.logins.map((l, i) => (
                <tr key={i} className={cx(!l.success && "bg-danger-bg")}>
                  <td className="num px-3 py-2.5 align-top">
                    {when(l.at)}
                    {!l.success && <span className="block text-xs font-medium text-danger">เข้าไม่สำเร็จ</span>}
                  </td>
                  <td className="px-3 py-2.5 align-top break-words">
                    {l.device} {l.current && <Badge variant="secondary" className="bg-primary-soft text-primary">เครื่องนี้</Badge>}
                    <span className="block text-xs text-muted md:hidden">{l.location} · <span className="num">{maskIp(l.ip)}</span></span>
                  </td>
                  <td className="px-3 py-2.5 align-top text-muted max-md:hidden">{l.location}</td>
                  <td className="num px-3 py-2.5 align-top whitespace-nowrap text-muted max-md:hidden">{maskIp(l.ip)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {logins.data && <MiniPager page={lp.page} size={lp.size} total={logins.data.total} onPage={(page) => setLp({ ...lp, page })} onSize={(size) => setLp({ page: 1, size })} />}
      </Panel>
    </Section>
  );
}

/* 3. ความเป็นส่วนตัว & ความยินยอม */
function Privacy() {
  const consents = useApi<{ consents: Consent[] }>("/profile/consents");
  const [pending, setPending] = useState<Purpose | "">("");
  const get = (p: Purpose) => consents.data?.consents.find((c) => c.purpose === p);

  async function toggle(purpose: Purpose, granted: boolean) {
    setPending(purpose);
    try {
      await api("/profile/consents", json("PUT", { purpose, granted }));
      consents.reload();
      toast.success(granted ? "เปิดความยินยอมแล้ว" : "ถอนความยินยอมแล้ว มีผลทันที");
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setPending("");
    }
  }

  return (
    <Section title="ความเป็นส่วนตัว & ความยินยอม" sub="คุณเลือกได้ว่าให้เราใช้ข้อมูลทำอะไรบ้าง ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)">
      {consents.loading ? <Loading /> : consents.error ? <ErrorNote>{consents.error}</ErrorNote> : (
        <>
          <Panel title="ทางเลือกของคุณ" sub="เปิดหรือปิดได้ทุกเมื่อ ถอนแล้วไม่กระทบการใช้งานหลัก">
            <ul className="divide-y divide-line border-y border-line">
              {CONSENTS.filter((c) => !c.required).map((c) => {
                const cur = get(c.purpose);
                return (
                  <li key={c.purpose} className="flex items-start justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <Label htmlFor={`c-${c.purpose}`} className="text-[15px] font-semibold">{c.title}</Label>
                      <p id={`c-${c.purpose}-d`} className="mt-1 text-sm text-muted">{c.text}</p>
                      {cur && <p className="mt-1 text-xs text-muted">{cur.granted ? "เปิด" : "ปิด"}เมื่อ {when(cur.at)}</p>}
                    </div>
                    <Switch id={`c-${c.purpose}`} aria-describedby={`c-${c.purpose}-d`} className="mt-1 after:absolute after:-inset-3 relative"
                      checked={cur?.granted ?? false} disabled={pending === c.purpose} onCheckedChange={(v) => toggle(c.purpose, v)} />
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="ข้อตกลงที่จำเป็น" sub="ต้องยอมรับเพื่อใช้งาน หากไม่ต้องการแล้ว ให้ลบบัญชีในหมวด “ข้อมูลของฉัน”">
            <ul className="divide-y divide-line border-y border-line">
              {CONSENTS.filter((c) => c.required).map((c) => {
                const href = LEGAL[c.purpose];
                const cur = get(c.purpose);
                return (
                  <li key={c.purpose} className="flex items-center justify-between gap-4 py-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Lock aria-hidden size={16} className="mt-1 shrink-0 text-muted" />
                      <div className="min-w-0">
                        {href ? <Link href={href} target="_blank" className="font-medium text-primary hover:underline">{c.title}</Link> : <p className="font-medium">{c.title}</p>}
                        {cur && <p className="text-xs text-muted">ยอมรับ{cur.version && ` ฉบับ ${cur.version}`} เมื่อ {when(cur.at)}</p>}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 bg-success-bg text-success">ยอมรับแล้ว</Badge>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </>
      )}
    </Section>
  );
}

/* 4. ข้อมูลของฉัน */
function MyData() {
  const [ap, setAp] = useState({ page: 1, size: 10 });
  const audit = useApi<{ entries: AuditEntry[]; total: number }>(`/audit?limit=${ap.size}&page=${ap.page}`);
  return (
    <Section title="ข้อมูลของฉัน" sub="ข้อมูลเป็นของคุณ ดาวน์โหลดเก็บไว้ ดูว่าถูกใช้เมื่อไหร่ หรือลบทิ้งได้">
      <Panel title="ส่งออกข้อมูล" sub="Statement เป็น CSV/PDF หรือชุดยื่นภาษีเงินได้บุคคลธรรมดาแบบกรอกให้ (ต้องมีเลขบัตรประชาชนในบัญชีของฉัน)"
        action={<ExportDialog />}>
        <p className="text-sm text-muted">รวมทุกรายการ หมวดหมู่ และโน้ตที่คุณแก้ไว้ เปิดได้ใน Excel หรือ Google Sheets</p>
      </Panel>

      <Panel title="ประวัติการใช้งานบัญชี" sub="ทุกครั้งที่มีการเข้าถึงหรือเปลี่ยนข้อมูลของคุณ">
        {audit.loading ? <Loading /> : audit.error ? <ErrorNote>{audit.error}</ErrorNote> : (
          <ol className="divide-y divide-line border-y border-line">
            {(audit.data?.entries ?? []).map((e, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5">
                <span className="font-medium">{ACTION_LABEL[e.action] ?? e.action}</span>
                <span className="num text-sm text-muted">{when(e.at)}</span>
              </li>
            ))}
          </ol>
        )}
        {audit.data && <MiniPager page={ap.page} size={ap.size} total={audit.data.total} onPage={(page) => setAp({ ...ap, page })} onSize={(size) => setAp({ page: 1, size })} />}
      </Panel>

      <Panel title="ลบบัญชี" className="border-danger/50" sub="ลบถาวรและกู้คืนไม่ได้" action={<DeleteAccount />}>
        <p className="text-sm text-muted">ข้อมูลส่วนตัว รายการเงิน ไฟล์ statement สลิป และประวัติการเข้าสู่ระบบจะถูกลบทั้งหมด</p>
      </Panel>
    </Section>
  );
}

function DeleteAccount() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/account", json("DELETE", { password: new FormData(e.currentTarget).get("password") }));
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "รหัสผ่านไม่ถูกต้อง ลองอีกครั้ง" : err instanceof ApiError && err.status === 429 ? "ลองผิดหลายครั้งเกินไป รอสักครู่แล้วลองใหม่" : errorText(err));
      setBusy(false);
    }
  }

  return (
    <Dialog onOpenChange={() => setError("")}>
      <DialogTrigger asChild>
        <Button variant="destructive" className={tall}>ลบบัญชี…</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>ลบบัญชีถาวร?</DialogTitle>
            <DialogDescription>
              เราจะลบข้อมูลส่วนตัว รายการเงิน ไฟล์ statement สลิป และประวัติการเข้าสู่ระบบทั้งหมด กู้คืนไม่ได้
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-md bg-subtle p-3 text-sm text-muted">
            สิ่งที่ยังเก็บไว้ตามกฎหมาย: บันทึกความยินยอมและบันทึกการใช้งาน โดยตัดชื่อและอีเมลออกแล้ว (ไม่ระบุตัวตน)
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="del-pw">ใส่รหัสผ่านเพื่อยืนยันว่าเป็นคุณ</Label>
            <Input id="del-pw" name="password" type="password" required autoComplete="current-password" className="max-lg:h-11" />
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" className={tall}>ยกเลิก</Button></DialogClose>
            <Button type="submit" variant="destructive" className={tall} disabled={busy}>{busy ? "กำลังลบ…" : "ลบบัญชีถาวร"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

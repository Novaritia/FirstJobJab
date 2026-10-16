// Dev-only mock of app/API.md, enabled with NEXT_PUBLIC_MOCK=1. In-memory, resets on reload.
// shortcut: no persistence and loose validation; delete once the real API is stable.
import type { Category, Direction } from "@fjm/shared";
import type { AuditEntry, ChatMsg, Consent, ReviewRow, Slip, Tx, TxEdit, UploadResult } from "./api";

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const err = (status: number, error: string) => ok({ error }, status);

const MONTHS = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
let loggedIn = true;
const profile: Record<string, unknown> = { displayName: "มิ้นท์", fullName: null, phone: null, birthDate: null, monthlySalary: null };
const user = { id: "u1", email: "demo@firstjobjab.app", displayName: "มิ้นท์", hasPii: false, createdAt: "2026-10-16T08:00:00Z" };
const consents: Consent[] = [
  { purpose: "planning", granted: true, version: "1", at: "2026-10-16T08:00:00Z" },
  { purpose: "loan_summary", granted: false, version: "1", at: "2026-10-16T08:00:00Z" },
  { purpose: "improve", granted: false, version: "1", at: "2026-10-16T08:00:00Z" },
];
const audit: AuditEntry[] = [
  { action: "login", target: "user:u1", at: "2026-10-16T08:00:00Z" },
  { action: "confirm_import", target: "upload:up1", at: "2026-10-16T08:05:00Z" },
];
const edits: Record<string, TxEdit[]> = {};

const SPEND: [string, Category, number][] = [
  ["7-ELEVEN", "food", 8900], ["GRAB FOOD", "food", 21500], ["BTS SKYTRAIN", "transport", 4400],
  ["SHOPEE", "shopping", 129000], ["AIS BILL", "bills", 59900], ["โอนค่าห้อง นายสมชาย", "rent", 650000],
  ["MAJOR CINEPLEX", "entertainment", 32000], ["โอนให้แม่", "family", 300000], ["KTC CARD", "debt", 250000],
  ["DIME! ลงทุน", "savings_invest", 200000],
];
let txs: Tx[] = MONTHS.flatMap((m, mi) => {
  let bal = 1500000 + mi * 120000;
  const rows: Tx[] = [];
  const add = (day: number, description: string, category: Category, amount: number, direction: Direction) => {
    bal += direction === "in" ? amount : -amount;
    rows.push({
      id: `t${m}-${rows.length}`, accountId: "kbank-1234", date: `${m}-${String(day).padStart(2, "0")}`,
      description, amount, direction, balance: bal, category, source: "statement", verified: true,
      hidden: false, edited: false,
    });
  };
  add(1, "SALARY ACME CO", "salary", 2800000, "in");
  SPEND.forEach(([d, c, a], i) => add(2 + i * 2, d, c, a + mi * 1700, "out"));
  return rows;
});
txs.push({
  id: "t-manual-1", accountId: "cash", date: "2026-09-20", description: "ข้าวมันไก่ (เงินสด)", amount: 6000,
  direction: "out", category: "food", source: "manual", verified: false, hidden: false, edited: false,
});

function summary(months: number) {
  const ms = MONTHS.slice(-months).map((month) => {
    const rows = txs.filter((t) => t.date.startsWith(month) && !t.hidden && t.category !== "own_transfer");
    const income = rows.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0);
    const spend = rows.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0);
    const byCategory: Partial<Record<Category, number>> = {};
    rows.filter((t) => t.direction === "out").forEach((t) => (byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount));
    return { month, income, spend, net: income - spend, byCategory };
  });
  const last = ms[ms.length - 1];
  const topSpend = Object.entries(last.byCategory)
    .map(([category, amount]) => ({ category: category as Category, amount: amount ?? 0 }))
    .sort((a, b) => b.amount - a.amount).slice(0, 5);
  return {
    months: ms, topSpend,
    text: "3 เดือนที่ผ่านมา เงินเดือนเข้าเฉลี่ย ฿28,000 ใช้ไปประมาณ ฿16,500 เหลือเก็บราว ฿11,500 ต่อเดือน ค่าใช้จ่ายก้อนใหญ่สุดคือค่าห้อง รองลงมาคือส่งให้ครอบครัวและผ่อนบัตร ถ้าลด Grab Food ลงครึ่งหนึ่งจะเก็บเพิ่มได้อีกราว ฿1,000/เดือน",
  };
}

let streakCurrent = 4;
const streak = () => ({
  current: streakCurrent, best: Math.max(streakCurrent, 4),
  months: ["2026-04", ...MONTHS].map((month) => ({ month, covered: month !== "2026-04" || streakCurrent > 4 })),
  missing: streakCurrent > 4 ? [] : ["2026-04"], expiringSoon: streakCurrent > 4 ? [] : ["2026-04"],
});

// Upload: April statement with two rows whose amounts were mis-read.
type MockUpload = UploadResult & { opening: number };
const uploads: Record<string, MockUpload> = {};
function recheck(u: MockUpload) {
  let prev = u.opening;
  const rows = u.rows.map((r) => {
    const expectedBalance = prev + (r.direction === "in" ? r.amount : -r.amount);
    const okRow = expectedBalance === r.balance;
    prev = r.balance;
    return { index: r.index, ok: okRow, expectedBalance };
  });
  u.rows = u.rows.map((r, i) => ({ ...r, ok: rows[i].ok }));
  const okCount = rows.filter((r) => r.ok).length;
  u.check = { rows, totalsOk: okCount === rows.length, okCount, failCount: rows.length - okCount };
}
function newUpload(name: string): MockUpload {
  const id = `up${Object.keys(uploads).length + 2}`;
  const base: [string, number, Direction][] = [
    ["SALARY ACME CO", 2800000, "in"], ["7-ELEVEN", 8900, "out"], ["GRAB FOOD", 21500, "out"],
    ["โอนค่าห้อง นายสมชาย", 650000, "out"], ["SHOPEE", 129000, "out"], ["AIS BILL", 59900, "out"],
    ["โอนให้แม่", 300000, "out"], ["KTC CARD", 250000, "out"],
  ];
  let bal = 1380000;
  const opening = bal;
  const rows: ReviewRow[] = base.map(([description, amount, direction], index) => {
    bal += direction === "in" ? amount : -amount;
    const shown = index === 2 ? 2150 : index === 5 ? 59990 : amount; // simulated misreads
    return {
      index, date: `2026-04-${String(1 + index * 3).padStart(2, "0")}`, description, amount: shown, direction,
      balance: bal, ok: true, category: index === 0 ? "salary" : "other",
    };
  });
  const u: MockUpload = {
    uploadId: id, bank: name.toLowerCase().includes("bbl") ? "BBL" : "KBANK",
    period: { start: "2026-04-01", end: "2026-04-30" }, accountNoMasked: "xxx-x-x1234-x", rows, opening,
    check: { rows: [], totalsOk: false, okCount: 0, failCount: 0 },
  };
  recheck(u);
  return (uploads[id] = u);
}

function growth(body: { monthlySaving: number; annualReturn: number; years: number; startBalance?: number }) {
  const r = body.annualReturn / 12;
  const start = body.startBalance ?? 0;
  let value = start;
  const points = [{ month: 0, contributed: start, value }];
  for (let m = 1; m <= body.years * 12; m++) {
    value = value * (1 + r) + body.monthlySaving;
    points.push({ month: m, contributed: start + body.monthlySaving * m, value: Math.round(value) });
  }
  return { points };
}

function chat(q: string) {
  const s = summary(1);
  const m = s.months[0];
  if (/มากสุด|อะไร/.test(q)) return { reply: `เดือน ${m.month} ใช้กับค่าเช่ามากสุด รองลงมาคือครอบครัวและผ่อนบัตร`, data: s.topSpend.map((t) => ({ หมวด: t.category, จำนวน: `฿${(t.amount / 100).toLocaleString("th-TH")}` })) };
  if (/ภาษี/.test(q)) return { reply: "ปีนี้น่าจะเสียภาษีประมาณ ฿850 (ประมาณการ ไม่ใช่คำแนะนำทางภาษี)" };
  if (/กู้/.test(q)) return { reply: `ส่ง statement ต่อเนื่อง ${streakCurrent}/6 เดือน ผ่อนได้ไม่เกินประมาณ ฿11,200/เดือน` };
  if (/streak|สตรีค/i.test(q)) return { reply: `streak ตอนนี้ ${streakCurrent} เดือน ยังขาด เม.ย. 69 รีบอัปโหลดก่อนธนาคารลบ` };
  return { reply: `เดือนนี้ใช้ไป ฿${(m.spend / 100).toLocaleString("th-TH")} จากเงินเข้า ฿${(m.income / 100).toLocaleString("th-TH")}`, data: [{ รายการ: "เงินเข้า", จำนวน: m.income / 100 }, { รายการ: "ใช้ไป", จำนวน: m.spend / 100 }, { รายการ: "เหลือ", จำนวน: m.net / 100 }] };
}

export async function mockFetch(path: string, init: RequestInit): Promise<Response> {
  await new Promise((r) => setTimeout(r, 250));
  const method = (init.method ?? "GET").toUpperCase();
  const url = new URL(path, "http://mock");
  const p = url.pathname;
  const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
  const now = () => new Date().toISOString();

  if (p === "/auth/login" || p === "/auth/register") {
    loggedIn = true;
    if (body?.displayName) user.displayName = body.displayName;
    return ok({ user });
  }
  if (p === "/auth/logout") { loggedIn = false; return ok({ ok: true }); }
  if (!loggedIn) return err(401, "unauthorized");
  if (p === "/auth/me") return ok({ user });

  if (p === "/profile") {
    if (method === "PUT") Object.assign(profile, body, body.monthlySalary != null && { monthlySalary: body.monthlySalary * 100 });
    return ok({ ...profile, email: user.email, nationalIdMasked: null, hasNationalId: false });
  }
  if (p === "/profile/pii") { user.hasPii = true; return ok({ ok: true }); }
  if (p === "/profile/reconsent") return ok({ ok: true });
  if (p === "/account" && method === "DELETE") {
    if (body?.password !== "demo1234") return err(401, "wrong_password");
    loggedIn = false;
    return ok({ ok: true });
  }
  if (p === "/security/logins") {
    const logins = [
      { at: "2026-10-16T08:00:00Z", success: true, ip: "171.96.12.40", device: "Windows · Chrome", location: "Bangkok, TH", current: true },
      { at: "2026-10-15T21:12:00Z", success: false, ip: "203.0.113.9", device: "Linux · Firefox", location: "Singapore, SG", current: false },
      { at: "2026-10-14T07:30:00Z", success: true, ip: "171.96.12.41", device: "iOS · Safari", location: "Bangkok, TH", current: false },
    ];
    return ok({ logins, total: logins.length });
  }
  if (p === "/security/sessions") {
    return ok({ sessions: [
      { id: "s1", createdAt: "2026-10-16T08:00:00Z", lastSeenAt: "2026-10-16T09:50:00Z", device: "Windows · Chrome", location: "Bangkok, TH", current: true },
      { id: "s2", createdAt: "2026-10-14T07:30:00Z", lastSeenAt: "2026-10-15T12:00:00Z", device: "iOS · Safari", location: "Bangkok, TH", current: false },
    ] });
  }
  if (p === "/security/sessions/revoke-others") return ok({ ok: true, revoked: 1 });
  if (p.startsWith("/security/sessions/")) return ok({ ok: true });
  if (p === "/profile/consents" && method === "GET") return ok({ consents });
  if (p === "/profile/consents") {
    const c = consents.find((x) => x.purpose === body.purpose);
    if (c) { c.granted = body.granted; c.at = now(); }
    return ok({ ok: true });
  }

  if (p === "/uploads" && method === "POST") {
    const form = init.body as FormData;
    const file = form.get("file") as File;
    if (file.name.toLowerCase().includes("locked") && !form.get("password")) return err(422, "password_required");
    const u = newUpload(file.name);
    return ok({ ...u, opening: undefined });
  }
  if (p === "/uploads") {
    return ok({ uploads: [{ id: "up1", bank: "KBANK", periodStart: "2026-05-01", periodEnd: "2026-09-30", status: "confirmed", rowCount: 55, createdAt: "2026-10-16T08:05:00Z" }] });
  }
  let m = p.match(/^\/uploads\/([^/]+)\/rows\/(\d+)$/);
  if (m) {
    const u = uploads[m[1]];
    const i = Number(m[2]);
    u.rows[i] = { ...u.rows[i], ...body };
    recheck(u);
    return ok({ rows: u.rows, check: u.check });
  }
  m = p.match(/^\/uploads\/([^/]+)\/confirm$/);
  if (m) {
    const u = uploads[m[1]];
    if (u.check.failCount) return err(409, "balance_check_failed");
    streakCurrent += 1;
    audit.push({ action: "confirm_import", target: `upload:${u.uploadId}`, at: now() });
    return ok({ imported: u.rows.length, streak: streak() });
  }

  if (p === "/transactions/export.csv") {
    const csv = "date,description,direction,amount,category\n" +
      txs.map((t) => `${t.date},"${t.description}",${t.direction},${(t.amount / 100).toFixed(2)},${t.category}`).join("\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv" } });
  }
  if (p === "/transactions" && method === "GET") {
    const from = url.searchParams.get("from"), to = url.searchParams.get("to");
    return ok({
      transactions: txs.filter((t) => (!from || t.date >= from) && (!to || t.date <= to)).sort((a, b) => b.date.localeCompare(a.date)),
    });
  }
  if (p === "/transactions") {
    const t: Tx = { ...body, id: `t-manual-${txs.length}`, accountId: "cash", source: "manual", verified: false, hidden: false, edited: false };
    txs = [t, ...txs];
    return ok({ transaction: t });
  }
  m = p.match(/^\/transactions\/([^/]+)\/edits$/);
  if (m) return ok({ edits: edits[m[1]] ?? [] });
  m = p.match(/^\/transactions\/([^/]+)$/);
  if (m) {
    const id = m[1];
    const t = txs.find((x) => x.id === id);
    if (!t) return err(404, "not_found");
    for (const [k, v] of Object.entries(body)) {
      (edits[id] ??= []).push({ field: k, oldValue: String((t as Record<string, unknown>)[k] ?? ""), newValue: String(v), at: now() });
    }
    Object.assign(t, body, { edited: true });
    return ok({ transaction: t });
  }

  if (p === "/insights/summary") return ok(summary(Number(url.searchParams.get("months") ?? 3)));
  if (p === "/insights/growth") return ok(growth(body));
  if (p === "/insights/loan-ready") {
    return ok({ continuousMonths: streakCurrent, required: 6, avgIncome: 2800000, avgSpend: 1650000, maxInstallment: 1120000 });
  }
  if (p === "/insights/tax") {
    return ok({
      grossIncome: 33600000, expenseDeduction: 10000000, allowances: 6900000, netIncome: 16700000, tax: 85000,
      brackets: [
        { from: 0, to: 15000000, rate: 0, tax: 0 },
        { from: 15000000, to: 30000000, rate: 0.05, tax: 85000 },
      ],
      monthlySalaryWhereTaxStarts: 2629200,
    });
  }
  if (p === "/chat") return ok(chat((body.messages as ChatMsg[]).at(-1)?.content ?? ""));
  if (p === "/chat/voice") return err(503, "voice_unavailable");
  if (p === "/slips") {
    const files = (init.body as FormData).getAll("images") as File[];
    const out: Slip[] = files.map((f, i) => ({
      id: `slip${Date.now()}-${i}`, amount: i % 2 ? 35000 : 21500, date: "2026-09-06", time: "12:41",
      fromName: "นางสาว มิ้นท์ ใจดี", toName: i % 2 ? "ร้านป้าแดง" : "GRAB FOOD", bank: "KBANK", ref: `${f.name.slice(0, 6)}${i}`,
      matchedTransactionId: i % 2 ? null : "t2026-09-2", status: i % 2 ? "unmatched" : "matched", confidence: i % 2 ? 0.82 : 0.97,
    }));
    return ok({ slips: out });
  }
  if (/^\/slips\/[^/]+\/confirm$/.test(p)) return ok({ ok: true });
  if (p === "/streak") return ok(streak());
  if (p === "/voice/weekly") return err(503, "voice_unavailable");
  if (p === "/voice/weekly/text") return ok({ text: "สัปดาห์นี้ใช้ไป ฿3,200 จากงบ ฿4,000 เก่งมาก! ค่าอาหารลดลงจากสัปดาห์ก่อน 15%" });
  if (p === "/audit") return ok({ entries: audit, total: audit.length });
  return err(404, `mock: no route ${method} ${p}`);
}

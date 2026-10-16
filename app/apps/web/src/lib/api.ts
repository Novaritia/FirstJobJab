import type {
  BalanceCheckResult, Bank, Category, Direction, GrowthInput, GrowthPoint, MonthSummary,
  ParsedRow, Source, TaxResult,
} from "@fjm/shared";
import { busy } from "./busy";

// Types from app/API.md
export type User = { id: string; email: string; displayName: string; hasPii: boolean; createdAt: string; needsReconsent?: boolean };
export type Purpose = "terms" | "privacy" | "planning" | "loan_summary" | "improve";
export type Consent = { purpose: Purpose; granted: boolean; version: string; at: string };
export type ReviewRow = ParsedRow & { index: number; ok: boolean; category: Category };
export type UploadResult = {
  uploadId: string; bank: Bank; period: { start: string; end: string }; accountNoMasked: string;
  rows: ReviewRow[]; check: BalanceCheckResult;
};
/** History coverage for loan-ready (x/6 continuous months) — not the 🔥 streak. */
export type Coverage = { months: { month: string; covered: boolean }[]; continuousMonths: number; missing: string[]; expiringSoon: string[] };
/** 🔥 streak: +1 per update that added data, no maximum; goes out after 30 days without an update. */
export type Streak = {
  current: number; best: number; lastUpdateAt: string | null; expiresAt: string | null; daysLeft: number;
  updatesThisMonth: number; recent: { at: string; kind: string; rows: number }[]; coverage: Coverage;
  gained?: number; // only on confirm responses
};
export type Tx = {
  id: string; accountId: string; date: string; time?: string; description: string; amount: number;
  direction: Direction; balance?: number; category: Category; note?: string; source: Source;
  verified: boolean; hidden: boolean; edited: boolean;
};
export type TxEdit = { field: string; oldValue: string | null; newValue: string | null; at: string };
export type Summary = { months: MonthSummary[]; topSpend: { category: Category; amount: number }[]; text: string };
export type LoanReady = { continuousMonths: number; required: number; avgIncome: number; avgSpend: number; maxInstallment: number };
export type AuditEntry = { action: string; target: string | null; at: string };
export type Profile = {
  displayName: string; email: string; fullName: string | null; phone: string | null; birthDate: string | null;
  nationalIdMasked: string | null; hasNationalId: boolean; monthlySalary: number | null; // satang
};
export type LoginRow = { at: string; success: boolean; ip: string; device: string; location: string; current: boolean };
export type SessionRow = { id: string; createdAt: string; lastSeenAt: string; device: string; location: string; current: boolean };
export type ChatMsg = { role: "user" | "assistant"; content: string };
export type DataRow = Record<string, string | number | null>;
export type ChatReply = { reply: string; data?: DataRow[] };
export type VoiceReply = ChatReply & { transcript: string; audio?: string };
export type UploadLog = {
  id: string; bank: string; periodStart: string; periodEnd: string; status: "pending" | "confirmed" | string; rowCount: number; createdAt: string;
  fileName?: string | null; kind?: string; importedRows?: number; confirmedAt?: string | null; ocr?: boolean;
  check?: { okCount: number; failCount: number; mode?: "per_row" | "totals" | "none" };
  // older/mock fields
  importedCount?: number; okCount?: number; failCount?: number; unverifiedCount?: number;
};
export type Slip = {
  id: string; amount?: number; date?: string; time?: string; fromName?: string; toName?: string; bank?: string; ref?: string; qrRef?: string;
  matchedTransactionId?: string | null; status: "matched" | "unmatched" | "confirmed"; confidence: number;
};
export type { GrowthInput, GrowthPoint, TaxResult };

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const MOCK = process.env.NEXT_PUBLIC_MOCK === "1";

export class ApiError extends Error {
  constructor(public status: number, message: string, public fields?: Record<string, string>) { super(message); }
}

/** Raw fetch against the API (cookie auth). Returns the Response so callers can read blobs. Drives TopLoader. */
export function apiRaw(path: string, init: RequestInit = {}): Promise<Response> {
  return busy.track(send(path, init));
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const req = { ...init, headers, credentials: "include" as const };
  const res = MOCK ? await (await import("./mock")).mockFetch(path, req) : await fetch(API_URL + path, req);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText ?? "error", body.fields);
  }
  return res;
}

const inflight = new Map<string, Promise<unknown>>();

/** Tell every mounted useApi (navbar 🔥, lists, dashboard) to refetch after a mutation that changes server data. */
export const DATA_CHANGED = "fjm:data-changed";
export const dataChanged = () => window.dispatchEvent(new Event(DATA_CHANGED));

/** JSON call. Identical GETs already in flight share one request (layout + page, StrictMode double effects). */
export function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const load = () => apiRaw(path, init).then((r) => r.json() as Promise<T>);
  if ((init.method ?? "GET") !== "GET") return load();
  let p = inflight.get(path);
  if (!p) {
    p = load().finally(() => inflight.delete(path));
    inflight.set(path, p);
  }
  return p as Promise<T>;
}

export const json = (method: string, body?: unknown): RequestInit =>
  ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    if (e.message === "unsupported_format") return "อ่านรายการในไฟล์นี้ไม่ได้ — ลองไฟล์ statement ที่ชัดกว่านี้ หรือถ่ายรูปให้เห็นทั้งตาราง";
    if (e.message === "slip_incomplete") return "อ่านยอดหรือวันที่จากสลิปไม่ได้ เพิ่มเป็นรายการเองแทนได้";
    if (e.message === "slip_not_unmatched") return "สลิปนี้เพิ่มหรือจับคู่ไปแล้ว";
    if (e.message === "not_an_image") return "รองรับเฉพาะรูป JPG/PNG";
    if (e.message === "not_an_image") return "รองรับเฉพาะรูป JPG/PNG";
    if (e.message === "already_imported") return "ไฟล์นี้นำเข้าไปแล้ว";
    return e.message;
  }
  return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง";
}

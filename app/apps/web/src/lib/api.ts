import type {
  BalanceCheckResult, Bank, Category, Direction, GrowthInput, GrowthPoint, MonthSummary,
  ParsedRow, Source, TaxResult,
} from "@fjm/shared";

// Types from app/API.md
export type User = { id: string; email: string; displayName: string; hasPii: boolean; createdAt: string };
export type Purpose = "planning" | "loan_summary" | "improve";
export type Consent = { purpose: Purpose; granted: boolean; version: string; at: string };
export type ReviewRow = ParsedRow & { index: number; ok: boolean; category: Category };
export type UploadResult = {
  uploadId: string; bank: Bank; period: { start: string; end: string }; accountNoMasked: string;
  rows: ReviewRow[]; check: BalanceCheckResult;
};
export type Streak = {
  current: number; best: number; months: { month: string; covered: boolean }[];
  missing: string[]; expiringSoon: string[];
};
export type Tx = {
  id: string; accountId: string; date: string; time?: string; description: string; amount: number;
  direction: Direction; balance?: number; category: Category; note?: string; source: Source;
  verified: boolean; hidden: boolean; edited: boolean;
};
export type TxEdit = { field: string; oldValue: string | null; newValue: string | null; at: string };
export type Summary = { months: MonthSummary[]; topSpend: { category: Category; amount: number }[]; text: string };
export type LoanReady = { continuousMonths: number; required: number; avgIncome: number; avgSpend: number; maxInstallment: number };
export type AuditEntry = { action: string; target: string; at: string };
export type { GrowthInput, GrowthPoint, TaxResult };

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const MOCK = process.env.NEXT_PUBLIC_MOCK === "1";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Raw fetch against the API (cookie auth). Returns the Response so callers can read blobs. */
export async function apiRaw(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const req = { ...init, headers, credentials: "include" as const };
  const res = MOCK ? await (await import("./mock")).mockFetch(path, req) : await fetch(API_URL + path, req);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText ?? "error");
  }
  return res;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await apiRaw(path, init)).json() as Promise<T>;
}

export const json = (method: string, body?: unknown): RequestInit =>
  ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    if (e.message === "unsupported_format") return "อ่านไฟล์นี้ไม่ได้ — ตอนนี้รองรับ statement KBank และ Bangkok Bank";
    return e.message;
  }
  return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง";
}

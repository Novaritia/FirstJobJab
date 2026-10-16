# API contract (apps/api ↔ apps/web)

Base: `NEXT_PUBLIC_API_URL` (default http://localhost:4000). JSON. Auth = httpOnly cookie `sid` (send `credentials: 'include'`).
Money = integer satang. Dates = `YYYY-MM-DD`. Types from `@fjm/shared` (`contract.ts`).
Errors: `{ "error": "message" }` with 4xx/5xx.

## Auth
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | /auth/register | `{email, password, displayName, acceptTerms: true, termsVersion, privacyVersion}` (versions must equal current, `'2026-10-16'`; else 400) | `{user}` + cookie |
| POST | /auth/login | `{email, password}` | `{user}` + cookie |
| POST | /auth/logout | — | `{ok}` |
| GET | /auth/me | — | `{user}` or 401 |

`user = {id, email, displayName, hasPii: boolean, createdAt}` (+ `needsReconsent: boolean` on /auth/me — true when accepted terms/privacy version < current → show accept screen, then POST /profile/reconsent)

## Profile / PII / consent
| PUT | /profile/pii | `{birthDate: 'YYYY-MM-DD', nationalId: string}` | `{ok}` (stored encrypted) |
| GET | /profile/consents | — | `{consents: {purpose, granted, version, at}[]}` |
| PUT | /profile/consents | `{purpose: 'planning'|'loan_summary'|'improve', granted: boolean}` | `{ok}` |

## Uploads → review → confirm
| POST | /uploads | multipart `file` (PDF) + optional `password` | `{uploadId, bank, period:{start,end}, accountNoMasked, rows: ReviewRow[], check: BalanceCheckResult}` |
| PATCH | /uploads/:id/rows/:index | `{amount?, direction?, date?, balance?}` (only failing rows) | `{rows, check}` (re-checked) |
| POST | /uploads/:id/confirm | — | `{imported: number, streak}` — 409 if check still fails |
| GET | /uploads | — | `{uploads: {id, bank, periodStart, periodEnd, status, rowCount, createdAt}[]}` |

If PDF is locked and no password given, server tries stored PII (birth date / national ID formats); on failure returns 422 `{error:'password_required'}`.
`ReviewRow = ParsedRow & {index, ok: boolean, category: Category}`

## Transactions
| GET | /transactions?from&to&accountId | — | `{transactions: Tx[]}` |
| PATCH | /transactions/:id | `{category?, note?, hidden?}` | `{transaction}` (edit logged) |
| POST | /transactions | `{date, amount, direction, description, category}` | manual row (source='manual') |
| GET | /transactions/:id/edits | — | `{edits: {field, oldValue, newValue, at}[]}` |
| GET | /transactions/export.csv | — | CSV download |

`Tx = {id, accountId, date, time?, description, amount, direction, balance?, category, note?, source, verified, hidden, edited: boolean}`

## Insights
| GET | /insights/summary?months=3 | — | `{months: MonthSummary[], topSpend: {category, amount}[], text: string}` (text = Thai plain-language summary) |
| GET | /insights/tax?year= | — | `TaxResult` (from salary rows + social security estimate) |
| POST | /insights/growth | `GrowthInput` | `{points: GrowthPoint[]}` |
| GET | /insights/loan-ready | — | `{continuousMonths, required: 6, avgIncome, avgSpend, maxInstallment}` |

## Streak
| GET | /streak | — | `{current, best, months: {month:'YYYY-MM', covered: boolean}[], missing: string[], expiringSoon: string[]}` |

## Voice
| GET | /voice/weekly | — | `audio/mpeg` (ElevenLabs TTS of the weekly summary text); 503 if no key |
| GET | /voice/weekly/text | — | `{text}` |

## Audit
| GET | /audit | — | `{entries: {action, target, at}[]}` (own entries only) |

## Chat (ask about my account)
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | /chat | `{messages: {role:'user'\|'assistant', content}[]}` (≤20, last = user, content ≤2000) | `{reply: string, data?: Record<string, string\|number>[]}` |
| POST | /chat/voice | multipart `audio` (audio/webm\|ogg\|mpeg\|mp4\|wav, ≤10MB) + optional `history` (JSON string of messages, ≤19) | `{transcript, reply, data?, audio: base64 mp3}`; 503 `{error:'voice_unavailable'}` without ElevenLabs key; 422 `no_speech` |

`data` = flat table rows for the answer (Thai header keys, money in baht), e.g. `[{"วันที่":"2026-08-01","รายการ":"…","หมวด":"ค่าเช่า","รับ/จ่าย":"จ่าย","จำนวน (฿)":7500}]`.
LLM: Gemini → OpenAI → rule-based Thai fallback (no key). Tools are scoped to the session user; digit runs are masked before anything reaches the LLM.

## Security
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | /security/logins | — | `{logins: {at, success, ip, device, location, current}[]}` (last 100; kept 90 days; fails recorded only for existing emails) |
| GET | /security/sessions | — | `{sessions: {id, createdAt, lastSeenAt, device, location, current}[]}` |
| DELETE | /security/sessions/:id | — | `{ok}` |
| POST | /security/sessions/revoke-others | — | `{ok, revoked: number}` |

`device` e.g. "Windows · Chrome"; `location` = approx "Bangkok, TH" (offline GeoIP) or "เครือข่ายภายใน" for private/loopback IPs.

## Account / consent
| POST | /profile/reconsent | `{termsVersion, privacyVersion}` (current versions) | `{ok}` |
| DELETE | /account | `{password}` (re-auth) | `{ok}` + cookie cleared. Deletes sessions, PII, transactions+edits, uploads (+ encrypted files), slips, rules, accounts, login history. Keeps consents + audit_log (legal proof) with the user row anonymised. 401 wrong password, 429 after 5 tries |

PUT /profile/consents: purposes `terms`, `privacy`, `planning` are required (contract) → `granted:false` returns 400 `{error:'required_consent'}`; `loan_summary`, `improve` can be withdrawn anytime.

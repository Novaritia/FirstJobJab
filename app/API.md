# API contract (apps/api ↔ apps/web)

Base: `NEXT_PUBLIC_API_URL` (default http://localhost:4000). JSON. Auth = httpOnly cookie `sid` (send `credentials: 'include'`).
Money = integer satang. Dates = `YYYY-MM-DD`. Types from `@fjm/shared` (`contract.ts`).
Errors: `{ "error": "message" }` with 4xx/5xx.

## Auth
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | /auth/register | `{email, password, displayName}` | `{user}` + cookie |
| POST | /auth/login | `{email, password}` | `{user}` + cookie |
| POST | /auth/logout | — | `{ok}` |
| GET | /auth/me | — | `{user}` or 401 |

`user = {id, email, displayName, hasPii: boolean, createdAt}`

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

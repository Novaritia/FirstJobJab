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
| GET | /profile | — | `{displayName, email, fullName, phone, birthDate, nationalIdMasked: 'x-xxxx-xxxxx-45-8'\|null, hasNationalId, monthlySalary (satang)\|null}` — full ID never returned |
| PUT | /profile | any subset of `{displayName, fullName, phone, birthDate: 'YYYY-MM-DD', nationalId, monthlySalary (baht number)}`; `null`/`''` clears an optional field; email is read-only | same as GET. Phone normalised to `0XXXXXXXXX` (06/08/09 mobiles, +66 ok); nationalId mod-11 checksum. 400 `{error:'invalid_profile', fields:{phone:'invalid_phone', nationalId:'invalid_national_id', displayName:'required', birthDate:'invalid_date', monthlySalary:'invalid_salary', fullName:'too_short'\|'too_long'}}`. Audit `profile_change` with changed field names only. No nationalId ⇒ statements export only (no prefilled tax pack). Server helper: `ProfileService.decrypted(userId)` (src/profile.service.ts) |
| PUT | /profile/pii | `{birthDate: 'YYYY-MM-DD', nationalId: string}` | `{ok}` (stored encrypted) |
| GET | /profile/consents | — | `{consents: {purpose, granted, version, at}[]}` |
| PUT | /profile/consents | `{purpose: 'planning'|'loan_summary'|'improve', granted: boolean}` | `{ok}` |

## Uploads → review → confirm
| POST | /uploads | multipart `file` (PDF) + optional `password` | `{uploadId, bank, period:{start,end}, accountNoMasked, rows: ReviewRow[], check: BalanceCheckResult, ocr: boolean}` — scanned (image-only) PDFs are OCR'd (`ocr: true`, ~2–3 s/page, ≤15 pages else 422 too_many_pages); OCR misreads show up as failing rows |
| POST | /uploads/passbook | multipart repeated `images` (PNG/JPEG passbook page photos, in page order, ≤15 × 10 MB) + optional `bank` (any `Bank` code, for pages without a logo) — also e-wallet app history screenshots | same as POST /uploads + `pages`; `ocr: true`. Rows get `channel: "Passbook"`, no time. Direction from balance delta; first row needs a ยอดยกมา/B/F line to be verifiable. 415 not_an_image, 422 unsupported_format, 409 already_imported (sha256 over page hashes). Pages stored as one AES-GCM blob like PDFs. Then the same PATCH rows / confirm flow; confirm skips rows already imported by date+amount+balance |
| PATCH | /uploads/:id/rows/:index | `{amount?, direction?, date?, balance?}` (only failing rows) | `{rows, check}` (re-checked) |
| POST | /uploads/:id/confirm | optional `{acceptUnverified: true}` | `{imported: number, streak}` — `check.mode` per_row: 409 balance_check_failed until every row is ✅. totals/none: imported `verified: true` only if totals reconcile, else 409 unverified_needs_accept unless `acceptUnverified: true` (rows then saved `verified: false`) |
| GET | /uploads | — | `{uploads: {id, bank, periodStart, periodEnd, status, rowCount, createdAt}[]}` |

**Any Thai bank or e-wallet.** `bank` = KBANK BBL SCB KTB BAY TTB GSB UOB CIMBT KKP LHB BAAC GHB TISCO ICBCT, wallets TRUEMONEY SHOPEEPAY LINEPAY PAOTANG, else OTHER (names: `BANK_NAMES` in @fjm/shared). Bank-specific parser first (KBANK/BBL mock layouts), then a layout-free generic parser (row = line starting with a date, dd/mm/yy(yy) / Thai month / English month, BE or CE; last amount = balance; amount + direction from the balance delta). No more 422 unsupported_bank; 422 unsupported_format only when no rows at all.
`BalanceCheckResult.mode`: `per_row` (every row vs its printed balance), `totals` (no row balances — e.g. wallet history — but opening/closing or period totals printed: rows ✅ only if `opening + in − out = closing` and totals match), `none` (nothing to check against: okCount = failCount = 0, rows shown ✋ "ตรวจยอดไม่ได้", user confirms in bulk with acceptUnverified). `ParsedRow.balance`, `openingBalance`, `closingBalance`, `RowCheck.expectedBalance` are optional.
If PDF is locked and no password given, server tries stored PII (birth date / national ID formats); on failure returns 422 `{error:'password_required'}`.
`ReviewRow = ParsedRow & {index, ok: boolean, category: Category}`

## Slips (transfer slip images → match or add)
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | /slips | multipart repeated `images` (PNG/JPEG, ≤10 × 10 MB) | `{slips: Slip[]}` — 400 images_required, 415 not_an_image |
| POST | /slips/:id/confirm | optional fixes `{amount?, date?, time?, description?, category?}` | `{transaction}` (source='slip', verified=false). 409 slip_not_unmatched, 422 slip_incomplete (no amount/date) |

`Slip = {id, amount?, date?, time?, fromName?, toName?, bank?, ref?, qrRef?, matchedTransactionId?, status: 'matched'|'unmatched'|'confirmed', confidence: 0..1}`
- Read = slip-verify QR (exact ref) + OCR (Paddle sidecar or tesseract) + regex. Web warns when `confidence < 0.9`.
- `matched`: an existing outgoing tx with same amount + date, time ±5 min (nearest wins) → nothing to add (no double count).
- Same image (sha256) or same QR ref again → the existing slip is returned, not re-created.
- Image bytes are never stored (only sha256 + fields). Audit: `slip_upload`, `slip_confirm`.

## Transactions
| GET | /transactions?from&to&accountId&q&direction&category&source&minAmount&maxAmount&hidden&limit&offset\|page&sort | — | `{transactions: Tx[], total, accounts: {id, bank, accountNoMasked, accountName}[]}` — see filters below |
| PATCH | /transactions/:id | `{category?, note?, hidden?}` | `{transaction}` (edit logged) |
| POST | /transactions | `{date, amount, direction, description, category}` | manual row (source='manual') |
| GET | /transactions/:id/edits | — | `{edits: {field, oldValue, newValue, at}[]}` |
| GET | /transactions/export.csv | — | CSV download |

`Tx = {id, accountId, date, time?, description, amount, direction, balance?, category, note?, source, verified, hidden, edited: boolean}`

GET /transactions filters (all optional): `q` (≤100 chars, case-insensitive contains on description/note, plus categories whose Thai name or key contains it), `direction` in\|out, `category`, `source` statement\|slip\|manual, `minAmount`/`maxAmount` (satang, inclusive), `hidden` include (default, = old behaviour)\|exclude\|only, `limit` 1–500 (default **50** — callers that need everything must page), `offset` or `page` (1-based; wins over offset), `sort` date_desc (default)\|date_asc\|amount_desc\|amount_asc. `total` = count matching the filters (ignores limit/offset). Bad values → 400.

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
| GET | /audit?limit&page (or &offset) | — | `{entries: {action, target, at}[], total}` (own entries only, newest first; default limit 200, max 200) |

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
| GET | /security/logins?limit&page (or &offset) | — | `{logins: {at, success, ip, device, location, current}[], total}` (newest first; default/max limit 100; kept 90 days; fails recorded only for existing emails) |
| GET | /security/sessions | — | `{sessions: {id, createdAt, lastSeenAt, device, location, current}[]}` |
| DELETE | /security/sessions/:id | — | `{ok}` |
| POST | /security/sessions/revoke-others | — | `{ok, revoked: number}` |

`device` e.g. "Windows · Chrome"; `location` = approx "Bangkok, TH" (offline GeoIP) or "เครือข่ายภายใน" for private/loopback IPs.

## Account / consent
| POST | /profile/reconsent | `{termsVersion, privacyVersion}` (current versions) | `{ok}` |
| DELETE | /account | `{password}` (re-auth) | `{ok}` + cookie cleared. Deletes sessions, PII, transactions+edits, uploads (+ encrypted files), slips, rules, accounts, login history. Keeps consents + audit_log (legal proof) with the user row anonymised. 401 wrong password, 429 after 5 tries |

PUT /profile/consents: purposes `terms`, `privacy`, `planning` are required (contract) → `granted:false` returns 400 `{error:'required_consent'}`; `loan_summary`, `improve` can be withdrawn anytime.

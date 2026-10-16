# Tech Plan — First-Jobber Money Keeper

> Spec: [idea-first-jobber-money.md](../01-brainstorm/idea-first-jobber-money.md)

## TL;DR (ไทย)
Next.js (หน้าเว็บ) + NestJS บน Fastify (API, TypeScript) + PostgreSQL + Cloudflare (DNS/WAF/Turnstile/R2 เก็บไฟล์) — รหัสผ่าน **hash** (argon2id), ข้อมูลที่ต้องอ่านกลับ **encrypt** (AES-256-GCM), log แบบ hash chain แก้ย้อนหลังไม่ได้ — UI neumorphism โทนน้ำเงิน/ฟ้า แต่ตัวอักษร/ปุ่มต้อง contrast สูง

## 1. Stack
| Layer | Choice | Note |
|---|---|---|
| Web | **Next.js** (App Router, TS) + Tailwind + shadcn/ui | UI only; calls the API |
| API | **NestJS + Fastify adapter** (TS) | Modules: auth, statements, transactions, plans, tax, streak, audit |
| Shared | `packages/shared` | zod schemas, types, **balance-check / tax / growth engines** (pure TS, unit-tested) |
| DB | **PostgreSQL** + Prisma | Managed, Singapore region |
| Files | **Cloudflare R2** | Encrypted PDFs/slip thumbnails, nightly `.csv.gz` backups (separate bucket) |
| Edge | **Cloudflare** DNS, WAF, rate limit, **Turnstile** on sign-up/login | |
| PDF | pdf.js (unlock with password in memory → text) | Parser per bank: KBank, Bangkok Bank |
| AI | Claude API (`claude-haiku-5-5`) — categorisation only | Receives description + amount; **never** names, ID, DOB, account no. |
| Voice | ElevenLabs TTS (weekly summary), STT (cash entry) | Backend only |
| Audit log | Postgres append-only table (MVP) → ClickHouse when volume needs it | |
| Hosting | Web: Vercel or Cloudflare · API: Railway/Fly (Singapore) | |

Repo: pnpm workspaces — `apps/web`, `apps/api`, `packages/shared`.
MVP: no queue (parse a statement synchronously, seconds). Add BullMQ + Redis when uploads are batched.

## 2. Login
- **LINE Login** (Thai default) + **Google** + email/password.
- Passwords: **argon2id**.
- Sessions: httpOnly, Secure, SameSite=Lax cookie; server-side session table (revocable, "log out all devices").
- **2FA (TOTP)** required before the first statement upload — this is bank data.
- Library: Better Auth or Auth.js with Postgres adapter (pick after checking Nest/Fastify fit). Don't hand-roll.
- Re-auth before: viewing/changing ID/DOB, export, delete account.

## 3. Security: hash vs encrypt
| Data | Treatment | Why |
|---|---|---|
| Passwords, 2FA recovery codes | **Hash** (argon2id) | Never need to read back |
| National ID, birth date | **Encrypt** field-level, AES-256-GCM, separate key | Needed to unlock PDFs → must decrypt |
| Statement PDFs, slip thumbnails | **Encrypt** (envelope: per-file data key, wrapped by master key) | |
| Transactions (amounts, descriptions) | DB encryption at rest + TLS; account no. masked `xxx-x-x1234-x` | Must query/sum |
| Uploaded files | **SHA-256 hash** stored | Prove original unchanged; dedupe re-uploads |
| Audit log rows | **Hash chain**: `hash = sha256(prev_hash + row)` | Tampering becomes detectable |
| IP addresses in logs | HMAC with secret | Investigate abuse without storing raw IPs long-term |
| PDF passwords | **Never stored** — used in memory, discarded | |

Other rules:
- Every query scoped by `user_id` (plus Postgres RLS as a second guard).
- Upload validation: size limit, real MIME check, PDF/JPEG/PNG only.
- CSP, CSRF protection, rate limits (Cloudflare + API), secrets in host secret manager.
- Keys: master key in a KMS/secret manager, never in the repo; rotation plan.
- Breach response: PDPA requires notifying the regulator within 72 hours → keep an incident runbook.

## 4. Audit log (what's logged)
`audit_log(id, user_id, actor, action, target, before, after, ip_hmac, user_agent, at, prev_hash, hash)`
Actions: login ok/fail, 2FA, session revoke, upload, confirm import, edit row, hide row, consent give/withdraw, export, PII view/change, account delete.
Postgres append-only (no UPDATE/DELETE grant). Move to ClickHouse only if it grows past what Postgres handles comfortably.

## 5. ToS / Privacy (PDPA) — documents to write
- **Terms of Service:** not a bank, doesn't hold or move money; tax figures are estimates, not tax advice; "loan ready" is not loan approval; not investment advice; user is responsible for uploaded data.
- **Privacy Policy:** what we collect (statements, slips, ID/DOB, wallet address), why, retention (free 2 years / Plus unlimited), processors and **cross-border transfer** (cloud, Claude API, ElevenLabs), rights (access, export, correct, delete, withdraw consent), contact/DPO.
- **Consent records:** separate checkboxes per purpose, versioned, stored with timestamp + policy version.
- Have a Thai lawyer review before real launch.

## 6. UI — coloured neumorphism, blue/sky
Neumorphism has low contrast by nature. Rule: **surfaces/cards are soft; text, buttons, numbers and focus rings are sharp.** Min contrast 4.5:1 for text.

```css
:root {
  --bg: #E4EDF8;            /* soft blue base */
  --surface: #E4EDF8;
  --shadow-dark: #B7C6DB;
  --shadow-light: #FFFFFF;
  --primary: #1D4ED8;       /* blue — buttons, links */
  --accent: #0EA5E9;        /* sky — charts, highlights */
  --text: #0F2744;
  --text-muted: #4A5D78;
  --success: #15803D; --warning: #B45309; --danger: #B91C1C;
  --neu-out: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
  --neu-in: inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #172235; --surface: #172235;
    --shadow-dark: #0E1522; --shadow-light: #213049;
    --primary: #60A5FA; --accent: #38BDF8;
    --text: #E6EEF8; --text-muted: #9FB0C8;
  }
}
```
- Cards/streak/upload area: `--neu-out`; inputs, pressed buttons: `--neu-in`.
- Primary button: solid `--primary` (not neumorphic) so it's obvious what to tap.
- Font: IBM Plex Sans Thai (or Noto Sans Thai); money in tabular numerals.
- ✅ / ⚠️ / ✋ badges always carry text, not colour alone.

## 7. Core tables (Prisma)
`users`, `sessions`, `pii` (encrypted ID/DOB), `consents`, `accounts` (bank, masked no.), `uploads` (r2_key, sha256, bank, period, status), `transactions` (account_id, upload_id, date, amount, direction, balance, description, category, source=statement|slip|manual, verified, hidden), `edits` (append-only), `category_rules`, `streaks`, `audit_log`.

## 8. Hackathon cut
Must work in the demo: login (Google or email) → upload mock KBank/BBL PDF → balance check → review/confirm → table + edit log → streak card → salary summary, growth graph, tax estimate → ElevenLabs weekly summary.
Skip for the demo: 2FA, LINE Login, R2 backups, ClickHouse, Your Data, crypto, gallery import.

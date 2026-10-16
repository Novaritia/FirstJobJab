# FirstJobJab

**Your bank statements, turned into a money plan — built for Thai first jobbers.**

U-Hackathon 2026 (u-topia · Flow Summit Bangkok) · AI track

First jobbers get a salary, but nobody teaches them where it goes, how tax works, or how to get ready for their first car or condo loan. FirstJobJab reads the statements they already have, checks every number, and turns them into a plan, with a monthly 🔥 streak (like Duolingo) so the history never has gaps.

## What it does

| | |
|---|---|
| **Upload, any format** | KBank / Bangkok Bank e-statement PDFs (auto-unlocked), scanned PDFs, passbook photos and transfer slips. Thai OCR (PaddleOCR PP-OCRv5) for images |
| **Every row balance-checked** | `previous balance ± amount = balance` on every row. ✅ rows are proven; ⚠️ rows (misreads) are the only ones you can edit, and only to a value that reconciles. Every edit is logged |
| **Slips never double-count** | Slips are matched to statement rows; unmatched slips need a ✋ confirm |
| **Dashboard** | Where the salary went, by category; 6-month trend; end-of-month forecast |
| **Plan** | Growth projection with sliders; salary split (spend / emergency / invest) from real spending |
| **Tax** | Thai personal income tax estimate with steps, plus a what-if calculator ("deduct ฿X more → save ฿Y") |
| **Loan-ready** | Continuous months of verified history (x/6) and a rule-of-thumb max installment |
| **Assistant** | Ask anything about your own account, by **chat** (Gemini with tools scoped to your data) or **voice** (ElevenLabs speech-to-text → answer → text-to-speech) |
| **Monthly streak** | Upload after payday, keep the streak; missing or expiring months are flagged |

## Security & privacy
- Passwords hashed with argon2id. ID number, birth date, uploaded files and login IPs encrypted with AES-256-GCM. PDF passwords are never stored.
- Audit log is hash-chained and append-only (a DB trigger blocks UPDATE/DELETE).
- Login history (IP, device, approx. location) and active sessions are visible to the user; any session can be revoked.
- Terms and privacy are accepted at sign-up and re-asked only when the version changes. Optional PDPA consents can be withdrawn anytime. Account deletion wipes the data and keeps only anonymised legal records.
- Only masked aggregates and descriptions reach the LLM, never ID or account numbers.

## Stack
pnpm monorepo in [`app/`](app/): **Next.js 16** (web) · **NestJS 12 + Fastify** (API) · **Prisma 7 + PostgreSQL** · `packages/shared` (pure TypeScript parser, balance check, tax and growth engines, shared by API and web) · **PaddleOCR** sidecar (Python) · **Gemini** (chat) · **ElevenLabs** (voice) · everything in **Docker**.

## Run it
```sh
cd app
cp .env.example .env            # fill the keys (see comments)
docker compose --profile full up -d --build
# web http://localhost:3000 · api http://localhost:4000
```
Demo account: `demo@firstjobjab.app` / `demo1234`. Mock statements are in [`app/mock-data/`](app/mock-data/) (password `14031999`): upload `KBANK_2026-09.pdf` to see the streak reach 6/6, and `BROKEN_KBANK_2026-06.pdf` to see ⚠️ rows.
Local dev without Docker: see [`app/HANDOFF.md`](app/HANDOFF.md).

## Docs
- Pages and what each does: [`app/docs/pages.md`](app/docs/pages.md)
- HTTP API contract: [`app/API.md`](app/API.md)
- OCR research and choice: [`app/docs/ocr.md`](app/docs/ocr.md)
- Product spec: [`01-brainstorm/idea-first-jobber-money.md`](01-brainstorm/idea-first-jobber-money.md) · Tech plan: [`03-tech/tech-plan-first-jobber.md`](03-tech/tech-plan-first-jobber.md)

## Honest limits
- Bank layouts are modelled on our own mock statements; real KBank/BBL files still need testing.
- Tax and loan figures are estimates, not advice. No payment integration yet (pricing shown on the landing page).

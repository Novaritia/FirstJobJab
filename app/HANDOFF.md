# FirstJobJab — Handoff (keep updated)

> Read this first if you're a new Claude session picking up the work.
> Submit U-Hackathon by **2026-10-16 14:00 ICT** (public GitHub repo + demo website + pitch deck link).

## What it is
Thai personal-finance web app for **first jobbers**: upload KBank / Bangkok Bank e-statement PDFs → parse → **balance-check every row** → review/confirm → dashboard (where salary went, growth plan, tax estimate, loan-ready, monthly streak like Duolingo).
Spec: `../01-brainstorm/idea-first-jobber-money.md` · Tech plan: `../03-tech/tech-plan-first-jobber.md` · HTTP contract: `API.md`.

## Decisions (from the user — don't relitigate)
- Name **FirstJobJab**. Target first jobbers. Both hackathon and real long-term use.
- Stack: pnpm monorepo — `apps/web` Next.js 16, `apps/api` NestJS 12 + Fastify, Prisma 7 + PostgreSQL, `packages/shared` pure TS engines. **Everything in Docker.**
- LLM: **free Gemini** (fallback OpenAI, then Thai template) — NOT Claude. ElevenLabs key added later by user (voice returns 503 until then).
- Banks: KBank + Bangkok Bank. **Mock data only** for demo (`mock-data/`, password `14031999`).
- Theme (REVISED 08:00): **Stripe-dashboard style** — neutral canvas, 1px borders, sharp corners (≤4–6px), clear labelled sections, sidebar grouped by category; **blue = accent only** (buttons, active nav, key figures), not whole page. Glass/neumorphism DROPPED. Follow impeccable skill. Responsive mobile / iPad / desktop.
- Edits: amounts only on rows failing balance check (must reconcile); category/note free; manual rows ✋; hide not delete; every edit logged.
- Security: argon2id passwords, AES-256-GCM for ID/DOB + PDFs, PDF passwords never stored, audit log hash chain (DB trigger blocks UPDATE/DELETE), IP as HMAC. ClickHouse deferred.
- Freemium idea: free keeps 2 years; Plus ~฿59/mo or ฿590/yr (pricing not final).
- Server: local first; user will give an IP later → set `PUBLIC_API_URL` for web build.
- Work in ponytail mode (minimal code, terse).

## Status (2026-10-16 ~07:15)
| Part | State |
|---|---|
| `packages/shared` (parser, balance check, tax, growth, categorize, own-transfer) | ✅ 38/38 tests |
| `mock-data/` 13 PDFs (Sarabun OFL font) + persona.json | ✅ |
| `apps/api` all endpoints in API.md | ✅ build + 5 unit + 2 e2e tests; curl e2e ok |
| `apps/web` 11 routes (impeccable; PRODUCT.md/DESIGN.md in apps/web) | ✅ build+lint; runs vs real API (CORS/cookie ok); not yet clicked through in a browser by a human |
| `apps/api` chat: POST /chat (Gemini tools → OpenAI → Thai rule fallback), POST /chat/voice (ElevenLabs STT→chat→TTS) | ✅ build + 15 unit tests; /chat live-tested with Gemini; voice untested (no ElevenLabs key) |
| `apps/api` security: login history (IP AES-encrypted, GeoIP city), sessions list/revoke, ToS/Privacy consent at signup + reconsent on version change, DELETE /account (anonymise, keep consents+audit) | ✅ build + 24 unit + 2 e2e; curl ok. geoip-lite adds ~150MB to image |
| Docker (`Dockerfile`, `docker-compose.yml`) | ✅ full build ok; api + web containers start (07:45). Build needs dummy DATABASE_URL (in Dockerfile) |
| OCR (Thai, slips + scanned PDF + passbook photos) | ✅ 10-16 08:10: PaddleOCR PP-OCRv5 Thai via RapidOCR sidecar `apps/ocr` (compose service `ocr`, `OCR_URL`), tesseract fallback. Gemini removed from OCR (user: Gemini = chatbot only). See docs/ocr.md. Passbook photo import ✅ `POST /uploads/passbook` + web toggle + `mock-data/passbook/` (shared 46/46, api 26/26); not yet run vs DB or on a real phone |
| Assistant chat + voice (ElevenLabs STT/TTS) | 🔄 api agent: POST /chat, /chat/voice; web agent: /assistant page after redesign |
| Pitch deck / demo script | ❌ not started (`../05-pitch/` has old outlines for a dropped idea) |
| Git commit / push | ✅ f14f320 pushed to main (app/ + 2 new docs). Older uncommitted docs from earlier sessions left untouched |

## Session 2026-10-16 (09:00–10:00, Windows PC, parallel subagents)
- UI renovated onto **shadcn/ui** (`src/components/shadcn/*`, alias `@/components/shadcn`; `@/components/ui` keeps the old API on top). Theme now **modern minimal white + blue** (tokens in globals.css, see DESIGN.md). Sharp-corner/Stripe rule superseded.
- Landing: looping live-audit hero, ledger grid, ticker, streak section (hook = upload + 🔥 streak), pricing (#pricing, navy band), session-aware nav. Landing CSS in `src/app/landing.css`.
- Dashboard: streak hero → spending donut → income split donut + KPI tiles → 6-month trend → next steps. Recharts lazy-loaded.
- Transactions: search/filters/paging (20/50/100/custom) via `GET /transactions?q&direction&category&…&limit&page` → `{transactions,total,accounts}`; optimistic edits.
- Settings: 4 sections (account, security, consents, my data); `/settings/security` redirects to `/settings`.
- TopLoader bar (`components/TopLoader.tsx`, `instrumentation-client.ts`), `(app)/loading.tsx`, GET dedupe in lib/api.ts. `<Toaster/>` (sonner) in root layout.
- /terms and /privacy drafts (`components/LegalPage.tsx`); policy version `2026-10-16` lives in 3 places: api security-util.ts, AuthForm.tsx, LegalPage.tsx.
- Checks: shared 46/46, api 30/30, web tsc+eslint clean, all routes 200. **Not yet clicked through in a browser by a human.**
- Open: emoji→icon only on transactions page (user to decide app-wide); no change-password feature; GEMINI_API_KEY still empty in app/.env.

## Run locally (from `app/`)
```sh
docker compose up -d db
pnpm --filter @fjm/shared build      # api imports shared/dist
cd apps/api && npx prisma migrate deploy && pnpm build && pnpm seed && pnpm start:prod   # :4000
sh demo-preload.sh                   # loads Apr–Aug for demo user → streak 5/6
pnpm --filter web dev                # :3000
# OCR sidecar (optional; else tesseract): cd apps/ocr && pip install rapidocr==3.10.0 onnxruntime fastapi uvicorn python-multipart opencv-python-headless && uvicorn server:app --port 8765
```
Full stack in Docker: `docker compose --profile full up -d --build`.
Demo login: `demo@firstjobjab.app` / `demo1234`. Live demo: upload `mock-data/KBANK_2026-09.pdf` (+ BBL) → streak 6/6. `BROKEN_KBANK_2026-06.pdf` shows ⚠️ rows.
Local DB in use: **`fjm_demo`** (`.env` DATABASE_URL). Old `fjm` DB has test junk — reset needs user consent (Prisma blocks AI resets).

## Open items / next steps
1. Finish web; run it against the API; impeccable audit.
2. Docker done. Before deploy: set PUBLIC_API_URL + WEB_ORIGIN to server IP, POSTGRES_PASSWORD, real keys in .env.
3. Pitch deck + demo script; README for repo; commit + push (`origin` = github.com/Novaritia/u-hackathon).
4. Unverified facts: real KBank/BBL PDF layout + password format; bank e-statement retention; SS cap 750 vs 875 in 2026; ThaiESG/2026 deductions; Gemini model name (`gemini-3.5-flash-lite` default); BOT "Your Data" status.
5. Not built: 2FA, LINE login, gallery import (app), crypto/u-topia wallet, R2 backups, U-Bot.

## Queued for web agent (08:30)
- Motion animations (luxury/money feel, reduced-motion respected).
- Semantic colours (blue action, green good, amber attention, red danger) + red `*` on required fields.
- Dashboard: plain headline, KPI tiles with deltas, end-of-month forecast.
- /tax what-if calculator, /plan instant growth + raise→tax (client-side shared engines).
- Session UX: landing/login show logged-in user in navbar (no auto-redirect); cookie 30 days, removed only by logout.
- Page descriptions: `docs/pages.md`.
- (08:40) Security page: login history (IP encrypted so user can see it, device, approx location), active sessions + revoke. ToS/Privacy required at signup, locked (only exit = delete account); optional consents (loan_summary, improve) withdrawable anytime (PDPA); re-ask only when policy version changes (not monthly). Delete account: wipes data, keeps consents + audit (anonymised user). /terms, /privacy drafts. API agent + web agent.
- (08:45) Landing: ElevenLabs-style grid lines + bento; pricing section prominent (#pricing): Free ฿0 / Plus ฿59 mo or ฿590 yr / one-time loan report ฿149, tax pack ฿99. No payment integration ("เร็ว ๆ นี้").

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
- Theme: glassmorphism + neumorphism + modern, blue/sky, "like Dime!", **not AI slop → follow impeccable skill** (plugin installed). Responsive mobile / iPad / desktop. Best, easiest UX.
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
| Docker (`Dockerfile`, `docker-compose.yml`) | ✅ full build ok; api + web containers start (07:45). Build needs dummy DATABASE_URL (in Dockerfile) |
| Pitch deck / demo script | ❌ not started (`../05-pitch/` has old outlines for a dropped idea) |
| Git commit / push | ❌ nothing committed yet |

## Run locally (from `app/`)
```sh
docker compose up -d db
pnpm --filter @fjm/shared build      # api imports shared/dist
cd apps/api && npx prisma migrate deploy && pnpm build && pnpm seed && pnpm start:prod   # :4000
sh demo-preload.sh                   # loads Apr–Aug for demo user → streak 5/6
pnpm --filter web dev                # :3000
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

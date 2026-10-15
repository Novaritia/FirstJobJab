# Stack — ChatCFO

**Decision (2026-10-15): Next.js on Vercel + Claude API + plain TypeScript math.** See `../04-plan/decisions.md`.

| Part | Choice | Why |
|---|---|---|
| App | **Next.js (App Router, TypeScript) on Vercel** | One repo for UI + server routes (API keys stay server-side); instant deploy for the demo link |
| UI | Tailwind CSS + shadcn/ui | Fast, clean dashboard look (usability = 10%) |
| AI extraction + insights | **Claude API** (text + vision, structured JSON output) | Reads messy Thai chat text and slip / receipt images → orders, payments, deposits; writes plain-language insights |
| Tax, forecast, analysis math | **Plain TypeScript functions** | Numbers must be exact and repeatable — AI extracts, code calculates |
| Charts | Recharts | Simple React charts |
| PDF (filing pack, Credit Passport) | Print-friendly page + browser "Save as PDF" | No extra service |
| Storage | Browser (in-memory + localStorage) | No database / login needed for the demo |
| Voice (stretch) | ElevenLabs text-to-speech | Monday CFO call; ecosystem points |

## Not using (and why)
- **Database / auth** — demo is single-seller; add Supabase only if there's time.
- **Avalanche** — AI track.
- **Live LINE bot** — stretch only; upload of the chat export is enough to prove the idea.
- **U-Bot** — skipped for now (no API documented).

## Tooling
- Node.js 20+, pnpm or npm.
- `.env.local` in `app/` with `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (see `.env.example`).

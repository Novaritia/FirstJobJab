# Stack

**Decision: pending** — record the choice in `../04-plan/decisions.md`.

Selection criteria: fastest to a working deployed demo, team already knows it, keeps API keys server-side, free hosting.

| Option | Pros | Cons |
|---|---|---|
| **Next.js (App Router) + Vercel** | One repo for frontend + API routes; one-click deploy; good viem/wagmi support | Learning curve if team hasn't used it |
| **Vite + React frontend, Express backend** | Simple mental model; easy to debug | Two deploys (e.g. Vercel + Render) |
| **Plain HTML/JS + serverless functions** | Fastest to start, no build step | Gets messy as UI grows |

Recommended default: **Next.js on Vercel** unless nobody on the team knows React.

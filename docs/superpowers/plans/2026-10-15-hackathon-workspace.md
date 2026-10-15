# Hackathon Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the hackathon workspace folders and starter docs directly in the repo root.

**Architecture:** Plain Markdown files in numbered phase folders (`00-input` … `05-pitch`) plus an empty `app/`. No code, no dependencies. Verification is a shell check that every expected file exists and no secrets are committed.

**Tech Stack:** Markdown, Git, Bash (Git Bash on Windows).

**Spec:** `docs/superpowers/specs/2026-10-15-hackathon-workspace-design.md`

## Global Constraints

- Everything lives directly in repo root `V:\School\hackathon\u-hackathon`. No wrapper folder.
- Existing `README.md` is expanded, not replaced; `.gitattributes` untouched.
- Hackathon facts to use verbatim: host **U-topia** (fintech), theme **"AI for the future"**, required integrations **ElevenLabs** and **Avalanche (AVAX)**, deliverables **pitch + working website demo**.
- Fintech sub-category is NOT fixed — never write as if an idea was chosen.
- `01-brainstorm/` and `03-tech/` hold real content; `02-business/`, `04-plan/`, `05-pitch/` are templates with guiding prompts.
- No real secrets. `.env.example` holds names with empty values only.
- External links only to official docs (elevenlabs.io, docs.avax.network / build.avax.network, faucet.avax.network).

## Review Focus

- A teammate opening the repo cold: README must explain the folders and where to start, in that order.
- Someone copying `.env.example` to `.env`: `.env` must be git-ignored.
- Dead doc links: every URL in `03-tech/` must resolve (checked in Task 4).
- An idea later chosen that uses voice only lightly: `scoring.md` must score integration fit separately so weak fits are visible.
- Windows line endings: files must still render (covered by existing `.gitattributes`).

---

## Verification command (used by every task)

```bash
cd "V:/School/hackathon/u-hackathon"
for f in README.md .gitignore \
  00-input/README.md 00-input/links.md \
  01-brainstorm/ideas.md 01-brainstorm/scoring.md \
  02-business/problem-and-users.md 02-business/business-model.md 02-business/competitors.md 02-business/market.md \
  03-tech/architecture.md 03-tech/elevenlabs.md 03-tech/avalanche.md 03-tech/stack.md 03-tech/.env.example \
  04-plan/timeline.md 04-plan/tasks.md 04-plan/roles.md 04-plan/decisions.md \
  05-pitch/deck-outline.md 05-pitch/pitch-script.md 05-pitch/demo-script.md \
  app/.gitkeep; do [ -f "$f" ] || echo "MISSING $f"; done
grep -rnE '(sk_[A-Za-z0-9]{20,}|0x[a-fA-F0-9]{64})' --exclude-dir=.git . && echo "SECRET FOUND" || echo "no secrets"
```

Each task: run it before (expect its files MISSING), create files, run again (expect its files gone from the MISSING list), commit.

### Task 1: Root README, .gitignore, 00-input

**Files:** Modify `README.md`; Create `.gitignore`, `00-input/README.md`, `00-input/links.md`

- [ ] **Step 1:** Run verification; expect these 3 new files MISSING.
- [ ] **Step 2:** `README.md` — keep `# u-hackathon` heading; add sections: *About* (U-topia, "AI for the future", fintech, pitch + website demo), *Required integrations* (ElevenLabs, Avalanche AVAX), *Folder map* (table: folder → purpose), *How to work* (input → brainstorm → pick idea → business + tech → plan → build in `app/` → pitch), *Status* checklist mirroring those phases.
- [ ] **Step 3:** `.gitignore`:
  ```
  .env
  .env.*
  !.env.example
  node_modules/
  dist/
  build/
  .next/
  .DS_Store
  Thumbs.db
  ```
- [ ] **Step 4:** `00-input/README.md` — what to drop here (brief, rules, judging criteria, sponsor docs, screenshots), naming tip (`YYYY-MM-DD-source-topic.ext`), rule: treat as read-only reference.
- [ ] **Step 5:** `00-input/links.md` — table `| Link | What it is | Notes |` pre-filled with ElevenLabs docs and Avalanche docs rows, plus empty rows for the hackathon page and judging criteria.
- [ ] **Step 6:** Run verification; confirm `echo test > .env && git status --short` does not list `.env`; `rm .env`.
- [ ] **Step 7:** Commit `docs: add workspace README, gitignore, input folder`.

### Task 2: 01-brainstorm

**Files:** Create `01-brainstorm/ideas.md`, `01-brainstorm/scoring.md`

- [ ] **Step 1:** Run verification; expect both MISSING.
- [ ] **Step 2:** `ideas.md` — intro line ("category not fixed; these are seeds"), then 6–8 ideas across payments, remittance, lending/credit, savings, financial literacy, fraud/security, accessibility. Each idea: **one-line pitch**, *Problem*, *AI role*, *ElevenLabs role*, *AVAX role*, *Demo moment* (the one thing judges see live), *Risk*. End with "Add your idea" template block.
- [ ] **Step 3:** `scoring.md` — criteria with weights: Impact 25, Innovation 20, Demo-ability 20, Integration fit (ElevenLabs + AVAX) 20, Business viability 15. Scoring guide (1–5 per criterion). Table with one row per idea from `ideas.md` (scores empty), total column formula explained, "Decision" line linking to `04-plan/decisions.md`.
- [ ] **Step 4:** Run verification. Check every idea in `ideas.md` has a row in `scoring.md`.
- [ ] **Step 5:** Commit `docs: add brainstorm seed ideas and scoring matrix`.

### Task 3: 02-business templates

**Files:** Create `02-business/problem-and-users.md`, `business-model.md`, `competitors.md`, `market.md`

- [ ] **Step 1:** Run verification; expect 4 MISSING.
- [ ] **Step 2:** `problem-and-users.md` — prompts: problem statement (one sentence), who has it, how they cope today, why now (AI + blockchain), 2 user personas template, "how we'll know it's solved".
- [ ] **Step 3:** `business-model.md` — Lean Canvas as 9 headed sections (Problem, Customer Segments, Unique Value Proposition, Solution, Channels, Revenue Streams, Cost Structure, Key Metrics, Unfair Advantage) each with one guiding question; note on fit with U-topia.
- [ ] **Step 4:** `competitors.md` — comparison table (Competitor | What they do | Weakness | Our edge) + "why can't they just copy us" prompt.
- [ ] **Step 5:** `market.md` — TAM/SAM/SOM sections with formula `users × price × frequency`, sources column, warning to cite every number.
- [ ] **Step 6:** Run verification; commit `docs: add business templates`.

### Task 4: 03-tech reference

**Files:** Create `03-tech/architecture.md`, `elevenlabs.md`, `avalanche.md`, `stack.md`, `.env.example`

- [ ] **Step 1:** Run verification; expect 5 MISSING.
- [ ] **Step 2:** `architecture.md` — Mermaid diagram: Browser (website) → Backend API → ElevenLabs API (TTS / STT / Conversational agent); Browser → Wallet (Core / MetaMask) → Avalanche C-Chain (Fuji testnet) → Smart contract. Rule: API keys only on backend. Section "Data flow for a typical demo".
- [ ] **Step 3:** `elevenlabs.md` — what it offers (text-to-speech, speech-to-text, Conversational AI agents, voice cloning), getting an API key, key-on-server rule, free-tier limits note ("check current quota"), fintech use ideas, official doc links.
- [ ] **Step 4:** `avalanche.md` — C-Chain is EVM-compatible; Fuji testnet (chain ID 43113, RPC `https://api.avax-test.network/ext/bc/C/rpc`); faucet; wallets (Core, MetaMask); contract tooling (Hardhat/Foundry, Solidity); frontend libs (viem/wagmi or ethers); snowtrace testnet explorer; official doc links.
- [ ] **Step 5:** `stack.md` — 2–3 candidate stacks table (e.g. Next.js full-stack + viem; Vite React + Express; plus pros/cons), criteria for choosing, "Decision: pending — record in `04-plan/decisions.md`".
- [ ] **Step 6:** `.env.example`:
  ```
  # Copy to .env and fill in. Never commit .env.
  ELEVENLABS_API_KEY=
  ELEVENLABS_VOICE_ID=
  AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
  AVALANCHE_CHAIN_ID=43113
  DEPLOYER_PRIVATE_KEY=
  ```
- [ ] **Step 7:** Check links: for each URL in `03-tech/*.md` and `00-input/links.md`, `curl -sIL -o /dev/null -w "%{http_code} %{url_effective}\n" <url>`; expect 2xx/3xx. Fix any dead link.
- [ ] **Step 8:** Run verification (expect "no secrets"); commit `docs: add tech reference for ElevenLabs and Avalanche`.

### Task 5: 04-plan, 05-pitch, app

**Files:** Create `04-plan/timeline.md`, `tasks.md`, `roles.md`, `decisions.md`, `05-pitch/deck-outline.md`, `pitch-script.md`, `demo-script.md`, `app/.gitkeep`

- [ ] **Step 1:** Run verification; expect 8 MISSING.
- [ ] **Step 2:** `timeline.md` — phase table (Phase | Goal | Deadline | Done?) for: gather input, brainstorm, pick idea, business draft, tech spike (ElevenLabs + AVAX hello-world), build MVP, polish, pitch rehearsal, submit.
- [ ] **Step 3:** `tasks.md` — Kanban-style sections Todo / Doing / Done with checkbox format `- [ ] task — owner`, pre-seeded with the first real tasks (fill `00-input`, score ideas, get ElevenLabs key, get Fuji AVAX from faucet).
- [ ] **Step 4:** `roles.md` — table Role | Person | Responsibilities for Lead/Pitch, Business, Frontend, Backend + ElevenLabs, Blockchain (AVAX).
- [ ] **Step 5:** `decisions.md` — log format `## YYYY-MM-DD — Decision` with Context / Options / Choice / Why; first entry: "Workspace structure" (numbered phase folders, app/ deferred).
- [ ] **Step 6:** `deck-outline.md` — ~10 slides: Title, Problem, Who suffers, Solution, Live demo, How it works (AI + ElevenLabs + AVAX), Business model, Market, Competition, Team, Ask/Roadmap; each with "key message" prompt.
- [ ] **Step 7:** `pitch-script.md` — timed sections (hook 30s, problem, solution, demo handoff, business, close) with prompts. `demo-script.md` — step table (Step | Click/Say | What judges see | Fallback if it fails) plus pre-demo checklist (wallet funded on Fuji, ElevenLabs quota, backup video).
- [ ] **Step 8:** Create empty `app/.gitkeep`.
- [ ] **Step 9:** Run verification; expect no MISSING and "no secrets". Commit `docs: add plan, pitch templates and app placeholder`.

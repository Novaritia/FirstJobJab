# u-hackathon

Workspace for **U-Hackathon 2026** (hosted by u-topia at Flow Summit, Avani Sukhumvit Bangkok).
Theme: *The future of AI and Finance*.

## ❌ Dropped (2026-10-15): Univerxal — idea still open, see `01-brainstorm/ideas.md`
**"Your AI money assistant — automatic books and every money task, for everyone who earns outside a payslip."** For people and merchants **without a registered company**, easy enough for non-tech users (connect once, nothing to type). Webhooks, LINE bot (slips, voice notes) and uploads → automatic books, analysis, forecast and personal tax for merchants and individuals; a bank-ready loan package carried to lenders through u-topia's identity and compliance layer.
Full idea: [`01-brainstorm/idea-univerxal.md`](01-brainstorm/idea-univerxal.md)

## Key facts

| | |
|---|---|
| Build | Thu 15 Oct 2026 11:30 → **Fri 16 Oct 14:00** (ICT, UTC+7). Hall closes 18:00, no overnight. |
| Tracks | **AI** (AI tooling, no Web3 needed) or **Web3** (deployable on-chain) |
| Team | 1–4 people. New builds only; pre-research/planning allowed. |
| Submit | https://hub.team1.network/ — public repo, demo site showing the real product, deck link (anyone with link can view) |

### Judging

| Criterion | Weight |
|---|---|
| App execution | 40% |
| Practicality | 40% |
| Usability & design | 10% |
| Innovation & ecosystem (ElevenLabs / Avalanche) | 5% |
| U-Bot integration (core + working) | 5% |

### Integrations

- **U-Bot** — skipped for now (no API documented).
- **Claude API** — chat/slip extraction and insights.
- **ElevenLabs** — AI voice (TTS, STT, conversational agents).
- **Avalanche (AVAX)** — not used (AI track chosen).
- ~~Tokenomist~~ — not used.

## Folder map

| Folder | Purpose |
|---|---|
| `00-input/` | Reference material from organisers and sponsors (read-only) |
| `01-brainstorm/` | Candidate ideas and scoring against the real rubric |
| `02-business/` | Problem, users, business model, competitors, market |
| `03-tech/` | Architecture, U-Bot / ElevenLabs / Avalanche notes, stack, `.env.example` |
| `04-plan/` | Timeline, tasks, roles, decision log |
| `05-pitch/` | Deck outline, pitch script, demo script |
| `app/` | The website code |
| `docs/` | Design spec and implementation plan for this workspace |

## How to work

1. Drop references into `00-input/`.
2. Score ideas in `01-brainstorm/scoring.md`, record the pick in `04-plan/decisions.md`.
3. Fill `02-business/` and pick a stack in `03-tech/stack.md`.
4. Build in `app/` — get a working demo end-to-end first, polish after.
5. Write the deck and rehearse the demo in `05-pitch/`.

## Status

- [x] References collected (U-Bot guide, ElevenLabs hacker guide)
- [ ] Idea chosen
- [x] Track chosen: **AI**
- [x] Stack chosen (Next.js + Claude API + TS engines)
- [ ] App scaffolded
- [ ] Demo dataset (fake Thai chat + slips) ready
- [ ] (Stretch) ElevenLabs Monday CFO call
- [ ] Demo deployed
- [ ] Deck done, demo rehearsed
- [ ] Submitted before Fri 14:00

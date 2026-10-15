# Hackathon Workspace — Design

Date: 2026-10-15

## Goal

Set up the `u-hackathon` repo as the single workspace for the U-topia "AI for the future" hackathon: plan, references, business work, tech work, and pitch, ready for team discussion.

## Context (from user)

- Host: U-topia, a fintech company wanting an innovative, world-changing idea.
- Theme: "AI for the future". Fintech sub-category deliberately **not fixed** yet; brainstorm first.
- Deliverables: a pitch **and** a working website demo.
- Hard requirement: demo integrates **ElevenLabs** and **Avalanche (AVAX)**.
- Everything lives directly in the repo root `V:\School\hackathon\u-hackathon` (already pushed to `github.com/Novaritia/u-hackathon`). No extra wrapper folder.

## Structure

```
u-hackathon/
├── README.md              # overview, required integrations, folder map, workflow, status checklist
├── .gitignore             # .env, node_modules, build output, OS files
├── 00-input/
│   ├── README.md          # what to drop here (brief, rules, judging, sponsor docs, screenshots)
│   └── links.md           # table of reference links + one-line note each
├── 01-brainstorm/
│   ├── ideas.md           # 6–8 seed fintech ideas, each showing ElevenLabs + AVAX fit
│   └── scoring.md         # matrix: impact, innovation, demo-ability, integration fit, viability
├── 02-business/
│   ├── problem-and-users.md
│   ├── business-model.md  # Lean Canvas
│   ├── competitors.md
│   └── market.md          # TAM / SAM / SOM
├── 03-tech/
│   ├── architecture.md    # generic web + ElevenLabs + Avalanche diagram
│   ├── elevenlabs.md      # capabilities, keys, doc links
│   ├── avalanche.md       # Fuji testnet, wallet, contracts, faucet, doc links
│   ├── stack.md           # candidate stacks + trade-offs; final pick after idea chosen
│   └── .env.example       # placeholder keys only
├── 04-plan/
│   ├── timeline.md
│   ├── tasks.md
│   ├── roles.md
│   └── decisions.md       # decision log
├── 05-pitch/
│   ├── deck-outline.md
│   ├── pitch-script.md
│   └── demo-script.md
└── app/
    └── .gitkeep           # website code goes here once idea + stack chosen
```

## Content rules

- `01-brainstorm/` is filled with real seed ideas, not placeholders — it is the first discussion input.
- `02-business/`, `04-plan/`, `05-pitch/` are templates with guiding prompts (content depends on the chosen idea).
- `03-tech/` has real, usable reference content for ElevenLabs and Avalanche; stack is a shortlist, not a decision.
- No secrets committed; `.env.example` holds placeholder names only.
- Existing `README.md` is expanded, not replaced; `.gitattributes` untouched.

## Out of scope

- App scaffold / framework choice (deferred until idea is picked).
- Filled business analysis for a specific idea.
- Real API keys or wallets.

## Done when

All files above exist, links in `03-tech/` point to official docs, and the change is committed.

# MVP structure — what we actually build

Scope cut to 3 things that must work live; everything else is slides.

| # | Must work | Stretch (only if done early) | Slides only |
|---|---|---|---|
| 1 | LINE OA: customer sends slip → AI reads → recorded live | Facebook / IG webhook (same pipeline) | Marketplaces, POS, payment gateways |
| 2 | Order ↔ slip matching + slip guard (duplicate, wrong amount) | Voice note → entry (ElevenLabs STT) | Forecast, health score |
| 3 | "Bank ฿1.9M → real income ฿1.1M" + tax estimate | | LoanReady, u-topia identity |

## System

```mermaid
flowchart LR
  C[Customer on LINE] -->|slip / text| LW[/api/webhooks/line/]
  LW --> X[lib/extract.ts<br/>Claude reads slip/order]
  X --> DB[(Supabase)]
  U[Merchant uploads statement] --> SX[/api/statement/]
  SX -->|Claude: PDF → rows + kind| DB
  DB --> E[engines: matcher · slipGuard · tax]
  E --> D[Dashboard]
  E --> T[Tax page]
  LW -->|reply "ได้รับ ฿780"| C
```

## Folder layout (`app/`)

```
app/
├─ src/app/
│  ├─ page.tsx                     # landing + "Load sample data"
│  ├─ dashboard/page.tsx           # timeline (all channels) + today/month totals + slip alerts
│  ├─ tax/page.tsx                 # bank total vs real income, tax estimate, e-Payment meter
│  ├─ upload/page.tsx              # statement PDF upload
│  └─ api/
│     ├─ webhooks/line/route.ts    # verify x-line-signature → ChatEvent → extract → save → reply
│     ├─ webhooks/meta/route.ts    # stretch: FB + IG (hub.challenge GET, x-hub-signature-256 POST)
│     └─ statement/route.ts        # PDF → transactions with kind
├─ src/lib/
│  ├─ channels/line.ts             # signature check, image download, reply
│  ├─ channels/meta.ts             # stretch
│  ├─ extract.ts                   # Claude: image/text → { type: slip|order|other, amount, payer, ref, items }
│  ├─ db.ts                        # Supabase client (server only)
│  └─ engines/                     # plain TS, no AI, unit-tested
│     ├─ matcher.ts  + .test.ts    # order ↔ slip per thread, 48 h window → paid/underpaid/overpaid
│     ├─ slipGuard.ts + .test.ts   # duplicate ref, amount ≠ order, slip with no order
│     └─ tax.ts      + .test.ts    # real income, flat vs actual expense, e-Payment thresholds
├─ seed/                           # demo chats, slips, statement — dashboard works if webhook fails
└─ .env.local                      # never committed
```

## Data (Supabase tables)

| Table | Columns |
|---|---|
| `events` | id, channel, shop_id, thread_id, from_shop, at, text, image_path, platform_msg_id (unique → dedupe), raw |
| `orders` | id, shop_id, thread_id, at, items (json), total, event_id |
| `payments` | id, shop_id, thread_id, at, amount, payer, bank, slip_ref, order_id, status, event_id |
| `transactions` | id, shop_id, at, amount, direction, counterparty, kind (`sale` / `personal` / `own_account` / `loan` / `refund`), source (`slip` / `statement`), evidence |

Slip `payments` and statement `transactions` are linked by amount + time so a sale is never counted twice.

## Env

`ANTHROPIC_API_KEY` · `LINE_CHANNEL_SECRET` · `LINE_CHANNEL_ACCESS_TOKEN` · `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · (stretch) `META_APP_SECRET` · `META_VERIFY_TOKEN` · `META_PAGE_TOKEN` · `ELEVENLABS_API_KEY`

## Rules
- AI only extracts facts and wording; **every number comes from `engines/`**.
- Verify webhook signatures before parsing; return 200 fast; dedupe on `platform_msg_id`.
- Download slip images at once (platform URLs expire).
- Tax numbers labelled "estimate".

## Build order

| When | Task |
|---|---|
| Day 1 → 18:00 | Scaffold Next.js + deploy to Vercel · Supabase tables · LINE OA + webhook receiving a slip · `extract.ts` returns amount |
| Day 1 evening (home) | `matcher` + `slipGuard` + tests · dashboard timeline · seed data |
| Day 2 → 11:00 | Statement upload → transactions · `tax` engine + test · tax page |
| Day 2 → 12:30 | Stretch: FB/IG or voice · UI polish |
| Day 2 → 14:00 | Rehearse live demo twice · README · deck link · submit |

Details per channel: [`capture-flows.md`](capture-flows.md) · user journeys: [`../02-business/user-setup.md`](../02-business/user-setup.md)

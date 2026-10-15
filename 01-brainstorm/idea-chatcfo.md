# Idea: ChatCFO

> **"Your LINE chats are your accountant."**
> ⚠️ **SUPERSEDED 2026-10-15** by [Univerxal](idea-univerxal.md) — standalone bookkeeping already exists (Parnuan, Zendai, FlowAccount). ChatCFO lives on as Univerxal's core engine.
>
> AI that turns a seller's chat history into books, tax, forecasts and a credit profile — with zero manual input.

## Problem

- Thai online sellers and micro-shops run their whole business inside LINE / Facebook chats — orders, "transferred already 🙏", slip photos, "pay next week". **No books.**
- **e-Payment law (Revenue Code Amendment No. 48, in force since 21 Mar 2019):** banks report anyone with **3,000+ deposits/incoming transfers a year, or 400+ totalling ≥฿2M** (counted per bank, across all accounts) to the Revenue Department. Sellers get contacted with **no records to defend themselves**.
- They don't know: their income type (40(8)), flat 60% vs actual expenses, VAT registration at ฿1.8M/yr, filing dates (ภ.ง.ด.94 half-year, ภ.ง.ด.90 yearly).
- Fake / reused transfer slips → shipped goods, no money.
- No records → no formal credit → loan sharks.
- Result: surprise tax bills, fines, overpaid tax, cash crunches nobody saw coming.

## Solution — 5 layers

### 1. Chat → Books (zero input)
- Upload LINE chat export (`.txt`) + slip / receipt images.
- AI extracts orders, customers, products, payments, outstanding debts.
- Slip guard: cross-check slip vs order (amount mismatch, duplicate / reused slip, suspected edit).

### 2. Account Analysis
- **Business health score** (0–100) with the 3 reasons behind it.
- Revenue, gross profit, margin by product; best / worst sellers.
- **Customer analysis:** top customers, repeat rate, who pays late, who's going quiet (churn risk).
- **Anomaly detection:** sudden revenue drop, unusual expense, a customer's debt growing.
- Plain-language AI insights: *"70% of your profit comes from 2 products; customer 'Nok' has paid late 4 times."*

### 3. Prediction
- **Cash-flow forecast** 30 / 60 / 90 days → *"You'll be ฿12,000 short around 28 Nov."*
- **Sales forecast** with trend + seasonality (e.g. 11.11, Songkran, payday cycles).
- **Late-payment prediction** per customer → who to chase first.
- **Year-end tax projection** → *"At this pace you'll owe ฿31,000 by December."*
- **What-if simulator:** raise price 5%, drop a product, add an expense → see profit, cash, tax change.

### 4. Live Tax Meter
- Tax due so far; **flat 60% vs actual expenses** comparison with the cheaper option highlighted.
- Threshold alarms: VAT (฿1.8M) countdown, e-Payment reporting risk.
- Deduction finder: ThaiESG, insurance, Easy E-Receipt, etc.
- One-click **filing pack**: ภ.ง.ด.94 / ภ.ง.ด.90-ready figures + income/expense summary PDF.

### 5. Credit Passport
- Verified sales history + forecast as a one-page shareable profile for banks / microlenders.

## Extra features

### ⭐ Top picks
1. **Deposit Classifier (audit defense)** — e-Payment law counts *every* deposit (family money, friend repaying, own-account transfers). AI tags each deposit as **sale / personal / loan / refund** using chat + slip context.
   → *"Only ฿1.1M of your ฿1.9M deposits is real income — you're below the VAT threshold."*
   → If a tax letter arrives: one-click **evidence pack** matching each deposit to its chat proof.
2. **Customer Credit Limits** — AI sets a safe "pay later" tab per customer from payment history: *"Nok: up to ฿2,000. Bee: cash only."* Cuts bad debt without awkward conversations.
3. **Monday Morning CFO Call** — weekly 60-second voice briefing via ElevenLabs: *"Sales up 12%, 3 customers owe ฿4,800, cash tight on the 28th, restock lipstick #5."*

### Operations
4. **Restock prediction** — sales velocity → *"Out of item X in 6 days"* + drafted supplier order.
5. **Smart pricing** — find high-demand, low-margin products; suggest new prices; what-if shows profit + tax impact.
6. **Expense by voice note** — *"Paid ฿800 packaging, ฿350 delivery"* → booked instantly; makes the actual-expense tax method realistic.
7. **Multi-channel merge** — LINE + Facebook + Shopee / Lazada / TikTok Shop exports → one book, one tax number.

### Money & safety
8. **Business vs personal split** — detect mixing; suggest a fixed "pay yourself" salary.
9. **Scam-buyer network** — opt-in shared flags: *"This account sent fake slips to 3 other sellers."* (community / u-topia tie-in)
10. **Micro-financing at the right moment** — predicted cash crunch → short-term loan offer via Credit Passport (revenue model for u-topia).
11. **Self-employed safety net** — suggest Section 40 social security / retirement savings sized to real income.

### Paperwork
12. **Auto receipts & e-Tax invoices** — send a receipt / tax invoice back into the chat after each paid order.

## Already exists? (partly)

| Exists | Gap we fill |
|---|---|
| FlowAccount, PEAK | For registered businesses, manual entry |
| iTAX | Salaried personal tax, not seller books |
| SlipOK / EasySlip | Single-slip check, no order context |
| Human accountants | ฿2–5k/month — too expensive for micro-sellers |

**Novel:** chat history → tax-ready books + forecasts for informal sellers, no data entry.

## Demo (2 min)
1. Drop 3-month chat export + slips → dashboard fills in.
2. Fake-slip flag pops.
3. Analysis: health score 62, *"2 products = 70% of profit"*, late-payer list.
4. Forecast: *"Cash short ฿12,000 on 28 Nov"* + what-if: raise price 5% → fixed.
5. Tax meter: *"฿18,400 due; actual-expense method saves ฿6,100"*; VAT alarm.
6. Generate filing pack PDF / Credit Passport.
7. *(Optional voice)* ask *"Do I need to register VAT?"* → ElevenLabs answers.

## Tech stack

| Part | Choice | Why |
|---|---|---|
| App | Next.js on Vercel | One repo, server routes for API keys, instant deploy |
| AI extraction + insights | Claude API (text + vision, structured output) | Thai chat + slip images → JSON; narrative insights |
| Tax + forecast math | Plain TypeScript (moving average / linear trend + seasonality) | Numbers must be exact and repeatable — AI extracts, code calculates |
| Storage | Browser only for MVP | Less to build |
| Charts / PDF | Recharts, browser print-to-PDF | No extra services |
| Voice (optional) | ElevenLabs TTS | Ecosystem points |

**Screens:** Upload → Dashboard → Analysis → Forecast (+ what-if) → Tax → Filing pack / Credit Passport.

## Scope
- **MVP:** upload, extraction, dashboard, analysis, cash-flow forecast, tax meter, deposit classifier (#1), filing-pack PDF.
- **Stretch (in order):** customer credit limits (#2), Monday CFO call (#3), what-if simulator, Credit Passport, restock (#4), expense voice note (#6).
- **Pitch-only (roadmap slide):** #5, #7–#12, live LINE bot.

## Risks
- e-Payment "all deposits counted" and Section 40 details are from memory — verify.
- e-Payment thresholds **verified** (Mazars, Thairath). Still verify: 60% flat deduction, ฿1.8M VAT threshold for individuals, current VAT rate (7% extension ran to 30 Sep 2026), form names.
- Edited-slip detection by AI vision is unreliable → rely on mismatch / duplicate checks.
- Forecasts on 3 months of fake data — keep claims modest, show the method.
- Demo data: write a realistic fake Thai chat with 2–3 bad slips.

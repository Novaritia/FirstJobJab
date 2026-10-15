# Idea: ChatCFO

> **"Your LINE chats are your accountant."**
> AI that turns a seller's chat history into books, tax, forecasts and a credit profile — with zero manual input.

## Problem

- Thai online sellers and micro-shops run their whole business inside LINE / Facebook chats — orders, "transferred already 🙏", slip photos, "pay next week". **No books.**
- **e-Payment tax law (2022):** banks report accounts with heavy deposit activity (≈3,000+ deposits/yr, or 400+ deposits totalling ฿2M+) to the Revenue Department. Sellers get contacted with **no records to defend themselves**.
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
- **MVP:** upload, extraction, dashboard, analysis, cash-flow forecast, tax meter, filing-pack PDF.
- **Stretch:** what-if simulator, Credit Passport, live LINE bot, voice Q&A.

## Risks
- Tax figures (e-Payment thresholds, 60% flat deduction, ฿1.8M VAT, form names) are from memory — **verify with Revenue Department before demo**.
- Edited-slip detection by AI vision is unreliable → rely on mismatch / duplicate checks.
- Forecasts on 3 months of fake data — keep claims modest, show the method.
- Demo data: write a realistic fake Thai chat with 2–3 bad slips.

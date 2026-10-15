# Univerxal

> 🔒 **LOCKED 2026-10-15** — our U-Hackathon project. Supersedes [ChatCFO](idea-chatcfo.md) (now its core engine), LoanReady and the Kompass group-money idea.
>
> **"Your AI money assistant — automatic books and every money task, for everyone who earns outside a payslip."**
>
> Core = automatic money management. Credit (LoanReady) is **one feature**, not the point.

## Problem

- Thai sellers, freelancers and SMEs earn through **chats, marketplaces, slips and transfers** — and have **no proper books**.
- **e-Payment law** (in force since 21 Mar 2019): banks report anyone with **3,000+ deposits/year, or 400+ totalling ≥ ฿2M** to the Revenue Department. People can't prove which deposits are real income → tax shock or overpaying.
- **60–70% of SME loans are rejected**; **78% for new SMEs** with no financial track record — banks can't see real income (Bank of Thailand, Sep 2026). Even the top-30% most efficient SMEs: only 21% get formal credit.
- **Group money** (family, trips, parties) mixes into personal accounts and inflates apparent income.
- Fake slips, unpaid tabs and unforeseen cash shortfalls.

## Solution — one platform, three spaces

| Space | Who | Purpose |
|---|---|---|
| 👤 **Personal (B2C)** | Natural persons: freelancers, online sellers, employees with side income | Personal books, personal tax, credit profile |
| 🏪 **Business (B2B)** | Merchants and SMEs | Business books, cash flow, tax, loan readiness |
| 👨‍👩‍👧 **Group** | Family, friends, trips, parties | Shared pots, splitting, who-owes-who |

## Features

### ① Capture — data in (no bank connection, no data entry)
| Feature | Description |
|---|---|
| Universal upload | Bank statements (PDF, any bank), e-wallet statements, slips, receipts, e-Tax invoices, Excel/Sheets, handwritten-notebook photos |
| Chat import | LINE, Messenger, Instagram, WhatsApp exports → orders, customers, "pay later" debts |
| Marketplace & POS import | Shopee, Lazada, TikTok Shop, Grab / LINE MAN merchant reports, POS CSV exports |
| AI document reader | Reads Thai text, slips and tables; shows a confidence level |
| Review & correct | User fixes anything misread; AI learns the user's categories |
| Webhooks *(roadmap)* | User-owned channels only: own LINE Official Account, forwarded e-receipt email, seller-approved marketplace accounts |

### ② Ledger — automatic books
| Feature | Description |
|---|---|
| Automatic bookkeeping | Every transaction categorised per space: income, expense, transfer, debt |
| **Deposit classifier** ⭐ | Every bank deposit matched to its proof: sale (chat order / Shopee payout / POS), personal transfer, loan, refund, **group reimbursement** |
| Slip guard | Flags reused slips, wrong amounts, slips with no matching order |
| Receivables tracker | Who owes what, since when; friendly reminder drafts |
| Business vs personal split | Separates business and personal money automatically |

### ③ Insights — analysis, forecast, tax
| Feature | Description |
|---|---|
| Financial health score | 0–100 with the 3 reasons behind it |
| Spending & sales analysis | Top products/customers, margins, late payers, anomalies |
| Plain-language AI insights | e.g. "70% of your profit comes from 2 products" |
| Cash-flow forecast | 30 / 60 / 90 days — "฿12,000 short around 28 Nov" |
| What-if simulator | Price change, new expense, new loan → profit / cash / tax impact |
| **Personal tax meter** ⭐ | Real income (reimbursements and personal transfers excluded), estimated tax, flat vs actual expense method, deduction tips |
| Threshold alarms | e-Payment reporting risk, VAT threshold countdown |
| Tax summary pack | Figures ready for personal tax forms — labelled as an estimate |

### ④ Group money — family, friends, parties
| Feature | Description |
|---|---|
| Group pots | Separate ledgers per trip, party, household, parents' care |
| Receipt split | Scan a receipt; each member ticks their items, or split evenly / by share |
| Who-owes-who | Live balances + fewest transfers to settle |
| PromptPay QR settlement | Pay the person owed directly, bank to bank — **Univerxal never holds money** |
| **Linked to personal books** ⭐ | Your share = your expense; friends' repayments = **reimbursement, not income** → tax and credit stay correct |

### ⑤ Credit — LoanReady (unlocked once a statement is uploaded)
| Feature | Description |
|---|---|
| Verified income | Statement-anchored; every amount linked to its proof |
| Loan readiness score | 0–100 with reasons and fixes ("ask for ฿300k over 4 years instead") |
| Bank-ready loan package | PDF: income proof, cash flow, 12-month projection, business summary |
| Program matching | TCG guarantees (บสย.), SME D Bank, GSB, BOT SME Credit Portal (Dec 2026) |
| Interview practice | AI plays the bank officer (ElevenLabs voice) |

### ⑥ u-topia trust layer — credit, identity, compliance
| Feature | Description |
|---|---|
| Identity check | u-topia verifies the owner (KYC) — the package belongs to a real, verified person/business |
| Consent control | Owner chooses what to share, with which lender, for how long — PDPA consent record |
| Audit trail | Every number traces to its source (statement line ↔ slip ↔ chat ↔ report) |
| Credit hand-off | Verified profile delivered to licensed lenders via u-topia rails |
| Payments & rewards | Group settlement and SME payments via the U-Topia app; rewards for keeping books current |

## Key selling point
> *"Just send a slip or a voice note on LINE — Univerxal does your books, tax, group money and warns you before cash runs out."*

Supporting example: *"Your bank shows ฿1.9M; Univerxal knows only ฿1.1M is real income"* — which helps tax, planning **and** credit.

## Competitors

| Competitor | Gap |
|---|---|
| Zendai, Parnuan | Bookkeeping only — no income proof, credit or group money |
| FlowAccount, PEAK | Registered companies, manual entry — we **complement** them |
| KhunThong, MAKE by KBank | Split bills, but can't separate repayments from income for tax and credit |
| Lender-side AI (MoF "AI นกกระซิบ", SME D Bank) | Score applicants — we **prepare** them |

## Legal (third-party only)
- User uploads own files — **no bank connection, no bank apps**.
- **Never holds money, never lends, never approves.**
- Group money = record book; settlement via PromptPay QR person-to-person.
- Tax = **estimate**, not a filing. Readiness score = advice to the user, not a credit score.
- PDPA consent and privacy, delivered through u-topia's compliance layer.

## Business model (hypotheses)
| Stream | Price |
|---|---|
| Personal free (books, group pots, basic tax) | ฿0 — growth engine |
| Personal Pro (forecasts, full tax, unlimited uploads) — **main revenue** | ฿99 / month |
| Business (multi-channel, cash flow, receivables) | ฿299 / month |
| Loan package | ฿990 each |
| Lender success fee | 0.5–1% of approved loan |
| Accounting firms (multi-client) | ฿1,990 / month |
| u-topia | Share of credit hand-off and payment fees |

## Growth loops
- **Group pots:** every trip/party invites 3–10 friends.
- **Accounting firms:** one sign-up brings dozens of SMEs.
- **Lenders:** send rejected applicants to get ready.
- **Moments:** tax season; BOT SME Credit Portal (Dec 2026).
- **Stories:** "I got a loan from my LINE chats."

## Demo (2 min) — hero: Mae Fon
1. Uploads statement + LINE chats + Shopee export + slips → books appear.
2. "Hua Hin trip" group pot: ฿4,800 from friends → tagged **reimbursement**.
3. Analysis + forecast: health score, "cash short on 28 Nov".
4. Tax meter: "Real income ฿1.1M, not ฿1.9M."
5. LoanReady: readiness **52 → 81** → loan package.
6. u-topia: Verified ✓ → consent → sent to lender with audit trail.

## Hackathon scope (by Fri 16 Oct 14:00)
| Build for real | Slides / mock |
|---|---|
| Upload (statement, slips, 1 chat) → AI ledger → deposit classifier | Webhooks, marketplace/POS connectors |
| Personal space + 1 group pot | Full Business space |
| Analysis, simple forecast, tax meter (3 numbers) | Advanced forecasting, filing forms |
| Readiness score + PDF package | Real lender submission |
| Consent screen + audit trail + mock u-topia identity check | Real KYC and lender rails |

**Stack:** Next.js on Vercel · Claude API (document reading, insights) · TypeScript (all money and tax math) · ElevenLabs (interview voice).

## Risks → mitigations
| Risk | Mitigation |
|---|---|
| Scope too big | One flow, ~6 screens; rest on slides |
| Legal | Upload only; no money held; estimates only |
| AI misreads | Confidence + user edit + "Load sample data" fallback |
| Tax facts wrong | Only verified numbers, labelled estimates — **verify 60% flat deduction, personal allowances, VAT threshold for individuals, form names** |
| Privacy | Consent screen + u-topia compliance trail |
| Lender referral fees | Check whether they require loan-intermediary registration |

## Sources
- e-Payment thresholds: [Mazars](https://www.forvismazars.com/th/en/insights/doing-business-in-thailand/tax/deposit-and-transfer-transactions-reporting), [Thairath](https://en.thairath.co.th/money/personal_finance/finance_banking/2922087)
- SME loan rejections & BOT Credit Portal: [Nation](https://www.nationthailand.com/business/40070829), [Nation](https://www.nationthailand.com/business/banking-finance/40071175), [Pattaya Mail](https://www.pattayamail.com/news/bank-of-thailand-plans-200-billion-baht-credit-push-as-sme-loan-rejections-soar-564470)
- Competitors: [Zendai](https://trustmrr.com/startup/zendai), [FlowAccount AI Connector](https://flowaccount.com/functions/ai-connector), [KhunThong](https://thestandard.co/kbtg-khunthong-chatbot/), [MAKE by KBank](https://www.kasikornbank.com/en/News/Pages/MAKEbyKBank-.aspx), [AI นกกระซิบ](https://www.naewna.com/n/?p=54176)
- u-topia: [DappRadar](https://dappradar.com/?p=28028), [press release 2025](https://markets.financialcontent.com/franklincredit/article/zexprwire-2025-7-29-u-topia-joins-the-international-chamber-of-virtual-assets-through-theblocks-startup-program)

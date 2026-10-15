# Univerxal

> 🔒 **LOCKED 2026-10-15** — our U-Hackathon project. Supersedes [ChatCFO](idea-chatcfo.md) (now its core engine), LoanReady (now one feature) and the Kompass group-money idea.
>
> **"Your AI money assistant — every sale, slip and payment from every chat and platform, recorded automatically. Then books, tax, group money, forecasts and credit, done for you."**

## TL;DR (ไทย)

Univerxal คือผู้ช่วยการเงิน AI สำหรับคนที่ไม่มีเงินเดือนประจำ (แม่ค้าออนไลน์ ฟรีแลนซ์ เอสเอ็มอี) และกลุ่มเพื่อน/ครอบครัว
- **ดึงประวัติอัตโนมัติ** — ร้านกดเชื่อม LINE OA / เพจ Facebook / Instagram ครั้งเดียว ทุกสลิปและออเดอร์ที่ลูกค้าส่งในแชทถูกดึงมาลงประวัติเอง (webhook เงียบ ๆ ไม่ตอบลูกค้า) + รวมประวัติจากแพลตฟอร์มอื่นที่มี webhook
- **รวมประวัติ ไม่รวมเงิน** — ไม่แตะเงิน ไม่เข้าบัญชีธนาคาร
- **ต่อยอด** — บัญชี, วิเคราะห์, พยากรณ์, ภาษีบุคคลธรรมดา, เงินกลุ่ม, ตรวจสลิป, สินเชื่อ (หนึ่งในฟีเจอร์) + ElevenLabs เสียง + u-topia ยืนยันตัวตน/ความยินยอม

---

## 1. Problem

- Thai sellers, freelancers and SMEs sell through **LINE, Facebook, Instagram, marketplaces and payment links**. Orders and slips are scattered across chats — **nobody keeps the history**.
- Existing tools make the merchant do the work: **forward slips one by one** (ป้านวล, Zendai), or **move all selling into a new system** (Zwiz, Page365), or **type books manually** (FlowAccount, PEAK).
- Without history: no idea of real profit, **tax risk** under the e-Payment law (banks report **3,000+ deposits/year, or 400+ totalling ≥ ฿2M**, since 2019), money from friends/family mixed with sales, fake slips, cash shortfalls nobody saw coming.
- Credit is one consequence: **60–70% of SME loans rejected; 78% for new SMEs** with no financial track record (Bank of Thailand, Sep 2026).

## 2. Solution

### Core idea
**Connect once → every chat and platform feeds one history automatically → AI turns it into every money task.**
The merchant keeps selling exactly as before.

```
Customer chats the shop (LINE OA / Facebook Page / Instagram)
"เอา 2 ชิ้นค่ะ" + 📷 slip
        │  webhook — platform sends a silent copy to Univerxal
        ▼
Univerxal (never replies to customers, never touches money)
  ① AI reads slip → amount, date, payer, bank
  ② AI reads conversation → order "2 items ฿780"
  ③ Match slip ↔ order → record in history
        ▼
Private notice to the merchant: "✅ Sale ฿780 (FB · Khun Nok) recorded"
        ▼
Books · Analysis · Forecast · Tax · Group money · Slip guard · Credit
```

### Three spaces
| Space | Who |
|---|---|
| 👤 Personal | Natural persons: freelancers, online sellers, side-income earners |
| 🏪 Business | Merchants and SMEs |
| 👨‍👩‍👧 Group | Family, friends, trips, parties |

## 3. Capture — history from every chat and platform

**Principle:** we aggregate **history (records)**, not money. Webhook if the platform offers one → API with the user's permission → share / voice / upload as fallback.

### 3.1 Automatic from chats ⭐ (the merchant does nothing after connecting)
| Platform | How | Status |
|---|---|---|
| **LINE OA** | Messaging API webhook; shop admins keep chatting manually (chat + webhook can run together); bot stays silent | ✅ Demo |
| **Facebook Page (Messenger)** | Meta Messenger webhook | ✅ Demo (dev mode: team accounts only) |
| **Instagram DM** | Instagram Messaging webhook (Professional account) | 🟡 Stretch — harder setup |

### 3.1b Personal accounts (no automatic capture)
Webhooks exist **only for business accounts**. Personal Facebook Messenger, personal Instagram and personal LINE have **no official API** — logging in on the user's behalf or scraping would break platform terms, risk account bans and violate PDPA. We never do it.

| Account | Automatic? |
|---|---|
| Facebook Page · Instagram Professional · LINE OA | ✅ Webhook |
| Facebook personal profile · Instagram personal · LINE personal | ❌ |

For sellers on personal accounts:
| Option | How | Effort |
|---|---|---|
| **Switch to a free business account** ⭐ | Free Facebook Page, Instagram → Professional (settings, ~1 min), free LINE OA — guided in onboarding | One-time, 2–5 min |
| Share in 2 taps | Long-press slip → Share → Univerxal | Per slip |
| Import past chats | Facebook "Download Your Information" export → upload; AI extracts orders and slips | Occasional, not real-time |
| Voice / screenshot | Send to @Univerxal | Anytime |

Onboarding message: *"Switch to a free business account in 2 minutes and Univerxal records everything automatically."*

### 3.2 Other platforms with webhooks / APIs
| Platform | History captured | Status |
|---|---|---|
| Payment gateways (Opn, 2C2P, ChillPay) | Successful payments | 🟡 Demo via Opn test mode |
| Marketplaces (Shopee, Lazada, TikTok Shop) | Orders, payouts | ⏭️ Needs partner approval — simulated in demo |
| POS (Loyverse etc.) | Shop-front receipts | ⏭️ |

### 3.3 Fallbacks (when there's no webhook)
| Method | Use |
|---|---|
| Share a slip/screenshot to @Univerxal (2 taps) | Any bank / wallet / app |
| Voice note (ElevenLabs speech-to-text) | Cash sales, expenses: "ซื้อกล่อง 800 ค่าส่ง 350" |
| Upload | Bank statements, Excel, past history |

### 3.4 Smart confirmation
AI categorises everything; asks **only when unsure**, with one-tap buttons:
> "เงินเข้า ฿500 จาก 'นก' คืออะไรคะ?" **[🛒 ขายของ] [👨‍👩‍👧 ส่วนตัว] [🎉 เงินทริป] [💸 ยืม]** — and remembers next time.

## 4. Connecting — how easy is it

| Platform | Merchant does | Ease | We need |
|---|---|---|---|
| Facebook Page | Tap "Connect Facebook" → log in → pick page → allow | 🟢 3 taps | Meta App Review + business verification before public launch |
| Instagram | Same login (Professional account) | 🟢 | Meta App Review |
| LINE OA | **"Add Univerxal as admin"** → our team sets it up (≈10 min) | 🟢 for merchant | Manual setup now; LINE partner/module program later (unverified) |
| Payment gateway | Paste webhook URL or authorise | 🟡 | — |
| Shopee / Lazada / TikTok | Tap connect → log in → allow | 🟢 | Partner/app approval |

**Onboarding (< 2 min):** add LINE @Univerxal → "Where do you sell?" → tap connect on each → (optional) upload 3 months of statements for history → done.

**What the merchant sees:** instant "✅ recorded" notices · 21:00 daily summary · Monday voice summary · alerts (duplicate slip, cash shortfall).

## 5. Features

✅ demo · 🟡 if time · ⏭️ roadmap

### ① Books (automatic)
| Feature | Status |
|---|---|
| Unified history timeline: who ordered what, paid how much, when, which channel, with evidence | ✅ |
| Auto bookkeeping + categories | ✅ |
| **Deposit classifier** — sale / personal / loan / refund / group reimbursement ⭐ | ✅ |
| Slip guard — duplicate slip, wrong amount, no matching order | ✅ |
| Receivables — who owes, polite reminder drafts | 🟡 |
| Business vs personal split | 🟡 |
| Export to FlowAccount / PEAK | ⏭️ |

### ② Analysis
| Feature | Status |
|---|---|
| Financial health score 0–100 with reasons | ✅ |
| Plain-language AI insights ("70% of profit from 2 products") | ✅ |
| Best products / customers / late payers | 🟡 |
| Anomaly alerts | ⏭️ |

### ③ Forecast
| Feature | Status |
|---|---|
| Cash flow 30/60/90 days ("short ฿12,000 around 28 Nov") | ✅ |
| What-if simulator | 🟡 |
| Seasonal sales, stock-out prediction | ⏭️ |

### ④ Tax (natural person)
| Feature | Status |
|---|---|
| Tax on **real income** (reimbursements and personal transfers excluded) | ✅ |
| Flat vs actual expense comparison | ✅ |
| e-Payment / VAT threshold alerts | ✅ |
| Deduction tips | 🟡 |
| Figures for ภ.ง.ด.90/94, audit evidence pack, e-Tax receipts | ⏭️ |

### ⑤ Group money (family / friends / party)
| Feature | Status |
|---|---|
| Group pots (trip, party, household, parents' care) | ✅ (1 pot) |
| **Friends' repayments ≠ income** ⭐ | ✅ |
| Receipt split by item; who-owes-who; PromptPay QR settle (person to person — we never hold money) | 🟡 |
| Bot inside LINE groups | ⏭️ |

### ⑥ Credit — LoanReady (one feature, not the core)
| Feature | Status |
|---|---|
| Verified income from history + statement | ✅ |
| Readiness score 0–100 + how to improve | ✅ |
| Bank-ready PDF package | ✅ |
| Program matching (บสย., SME D Bank, GSB, BOT Credit Portal Dec 2026) | 🟡 |
| Interview practice (ElevenLabs Agent) | 🟡 |

### ⑦ ElevenLabs (voice)
| Feature | Status |
|---|---|
| Voice notes → entries (speech-to-text) | ✅ |
| Loan interview practice (Agents) | 🟡 |
| Monday voice CFO summary (text-to-speech) | 🟡 |
| AI accountant hotline — call and tell your day, it records (Agents + telephony) | ⏭️ |

### ⑧ u-topia trust layer (credit · identity · compliance)
| Feature | Status |
|---|---|
| Consent screen — what to share, with whom, how long (PDPA) | ✅ |
| Audit trail — every number traces to its source (slip ↔ chat ↔ webhook event) | ✅ |
| Identity check via u-topia | 🟡 (mocked) |
| Hand-off to lenders, payments, rewards via U-Topia app | ⏭️ |

### Future vision (slide only)
- **Income Passport** — a consented, verified income link for card applications, leasing, rentals, insurance (proven model abroad: Argyle, Truv; not found in Thailand).
- Ask-anything voice/chat assistant ("how much profit this month?").
- Accounting-firm multi-client view; ASEAN expansion.

## 6. Key selling points
1. **"Connect once. Every slip your customers send — on LINE, Facebook or Instagram — is recorded automatically. You never forward anything."**
2. **"Your bank shows ฿1.9M; Univerxal knows only ฿1.1M is real income"** — the rest is family transfers and trip money → right tax, real planning, credible credit.
3. **Works with what shops already use** — we don't replace Zwiz, Page365 or FlowAccount; we're the layer on top.

## 7. Competitors

| Competitor | What they do | Gap Univerxal fills |
|---|---|---|
| **ป้านวล / Zendai** | Bookkeeping in LINE — **merchant forwards slips** | Auto-capture from customer chats; multi-platform; tax, group, forecast, credit |
| **Zwiz.AI** | Chat commerce on FB/IG/LINE/TikTok/WhatsApp, payments, fake-slip check (70,000+ businesses reported) | Shops must sell through Zwiz; no personal tax, group money or credit |
| **Page365** | Unified FB/LINE/IG inbox, orders, receipts, tax invoices | Order management, not money intelligence |
| **FlowAccount / PEAK** | Accounting for registered companies, manual entry | Informal sellers; zero entry; we can export to them |
| **KhunThong / MAKE by KBank** | Bill split, savings pockets | Can't separate repayments from income for tax/credit |
| Lender-side AI (MoF "AI นกกระซิบ", SME D Bank) | Score applicants | We prepare applicants |

## 8. Legal (third-party only)
- Merchant **connects their own business accounts**; we only receive copies of messages sent to the business.
- **No personal chats, no bank apps, no bank logins.**
- **Never holds money, never moves money, never lends or approves.**
- Group money = record book; settlement is person-to-person via PromptPay QR.
- Tax = **estimate**; readiness score = advice to the owner, not a credit score.
- PDPA consent; data shared with lenders only by the owner's choice, via u-topia's compliance layer.

## 9. Business model (hypotheses)
| Stream | Price |
|---|---|
| Free (history, books, group pots, basic tax) | ฿0 — growth engine |
| Personal Pro (forecast, full tax, unlimited history) — **main revenue** | ฿99 / month |
| Business (multi-channel, receivables, multi-admin) | ฿299 / month |
| Loan package | ฿990 each |
| Lender success fee | 0.5–1% of approved loan |
| Accounting firms (multi-client) | ฿1,990 / month |
| u-topia | Share of identity, hand-off and payment fees |

### Growth loops
- **Zero-effort value:** connect once → history appears → merchant tells other merchants.
- **Group pots** invite 3–10 friends each.
- **Accounting firms** bring dozens of SMEs per sign-up.
- **Moments:** tax season; BOT SME Credit Portal (Dec 2026).

## 10. Demo (2 min) — hero: Mae Fon, online seller
1. Team member, as a customer, chats Mae Fon's **LINE OA**: "เอา 2 ชิ้นค่ะ" + slip → **dashboard records it live**; Mae Fon touched nothing.
2. Another customer on her **Facebook Page** → also recorded → one unified history.
3. **Judge adds the LINE OA and sends a slip** on stage → appears live.
4. "Hua Hin trip" group pot: ฿4,800 from friends → tagged **reimbursement, not income**.
5. Insights: health score, "cash short on 28 Nov".
6. Tax meter: "Real income ฿1.1M, not ฿1.9M."
7. (One feature) LoanReady: readiness 52 → 81 → PDF; u-topia consent + audit trail.
8. Voice: Mae Fon sends a voice note "ซื้อกล่อง 800" → recorded.

## 11. Hackathon scope (by Fri 16 Oct 14:00)
| Build for real | Slides / simulated |
|---|---|
| LINE OA webhook (silent) → slip + order extraction → history | Instagram (if setup fails), marketplaces, POS |
| Facebook Page webhook (team accounts) | Public Meta App Review, LINE partner connect |
| Unified history + deposit classifier + slip guard | Advanced analytics |
| Health score, simple forecast, tax meter (3 numbers) | Filing forms |
| 1 group pot with reimbursement tagging | Full split/settle flow |
| Readiness score + PDF; consent + audit trail; mocked u-topia ID | Real KYC, lender hand-off |
| Voice note → entry (ElevenLabs STT) | Hotline, interview agent (if time) |

**Stack:** Next.js on Vercel (HTTPS webhooks) · Supabase (history store) · Claude API (slip + chat reading, insights) · TypeScript (all money/tax math) · ElevenLabs (voice) · LINE Messaging API · Meta Messenger/Instagram API.

## 12. Risks → mitigations
| Risk | Mitigation |
|---|---|
| Chat capture also offered by Zwiz/Page365 | Pitch the layer on top (tax, group, forecast, credit); integrate with them later |
| LINE OA allows one webhook (conflict with Zwiz) | Investigate LINE module/partner options; silent mode |
| Meta dev mode limits who can message | Demo with team accounts; judge interaction via LINE |
| LINE OA setup is technical for merchants | "Add us as admin, we set it up"; partner program later |
| AI misreads slips/chats | Confidence + one-tap confirm + "Load sample data" fallback |
| Tax facts unverified | Verify 60% flat deduction, allowances, VAT threshold for individuals, form names; label as estimates |
| Credit-information / loan-intermediary rules | Owner shares, no score sold; ask mentor |
| Privacy (PDPA) | Consent at connect; business accounts only; u-topia compliance trail |
| Many sellers use personal profiles (no API) | Guided switch to free Page / IG Professional / LINE OA; share-in-2-taps and chat-export import as fallback |

## 13. Sources
- e-Payment thresholds: [Mazars](https://www.forvismazars.com/th/en/insights/doing-business-in-thailand/tax/deposit-and-transfer-transactions-reporting), [Thairath](https://en.thairath.co.th/money/personal_finance/finance_banking/2922087)
- SME loans & BOT Credit Portal: [Nation](https://www.nationthailand.com/business/40070829), [Nation](https://www.nationthailand.com/business/banking-finance/40071175), [Pattaya Mail](https://www.pattayamail.com/news/bank-of-thailand-plans-200-billion-baht-credit-push-as-sme-loan-rejections-soar-564470)
- Competitors: [Zendai](https://trustmrr.com/startup/zendai), [Zwiz](https://zwiz.ai/en), [Zwiz article](https://marketingoops.com/news/biz-news/zwiz-ai/), [Page365](https://www.page365.net/home-en?lang=en), [FlowAccount AI Connector](https://flowaccount.com/functions/ai-connector), [KhunThong](https://thestandard.co/kbtg-khunthong-chatbot/), [MAKE by KBank](https://www.kasikornbank.com/en/News/Pages/MAKEbyKBank-.aspx), [AI นกกระซิบ](https://www.naewna.com/n/?p=54176), [n8n LINE receipt template](https://n8n.io/workflows/12680-track-receipt-expenses-via-line-with-openai-gpt-4o-mini-and-google-sheets/)
- Income verification abroad: [Argyle](https://www.businesswire.com/news/home/20220307006135/en/Argyle-Launches-First-Self-serve-Tool-for-Consumers-to-Generate-Income-and-Employment-Verification-Reports-for-Free), [Truv](https://www.settlementone.com/verification-solutions/truv-income-employment-verification/)
- Freelancer income-proof pain: [KTC](https://www.ktc.co.th/article/knowledge/insights/freelance-credit-card-application-tips), [KBank](https://www.kasikornbank.com/th/credit-insight/pages/freelance-and-online-marchant-apply-personal-loan.aspx)
- u-topia: [DappRadar](https://dappradar.com/?p=28028), [press release 2025](https://markets.financialcontent.com/franklincredit/article/zexprwire-2025-7-29-u-topia-joins-the-international-chamber-of-virtual-assets-through-theblocks-startup-program)

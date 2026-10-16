# User setup — every case

Market: **merchants** (and their customers' payments) and **individuals** who file personal tax.
Works for people with **no registered company**: every channel below is free and opened with a personal account.
Rule: we read **records** sent to the merchant's business chat or uploaded by the user. We never log into personal chats or bank apps, never hold money.

| Case | User connects | Automatic | User still does |
|---|---|---|---|
| A. Merchant ↔ customer | Free LINE OA / FB Page / IG Professional | Every slip + order customers send in chat | Cash: 1 voice line per day · statement once a month (fallback) |
| B. Individual tax | Add @Univerxal as friend + upload statements | Classify every deposit: income vs not | Upload statement monthly (or 12 months once), photo of 50 ทวิ |

A merchant is also an individual taxpayer: case A sales flow straight into case B, so one person gets books **and** a tax estimate from the same history.

---

## A. Merchant ↔ customer (e.g. Mae Fon, sells clothes on IG + LINE, no company)

**Why it works for an individual:** LINE OA unverified accounts are free for anyone, individual or company. A Facebook Page is created from a personal profile. IG Professional is a free switch and no Page is needed for messaging (Instagram Login).

**Merchant setup (once, ~10 min, a grandchild can do it)**
1. Add **@Univerxal** on LINE → "ขายที่ไหน?" → pick channels.
2. LINE: open free LINE OA → add Univerxal team as admin (we set the webhook) or follow the picture guide.
3. Facebook: tap **Connect Facebook** → pick page → allow.
4. Instagram: switch to Professional → Settings → Messages → Connected tools → allow access → tap **Connect Instagram**.
5. Enter PromptPay number → we generate the shop sticker: ① PromptPay QR ② add-LINE-shop QR.
6. (Shop front only) enter morning change float, e.g. ฿500.

**Customer setup:** nothing. Online: chat the shop as usual. Shop front: scan ①, pay, scan ② once, send slip.

**Daily / monthly**
- Automatic: "✅ ขาย ฿780 (IG · คุณนก) เสื้อดำ ×2", underpaid / fake-slip alerts, 21:00 summary.
- Mae Fon: closing time, hold-to-talk "เงินในลิ้นชัก 2,300" → cash sales = drawer − float.
- Monthly: upload bank statement → fills transfers sent without a slip.

## B. Individual tax (e.g. Ploy, freelance designer + side sales, money lands in a personal account)

**Why it works:** no open-banking feed for individuals is assumed. The source is the user's **own bank statement** (PDF from the bank app), plus documents they already receive.

**Setup (once, ~5 min)**
1. Add **@Univerxal** on LINE (or the web app).
2. Upload last 12 months of bank statements (PDF; enter the PDF password if the bank set one).
3. Photo of each **50 ทวิ** (withholding certificate) from clients.
4. If she also sells in chat → connect channels as case A.

**Ongoing:** upload a statement monthly (reminder on the 1st).

**Automatic**
- Every deposit classified: sale / client fee / personal (family, own account) / loan / refund. Asks only when unsure, with buttons.
- Real income vs bank total ("ธนาคารเห็น ฿1.9M — รายได้จริง ฿1.1M").
- Tax estimate (flat vs actual expenses), e-Payment reporting risk, VAT threshold countdown, figures for filing.

---

## What is real vs mocked for the demo

| Piece | Status | Note |
|---|---|---|
| LINE OA webhook | Real, live | Judges can message it, no app review |
| Facebook / IG webhooks | Real, dev mode | Only app-role accounts → team phones play customers |
| Statement PDF → transactions (Claude) | Real | Use our own sample statements |
| Tax / matching engines | Real TS code + tests | AI never computes numbers |
| Android notification capture | Not built | Mentor check needed (bank-app rule) |
| u-topia identity | Mocked | |

## Demo script (one person, two cases, ~2 min)
1. **A:** judge sends a slip to the LINE shop → dashboard shows the sale; team phone does the same on IG.
2. **B:** upload a sample statement → "bank ฿1.9M, real income ฿1.1M" (sales from A + family transfers excluded) → tax estimate.

## Check before relying on it
- [ ] LINE: free-plan push quota in Thailand
- [ ] Meta dev mode: webhooks only from app-role users; tester limit
- [ ] Which Thai bank apps export statement PDFs and how (password format)
- [ ] Tax rules used by the engine (see `04-plan/tasks.md` tax facts task)

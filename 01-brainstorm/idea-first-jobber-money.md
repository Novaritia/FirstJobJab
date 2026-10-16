# First-Jobber Money Keeper (working name)

> 💡 **Candidate (2026-10-16)** — for U-Hackathon **and** for real long-term use.
>
> **"Your statements, turned into a plan."** Upload bank statements and slips → one verified history → where your salary goes, how your money grows, your tax, and when you're ready to borrow.

## TL;DR (ไทย)
แพลตฟอร์มสำหรับ **first jobber** ที่ยังบริหารเงินไม่เป็น อัปโหลด statement / สลิป → ระบบอ่านเป็นตาราง ตรวจยอดคงเหลือทุกแถว → บอกว่าเงินเดือนไปไหน, วางแผนแบ่งเงิน, กราฟเงินโต, ภาษี, ความพร้อมกู้ มี **streak รายเดือน** แบบ Duolingo ให้ส่ง statement สม่ำเสมอ เพราะ statement ย้อนหลังขอจากธนาคารได้จำกัด

## 1. Users & problem
- **First jobbers** (salary earners, ~1–3 years into work) who don't know how to manage money.
- Salary disappears with no idea where; no plan; tax is confusing; first car/condo loan needs 6 months of statements.
- Bank statements can only be requested back a limited time (≈6–12 months, varies by bank — verify) → history is lost if not kept.

## 2. Existing products
| Product | Does | Gap we fill |
|---|---|---|
| Budgy (TH) | AI expense tracker, slip + Thai statement import | Records the past only; no tax, growth plan, loan readiness |
| MeowJot (KBTG) | Reads e-slips from Thai bank apps, subscription | Same — tracking, not planning |
| iTAX | Tax calculation/planning | Manual input, no statements |
| WealthGame / WealthQuest / Cowrywise | Streaks, XP | Streak is cosmetic; ours = loan-ready history |

## 3. Features
1. **Where did my salary go** — plain-language summary of 3+ months.
2. **Salary plan** — split into spend / emergency / invest, based on real spending.
3. **Growth graph** — save X/month → value in 1/5/10 years, draggable.
4. **Tax** — this year's estimate; at what salary you start paying; deductions to use then.
5. **Loan ready** — max affordable installment; 6-month readable summary from original statements.
6. **Crypto (u-topia)** — read-only wallet address, joins the same history. Optional.
7. **Voice (ElevenLabs)** — weekly 30-second spoken summary; say cash expenses aloud.

## 4. Streak (monthly, not daily)
| When | Notice | Action |
|---|---|---|
| 2–3 days after payday | "Salary's in — upload this month's statement" | 1 upload → streak +1 |
| Anytime (optional) | "Big transfer? Send the slip" | slip |
| Weekly | "Spent 6k of 7k budget 👍" | read only |
| Before a month expires at the bank | "May statement is about to become unavailable" | backfill gap |

- Streak = **"🔥 4/6 continuous months → ready to apply for a loan"**.
- Backfilling a missed month keeps the streak while the bank still offers that statement.
- First use: upload 3–6 months back at once → streak starts above 0.
- Channel: in-app banner (MVP) → LINE OA Messaging API (later).

## 5. Data rules
- **Import → review → confirm.** Every statement row is balance-checked (`prev balance ± amount = balance`) and totals are checked against the statement summary. Review screen shows ✅ passed / ⚠️ failed rows only.
- **Amounts/dates:** editable only on ⚠️ rows, and the fix must make the balance reconcile. Locked after confirm.
- **Category/note:** freely editable; edits become rules ("Somchai = rent").
- **Manual rows:** allowed, tagged ✋, excluded from the loan summary.
- **Delete:** hide only.
- **Storage:** original rows immutable + append-only `edits(row_id, field, old, new, at)`. AI reads only the merged latest view. Loan summary uses original statement values only.
- **Slips:** QR verified → ✅; not verifiable → ✋. Slip ↔ statement row matched by ref / amount+time → one row (no double count).
- **Own-account transfers** detected (same amount out of A, into B within minutes) → not income.
- **Account field** stored on every row from day 1; MVP UI shows one merged view.

## 6. Security & privacy
- Original PDFs/images **encrypted at rest**; extracted data stored as DB rows (~200 B/row → ~0.5 MB per user for 2 years).
- **Backups (3 layers):** (1) DB provider's automatic daily backup; (2) nightly encrypted `.csv.gz` export per user to separate object storage, so data survives a DB/vendor loss; (3) "Download my data" button — CSV + original PDFs as a zip (also PDPA data portability).
- Slips: after QR verify keep hash + thumbnail, not the full image.
- **Birth date + national ID** stored to auto-unlock bank PDFs: field-level encryption, used server-side only at unlock, never logged, never sent to the AI; user may choose "don't remember, ask each time".
- PDPA: separate consents per purpose (own planning / loan summary / anonymised improvement); withdraw + real delete.

## 7. MVP (hackathon)
- Banks: **KBank + Bangkok Bank**. Demo uses **mock statements** (3–6 months), no real personal data.
- Web: multi-file upload → parse → balance check → review/confirm → merged table with edit log → streak card + missing-month banner → salary summary, growth graph, tax estimate → ElevenLabs weekly voice summary.
- Later (app): auto-import from the bank-slip album in the gallery (on app open), per-account filter, crypto, loan report, LINE notices.

## 8. Business risks
- **BOT "Your Data"** (consumer bank-data sharing, expected from H2 2026): statement upload/OCR stops being a moat; plan to become a data recipient. Moat = planning, streak habit, verified history.
- Consumer subscription alone is weak (59 ฿ × ~17k payers ≈ 1M ฿/month needs ~560k free users at 3%). Real revenue: employer benefit (B2B2C) and loan-ready reports / lender referrals (watch conflict of interest).

## 9. Open questions
- [ ] Exact e-statement PDF password format for KBank and Bangkok Bank.
- [ ] How far back each bank lets you request e-statements.
- [ ] 2026 tax deduction list (ThaiESG etc.) from the Revenue Department.
- [ ] ElevenLabs Thai quality (TTS + STT).
- [ ] u-topia wallet chain + read access; U-Bot integration (later).
- [ ] Product name.
- [ ] Pricing — see [business notes](../02-business/business-model.md) (to update).

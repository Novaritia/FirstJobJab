# Problem & Users — ChatCFO

## Problem statement
> **Thai online sellers** run their whole business inside LINE / Facebook chats and **have no books**, so they **can't prove income, overpay or get surprised by tax, lose money to fake slips, and can't get formal credit** — pushing them toward fines and loan sharks.

## The problem chain

```
Business lives in chats → no books → ┬→ tax shock (e-Payment report → Revenue Dept letter, no records to defend)
                                     ├→ overpaid tax (personal transfers counted as income; wrong expense method)
                                     ├→ fake / reused slips → goods shipped, no money
                                     ├→ cash crunches nobody predicted
                                     └→ no proof of income → no bank loan → loan sharks
```

## Evidence (cite on slides)
- **e-Payment law** (Revenue Code Amendment No. 48, in force 21 Mar 2019): banks must report anyone with **3,000+ deposits/incoming transfers a year, or 400+ totalling ≥ ฿2M**, per bank across all accounts. Reported data: ID, name, account, count and total. — [Mazars](https://www.forvismazars.com/th/en/insights/doing-business-in-thailand/tax/deposit-and-transfer-transactions-reporting), [Thairath](https://en.thairath.co.th/money/personal_finance/finance_banking/2922087)
- **March 2026:** news reports caused alarm among young people and online merchants about the 3,000-deposit rule — the fear is current. — [Thairath](https://en.thairath.co.th/money/personal_finance/finance_banking/2922087)
- **Online scams:** 612,603 cases, > ฿69.18 billion lost (Mar 2022 – Jul 2024, Royal Thai Police data). — [The Stable](https://www.thestable.com.au/vml-thailand-whoscall-the-digital-era-yellow-pages-lists-1-5m-scammers-phone-numbers/)
- **Online shopping fraud** = 73% of reported scam cases (SCB EIC survey); more than half of victims got no resolution. — [Thairath](https://en.thairath.co.th/money/economics/thai_economics/2956372)
- **Fake slips:** slip-generator apps produce realistic slips with correct fonts, timestamps and QR codes. — [Motorist](https://www.motorist.co.th/en/article/5370/warning-5-online-used-car-scams-every-seller-must-know)
- **Scale:** ~850,000 sellers in Thai video commerce alone (Ken Research, 2025 — private estimate). — [Ken Research](https://www.kenresearch.com/industry-reports/thailand-social-commerce-market)

## Who has it
- **Primary user:** solo / family online sellers on LINE, Facebook, TikTok, IG — cosmetics, clothes, food, crafts. ฿30k–฿3M revenue a year. No accountant.
- **Secondary users:** lenders / banks (need proof of income), accountants (could serve many more clients), u-topia (merchant payments ecosystem).

## How they cope today
- Scroll back through chats at tax time; guess the numbers.
- Notebook or Excel, abandoned after two weeks.
- Take the flat expense deduction without checking whether actual costs save more.
- Trust slip screenshots; check the bank app only "when they remember".
- Pay an accountant ฿2–5k/month — or nothing at all and hope.

## Why now
- e-Payment reporting makes every heavy-deposit seller visible to the Revenue Department.
- PromptPay + slip culture means **all the evidence already exists** — in chats and images.
- AI can now read messy Thai chat text and slip images reliably → zero-input bookkeeping is finally possible.

## Personas

### Persona 1 — "Mae Fon", cosmetics seller
- 34, Nonthaburi. Sells skincare via LINE OA + Facebook Live. ~1,200 orders a year, ~฿1.4M revenue.
- **Goal:** know her real profit; never get a tax shock.
- **Frustration:** "My account shows ฿1.9M coming in — but a lot of it is my sister paying me back and me moving my own money. Will the Revenue Department think it's all income?"
- **Pain moment:** received a fake slip for ฿3,200 last month; shipped before checking.

### Persona 2 — "Ton", home food seller
- 27, Bangkok. Sells meal boxes to office workers via LINE groups. Customers "pay Friday".
- **Goal:** stop chasing money; get a loan for a second oven.
- **Frustration:** "The bank asked for financial statements. I only have chats."

## How we'll know it's solved
- Books built from chats with **≥ 90% of orders extracted correctly** (demo dataset).
- Seller can answer "how much tax do I owe?" and "how much am I owed?" in **under 10 seconds**.
- Every fake / duplicate slip in the demo data is flagged.
- Filing pack + Credit Passport generated in one click.

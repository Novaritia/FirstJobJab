# Product

<!-- impeccable:product-schema 1 -->

> Written by a build subagent without a live interview (no question tool in that session). Facts come from the coordinator brief and `01-brainstorm/idea-first-jobber-money.md`. Items marked *(inferred)* need confirmation.

## Platform

web

## Users
Thai first jobbers, about 1–3 years into salaried work, who don't know how to manage money. Their salary disappears without them knowing where. They have no plan, find tax confusing, and their first car or condo loan will need 6 months of statements. They mostly use a phone; a laptop is used for the first bulk upload *(inferred)*.

## Product Purpose
FirstJobJab turns bank statements into a money plan. The user uploads e-statement PDFs (KBank, Bangkok Bank). The system reads every row, balance-checks each one, and asks the user to confirm. It then shows where the salary went, how to split it (spend / emergency / invest), a growth projection, a tax estimate, and loan readiness. Success means a first jobber uploads every month and can say where their money goes.

## Positioning
A verified history built from original bank statements. Every row is balance-checked (previous balance ± amount = balance), and a monthly streak ("🔥 4/6 months → ready to apply for a loan") produces a real loan-ready record. Expense trackers only record the past, and their streaks are cosmetic.

## Operating Context
- Monthly ritual: 2–3 days after payday, upload the statement and the streak goes +1. On first use, backfill 3–6 months at once.
- Banks only let you request statements back a limited time, so "missing month" and "expiring soon" notices matter.
- PDFs are password-locked with the birth date or national ID. Storing these is optional and they are encrypted.

## Capabilities and Constraints
- Import → review → confirm. Only failing rows are editable (amount, direction, date), and a fix must reconcile the balance. Amounts and dates are locked after confirm.
- Category and note can be edited freely, with an append-only edit history. Manual rows are tagged ✋ and excluded from the loan summary. Rows are never deleted, only hidden.
- PDPA: separate consents for planning (required), loan summary, and anonymised improvement.
- Weekly ElevenLabs voice summary (optional; the server may not have a key).
- Money is integer satang, shown as ฿ with thousands separators. The tax figure is an estimate, not tax advice.

## Brand Commitments
- Name: **FirstJobJab**.
- UI language: Thai, with English where it reads naturally.
- Pinned by the brief: blue/sky palette, in a "Dime!-like" modern Thai fintech style that mixes glassmorphism (top bar, tab bar, modals, hero balance card) with neumorphism (content cards, inputs, toggles, secondary buttons). Primary actions are solid blue pills. Big, bold money numbers. Friendly emoji accents. The ✅ / ⚠️ / ✋ badges always carry text.
- Voice: plain, friendly Thai, like an older sibling who is good with money *(inferred)*.

## Evidence on Hand
- Mock statements only (3–6 months, no real personal data). There are no testimonials, customers, user counts, partner banks beyond KBank/BBL, or pricing. Do not fabricate any of them.

## Product Principles
1. One obvious next action per screen.
2. Show that the numbers can be trusted: every figure traces back to a balance-checked statement row.
3. Ask for as little typing as possible. Big touch targets (≥44px).
4. Empty states tell the user exactly what to do next.
5. Privacy is explained where data is asked for, not buried.

## Accessibility & Inclusion
WCAG AA: text, numbers, primary buttons, and focus rings at least 4.5:1, including on glass surfaces. Glass needs a solid fallback when blur is unsupported or prefers-reduced-transparency is set. Respect prefers-reduced-motion. Keyboard reachable. Status is never shown by colour alone. Layouts must work from 360px with no horizontal scroll.

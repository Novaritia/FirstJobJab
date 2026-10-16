# Demo Script — FirstJobJab (≈3 min live)

U-Hackathon 2026 · AI track. One presenter drives the browser; another can read the lines.
Web http://localhost:3000 · API :4000 · Login `demo@firstjobjab.app` / `demo1234`.
Mock files: `app/mock-data/` (PDF password `14031999`, normally auto-unlocked).

## Pre-demo checklist (T-10 min)

- [ ] **Servers up**: DB container `app-db-1`, OCR `fjj-ocr` :8765, API :4000 (`cd app/apps/api; node dist/main.js`), web **production** :3000 (`pnpm --filter web start` from `app/`). Not dev mode, because dev compiles each page on first visit (0.7–2 s).
- [ ] **Warm up**: open `/`, `/login`, `/dashboard`, `/upload`, `/plan`, `/tax`, `/assistant` once, then log out.
- [ ] **Demo data reset**: demo user has **only Apr–Aug** imported. Dashboard shows 🔥 **10** and loan-ready **5/6**. In `/upload` → "ประวัติการอัปโหลด" there is **no September import and no pending file**. If there is one, cancel or delete it there.
- [ ] Auto-unlock works: if a PDF asks for a password, run `pnpm --filter api seed` (resets the demo birth date to 1999-03-14).
- [ ] Run `sh backup-db.sh` once the data is right. **Never** run `docker compose down -v` or `prisma migrate reset`.
- [ ] Gemini answers: ask one test question in `/assistant`, then reload the page so the history is clean.
- [ ] Voice: only if an ElevenLabs key is in `app/.env`. Otherwise plan to skip voice (the line is below).
- [ ] File picker opens in `app/mock-data/` (pick one file there beforehand so the dialog remembers the folder). `KBANK_2026-09.pdf` and `BROKEN_KBANK_2026-06.pdf` are easy to find.
- [ ] Browser: one clean window, zoom **110–125%** for the projector, bookmarks bar hidden, notifications off, laptop on power, projector mirrored.
- [ ] **Logged out**, start on the landing page `/`.
- [ ] Backup: screenshots and screen recording open in another window (see "If something breaks").

## Run sheet

| Time | Step | Click path | What judges see |
|---|---|---|---|
| 0:00–0:20 | 1. Hook | Landing `/` (no clicks) | Hero, live-audit animation |
| 0:20–0:35 | 2. Login | Navbar "เข้าสู่ระบบ" → type email/password → submit | Dashboard, 🔥 10 in navbar, loan-ready 5/6 |
| 0:35–1:05 | 3. Upload September | Sidebar "อัปโหลด" (`/upload`) → drop `KBANK_2026-09.pdf` | Auto-unlocked, row strip ticks green, "ยอดคงเหลือตรง N แถว · ไม่ตรง 0" |
| 1:05–1:20 | 4. Confirm | "ยืนยันนำเข้า" → celebration → "ไปหน้าหลัก" | "+1 🔥", 🔥 11 in navbar, loan-ready 6/6 |
| 1:20–1:45 | 5. Broken file | `/upload` → drop `BROKEN_KBANK_2026-06.pdf` | ⚠️ rows; only those are editable; confirm is locked |
| 1:45–2:05 | 6. Dashboard | Sidebar "ภาพรวม" (`/dashboard`) | Where the salary went (donut), 6-month trend, end-of-month forecast |
| 2:05–2:20 | 7. Plan / tax | `/plan` (growth graph + raise slider) → `/tax` "ลองคำนวณเอง (what-if)" | Growth curve, tax saved by extra deduction |
| 2:20–2:40 | 8. Assistant | Sidebar "ผู้ช่วย" (`/assistant`) → type a question | Gemini answer from the user's own numbers |
| 2:40–2:50 | 9. History + security | `/upload` → "ประวัติการอัปโหลด" (+ cancel the broken file) | Pending / imported files, cancel / delete |
| 2:50–3:00 | 10. Close | Back to `/` → scroll to pricing (#pricing) | Free / Plus ฿59 |

## Step by step

### 1. Hook (0:00–0:20) on `/`
> "Every Thai first jobber gets a salary, and by the 25th it's gone. Nobody teaches them where it went, how tax works, or that a bank wants **six straight months of statements** before their first car or condo loan. And banks only let you request statements back a limited time, so the history gets lost. FirstJobJab turns the statements you already have into a plan."

*Optional Thai:* "เงินเดือนออกวันที่ 25 แต่หายไปไหนไม่รู้"

### 2. Login (0:20–0:35)
Click "เข้าสู่ระบบ" → `demo@firstjobjab.app` / `demo1234` → submit. (The production build does not show the "ลองด้วยบัญชี demo" button, so type the credentials.)
> "This is our demo user: five months already uploaded, April to August. See the 🔥 **10** in the corner. Like Duolingo, every update with new data is +1, and it goes out if you don't update for 30 days. And loan-ready is at **5 of 6** months."

Point at the navbar 🔥 badge and the dashboard card "ประวัติต่อเนื่อง อีก 1 เดือนพร้อมยื่นกู้".

### 3. Upload September (0:35–1:05)
Sidebar "อัปโหลด" → drag `app/mock-data/KBANK_2026-09.pdf` onto the drop zone (or click and pick it).
> "September's e-statement from the KBank app. It's password-locked. We unlock it with the birth date she gave at onboarding, which is stored encrypted, and we never store the PDF password. Now the important part: **every row is balance-checked**: previous balance plus or minus the amount must equal the printed balance. Green means proven. The AI doesn't guess your numbers."

Point at the row strip turning green and the header "ยอดคงเหลือตรง … แถว / ไม่ตรง 0 แถว". Optionally open "ดูแถวที่ผ่าน".

### 4. Confirm → streak (1:05–1:20)
Click "ยืนยันนำเข้า" → celebration dialog ("+1 🔥", counter rolls to 11) → "ไปหน้าหลัก".
> "Confirm, and the fire goes up: 11. Navbar updated instantly. And loan-ready is now **6 of 6**: six continuous verified months, which is the proof of income a bank asks for."

*Optional Thai:* "ครบ 6 เดือน พร้อมยื่นกู้"

### 5. Broken statement (1:20–1:45)
Sidebar "อัปโหลด" → drop `BROKEN_KBANK_2026-06.pdf`.
> "What if the PDF is misread, or someone edits a number? Here rows fail the check (⚠️). **Only the failing rows can be edited**, and only to a value that reconciles. The confirm button stays locked: 'แก้อีก N แถวก่อนยืนยัน'. Every edit is logged in an append-only, hash-chained audit log."

Point at a ⚠️ card: "ยอดคงเหลือใน PDF ฿X แต่คำนวณได้ ฿Y". Optionally change the amount and press "ตรวจใหม่" to show it turn ✅ (only if you know the right figure; otherwise just point).
**Do not confirm this file.** June is already imported. We cancel it in step 9.

### 6. Dashboard (1:45–2:05)
Sidebar "ภาพรวม".
> "Now the plan. Where the salary went, by category. Income split, six-month trend, and a forecast of how much will be left at the end of the month. All in plain Thai, not accounting language."

Point at the headline "คาดว่าสิ้นเดือน … จะเหลือ ฿…", the spending donut, and the "สิ่งที่ควรทำ" list.

### 7. Plan + tax what-if (2:05–2:20)
Sidebar "แผนเงิน" (`/plan`): drag the growth slider once, scroll to "ถ้าเงินเดือนขึ้น ภาษีจะเป็นเท่าไหร่", move the raise slider.
Then sidebar "ภาษี" (`/tax`) → card "ลองคำนวณเอง (what-if)".
> "How the money grows if she saves a bit more, how to split the salary from her real spending, and the tax: 'deduct ฿X more, for example ThaiESG, and save ฿Y'. These are estimates, not advice, and we say so on the page."

### 8. Assistant (2:20–2:40)
Sidebar "ผู้ช่วย" → "แชท" tab → type e.g. `เดือนนี้ใช้ไปเท่าไหร่` (or a suggested question) → Enter.
> "And she can just ask. Gemini with tools that only read **her own** data. Only masked aggregates and descriptions go to the model, never ID or account numbers."

- **Voice (only if ElevenLabs key present):** "เสียง" tab → tap the mic → ask the same question aloud → it answers in speech.
- **No key (fallback line):** "There's also a voice mode (ElevenLabs speech-to-text and back) that is wired up; we're showing chat today." Don't click "เสียง" (it shows "ยังไม่ได้ตั้งค่าเสียง ใช้แชทแทนได้").

### 9. Upload history + security (2:40–2:50)
Sidebar "อัปโหลด" → scroll to "ประวัติการอัปโหลด".
> "Everything you uploaded is here. A pending file can be resumed or cancelled. Watch: we cancel the broken one, and nothing is imported. A wrong import can be deleted with its rows, and the fire you earned stays."

Click "ยกเลิก ไม่นำเข้า" on the BROKEN file. (Optionally open "ลบการนำเข้านี้" on September to show the dialog, then **cancel the dialog**. Don't delete.)
Security one-liner:
> "Security: argon2id passwords, AES-256-GCM for ID, birth date and files, PDF passwords never stored, hash-chained audit log, and login history and sessions you can revoke in Settings. PDPA consents are per purpose."

### 10. Close (2:50–3:00)
(Optional: go to `/` and scroll to pricing.)
> "Business model: **Free** keeps two years of history; **Plus** is **฿59 a month or ฿590 a year**: unlimited history, OCR for slips and passbooks, the AI assistant with voice, the growth plan and the loan check. Honest limits: bank layouts are modelled on our mock statements and still need testing on real KBank and BBL files; tax and loan figures are estimates; no payment integration yet. FirstJobJab: your statements, turned into a plan. Thank you."

*Optional Thai:* "เปลี่ยน statement ให้เป็นแผนการเงิน"

## If something breaks

| Problem | Do this | Say |
|---|---|---|
| PDF asks for a password | Type `14031999` → "ปลดล็อกและอ่าน". Afterwards `pnpm --filter api seed` | "If we can't auto-unlock, we ask once and discard it." |
| "ไฟล์นี้นำเข้าไปแล้ว" on September | Reset was missed. Skip to the dashboard; loan-ready already shows 6/6 | "It even refuses duplicates." |
| Upload hangs / API down | Restart only the process on :4000 (`cd app/apps/api; node dist/main.js`); meanwhile show screenshots | "Let me show you what you'd see." |
| Gemini slow or erroring | The API falls back (OpenAI, then a Thai rule-based answer). If it's still blank, move on | "It falls back to a rule-based answer if the model is down." |
| Whole stack dead | **Mock mode**: `cd app; $env:NEXT_PUBLIC_MOCK='1'; pnpm --filter web dev` → same login, in-memory API (upload, review, confirm, streak, chat; voice returns 503). Footer shows "โหมดข้อมูลตัวอย่าง (mock)" | "This is our offline mock of the same API." |
| No network / projector issue | Play the pre-recorded screen recording, or step through screenshots: landing, dashboard 🔥10, upload ✅ strip, +1 🔥 dialog, 6/6, ⚠️ rows, dashboard, tax what-if, chat answer, upload history | Narrate the same lines |
| Running over time | Cut step 7 (plan/tax), then step 5's edit | — |

**Before the demo, capture those screenshots now** (while the stack works) and put them in one folder on the desktop.

## After the demo (reset for the next run)
`/upload` → "ประวัติการอัปโหลด" → September import → "ลบการนำเข้านี้" → confirm. The 🔥 is not reduced (by design), so 🔥 will read 11+ next time. Say "🔥 11" in step 2 if so. Make sure loan-ready is back to 5/6.

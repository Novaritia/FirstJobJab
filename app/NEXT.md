# NEXT — งานที่ต้องทำต่อ (ส่งต่อให้ Claude ตัวใหม่)

> เขียนเมื่อ 2026-10-16 12:04 ICT · **ส่ง hackathon 14:00 ICT วันนี้** (hub.team1.network: public repo ✅, demo website, deck link)
> อ่าน `HANDOFF.md` ก่อน (decisions, วิธีรัน, ประวัติ) → แล้วทำตามไฟล์นี้ · ทำงานแบบ ponytail (โค้ดน้อยสุด ตอบสั้น)

## สถานะตอนส่งต่อ
- Push ล่าสุด: `3c3d1ce` (streak ไฟไม่จำกัด + DB volume external + backup-db.sh)
- **ยังไม่ commit** (ทำเสร็จแล้วแต่ยังไม่ build/commit):
  - API: upload log + `DELETE /uploads/:id` (cancel / delete import) + migration `20261016045917_upload_log` + `test/uploads.e2e-spec.ts` — agent บอก build+tests ผ่านแล้ว
  - API: **`GET /uploads/:id`** (reopen review ของไฟล์ pending — ปุ่ม "ดำเนินการต่อ" ใช้) เพิ่มใน `uploads.controller.ts` แล้ว **ยังไม่ build/test**
  - Web: `UploadHistory.tsx` (ประวัติการอัปโหลด + ยกเลิก/ลบ), วันเกิดกรอก ค.ศ. อิสระ (`PiiForm.tsx` + `parseBirthDate` ใน `lib/format.ts`), navbar 🔥 refresh ผ่าน `dataChanged()`; แก้ข้อความ dialog ลบเป็น "ไฟ 🔥 ที่ได้ไปแล้วไม่ถูกหัก"
- Servers ตอนนี้: API :4000 (`cd apps/api && node dist/main.js`), web **production** :3000 (`pnpm --filter web start` จาก `app/`), OCR container `fjj-ocr` :8765, DB container `app-db-1` (DB ที่ใช้: `fjm_demo`)
- Web agent อาจยังมีงาน background ค้าง — เช็ค `git status` ก่อนแก้ไฟล์ web

## ต้องทำ (เรียงตามลำดับ)
> ✅ 12:36 (PC #2): ข้อ 1 ครบ (api 44 unit + 4 e2e, web lint/build, curl flow ผ่าน) + ข้อ 3 ครบ (backup แล้ว; demo มีแค่ KBANK+BBL เม.ย.–ส.ค., 🔥10, 5/6). PC นี้: `.env` สร้างใหม่ (ยังไม่มี GEMINI key), ไม่มี OCR container (ใช้ tesseract)
1. ✅ **ปิดงานที่ค้าง**
   - เพิ่มแถวใน `API.md` ส่วน Uploads: `| GET | /uploads/:id | — | pending only: reopen review, same shape as POST /uploads (404 not_found, 409 already_confirmed) |`
   - `pnpm --filter api build && pnpm --filter api test && pnpm --filter api test:e2e`
   - `pnpm --filter web lint && pnpm --filter web build`
   - restart: kill เฉพาะ process ที่ listen :4000 และ :3000 แล้วรันใหม่ตามคำสั่งด้านบน (อย่า kill node ทั้งหมด)
   - ทดสอบด้วย curl (ส่งภาษาไทยจากไฟล์ UTF-8 — Windows curl ทำ Thai args เพี้ยน): upload `mock-data/KBANK_2026-09.pdf` → `GET /uploads/:id` → cancel → upload ใหม่ → confirm (ได้ `streak.gained:1`) → `DELETE ?withTransactions=1 {confirm:true}`
   - หลังทดสอบ: คืน demo ให้มีแค่ เม.ย.–ส.ค. (เดือน 9 เก็บไว้ upload สด) — ยกเลิก/ลบ upload เดือน 9 ที่สร้างระหว่างทดสอบ
   - commit + push (ห้าม commit `real-samples/`, `backups/`, `.env`, `*.log`, `*.err`)
2. **ไฟล์จริงของผู้ใช้**: ถ้ามีไฟล์ใน `app/real-samples/` (gitignored, ห้ามออกนอกเครื่อง/ห้ามใส่ใน test/mock/docs) → fit parser KBank + generic ให้แถวผ่าน ✅ ทั้งหมด รายงานแค่โครงสร้าง
3. ✅ **ล้าง demo ก่อน demo จริง**: บัญชี "กสิกรไทย unknown" ใน PDF export (มาจากไฟล์เทส) — ตรวจ `accounts` ของ demo user แล้วลบที่ไม่ได้มาจาก preload; `sh backup-db.sh` ก่อนลบ
4. **ทดสอบในเบราว์เซอร์จริง (ยังไม่มีใครคลิกจริง)**: login demo → upload review (⚠️ จาก `BROKEN_KBANK_2026-06.pdf`) → confirm → 🔥 navbar ขึ้นทันที → ประวัติการอัปโหลด ยกเลิก/ลบ → export (ชื่อไฟล์มีช่วงวันที่/เวลา/ครั้งที่) → ผู้ช่วยแชท → onboarding วันเกิด (ลอง 2542 ต้องเตือน ค.ศ.)
5. **ส่ง hackathon** (ก่อน 14:00): demo script (ไฟล์ `../05-pitch/demo-script.md` ยังเป็นของไอเดียเก่า ChatCFO — เขียนใหม่ตาม flow ข้อ 4) · pitch deck — **ผู้ใช้สั่งให้หยุดไว้ก่อน ห้ามทำจนกว่าจะสั่ง** (มี artifact เริ่มไว้ https://claude.ai/artifact/UViuJRTVc1Zp78qcrW3be1 มีแค่ cover)
6. **Docker ให้ใช้ข้อมูลเดียวกับ dev** (ถ้าจะ demo ผ่าน Docker): compose `api` ใช้ DB `fjm` ไม่ใช่ `fjm_demo` และ uploads เป็น volume แยก — เปลี่ยน `DATABASE_URL` เป็น `fjm_demo` + mount `./apps/api/uploads`; ใส่ `OCR_URL=http://ocr:8765` ใน compose; image ใหญ่ ~3.2GB (ลดทีหลังได้)
7. **Deploy server**: ผู้ใช้จะให้ IP ทีหลัง → ตั้ง `PUBLIC_API_URL`, `WEB_ORIGIN`, `POSTGRES_PASSWORD`, `TRUST_PROXY` แล้ว `docker compose --profile full up -d --build`

## ข้อควรระวัง
- **ห้ามรัน `docker compose down -v` / `prisma migrate reset`** — DB เคยหายตอน 11:39 (ไม่รู้ใครรัน) ตอนนี้ volume เป็น external แล้ว แต่ระวังไว้; backup: `sh backup-db.sh`
- Demo login: `demo@firstjobjab.app` / `demo1234`; ถ้า PDF ไม่ปลดล็อกเอง → `pnpm --filter api seed` (รีเซ็ตวันเกิด demo เป็น 1999-03-14)
- LLM = Gemini (key อยู่ใน `.env`) ไม่ใช่ Claude; ElevenLabs key ยังไม่มี (voice ตอบ 503 = ปกติ)
- ไฟ 🔥: +1 ต่อการอัปเดตที่มีข้อมูลใหม่, ไม่มี max, ดับถ้าไม่อัปเดต >30 วัน, ลบการนำเข้าไม่หักไฟ; "ประวัติต่อเนื่อง x/6" แยกเป็นตัวชี้วัดพร้อมกู้
- งานที่ยังไม่ได้ทำ (ไม่ต้องทำก่อนส่ง): 2FA, LINE login, ดึงสลิปจาก gallery (app), crypto/u-topia wallet, U-Bot, payment จริง

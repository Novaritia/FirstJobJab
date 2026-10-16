// Mock Thai transfer slips (PNG) + a scanned (image-only) statement PDF for the OCR demo.
// Layouts imitate KBank / SCB slips from memory only — UNVERIFIED. Run from apps/api: node scripts/make-mock-slips.mjs
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import QRCode from 'qrcode';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, createWriteStream } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MOCK = resolve(here, '../../../mock-data');
const FONTS = resolve(here, '../../../packages/shared/scripts/fonts');
GlobalFonts.registerFromPath(join(FONTS, 'Sarabun-Regular.ttf'), 'Sarabun');
GlobalFonts.registerFromPath(join(FONTS, 'Sarabun-Bold.ttf'), 'SarabunBold');

// EMVCo TLV slip-verify mini QR: 00{00 api id,01 bank code,02 trans ref} 51 TH 91 CRC16
const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
const crc16 = (s) => {
  let c = 0xffff;
  for (const b of Buffer.from(s)) { c ^= b << 8; for (let i = 0; i < 8; i++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff; }
  return c.toString(16).toUpperCase().padStart(4, '0');
};
const miniQr = (bankCode, ref) => { const s = tlv('00', tlv('00', '000001') + tlv('01', bankCode) + tlv('02', ref)) + tlv('51', 'TH') + '9104'; return s + crc16(s); };

const slips = [
  // match KBANK_2026-09 rows
  { file: 'slip_kbank_rent_2026-09-01.png', bank: 'KBANK', date: '1 ก.ย. 69', time: '09:01', from: 'น.ส. สมหญิง ใจดี', fromAcct: 'xxx-x-x4821-x', to: 'นาย สมชาย เช่าดี', toAcct: 'พร้อมเพย์ xxx-xxx-4521', amount: '7,500.00', ref: '016244090105ATF07623' },
  { file: 'slip_kbank_mom_2026-09-28.png', bank: 'KBANK', date: '28 ก.ย. 69', time: '20:12', from: 'น.ส. สมหญิง ใจดี', fromAcct: 'xxx-x-x4821-x', to: 'นาง มาลี ใจดี', toAcct: 'ธ.กสิกรไทย xxx-x-x3390-x', amount: '2,000.00', ref: '016271201246BPM04518' },
  // not in any uploaded statement (paid from an SCB account)
  { file: 'slip_scb_food_2026-09-12.png', bank: 'SCB', date: '12 ก.ย. 2569', time: '14:30', from: 'นางสาว สมหญิง ใจดี', fromAcct: 'xxx-xxx188-8', to: 'ร้านป้าแดง ข้าวแกง', toAcct: 'พร้อมเพย์ xxx-xxx-7720', amount: '350.00', ref: '202609121430SCB00017' },
  { file: 'slip_scb_aircon_2026-09-20.png', bank: 'SCB', date: '20 ก.ย. 2569', time: '16:45', from: 'นางสาว สมหญิง ใจดี', fromAcct: 'xxx-xxx188-8', to: 'นาย วิทยา ช่างแอร์', toAcct: 'ธ.กรุงไทย xxx-x-x5521-x', amount: '1,250.00', ref: '202609201645SCB00342' },
];

mkdirSync(join(MOCK, 'slips'), { recursive: true });
for (const s of slips) {
  const kb = s.bank === 'KBANK';
  const W = 720, H = 1180, cv = createCanvas(W, H), g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  g.fillStyle = kb ? '#00a950' : '#4e2a84'; g.fillRect(0, 0, W, 130);
  g.fillStyle = '#ffffff'; g.font = '40px SarabunBold';
  g.fillText(kb ? 'K+ ธนาคารกสิกรไทย' : 'SCB ธนาคารไทยพาณิชย์', 40, 82);
  const text = (t, y, size = 32, bold = false, color = '#222222', x = 50) => { g.fillStyle = color; g.font = `${size}px ${bold ? 'SarabunBold' : 'Sarabun'}`; g.fillText(t, x, y); };
  text('โอนเงินสำเร็จ', 210, 44, true, kb ? '#00a950' : '#4e2a84');
  text(kb ? `${s.date} ${s.time} น.` : `${s.date} - ${s.time}`, 265, 30, false, '#555555');
  text('จาก', 340, 26, false, '#777777'); text(s.from, 385, 34, true); text(s.fromAcct, 430, 28, false, '#555555');
  text('ไปยัง', 510, 26, false, '#777777'); text(s.to, 555, 34, true); text(s.toAcct, 600, 28, false, '#555555');
  text(`${kb ? 'เลขที่รายการ' : 'รหัสอ้างอิง'}: ${s.ref}`, 690, 28);
  text(`จำนวน: ${s.amount} บาท`, 760, 36, true);
  text('ค่าธรรมเนียม: 0.00 บาท', 815, 28, false, '#555555');
  const qr = await QRCode.toBuffer(miniQr(kb ? '004' : '014', s.ref), { width: 260, margin: 2 });
  const { loadImage } = await import('@napi-rs/canvas');
  g.drawImage(await loadImage(qr), 50, 860, 260, 260);
  text('สแกนตรวจสอบสลิป', 1000, 28, false, '#777777', 340);
  writeFileSync(join(MOCK, 'slips', s.file), cv.toBuffer('image/png'));
  console.log('slip', s.file);
}

// Scanned statement: rasterise KBANK_2026-09 pages to JPEG, wrap in an image-only PDF (no password, no text layer)
const pdfjsDir = dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
const doc = await getDocument({
  data: new Uint8Array(readFileSync(join(MOCK, 'KBANK_2026-09.pdf'))), password: '14031999', verbosity: 0,
  cMapUrl: join(pdfjsDir, 'cmaps') + '/', cMapPacked: true, standardFontDataUrl: join(pdfjsDir, 'standard_fonts') + '/', wasmUrl: join(pdfjsDir, 'wasm') + '/',
}).promise;
const PDFDocument = createRequire(join(FONTS, '../../package.json'))('pdfkit');
const out = new PDFDocument({ autoFirstPage: false });
const done = new Promise((r) => out.pipe(createWriteStream(join(MOCK, 'SCANNED_KBANK_2026-09.pdf'))).on('finish', r));
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: 200 / 72 }); // ~200 dpi like an office scanner
  const cv = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  await page.render({ canvas: cv, viewport: vp }).promise;
  out.addPage({ size: [vp1.width, vp1.height], margin: 0 });
  out.image(cv.toBuffer('image/jpeg', 80), 0, 0, { width: vp1.width, height: vp1.height });
}
out.end();
await done;
console.log('scanned pdf', doc.numPages, 'pages');

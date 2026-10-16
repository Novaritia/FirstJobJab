// Mock TrueMoney-style app history screenshot (PNG): title + signed amount, date below, NO balance.
// Invented layout, not the real app. Run from apps/api: node scripts/make-mock-wallet-shot.mjs
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FONTS = resolve(here, '../../../packages/shared/scripts/fonts');
const OUT = resolve(here, '../../../mock-data/wallet');
GlobalFonts.registerFromPath(join(FONTS, 'Sarabun-Regular.ttf'), 'Sarabun');
GlobalFonts.registerFromPath(join(FONTS, 'Sarabun-Bold.ttf'), 'SarabunBold');

const rows = [
  ['จ่าย 7-Eleven', '-85.00', '16 ก.ย. 69 12:30'],
  ['เติมเงินจาก SCB', '+500.00', '17 ก.ย. 69 09:05'],
  ['ชำระ GRAB', '-129.00', '18 ก.ย. 69 18:42'],
  ['รับเงินจาก น.ส.ปิยะดา', '+250.00', '19 ก.ย. 69 20:15'],
];
const W = 720, H = 220 + rows.length * 130, cv = createCanvas(W, H), g = cv.getContext('2d');
g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
g.fillStyle = '#ff8300'; g.fillRect(0, 0, W, 120);
g.fillStyle = '#ffffff'; g.font = '40px SarabunBold'; g.fillText('TrueMoney ประวัติรายการ', 40, 78);
rows.forEach(([title, amt, date], i) => {
  const y = 200 + i * 130;
  g.fillStyle = '#222222'; g.font = '34px SarabunBold'; g.fillText(title, 40, y);
  g.fillStyle = amt.startsWith('+') ? '#0a8a3a' : '#222222'; g.textAlign = 'right'; g.fillText(amt, W - 40, y); g.textAlign = 'left';
  g.fillStyle = '#777777'; g.font = '28px Sarabun'; g.fillText(date, 40, y + 45);
});
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'truemoney_history_2026-09.png'), cv.toBuffer('image/png'));
console.log('wrote mock-data/wallet/truemoney_history_2026-09.png');

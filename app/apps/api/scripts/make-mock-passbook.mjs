// Mock passbook (สมุดบัญชี) page photos for persona สมหญิง ใจดี: October 2026, continuing from the September e-statements' closing balance.
// Layout imitates a KBank / BBL passbook printer page from memory only — UNVERIFIED. Run from apps/api (after shared build): node scripts/make-mock-passbook.mjs
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import shared from '@fjm/shared';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MOCK = resolve(here, '../../../mock-data');
const FONTS = resolve(here, '../../../packages/shared/scripts/fonts');
GlobalFonts.registerFromPath(join(FONTS, 'Sarabun-Regular.ttf'), 'Sarabun');
GlobalFonts.registerFromPath(join(FONTS, 'Sarabun-Bold.ttf'), 'SarabunBold');

async function closing(file) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(join(MOCK, file))), password: '14031999', verbosity: 0, useSystemFonts: false }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    pages.push(tc.items.filter((i) => 'str' in i).map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5] })));
  }
  return shared.parseStatement(shared.pdfItemsToLines(pages)).closingBalance;
}

// [dd, code, baht, dir]
const books = {
  KBANK: {
    open: await closing('KBANK_2026-09.pdf'), sep: '/', acct: '063-8-14821-7', brand: '#138f2d', tint: '#f1f8f2',
    title: 'ธนาคารกสิกรไทย KASIKORNBANK', branch: 'สาขาเซ็นทรัล ลาดพร้าว', teller: ['K001', 'K017', 'K022'],
    pages: [
      [[1, 'TRF', 7500, 'out'], [2, 'ATM', 500, 'out'], [3, 'TRF', 245, 'out'], [5, 'TRF', 350, 'in'], [6, 'CDM', 1500, 'in'], [8, 'ATM', 1000, 'out']],
      [[10, 'TRF', 399, 'out'], [11, 'ATM', 700, 'out'], [12, 'TRF', 1200, 'out'], [14, 'CDM', 2000, 'in'], [15, 'TRF', 69, 'out']],
    ],
  },
  BBL: {
    open: await closing('BBL_2026-09.pdf'), sep: '-', acct: '172-0-87305-4', brand: '#1e3a8a', tint: '#f0f4fb',
    title: 'ธนาคารกรุงเทพ BANGKOK BANK', branch: 'สาขาสีลม', teller: ['0123', '0088'],
    pages: [[[5, 'ฝาก', 2000, 'in'], [9, 'ถอน', 1000, 'out'], [13, 'TRF', 500, 'out']]],
  },
};

let seed = 20261016;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const money = (s) => (s / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const W = 1600, H = 1100;
const COLS = [['วันที่', 70, 'left'], ['รายการ', 260, 'left'], ['ถอน', 620, 'right'], ['ฝาก', 880, 'right'], ['คงเหลือ', 1180, 'right'], ['ผู้บันทึก', 1260, 'left']];

mkdirSync(join(MOCK, 'passbook'), { recursive: true });
for (const [bank, b] of Object.entries(books)) {
  let bal = b.open;
  for (const [pi, rows] of b.pages.entries()) {
    const noisy = bank === 'KBANK' && pi === 1;
    const cv = createCanvas(W, H), g = cv.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    if (noisy) { g.translate(W / 2, H / 2); g.rotate(-0.022); g.translate(-W / 2, -H / 2); } // phone held slightly crooked
    g.fillStyle = b.tint; g.fillRect(30, 30, W - 60, H - 60);
    // pre-printed header: bank + account (printed on every page here so the demo needs no bank picker)
    g.fillStyle = b.brand; g.fillRect(30, 30, W - 60, 90);
    g.fillStyle = '#ffffff'; g.font = '38px SarabunBold'; g.fillText(b.title, 60, 88);
    g.font = '28px Sarabun'; g.fillText('สมุดบัญชีเงินฝากออมทรัพย์', W - 420, 88);
    g.fillStyle = '#1a2433'; g.font = '30px Sarabun';
    g.fillText(`ชื่อบัญชี นางสาวสมหญิง ใจดี`, 60, 170);
    g.fillText(`เลขที่บัญชี ${b.acct}   ${b.branch}`, 760, 170);
    // column header + ruled lines
    g.fillStyle = b.brand; g.fillRect(30, 200, W - 60, 56);
    g.fillStyle = '#ffffff'; g.font = '28px SarabunBold';
    for (const [t, x, al] of COLS) { g.textAlign = al; g.fillText(t, x, 238); }
    g.strokeStyle = b.brand; g.globalAlpha = 0.25; g.lineWidth = 1;
    for (let y = 316; y < H - 60; y += 60) { g.beginPath(); g.moveTo(30, y); g.lineTo(W - 30, y); g.stroke(); }
    g.globalAlpha = 1;
    // printer text
    const line = (i, cells) => {
      g.fillStyle = '#20232a'; g.font = '32px Sarabun';
      const y = 302 + i * 60;
      for (const [k, v] of Object.entries(cells)) { if (v == null) continue; const [, x, al] = COLS[k]; g.textAlign = al; g.fillText(v, x, y); }
    };
    const dd = (d) => [String(d).padStart(2, '0'), '10', '69'].join(b.sep);
    line(0, { 0: dd(rows[0][0]), 1: 'ยอดยกมา B/F', 4: money(bal) });
    rows.forEach(([d, code, baht, dir], i) => {
      bal += (dir === 'in' ? 1 : -1) * baht * 100;
      line(i + 1, { 0: dd(d), 1: code, [dir === 'in' ? 3 : 2]: money(baht * 100), 4: money(bal), 5: b.teller[i % b.teller.length] });
    });
    if (pi < b.pages.length - 1) line(rows.length + 1, { 1: 'ยอดยกไป C/F', 4: money(bal) });
    g.textAlign = 'left';
    if (noisy) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      const sh = g.createLinearGradient(0, 0, W, 0); // uneven light from a phone photo
      sh.addColorStop(0, 'rgba(0,0,0,0.10)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(40,40,40,0.35)';
      for (let i = 0; i < 2500; i++) g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    const file = `passbook_${bank.toLowerCase()}_2026-10_p${pi + 1}.${noisy ? 'jpg' : 'png'}`;
    writeFileSync(join(MOCK, 'passbook', file), noisy ? cv.toBuffer('image/jpeg', 72) : cv.toBuffer('image/png'));
    console.log(file, 'closing', money(bal));
  }
}

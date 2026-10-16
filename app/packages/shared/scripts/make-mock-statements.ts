// Generates password-protected mock KBank / BBL e-statement PDFs for persona สมหญิง ใจดี.
// Layouts imitate real statements from memory only — real bank formats are UNVERIFIED.
// Run: pnpm --filter @fjm/shared mock   → writes app/mock-data/
import PDFDocument from 'pdfkit';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../../../mock-data');
const FONT = join(here, 'fonts/Sarabun-Regular.ttf');
const FONT_BOLD = join(here, 'fonts/Sarabun-Bold.ttf');

const persona = {
  name: 'สมหญิง ใจดี',
  nameTitled: 'นางสาวสมหญิง ใจดี',
  birthDate: '1999-03-14',
  nationalId: '1103700123458', // fake; check digit valid
  password: '14031999', // DDMMYYYY of birth date (CE)
  employer: 'บจก. ไทยดิจิทัล โซลูชั่น',
  grossSalary: 28_000,
  socialSecurityPerMonth: 750,
  netSalaryDeposit: 27_250, // social security deducted by employer before payout
  accounts: {
    KBANK: { masked: 'xxx-x-x4821-x', type: 'ออมทรัพย์ / Savings', branch: 'สาขาเซ็นทรัล ลาดพร้าว' },
    BBL: { masked: 'xxx-x-x7305-x', type: 'ออมทรัพย์ / Savings', branch: 'สาขาสีลม' },
  },
};

// ---------- deterministic random ----------
let seed = 20260401;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (a: number, b: number) => Math.round(a + rnd() * (b - a));
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const chance = (p: number) => rnd() < p;

type BankId = 'KBANK' | 'BBL';
interface Tx {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  dir: 'in' | 'out';
  amount: number; // satang
  type: string; // KBank transaction type / BBL code
  detail: string;
  channel: string;
  balance?: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const t = (h: number, m: number) => `${pad(h)}:${pad(m)}`;
const B = 100;

const MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
const daysIn = (ym: string) => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();

const kb: Tx[] = [];
const bbl: Tx[] = [];

for (const ym of MONTHS) {
  const nd = daysIn(ym);
  for (let d = 1; d <= nd; d++) {
    const date = `${ym}-${pad(d)}`;
    const day: Tx[] = [];
    if (d === 1) day.push({ date, time: t(9, between(0, 30)), dir: 'out', amount: 7_500 * B, type: 'โอนเงิน', detail: 'PromptPay x4521 ค่าห้อง นายสมชาย เช่าดี', channel: 'K PLUS' });
    if (chance(0.55)) day.push({ date, time: t(7, between(10, 55)), dir: 'out', amount: between(35, 180) * B, type: 'ชำระเงิน', detail: `QR 7-ELEVEN สาขา ${pick(['ลาดพร้าว 71', 'โชคชัย 4', 'BTS หมอชิต'])}`, channel: 'K PLUS' });
    if (chance(0.5)) day.push({ date, time: t(between(11, 13), between(0, 59)), dir: 'out', amount: between(89, 320) * B, type: 'ชำระเงิน', detail: pick(['LINE MAN', 'GRAB FOOD', 'ShopeeFood', 'Robinhood']), channel: 'K PLUS' });
    if (chance(0.22)) day.push({ date, time: t(between(18, 21), between(0, 59)), dir: 'out', amount: between(120, 450) * B, type: 'ชำระเงิน', detail: pick(['LINE MAN', 'GRAB FOOD', 'MK Restaurants', 'Cafe Amazon']), channel: 'K PLUS' });
    if (chance(0.25)) day.push({ date, time: t(8, between(0, 59)), dir: 'out', amount: between(65, 240) * B, type: 'ชำระเงิน', detail: 'GRAB TAXI', channel: 'K PLUS' });
    if (chance(0.12)) day.push({ date, time: t(between(20, 22), between(0, 59)), dir: 'out', amount: between(150, 900) * B, type: 'ชำระเงิน', detail: pick(['SHOPEE', 'LAZADA']), channel: 'K PLUS' });
    if (chance(0.06)) day.push({ date, time: t(19, between(0, 59)), dir: 'in', amount: between(100, 600) * B, type: 'รับโอนเงิน', detail: 'PromptPay x9910 น.ส.ปิยะดา เพื่อนดี', channel: 'K PLUS' });
    if (chance(0.06)) day.push({ date, time: t(19, between(0, 59)), dir: 'out', amount: between(100, 500) * B, type: 'โอนเงิน', detail: 'PromptPay x9910 น.ส.ปิยะดา เพื่อนดี', channel: 'K PLUS' });
    if (d === 10) day.push({ date, time: t(10, 15), dir: 'out', amount: 399 * B, type: 'ชำระเงิน', detail: 'AIS ค่าโทรศัพท์', channel: 'K PLUS' });
    if (d === 15) day.push({ date, time: t(0, 5), dir: 'out', amount: 69 * B, type: 'หักบัญชี', detail: 'SPOTIFY', channel: 'Auto' });
    if (d === 25) day.push({ date, time: t(6, 30), dir: 'in', amount: persona.netSalaryDeposit * B, type: 'รับโอนเงิน', detail: `เงินเดือน ${persona.employer}`, channel: 'Auto' });
    if (d === 28) day.push({ date, time: t(20, 12), dir: 'out', amount: 2_000 * B, type: 'โอนเงิน', detail: 'KBANK x3390 นางมาลี ใจดี (แม่)', channel: 'K PLUS' });
    if (d === 26) {
      // own transfer KBank → BBL savings, lands the same minute
      const tm = t(10, between(0, 50));
      day.push({ date, time: tm, dir: 'out', amount: 5_000 * B, type: 'โอนเงิน', detail: `BBL ${persona.accounts.BBL.masked.slice(-6, -2)} สมหญิง ใจดี`, channel: 'K PLUS' });
      bbl.push({ date, time: tm, dir: 'in', amount: 5_000 * B, type: 'TRF IN', detail: 'รับโอนจาก KBANK x4821', channel: 'Internet/Mobile' });
    }
    kb.push(...day.sort((a, b) => a.time.localeCompare(b.time)));

    if (ym === '2026-08' && d === 12) {
      // BBL → KBank top-up (own transfer the other way)
      bbl.push({ date, time: '13:40', dir: 'out', amount: 3_000 * B, type: 'TRF OUT', detail: 'โอนไป KBANK x4821', channel: 'Bualuang mBanking' });
      kb.push({ date, time: '13:41', dir: 'in', amount: 3_000 * B, type: 'รับโอนเงิน', detail: 'BBL x7305 สมหญิง ใจดี', channel: 'K PLUS' });
      kb.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    }
    if (d === 15 && (ym === '2026-05' || ym === '2026-09')) bbl.push({ date, time: '16:20', dir: 'out', amount: 1_000 * B, type: 'ATM WDL', detail: 'ถอนเงินสด ATM สีลม', channel: 'ATM' });
    if (d === nd && (ym === '2026-06' || ym === '2026-09')) bbl.push({ date, time: '23:59', dir: 'in', amount: between(2_000, 9_000), type: 'INT', detail: 'ดอกเบี้ยเงินฝาก', channel: 'Auto' });
  }
}

const OPENING: Record<BankId, number> = { KBANK: 24_230_50, BBL: 42_100_00 };
for (const [bank, list] of [['KBANK', kb], ['BBL', bbl]] as const) {
  let bal = OPENING[bank];
  for (const x of list) {
    bal += x.dir === 'in' ? x.amount : -x.amount;
    if (bal < 0) throw new Error(`${bank} went negative on ${x.date}`);
    x.balance = bal;
  }
}

// ---------- rendering ----------
const money = (s: number) => (s / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dmy = (iso: string, sep: string, yy = false) => {
  const [y, m, d] = iso.split('-');
  return [d, m, yy ? y.slice(2) : y].join(sep);
};

interface Col { key: string; title: string; x: number; w: number; align?: 'right' }

function render(bank: BankId, ym: string, txs: Tx[], opening: number, file: string, corruptIndex?: number) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 30,
    userPassword: persona.password,
    ownerPassword: 'fjm-mock-owner',
    permissions: { printing: 'highResolution', copying: true },
    pdfVersion: '1.7',
    info: { Title: `${bank} e-Statement ${ym}`, Author: bank === 'KBANK' ? 'KASIKORNBANK' : 'Bangkok Bank', Producer: 'fjm mock generator' },
  });
  doc.registerFont('th', FONT);
  doc.registerFont('thb', FONT_BOLD);
  doc.pipe(createWriteStream(file));

  const start = `${ym}-01`;
  const end = `${ym}-${pad(daysIn(ym))}`;
  const closing = txs.length ? txs[txs.length - 1].balance! : opening;
  const totIn = txs.filter((x) => x.dir === 'in').reduce((a, x) => a + x.amount, 0);
  const totOut = txs.filter((x) => x.dir === 'out').reduce((a, x) => a + x.amount, 0);
  const nIn = txs.filter((x) => x.dir === 'in').length;
  const acct = persona.accounts[bank];
  const isK = bank === 'KBANK';
  const brand = isK ? '#138f2d' : '#1e3a8a';

  const cols: Col[] = isK
    ? [
        { key: 'date', title: 'วันที่\nDate', x: 30, w: 44 },
        { key: 'time', title: 'เวลา\nTime', x: 76, w: 30 },
        { key: 'type', title: 'รายการ\nDescriptions', x: 108, w: 62 },
        { key: 'amount', title: 'ถอนเงิน / ฝากเงิน\nWithdrawal / Deposit', x: 172, w: 72, align: 'right' },
        { key: 'balance', title: 'ยอดคงเหลือ\nOutstanding Balance', x: 248, w: 72, align: 'right' },
        { key: 'channel', title: 'ช่องทาง\nChannel', x: 326, w: 50 },
        { key: 'detail', title: 'รายละเอียด\nDetails', x: 380, w: 185 },
      ]
    : [
        { key: 'date', title: 'วันที่\nDate', x: 30, w: 42 },
        { key: 'time', title: 'เวลา\nTime', x: 74, w: 28 },
        { key: 'desc', title: 'รายการ\nDescription', x: 104, w: 190 },
        { key: 'wd', title: 'ถอน\nWithdrawal', x: 296, w: 62, align: 'right' },
        { key: 'dep', title: 'ฝาก\nDeposit', x: 360, w: 62, align: 'right' },
        { key: 'balance', title: 'คงเหลือ\nBalance', x: 424, w: 66, align: 'right' },
        { key: 'channel', title: 'ช่องทาง\nChannel', x: 494, w: 72 },
      ];

  const cell = (c: Col, text: string, y: number, font = 'th', size = 7.5) =>
    doc.font(font).fontSize(size).fillColor('#111').text(text, c.x, y, { width: c.w, align: c.align ?? 'left', lineBreak: false });

  const ROWS_PER_PAGE = 42;
  const pages = Math.max(1, Math.ceil(txs.length / ROWS_PER_PAGE));

  const header = (page: number) => {
    doc.rect(0, 0, 595, 6).fill(brand);
    doc.font('thb').fontSize(15).fillColor(brand).text(isK ? 'KASIKORNBANK' : 'BANGKOK BANK', 30, 20, { lineBreak: false });
    doc.font('th').fontSize(9).fillColor('#333').text(isK ? 'ธนาคารกสิกรไทย จำกัด (มหาชน)' : 'ธนาคารกรุงเทพ จำกัด (มหาชน)', 30, 40, { lineBreak: false });
    doc.font('thb').fontSize(10).fillColor('#111').text(isK ? 'รายการเดินบัญชีเงินฝาก / STATEMENT OF DEPOSIT ACCOUNT' : 'รายการเคลื่อนไหวบัญชี / Statement of Account', 250, 22, { width: 315, align: 'right', lineBreak: false });
    doc.font('th').fontSize(8).fillColor('#333').text(`Page ${page}/${pages}`, 250, 40, { width: 315, align: 'right', lineBreak: false });

    const info: [string, string][] = [
      ['Account Name:', persona.nameTitled],
      [isK ? 'Account Number:' : 'Account No.:', acct.masked],
      ['Account Type:', acct.type],
      ['Branch:', acct.branch],
    ];
    info.forEach(([k, v], i) => {
      doc.font('th').fontSize(8.5).fillColor('#555').text(k, 30, 62 + i * 13, { lineBreak: false });
      doc.font('th').fillColor('#111').text(v, 110, 62 + i * 13, { lineBreak: false });
    });
    const right: [string, string][] = [
      [isK ? 'Period:' : 'Statement Period:', `${dmy(start, '/')} - ${dmy(end, '/')}`],
      [isK ? 'Opening Balance / ยอดยกมา' : 'Balance Brought Forward', money(opening)],
    ];
    right.forEach(([k, v], i) => {
      doc.font('th').fontSize(8.5).fillColor('#555').text(k, 330, 62 + i * 13, { lineBreak: false });
      doc.font('thb').fillColor('#111').text(v, 420, 62 + i * 13, { width: 145, align: 'right', lineBreak: false });
    });

    doc.rect(30, 118, 535, 22).fill(isK ? '#e8f5ea' : '#e6ecf8');
    for (const c of cols) {
      doc.font('thb').fontSize(6.5).fillColor('#111').text(c.title, c.x, 120, { width: c.w, align: c.align ?? 'left' });
    }
  };

  for (let p = 0; p < pages; p++) {
    if (p > 0) doc.addPage();
    header(p + 1);
    const slice = txs.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE);
    slice.forEach((x, i) => {
      const idx = p * ROWS_PER_PAGE + i;
      const y = 146 + i * 14;
      if (i % 2) doc.rect(30, y - 3, 535, 14).fill('#f6f6f6');
      const shown = idx === corruptIndex ? x.balance! + 100 * B : x.balance!; // deliberate ⚠️ row
      const v: Record<string, string> = isK
        ? { date: dmy(x.date, '-', true), time: x.time, type: x.type, amount: money(x.amount), balance: money(shown), channel: x.channel, detail: x.detail }
        : { date: dmy(x.date, '/', true), time: x.time, desc: `${x.type} ${x.detail}`, wd: x.dir === 'out' ? money(x.amount) : '', dep: x.dir === 'in' ? money(x.amount) : '', balance: money(shown), channel: x.channel };
      for (const c of cols) if (v[c.key]) cell(c, v[c.key], y);
    });

    if (p === pages - 1) {
      let y = 146 + slice.length * 14 + 10;
      doc.moveTo(30, y).lineTo(565, y).strokeColor('#999').stroke();
      y += 8;
      const foot: [string, string][] = isK
        ? [
            [`Total Withdrawal / รวมถอนเงิน ${txs.length - nIn} รายการ`, money(totOut)],
            [`Total Deposit / รวมฝากเงิน ${nIn} รายการ`, money(totIn)],
            ['Closing Balance / ยอดยกไป', money(closing)],
          ]
        : [
            [`Total Debits ${txs.length - nIn} items`, money(totOut)],
            [`Total Credits ${nIn} items`, money(totIn)],
            ['Balance Carried Forward', money(closing)],
          ];
      foot.forEach(([k, v], i) => {
        doc.font('th').fontSize(8.5).fillColor('#111').text(k, 300, y + i * 13, { lineBreak: false });
        doc.font('thb').text(v, 470, y + i * 13, { width: 95, align: 'right', lineBreak: false });
      });
    }
    doc.font('th').fontSize(6.5).fillColor('#777').text(
      'MOCK DATA for First-Jobber Money demo — not a real bank document / เอกสารจำลอง ไม่ใช่เอกสารจากธนาคาร',
      30, 805, { width: 535, align: 'center', lineBreak: false },
    );
  }
  doc.end();
}

mkdirSync(OUT, { recursive: true });
const files: string[] = [];
for (const [bank, list] of [['KBANK', kb], ['BBL', bbl]] as const) {
  let opening = OPENING[bank];
  for (const ym of MONTHS) {
    const txs = list.filter((x) => x.date.startsWith(ym));
    const file = join(OUT, `${bank}_${ym}.pdf`);
    render(bank, ym, txs, opening, file);
    files.push(file);
    if (bank === 'KBANK' && ym === '2026-06') render(bank, ym, txs, opening, join(OUT, `BROKEN_KBANK_${ym}.pdf`), 7);
    opening = txs.length ? txs[txs.length - 1].balance! : opening;
  }
}

writeFileSync(
  join(OUT, 'persona.json'),
  JSON.stringify(
    {
      name: persona.name,
      nameTitled: persona.nameTitled,
      birthDate: persona.birthDate,
      nationalId: persona.nationalId,
      password: persona.password,
      grossSalary: persona.grossSalary,
      socialSecurityPerMonth: persona.socialSecurityPerMonth,
      netSalaryDeposit: persona.netSalaryDeposit,
      employer: persona.employer,
      accounts: persona.accounts,
      months: MONTHS,
      brokenFile: { file: 'BROKEN_KBANK_2026-06.pdf', rowIndex: 7, note: 'printed balance +100.00 on row 8; rows 8 and 9 fail the check' },
    },
    null,
    2,
  ) + '\n',
);
console.log(`wrote ${files.length + 1} PDFs + persona.json to ${OUT}`);

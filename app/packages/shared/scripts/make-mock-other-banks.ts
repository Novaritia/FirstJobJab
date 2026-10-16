// Mock SCB-style and Krungthai-style statements (different column order, date formats, Thai month + BE year)
// to exercise the generic parser. Layouts are invented, NOT real bank formats.
// Run: pnpm --filter @fjm/shared exec tsx scripts/make-mock-other-banks.ts → writes app/mock-data/{SCB,KTB}_2026-09.pdf
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../../../mock-data');
const FONT = join(here, 'fonts/Sarabun-Regular.ttf');
const FONT_BOLD = join(here, 'fonts/Sarabun-Bold.ttf');
const NAME = 'นางสาวสมหญิง ใจดี';
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

let seed = 909;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const between = (a: number, b: number) => Math.round(a + rnd() * (b - a));
const pad = (n: number) => String(n).padStart(2, '0');
const baht = (s: number) => (s / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Tx { d: number; time: string; dir: 'in' | 'out'; amount: number; desc: string; balance: number }
function makeTxs(opening: number, outs: string[], ins: string[]): Tx[] {
  const txs: Tx[] = [];
  let bal = opening;
  for (let d = 1; d <= 30; d++) {
    if (rnd() < 0.55) continue;
    const dir = rnd() < 0.2 ? 'in' : 'out';
    const amount = between(40, dir === 'in' ? 1500 : 600) * 100 + (rnd() < 0.3 ? 50 : 0);
    bal += dir === 'in' ? amount : -amount;
    txs.push({ d, time: `${pad(between(7, 21))}:${pad(between(0, 59))}`, dir, amount, desc: (dir === 'in' ? ins : outs)[between(0, (dir === 'in' ? ins : outs).length - 1)], balance: bal });
  }
  return txs;
}

function doc(file: string) {
  const pdf = new PDFDocument({ size: 'A4', margin: 30, userPassword: '14031999', ownerPassword: 'fjm-mock-owner', pdfVersion: '1.7' });
  pdf.registerFont('th', FONT);
  pdf.registerFont('thb', FONT_BOLD);
  pdf.pipe(createWriteStream(file));
  return pdf;
}
const t = (pdf: PDFKit.PDFDocument, s: string, x: number, y: number, o: { w?: number; right?: boolean; bold?: boolean; size?: number } = {}) =>
  pdf.font(o.bold ? 'thb' : 'th').fontSize(o.size ?? 8.5).fillColor('#111')
    .text(s, x, y, { width: o.w ?? 200, align: o.right ? 'right' : 'left', lineBreak: false });

let scbTxs: Tx[] = [];
// ---- SCB-style: dd/mm/yyyy CE + time, code column, separate withdrawal/deposit columns, details last
{
  const opening = 12_500_00;
  const txs = (scbTxs = makeTxs(opening, ['ร้านอาหาร', '7-11', 'ค่าน้ำมัน', 'TRUEMONEY'], ['รับโอนจาก น.ส.ปิยะดา', 'PromptPay IN']));
  const pdf = doc(join(OUT, 'SCB_2026-09.pdf'));
  pdf.rect(0, 0, 595, 6).fill('#4e2a84');
  t(pdf, 'SCB ธนาคารไทยพาณิชย์ จำกัด (มหาชน)', 30, 20, { bold: true, size: 14, w: 400 });
  t(pdf, 'รายการเคลื่อนไหวบัญชีเงินฝาก / Account Statement', 30, 42, { w: 400 });
  t(pdf, `ชื่อบัญชี / Account Name: ${NAME}`, 30, 62, { w: 400 });
  t(pdf, 'เลขที่บัญชี / Account No.: xxx-x-x1188-x', 30, 75, { w: 400 });
  t(pdf, 'รอบรายการ / Period: 01/09/2026 - 30/09/2026', 30, 88, { w: 400 });
  const cols = [['วันที่ Date', 30], ['เวลา', 85], ['รายการ', 120], ['ช่องทาง', 150], ['ถอน Withdrawal', 200], ['ฝาก Deposit', 280], ['คงเหลือ Balance', 360], ['รายละเอียด Description', 450]] as const;
  for (const [c, x] of cols) t(pdf, c, x, 110, { bold: true, size: 7.5, w: 90 });
  t(pdf, 'ยอดยกมา / Balance Brought Forward', 120, 126, { w: 200 });
  t(pdf, baht(opening), 360, 126, { right: true, w: 70 });
  let y = 140;
  for (const x of txs) {
    t(pdf, `${pad(x.d)}/09/2026`, 30, y);
    t(pdf, x.time, 85, y);
    t(pdf, x.dir === 'in' ? 'X1' : 'X2', 120, y);
    t(pdf, 'ENET', 150, y);
    t(pdf, baht(x.amount), x.dir === 'out' ? 200 : 280, y, { right: true, w: 70 });
    t(pdf, baht(x.balance), 360, y, { right: true, w: 70 });
    t(pdf, x.desc, 450, y, { w: 120 });
    y += 14;
  }
  t(pdf, 'ยอดยกไป / Balance Carried Forward', 120, y + 6);
  t(pdf, baht(txs.at(-1)!.balance), 360, y + 6, { right: true, w: 70 });
  t(pdf, 'MOCK DATA — not a real bank document / เอกสารจำลอง', 30, 800, { size: 6.5, w: 500 });
  pdf.end();
}

// ---- Krungthai-style: "01 ก.ย. 2569" Thai month + BE, no time, description before amounts, opening as a dated row
{
  const opening = 8_250_00;
  const txs = makeTxs(opening, ['ชำระค่าสินค้า', 'โอนเงินออก', 'ถอนเงินสด ATM'], ['รับโอนเงิน', 'ดอกเบี้ย']);
  const pdf = doc(join(OUT, 'KTB_2026-09.pdf'));
  pdf.rect(0, 0, 595, 6).fill('#00a6e6');
  t(pdf, 'ธนาคารกรุงไทย จำกัด (มหาชน) KRUNG THAI BANK', 30, 20, { bold: true, size: 14, w: 450 });
  t(pdf, 'ใบแสดงรายการเคลื่อนไหวทางบัญชี', 30, 42, { w: 400 });
  t(pdf, `ชื่อบัญชี ${NAME}`, 30, 62, { w: 400 });
  t(pdf, 'เลขที่บัญชี xxx-x-x2290-x', 30, 75, { w: 400 });
  t(pdf, 'ระหว่างวันที่ 01 ก.ย. 2569 ถึง 30 ก.ย. 2569', 30, 88, { w: 400 });
  const cols = [['วันที่', 30], ['รายการ', 100], ['เลขที่เช็ค', 210], ['ถอน', 250], ['ฝาก', 330], ['คงเหลือ', 410], ['สาขา/ช่องทาง', 500]] as const;
  for (const [c, x] of cols) t(pdf, c, x, 110, { bold: true, size: 7.5, w: 90 });
  t(pdf, `01 ${TH_MON[8]} 2569`, 30, 126);
  t(pdf, 'ยอดยกมา', 100, 126);
  t(pdf, baht(opening), 410, 126, { right: true, w: 70 });
  let y = 140;
  for (const x of txs) {
    t(pdf, `${pad(x.d)} ${TH_MON[8]} 2569`, 30, y);
    t(pdf, x.desc, 100, y, { w: 105 });
    t(pdf, baht(x.amount), x.dir === 'out' ? 250 : 330, y, { right: true, w: 70 });
    t(pdf, baht(x.balance), 410, y, { right: true, w: 70 });
    t(pdf, 'KTB NEXT', 500, y, { w: 70 });
    y += 14;
  }
  const sum = (dir: 'in' | 'out') => txs.filter((x) => x.dir === dir).reduce((a, x) => a + x.amount, 0);
  t(pdf, `รวมถอน ${baht(sum('out'))}   รวมฝาก ${baht(sum('in'))}`, 100, y + 6, { w: 400 });
  t(pdf, 'MOCK DATA — not a real bank document / เอกสารจำลอง', 30, 800, { size: 6.5, w: 500 });
  pdf.end();
}
// ---- TrueMoney-style wallet history: one amount per row (+/-), NO running balance; opening/closing + totals printed.
// Top-ups mirror the SCB "TRUEMONEY" rows (same date/time/amount) so own-transfer detection can pair them.
{
  const opening = 300_00;
  const tops = scbTxs.filter((x) => x.desc === 'TRUEMONEY').map((x) => ({ ...x, dir: 'in' as const, desc: 'เติมเงินจาก SCB' }));
  const spends = ['จ่าย 7-Eleven', 'ชำระ GRAB', 'จ่ายบิล AIS', 'ซื้อสินค้า Lazada'].map((desc, k) => ({
    d: 3 + k * 6, time: `${pad(12 + k)}:${pad(10 + k * 7)}`, dir: 'out' as const, amount: [85_00, 129_00, 199_00, 59_50][k], desc, balance: 0,
  }));
  const rows = [...tops, ...spends].sort((a, b) => a.d - b.d || a.time.localeCompare(b.time));
  const tin = tops.reduce((a, x) => a + x.amount, 0), tout = spends.reduce((a, x) => a + x.amount, 0);
  const pdf = doc(join(OUT, 'TRUEMONEY_2026-09.pdf'));
  pdf.rect(0, 0, 595, 6).fill('#ff8300');
  t(pdf, 'TrueMoney Wallet ทรูมันนี่ วอลเล็ท', 30, 20, { bold: true, size: 14, w: 450 });
  t(pdf, 'ประวัติการทำรายการ / Transaction History', 30, 42, { w: 400 });
  t(pdf, `ชื่อ: ${NAME}`, 30, 62, { w: 400 });
  t(pdf, 'หมายเลขวอลเล็ท: xxx-xxx-4521', 30, 75, { w: 400 });
  t(pdf, 'ช่วงวันที่ 01/09/2026 - 30/09/2026', 30, 88, { w: 400 });
  t(pdf, 'ยอดเงินต้นงวด', 30, 106); t(pdf, baht(opening), 430, 106, { right: true, w: 100 });
  for (const [c, x] of [['วันที่', 30], ['เวลา', 100], ['รายการ', 150], ['จำนวนเงิน (บาท)', 430]] as const) t(pdf, c, x, 124, { bold: true, size: 7.5, w: 100 });
  let y = 140;
  for (const x of rows) {
    t(pdf, `${pad(x.d)}/09/2026`, 30, y);
    t(pdf, x.time, 100, y);
    t(pdf, x.desc, 150, y, { w: 250 });
    t(pdf, `${x.dir === 'in' ? '+' : '-'}${baht(x.amount)}`, 430, y, { right: true, w: 100 });
    y += 14;
  }
  t(pdf, 'รวมเงินเข้า', 30, y + 6); t(pdf, baht(tin), 430, y + 6, { right: true, w: 100 });
  t(pdf, 'รวมเงินออก', 30, y + 20); t(pdf, baht(tout), 430, y + 20, { right: true, w: 100 });
  t(pdf, 'ยอดเงินปลายงวด', 30, y + 34); t(pdf, baht(opening + tin - tout), 430, y + 34, { right: true, w: 100 });
  t(pdf, 'MOCK DATA — not a real TrueMoney document / เอกสารจำลอง', 30, 800, { size: 6.5, w: 500 });
  pdf.end();
}
console.log('wrote SCB_2026-09.pdf, KTB_2026-09.pdf, TRUEMONEY_2026-09.pdf');

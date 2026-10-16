// Accountant-facing exports: CSV statement + formal A4 PDFs (Sarabun embedded). Pure builders, no DB.
import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Category, TaxResult } from '@fjm/shared';
import { CATEGORY_TH } from './stats.service.js';

export interface ExportRow {
  date: string; time: string | null; bank: string; accountNoMasked: string; description: string; category: string;
  direction: string; amount: number; balance: number | null; source: string; channel: string | null; note: string | null; verified: boolean;
}

const BANK_TH: Record<string, string> = { KBANK: 'กสิกรไทย', BBL: 'กรุงเทพ', SCB: 'ไทยพาณิชย์', KTB: 'กรุงไทย', BAY: 'กรุงศรีอยุธยา', TTB: 'ทีทีบี', GSB: 'ออมสิน', CASH: 'เงินสด' };
const SOURCE_TH: Record<string, string> = { statement: 'รายการเดินบัญชี', slip: 'สลิปโอนเงิน', manual: 'บันทึกเอง', passbook: 'สมุดบัญชี' };

export const accountLabel = (r: Pick<ExportRow, 'bank' | 'accountNoMasked'>) => r.bank === 'CASH' ? 'เงินสด' : `${BANK_TH[r.bank] ?? r.bank} ${r.accountNoMasked}`;
export const sourceLabel = (r: Pick<ExportRow, 'source' | 'channel'>) => SOURCE_TH[r.source === 'statement' && r.channel === 'Passbook' ? 'passbook' : r.source] ?? r.source;
const catLabel = (c: string) => CATEGORY_TH[c as Category] ?? c;
/** plain number, 2 dp, no separators → sums in Excel */
const num = (satang: number) => (satang / 100).toFixed(2);
/** 1,234.56 for PDFs */
export const money = (satang: number) => (satang / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** 2026-04-01 → 01/04/2569 (Thai documents use พ.ศ.) */
export const thDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${Number(iso.slice(0, 4)) + 543}`;

/** Escape for CSV and neutralise spreadsheet formula injection. */
export const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_HEAD = ['วันที่', 'เวลา', 'บัญชี', 'รายการ', 'หมวดหมู่', 'ประเภท', 'รายรับ', 'รายจ่าย', 'ยอดคงเหลือ', 'แหล่งที่มา', 'หมายเหตุ'];

/** UTF-8 BOM + CRLF, rectangular (no summary rows). Dates ISO YYYY-MM-DD: Excel/accounting software parse them as real dates and they sort correctly. */
export function buildCsv(rows: ExportRow[]): string {
  const lines = rows.map((t) => {
    const inc = t.direction === 'in';
    return [
      t.date, t.time, accountLabel(t), t.description, catLabel(t.category), inc ? 'รายรับ' : 'รายจ่าย',
      inc ? num(t.amount) : '', inc ? '' : num(t.amount), t.balance === null ? '' : num(t.balance), sourceLabel(t), t.note,
    ].map(csvCell).join(',');
  });
  return '﻿' + [CSV_HEAD.join(','), ...lines].join('\r\n') + '\r\n';
}

export function totals(rows: ExportRow[]) {
  let income = 0, expense = 0;
  const byCat = new Map<string, number>();
  for (const r of rows) {
    if (r.direction === 'in') income += r.amount;
    else { expense += r.amount; byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.amount); }
  }
  return { income, expense, net: income - expense, byCategory: [...byCat].sort((a, b) => b[1] - a[1]) };
}

// ---------- PDF ----------
const here = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = ['../../../packages/shared/scripts/fonts', '../../../../packages/shared/scripts/fonts'].map((p) => resolve(here, p)).find((p) => existsSync(p))
  ?? resolve(here, '../../../packages/shared/scripts/fonts');
const W = 595.28, H = 841.89, L = 40, R = W - 40, CW = R - L, BOTTOM = H - 56;
const INK = '#111111', GREY = '#666666', RULE = '#bbbbbb', BLUE = '#1d4ed8';

type Doc = PDFKit.PDFDocument;
function newDoc(title: string): Doc {
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true, info: { Title: title, Author: 'FirstJobJab', Producer: 'FirstJobJab' } });
  doc.registerFont('th', resolve(FONT_DIR, 'Sarabun-Regular.ttf'));
  doc.registerFont('thb', resolve(FONT_DIR, 'Sarabun-Bold.ttf'));
  return doc;
}
const toBuffer = (doc: Doc) => new Promise<Buffer>((ok, fail) => {
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c)).on('end', () => ok(Buffer.concat(chunks))).on('error', fail);
  doc.end();
});
/** Shrink to width with an ellipsis (single line, no wrap). */
const fit = (doc: Doc, s: string, w: number) => {
  if (doc.widthOfString(s) <= w) return s;
  let t = s;
  while (t.length > 1 && doc.widthOfString(t + '…') > w) t = t.slice(0, -1);
  return t + '…';
};
const txt = (doc: Doc, s: string, x: number, y: number, o: { w?: number; size?: number; bold?: boolean; color?: string; align?: 'left' | 'right' | 'center' } = {}) => {
  doc.font(o.bold ? 'thb' : 'th').fontSize(o.size ?? 9).fillColor(o.color ?? INK);
  const w = o.w ?? CW;
  doc.text(fit(doc, s, w), x, y, { width: w, align: o.align ?? 'left', lineBreak: false });
};
const hline = (doc: Doc, y: number, color = RULE, width = 0.5, x1 = L, x2 = R) => doc.moveTo(x1, y).lineTo(x2, y).lineWidth(width).strokeColor(color).stroke();

function header(doc: Doc, title: string, lines: [string, string][]) {
  txt(doc, 'FirstJobJab', L, 34, { size: 8, color: GREY });
  txt(doc, title, L, 46, { size: 16, bold: true });
  hline(doc, 72, BLUE, 0.8);
  lines.forEach(([k, v], i) => { txt(doc, k, L, 80 + i * 14, { w: 110, color: GREY }); txt(doc, v, L + 110, 80 + i * 14, { w: CW - 110 }); });
  return 80 + lines.length * 14 + 10;
}
function footers(doc: Doc, note: string) {
  const { count } = doc.bufferedPageRange();
  for (let i = 0; i < count; i++) {
    doc.switchToPage(i);
    hline(doc, H - 44);
    txt(doc, note, L, H - 38, { size: 7.5, color: GREY, w: CW - 70 });
    txt(doc, `หน้า ${i + 1}/${count}`, R - 70, H - 38, { size: 7.5, color: GREY, w: 70, align: 'right' });
  }
}

interface Col { title: string; w: number; align?: 'right' }
/** Table with header repeated on each page; returns y after the last row. */
function table(doc: Doc, y: number, cols: Col[], rows: { cells: string[]; bold?: boolean; rule?: boolean }[], contHeader: () => number) {
  const head = (y0: number) => {
    let x = L;
    for (const c of cols) { txt(doc, c.title, x + 2, y0 + 3, { w: c.w - 4, bold: true, size: 8.5, align: c.align }); x += c.w; }
    hline(doc, y0, INK, 0.6); hline(doc, y0 + 17, INK, 0.6);
    return y0 + 20;
  };
  y = head(y);
  for (const r of rows) {
    if (y + 14 > BOTTOM) { doc.addPage(); y = head(contHeader()); }
    if (r.rule) { hline(doc, y - 1, INK, 0.6); y += 1; }
    let x = L;
    r.cells.forEach((s, i) => { txt(doc, s, x + 2, y, { w: cols[i].w - 4, size: 8.5, bold: r.bold, align: cols[i].align }); x += cols[i].w; });
    y += 14;
  }
  return y + 4;
}
const kv = (doc: Doc, y: number, items: [string, string, boolean?][], w = 260) => {
  for (const [k, v, b] of items) {
    txt(doc, k, L, y, { w: w - 120, bold: b }); txt(doc, v, L + w - 120, y, { w: 120, align: 'right', bold: b });
    y += 15;
  }
  return y;
};

export interface StatementMeta { holder: string; from: string; to: string; generatedAt: string; accounts: string[] }

export async function statementPdf(rows: ExportRow[], m: StatementMeta): Promise<Buffer> {
  const title = 'รายงานสรุปรายรับ–รายจ่าย';
  const doc = newDoc(title);
  const period = `${thDate(m.from)} ถึง ${thDate(m.to)}`;
  let y = header(doc, title, [
    ['ชื่อเจ้าของบัญชี', m.holder],
    ['ช่วงเวลา', period],
    ['บัญชี', m.accounts.join(', ') || '-'],
    ['จัดทำเมื่อ', m.generatedAt],
  ]);
  const t = totals(rows);
  txt(doc, 'สรุปยอด (บาท)', L, y, { bold: true, size: 11 }); y += 18;
  y = kv(doc, y, [['รวมรายรับ', money(t.income)], ['รวมรายจ่าย', money(t.expense)], ['คงเหลือสุทธิ (รายรับ − รายจ่าย)', money(t.net), true]]);
  y += 8;
  if (t.byCategory.length) {
    txt(doc, 'รายจ่ายแยกตามหมวดหมู่', L, y, { bold: true, size: 11 }); y += 18;
    const cols: Col[] = [{ title: 'หมวดหมู่', w: 200 }, { title: 'จำนวนเงิน (บาท)', w: 110, align: 'right' }, { title: 'สัดส่วน', w: 70, align: 'right' }];
    y = table(doc, y, cols, [
      ...t.byCategory.map(([c, v]) => ({ cells: [catLabel(c), money(v), `${((v / t.expense) * 100).toFixed(1)}%`] })),
      { cells: ['รวม', money(t.expense), '100.0%'], bold: true, rule: true },
    ], () => 40);
    y += 6;
  }
  const cont = () => { txt(doc, `${title} · ${m.holder} · ${period}`, L, 30, { size: 8, color: GREY }); return 48; };
  if (y + 60 > BOTTOM) { doc.addPage(); y = cont(); }
  txt(doc, `รายการเคลื่อนไหว (${rows.length} รายการ)`, L, y, { bold: true, size: 11 }); y += 18;
  const cols: Col[] = [
    { title: 'วันที่', w: 56 }, { title: 'รายการ', w: 175 }, { title: 'หมวดหมู่', w: 74 },
    { title: 'รายรับ', w: 70, align: 'right' }, { title: 'รายจ่าย', w: 70, align: 'right' }, { title: 'คงเหลือ', w: CW - 445, align: 'right' },
  ];
  table(doc, y, cols, [
    ...rows.map((r) => ({ cells: [thDate(r.date), r.description, catLabel(r.category), r.direction === 'in' ? money(r.amount) : '', r.direction === 'in' ? '' : money(r.amount), r.balance === null ? '' : money(r.balance)] })),
    { cells: ['รวม', '', '', money(t.income), money(t.expense), ''], bold: true, rule: true },
  ], cont);
  const checked = rows.filter((r) => r.verified).length;
  footers(doc, `จัดทำจากข้อมูลที่ผู้ใช้อัปโหลด ตรวจยอดคงเหลือแล้ว ${checked}/${rows.length} แถว · ไม่ใช่เอกสารรับรองจากธนาคาร`);
  return toBuffer(doc);
}

export interface TaxPackMeta { holder: string; nationalId: string; year: number; generatedAt: string; monthsSeen: number }
export const formatNationalId = (id: string) => id.replace(/^(\d)(\d{4})(\d{5})(\d{2})(\d)$/, '$1-$2-$3-$4-$5');

/** monthly = YYYY-MM → {salary, other} actually received (satang). */
export async function taxPackPdf(tax: TaxResult & { salaryIncome: number; otherIncome: number; socialSecurity: number }, monthly: Map<string, { salary: number; other: number }>, m: TaxPackMeta): Promise<Buffer> {
  const title = 'สรุปข้อมูลประกอบการยื่นภาษีเงินได้บุคคลธรรมดา';
  const doc = newDoc(title);
  const form = tax.otherIncome > 0 ? 'ภ.ง.ด.90' : 'ภ.ง.ด.91';
  let y = header(doc, title, [
    ['ผู้มีเงินได้', m.holder],
    ['เลขประจำตัวผู้เสียภาษี', formatNationalId(m.nationalId)],
    ['ปีภาษี', `${m.year + 543} (${m.year})`],
    ['แบบที่ใช้ยื่น (ประมาณ)', form],
    ['จัดทำเมื่อ', m.generatedAt],
  ]);
  const B = (s: number) => money(s);
  txt(doc, '1. เงินได้พึงประเมิน (ประมาณการทั้งปี, บาท)', L, y, { bold: true, size: 11 }); y += 18;
  y = kv(doc, y, [
    ['เงินเดือน ค่าจ้าง มาตรา 40(1)', B(tax.salaryIncome)],
    ['เงินได้อื่น มาตรา 40(8) (ประมาณ)', B(tax.otherIncome)],
    ['รวมเงินได้พึงประเมิน', B(tax.grossIncome), true],
  ], 380);
  y += 8;
  txt(doc, '2. ค่าใช้จ่าย ค่าลดหย่อน และภาษี (ประมาณการ, บาท)', L, y, { bold: true, size: 11 }); y += 18;
  y = kv(doc, y, [
    ['หัก ค่าใช้จ่าย (40(1) 50% ไม่เกิน 100,000; 40(8) 60%)', B(tax.expenseDeduction)],
    ['หัก ค่าลดหย่อนส่วนตัว 60,000 + ประกันสังคม', B(tax.allowances)],
    ['   ในจำนวนนี้ เงินสมทบประกันสังคม', B(tax.socialSecurity)],
    ['เงินได้สุทธิ', B(tax.netIncome), true],
    ['ภาษีที่ต้องชำระ (ประมาณ, ก่อนหักภาษี ณ ที่จ่าย)', B(tax.tax), true],
  ], 380);
  y += 8;
  if (tax.brackets.length) {
    txt(doc, 'การคำนวณตามขั้นเงินได้สุทธิ', L, y, { bold: true, size: 10 }); y += 16;
    y = table(doc, y, [{ title: 'ขั้นเงินได้สุทธิ (บาท)', w: 200 }, { title: 'อัตรา', w: 60, align: 'right' }, { title: 'ภาษี (บาท)', w: 120, align: 'right' }],
      tax.brackets.map((b) => ({ cells: [`${money(b.from)} – ${b.to === null ? 'ขึ้นไป' : money(b.to)}`, `${Math.round(b.rate * 100)}%`, money(b.tax)] })), () => 40);
    y += 6;
  }
  txt(doc, `3. เงินได้ที่ได้รับเข้าบัญชีรายเดือน ปี ${m.year + 543} (ตามข้อมูลที่อัปโหลด, บาท)`, L, y, { bold: true, size: 11 }); y += 18;
  const MONTH_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  let ts = 0, to = 0;
  const mrows = MONTH_TH.map((name, i) => {
    const v = monthly.get(`${m.year}-${String(i + 1).padStart(2, '0')}`);
    ts += v?.salary ?? 0; to += v?.other ?? 0;
    return { cells: [`${name} ${m.year + 543}`, v?.salary ? money(v.salary) : '-', v?.other ? money(v.other) : '-'] };
  });
  y = table(doc, y, [{ title: 'เดือน', w: 140 }, { title: 'เงินเดือน (สุทธิเข้าบัญชี)', w: 140, align: 'right' }, { title: 'เงินได้อื่น', w: 120, align: 'right' }],
    [...mrows, { cells: ['รวม', money(ts), money(to)], bold: true, rule: true }], () => 40);
  y += 6;
  const notes = [
    `หมายเหตุ: ตัวเลขเป็นการประมาณการจากรายการเดินบัญชีที่ผู้ใช้อัปโหลด (พบเงินเดือน ${m.monthsSeen} เดือน แล้วคำนวณเป็นทั้งปี)`,
    'เงินเดือนในบัญชีเป็นยอดหลังหักประกันสังคม ระบบปรับกลับเป็นยอดก่อนหักโดยประมาณ ไม่รวมภาษีหัก ณ ที่จ่าย ค่าลดหย่อนอื่น',
    'โปรดใช้หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) จากนายจ้างเป็นหลัก ใช้เอกสารนี้ประกอบการปรึกษาผู้ทำบัญชี หรือการยื่นแบบทาง e-Filing',
  ];
  if (y + notes.length * 13 > BOTTOM) { doc.addPage(); y = 40; }
  for (const n of notes) { txt(doc, n, L, y, { size: 8, color: GREY }); y += 13; }
  footers(doc, 'จัดทำจากข้อมูลที่ผู้ใช้อัปโหลด · เป็นการประมาณการ ไม่ใช่แบบแสดงรายการภาษีหรือเอกสารรับรองจากกรมสรรพากร');
  return toBuffer(doc);
}

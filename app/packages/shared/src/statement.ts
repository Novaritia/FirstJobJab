import type { Bank, Direction, ParsedRow, ParsedStatement } from './contract';
import { checkBalances } from './balance';

/** pdf.js text items per page → text lines (group by y, sort by x). API feeds pdfjs output here. */
export function pdfItemsToLines(pages: { str: string; x: number; y: number }[][]): string[] {
  const out: string[] = [];
  for (const items of pages) {
    const rows: { y: number; items: { str: string; x: number }[] }[] = [];
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      // pdf.js y grows upward; items on the same printed line differ by < ~3pt
      let row = rows.find((r) => Math.abs(r.y - it.y) < 3);
      if (!row) rows.push((row = { y: it.y, items: [] }));
      row.items.push(it);
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      const line = r.items.sort((a, b) => a.x - b.x).map((i) => i.str).join(' ')
        .replace(/ำา|ํา/g, 'ำ') // fonts often extract sara am as nikhahit/am + sara aa
        .replace(/\s+/g, ' ').trim();
      if (line) out.push(line);
    }
  }
  return out;
}

// Most specific first: "กรุงเทพ" also appears in addresses, so BBL needs the full bank name.
const BANK_WORDS: [Bank, RegExp][] = [
  ['KBANK', /KASIKORN|กสิกร|\bKBank\b|K PLUS/i],
  ['SCB', /ไทยพาณิชย์|SIAM COMMERCIAL|\bSCB\b/i],
  ['KTB', /กรุงไทย|KRUNG ?THAI|\bKTB\b/i],
  ['BAY', /กรุงศรี|KRUNGSRI|BANK OF AYUDHYA|\bBAY\b/i],
  ['TTB', /ทหารไทย|ธนชาต|TMBTHANACHART|\bttb\b|\bTMB\b/i],
  ['GSB', /ออมสิน|GOVERNMENT SAVINGS|\bGSB\b/i],
  ['UOB', /ยูโอบี|\bUOB\b/i],
  ['CIMBT', /ซีไอเอ็มบี|\bCIMB\b/i],
  ['KKP', /เกียรตินาคิน|KIATNAKIN|\bKKP\b/i],
  ['LHB', /แลนด์ แอนด์ เฮ้าส์|LAND AND HOUSES|\bLH ?BANK\b/i],
  ['BAAC', /ธ\.ก\.ส|เพื่อการเกษตร|\bBAAC\b/i],
  ['GHB', /อาคารสงเคราะห์|ธอส|GOVERNMENT HOUSING|\bGHB\b/i],
  ['TISCO', /ทิสโก้|\bTISCO\b/i],
  ['ICBCT', /ไอซีบีซี|\bICBC\b/i],
  ['BBL', /BANGKOK BANK|ธนาคารกรุงเทพ|บัวหลวง|BUALUANG/i],
  ['TRUEMONEY', /TRUE ?MONEY|ทรูมันนี่/i],
  ['SHOPEEPAY', /SHOPEE ?PAY|ช้อปปี้เพย์/i],
  ['LINEPAY', /LINE ?PAY|แรบบิท ไลน์ เพย์/i],
  ['PAOTANG', /เป๋าตัง|PAOTANG|เป๋าเงิน/i],
];
/** Earliest bank name wins: the issuer is in the header, other banks appear later in transfer descriptions. */
export const bankFromText = (text: string): Bank =>
  BANK_WORDS.map(([b, re]) => [b, text.search(re)] as const).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1])[0]?.[0] ?? 'OTHER';
/** Bank from the header (first 15 lines); 'OTHER' when unknown — the generic parser still reads it. */
export const detectBank = (lines: string[]): Bank => bankFromText(lines.slice(0, 15).join('\n'));

const MONEY = /-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2}/g;
const toSatang = (s: string) => Math.round(parseFloat(s.replace(/,/g, '')) * 100);

/** dd-mm-yy / dd/mm/yyyy, CE or BE (2-digit yy >= 60 is read as BE 25yy). */
function toIsoDate(d: string, m: string, y: string): string {
  let year = parseInt(y, 10);
  if (y.length === 2) year = year >= 60 ? 2500 + year - 543 : 2000 + year;
  else if (year > 2400) year -= 543;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Transaction type words → direction. Unknown type falls back to balance movement.
const IN_WORDS = /รับโอน|ฝากเงิน|เงินเดือน|ดอกเบี้ย|คืนเงิน|TRF IN|DEPOSIT|\bDEP\b|\bINT\b|SALARY/i;
const OUT_WORDS = /โอนเงิน|ชำระ|ถอน|หักบัญชี|จ่าย|TRF OUT|PAYMENT|\bPMT\b|\bWDL\b|\bATM\b|DEBIT|BILL/i;
const CHANNELS = ['K PLUS', 'Bualuang mBanking', 'Internet/Mobile', 'Counter', 'ATM', 'EDC', 'Auto', 'K-ATM', 'mBanking'];

const LABELS: Partial<Record<Bank, { name: RegExp; acct: RegExp; period: RegExp; open: RegExp; close: RegExp; totIn: RegExp; totOut: RegExp }>> = {
  KBANK: {
    name: /Account Name\s*:?\s*(.+)/i,
    acct: /Account (?:Number|No\.?)\s*:?\s*([xX\d-]+)/i,
    period: /Period\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
    open: /Opening Balance/i,
    close: /Closing Balance/i,
    totIn: /Total Deposit/i,
    totOut: /Total Withdrawal/i,
  },
  BBL: {
    name: /Account Name\s*:?\s*(.+)/i,
    acct: /Account (?:Number|No\.?)\s*:?\s*([xX\d-]+)/i,
    period: /Statement Period\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:-|to)\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
    open: /Balance Brought Forward/i,
    close: /Balance Carried Forward/i,
    totIn: /Total Credits?/i,
    totOut: /Total Debits?/i,
  },
};

const lastMoney = (line: string) => { const m = line.match(MONEY); return m ? toSatang(m[m.length - 1]) : undefined; };

/** Bank-specific layout first, then the layout-free generic parser. Throws Error('unsupported_format') if neither finds rows. */
export function parseStatement(lines: string[]): ParsedStatement {
  const bank = detectBank(lines);
  let specific: ParsedStatement | undefined;
  if (LABELS[bank]) {
    try {
      specific = parseBankLayout(lines, bank);
      if (specific.rows.length && checkBalances(specific).failCount === 0) return specific;
    } catch { /* real layout differs from our mock: fall through */ }
  }
  let generic: ParsedStatement | undefined;
  try { generic = parseGenericStatement(lines, bank); } catch { /* keep specific if any */ }
  // both readable: keep whichever verifies more rows (the user fixes the rest in review)
  const best = [specific, generic].filter((s): s is ParsedStatement => !!s?.rows.length)
    .sort((a, b) => checkBalances(b).okCount - checkBalances(a).okCount)[0];
  if (!best) throw new Error('unsupported_format');
  return best;
}

function parseBankLayout(lines: string[], bank: Bank): ParsedStatement {
  const L = LABELS[bank]!;
  const find = (re: RegExp) => lines.find((l) => re.test(l));

  const nameLine = find(L.name);
  const acctLine = find(L.acct);
  const periodLine = lines.map((l) => l.match(L.period)).find(Boolean);
  const openLine = find(L.open);
  const closeLine = find(L.close);
  if (!acctLine || !periodLine || !openLine || !closeLine) throw new Error('unsupported_format');

  const openingBalance = lastMoney(openLine);
  const closingBalance = lastMoney(closeLine);
  if (openingBalance === undefined || closingBalance === undefined) throw new Error('unsupported_format');
  const totInLine = find(L.totIn);
  const totOutLine = find(L.totOut);

  const rows: ParsedRow[] = [];
  let prev = openingBalance;
  const ROW = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})\s+(?:(\d{1,2}:\d{2})\s+)?(.*)$/;
  for (const line of lines) {
    const m = line.match(ROW);
    if (!m) continue;
    const rest = m[5];
    const money = [...rest.matchAll(MONEY)];
    if (money.length < 2) continue; // not a transaction row
    // first money token = amount, second = balance after; text around them = description/channel
    const [amt, bal] = money;
    const amount = Math.abs(toSatang(amt[0]));
    const balance = toSatang(bal[0]);
    const before = rest.slice(0, amt.index).trim();
    let after = rest.slice(bal.index! + bal[0].length).trim();
    let channel: string | undefined;
    const ch = CHANNELS.find((c) => after.toLowerCase().startsWith(c.toLowerCase()));
    if (ch) { channel = ch; after = after.slice(ch.length).trim(); }
    const description = [before, after].filter(Boolean).join(' ');
    let direction: Direction;
    if (IN_WORDS.test(before)) direction = 'in';
    else if (OUT_WORDS.test(before)) direction = 'out';
    else direction = balance >= prev ? 'in' : 'out';
    rows.push({ date: toIsoDate(m[1], m[2], m[3]), time: m[4], description, channel, amount, direction, balance });
    prev = balance;
  }
  if (rows.length === 0 && openingBalance !== closingBalance) throw new Error('unsupported_format');

  return {
    bank,
    accountNoMasked: acctLine.match(L.acct)![1],
    // two-column headers put right-hand labels on the same line; cut there
    accountName: nameLine ? nameLine.match(L.name)![1].split(/\s+(?:Statement Period|Period|Opening|Balance|Account|Branch)\b/i)[0].trim() : '',
    periodStart: toIsoDate(periodLine[1], periodLine[2], periodLine[3]),
    periodEnd: toIsoDate(periodLine[4], periodLine[5], periodLine[6]),
    openingBalance,
    closingBalance,
    totalIn: totInLine ? lastMoney(totInLine) : undefined,
    totalOut: totOutLine ? lastMoney(totOutLine) : undefined,
    rows,
  };
}

/** Candidate PDF passwords from PII, most likely first. Real bank rules unverified, so we try several. */
export function pdfPasswordCandidates(bank: Bank, pii: { birthDate?: string | null; nationalId?: string | null }): string[] {
  const [y = '', m = '', d = ''] = (pii.birthDate ?? '').split('-');
  const be = y ? String(parseInt(y, 10) + 543) : '';
  const id = (pii.nationalId ?? '').replace(/\D/g, '');
  const birth = y ? [`${d}${m}${y}`, `${d}${m}${be}`, `${y}${m}${d}`, `${be}${m}${d}`, `${d}${m}${y.slice(2)}`, `${d}${m}${be.slice(2)}`] : [];
  const ids = id ? [id.slice(-4), id.slice(-6), id, ...(y ? [id.slice(-4) + d + m] : [])] : [];
  // shortcut: same order for both banks until real e-statement password rules are confirmed
  void bank;
  return [...new Set([...birth, ...ids].filter(Boolean))];
}

// ---------- generic (layout-free) parser for any Thai bank ----------
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_MON_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const EN_MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const thAlt = [...TH_MON_FULL, ...TH_MON.map((m) => m.replace(/\./g, String.raw`\.?`))].join('|'); // full names first (longer)
const DATE_RES: [RegExp, (m: RegExpMatchArray) => string | null][] = [
  [/(?<!\d)(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})(?![\d:])/g, (m) => isoOrNull(m[1], m[2], m[3])],
  [new RegExp(String.raw`(?<!\d)(\d{1,2})\s*(${thAlt}|[ก-ฮ][ก-๎.]{0,10}?)\s*(\d{4}|\d{2})(?!\d)`, 'g'), (m) => {
    const i = thMonth(m[2]);
    return i < 0 ? null : isoOrNull(m[1], String(i + 1), m[3]);
  }],
  [/(?<!\d)(\d{1,2})[\s-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[\s-]*(\d{4}|\d{2})(?!\d)/gi, (m) =>
    isoOrNull(m[1], String(EN_MON.indexOf(m[2].toLowerCase()) + 1), m[3])],
];
// OCR drops dots and invents vowel marks ("ก.ุย." for ก.ย.): compare letters, then consonants only
const thLetters = (s: string) => s.replace(/[.\s]/g, '');
const thConsonants = (s: string) => thLetters(s).replace(/[ั-ฺ็-๎]/g, '');
function thMonth(tok: string): number {
  const full = TH_MON_FULL.indexOf(tok);
  if (full >= 0) return full;
  for (const norm of [thLetters, thConsonants]) {
    const i = TH_MON.findIndex((x) => norm(tok) === norm(x));
    if (i >= 0) return i;
  }
  return -1;
}
function isoOrNull(d: string, m: string, y: string): string | null {
  const iso = toIsoDate(d, m, y);
  const [yy, mm, dd] = iso.split('-').map(Number);
  return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && yy >= 2000 && yy <= 2100 ? iso : null;
}
/** Every date in a line, in order. */
function findDates(s: string): { iso: string; index: number; len: number }[] {
  return DATE_RES.flatMap(([re, f]) => [...s.matchAll(re)].flatMap((m) => {
    const iso = f(m);
    return iso ? [{ iso, index: m.index!, len: m[0].length }] : [];
  })).sort((a, b) => a.index - b.index);
}
const G_OPEN = /ยอดยกมา|ยกมา|ต้นงวด|Opening Balance|Beginning Balance|Brought Forward|Balance Forward|\bB\s?\/\s?F\b/i;
const G_CLOSE = /ยอดยกไป|ยกไป|ปลายงวด|สิ้นงวด|Closing Balance|Ending Balance|Carried Forward|\bC\s?\/\s?F\b/i;
const G_TOTAL = /^(?:รวม|Total)/i;
const MONEY_1 = /\d\.\d{2}(?!\d)/;
const G_TIN = /รวมเงินเข้า|เงินเข้าทั้งหมด|Total (?:In|Received|Credit|Deposit)/i;
const G_TOUT = /รวมเงินออก|เงินออกทั้งหมด|Total (?:Out|Spent|Paid|Debit|Withdrawal)/i;
// wallet wording: top-up / receive / cashback / refund are money in
const W_IN = /เติมเงิน|รับเงิน|รับโอน|เงินเข้า|Top ?-?up|Received|Cash ?back|คืนเงิน|Refund/i;
const G_NAME = /(?:ชื่อบัญชี|Account Name|ชื่อ)(?:\s*\/\s*Account Name)?\s*:?\s*(.+)/i;
const G_LABEL_CUT = /\s+(?:เลขที่บัญชี|บัญชีเลขที่|สาขา|รอบ|ระหว่าง|ประเภท|Statement|Period|Opening|Balance|Account|Branch)/i;

/**
 * Layout-free parser: a row = a line starting with a date that has ≥2 money amounts (last = balance).
 * Amount/direction come from the balance delta, so column order doesn't matter. Misreads surface as failing rows in checkBalances.
 */
export function parseGenericStatement(lines: string[], bank: Bank = detectBank(lines)): ParsedStatement {
  const withBal = scanRows(lines, false);
  const noBal = scanRows(lines, true); // wallet histories: one amount per row, no running balance
  const best = withBal.rows.length >= noBal.rows.length ? withBal : noBal;
  if (!best.rows.length || (best === withBal && best.opening === undefined)) throw new Error('unsupported_format');
  return finishGeneric(lines, bank, best);
}

interface Scan { rows: ParsedRow[]; opening?: number; closing?: number; totalIn?: number; totalOut?: number }
function scanRows(lines: string[], noBal: boolean): Scan {
  const minMoney = noBal ? 1 : 2;
  const consumed = new Set<number>(); // line indexes already merged into a row
  let opening: number | undefined;
  let closing: number | undefined;
  let totalIn: number | undefined;
  let totalOut: number | undefined;
  let prev: number | undefined;
  const rows: ParsedRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const d = findDates(line)[0];
    const dated = d && d.index <= 4; // allow a short running number before the date
    if (G_OPEN.test(line) && !rows.length) {
      const v = lastMoney(line);
      if (v !== undefined) opening = prev = v;
      continue;
    }
    if (G_CLOSE.test(line)) { closing = lastMoney(line) ?? closing; continue; }
    if (G_TIN.test(line) && !dated) { totalIn = lastMoney(line) ?? totalIn; continue; }
    if (G_TOUT.test(line) && !dated) { totalOut = lastMoney(line) ?? totalOut; continue; }
    if (!dated) continue;
    // app screenshots often print "title  -85.00" above the date line: pull the amount from the line before
    const pv = lines[i - 1];
    if (noBal && !MONEY_1.test(line) && pv && MONEY_1.test(pv) && !findDates(pv).length && !G_OPEN.test(pv) && !G_CLOSE.test(pv) && !G_TOTAL.test(pv)
      && !consumed.has(i - 1)) { line += ' ' + pv; consumed.add(i - 1); }
    // a wrapped row: amounts on the next line(s)
    let used = 0;
    while (used < 2 && (line.match(MONEY)?.length ?? 0) < minMoney) {
      const nx = lines[i + used + 1];
      if (!nx || (findDates(nx)[0]?.index ?? 99) <= 4 || G_OPEN.test(nx) || G_CLOSE.test(nx) || G_TOTAL.test(nx)) break;
      line += ' ' + nx;
      used++;
      consumed.add(i + used);
    }
    let rest = line.slice(d.index + d.len);
    const tm = rest.match(/^\s*(\d{1,2}):(\d{2})(?::\d{2})?(?!\d)/);
    if (tm) rest = rest.slice(tm[0].length);
    const money = [...rest.matchAll(MONEY)];
    if (money.length < minMoney) continue;
    if (noBal) {
      const m = money[money.length - 1];
      const before = rest[m.index! - 1];
      const sign: Direction | undefined = m[0].startsWith('-') || before === '-' ? 'out' : before === '+' ? 'in' : undefined;
      const description = rest.replace(MONEY, ' ').replace(/[+฿]|THB|บาท/g, ' ').replace(/\s+/g, ' ').trim();
      const direction: Direction = sign ?? (W_IN.test(description) || IN_WORDS.test(description) ? 'in' : 'out');
      rows.push({ date: d.iso, time: tm ? `${tm[1].padStart(2, '0')}:${tm[2]}` : undefined, description: description || 'รายการ', amount: Math.abs(toSatang(m[0])), direction });
      i += used;
      continue;
    }
    const balance = toSatang(money[money.length - 1][0]);
    const cands = money.slice(0, -1).map((m) => Math.abs(toSatang(m[0])));
    const description = rest.replace(MONEY, ' ').replace(/\s+/g, ' ').trim();
    const word: Direction | undefined = IN_WORDS.test(description) ? 'in' : OUT_WORDS.test(description) ? 'out' : undefined;
    let amount = cands.find((a) => a > 0) ?? 0;
    let direction: Direction = word ?? 'out';
    if (prev !== undefined) {
      const hit = cands.find((a) => a > 0 && (prev! - a === balance || prev! + a === balance));
      if (hit !== undefined) { amount = hit; direction = prev - hit === balance ? 'out' : 'in'; }
      else if (!word) direction = balance >= prev ? 'in' : 'out';
    } else {
      // no opening line: trust a keyword to back out the opening balance; without one row 1 shows ⚠️ for the user
      opening = word ? balance + (word === 'in' ? -amount : amount) : balance;
    }
    rows.push({ date: d.iso, time: tm ? `${tm[1].padStart(2, '0')}:${tm[2]}` : undefined, description: description || 'รายการ', amount, direction, balance });
    prev = balance;
    i += used;
  }
  return { rows, opening, closing, totalIn, totalOut };
}

function finishGeneric(lines: string[], bank: Bank, { rows, opening, closing, totalIn, totalOut }: Scan): ParsedStatement {
  const text = lines.join('\n');
  const periodLine = lines.find((l) => /Period|ระหว่าง|รอบ|ช่วง|ตั้งแต่|ถึง|From/i.test(l) && findDates(l).length >= 2);
  const pd = periodLine ? findDates(periodLine) : [];
  const dates = rows.map((r) => r.date).sort();
  const acctLine = lines.find((l) => /บัญชี|Account|A\/C/i.test(l) && /[xX\d]{3}-?[xX\d]-?[xX\d]{5}-?[xX\d]|(?<!\d)\d{10,12}(?!\d)/.test(l)) ?? '';
  const masked = acctLine.match(/[xX\d]{3}-[xX\d]-[xX\d]{5}-[xX\d]/)?.[0];
  const digits = (masked ?? acctLine.match(/(?<!\d)\d{10,12}(?!\d)/)?.[0] ?? '').replace(/-/g, '');
  // wallets are keyed by phone number: keep only the last 4 digits
  const PHONE = /(?:0\d{2}|x{3})-?(?:\d{3}|x{3})-?(\d{4})(?!\d)/i;
  const phone = lines.find((l) => /วอลเล็ท|Wallet|เบอร์|Phone|Mobile/i.test(l) && PHONE.test(l))?.match(PHONE)?.[1];
  const accountNoMasked = masked && /x/i.test(masked) ? masked.toLowerCase()
    : digits.length >= 10 ? `xxx-x-x${digits.slice(5, 9)}-x` : phone ? `xxx-xxx-${phone}` : 'unknown';
  const nameM = text.match(G_NAME);
  return {
    bank,
    accountNoMasked,
    accountName: nameM ? nameM[1].split(G_LABEL_CUT)[0].trim() : '',
    periodStart: pd[0]?.iso ?? dates[0],
    periodEnd: pd[1]?.iso ?? dates[dates.length - 1],
    openingBalance: opening,
    closingBalance: closing ?? rows[rows.length - 1].balance,
    totalIn,
    totalOut,
    rows,
  };
}

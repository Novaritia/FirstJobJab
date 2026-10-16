import type { Bank, Direction, ParsedRow, ParsedStatement } from './contract';

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

export function detectBank(lines: string[]): Bank | null {
  const head = lines.slice(0, 15).join('\n');
  if (/KASIKORN|กสิกร/i.test(head)) return 'KBANK';
  if (/BANGKOK BANK|ธนาคารกรุงเทพ/i.test(head)) return 'BBL';
  return null;
}

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

const LABELS: Record<Bank, { name: RegExp; acct: RegExp; period: RegExp; open: RegExp; close: RegExp; totIn: RegExp; totOut: RegExp }> = {
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

/** Throws Error('unsupported_format') if it can't parse. */
export function parseStatement(lines: string[]): ParsedStatement {
  const bank = detectBank(lines);
  if (!bank) throw new Error('unsupported_format');
  const L = LABELS[bank];
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

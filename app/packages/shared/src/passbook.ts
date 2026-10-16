import type { Bank, Direction, ParsedRow, ParsedStatement } from './contract';
import { bankFromText, parseGenericStatement } from './statement';

// Passbook (สมุดบัญชี) page photos → OCR lines → rows. Columns: date | code | withdrawal | deposit | balance | teller.
// OCR collapses the empty column, so direction comes from the balance delta, not position.

const THAI_DIGITS = /[๐-๙]/g;
const IN_CODE = /\b(?:DEP|CDM|INT|CR|TRF\s?IN)\b|ฝาก|ดอกเบี้ย|รับโอน/i;
const OUT_CODE = /\b(?:WDL|ATM|ATW|DR|TRF\s?OUT|PMT|BIL|FEE|CHQ)\b|ถอน|ชำระ|ค่าธรรมเนียม/i;
const BF = /ยอดยกมา|ยกมา|\bB\s?\/\s?F\b|\bBF\b|BROUGHT\s?F/i;
const CF = /ยอดยกไป|ยกไป|\bC\s?\/\s?F\b|CARRIED\s?F/i;

/** Fix digit-ish OCR noise: Thai digits, O→0 / l,I,|→1 / ;→, inside numbers, spaces around separators, glued code+amount. */
export function normalizePassbookLine(s: string): string {
  return s
    .replace(THAI_DIGITS, (d) => String(d.charCodeAt(0) - 0x0e50))
    .replace(/[\dOoIl|,.;]+/g, (t) => {
      const f = t.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1').replace(/;/g, ',');
      return /\d/.test(t) || /^\d[\d,.]*[.,]\d{2}$/.test(f) ? f : t;
    })
    .replace(/(\d)\s+([,.])(?=\d)|(\d[,.])\s+(?=\d)/g, (_, a, b, c) => (c ?? a + b))
    .replace(/([A-Za-z฀-๿])(?=\d)|(\d)(?=[A-Za-z฀-๿])/g, '$1$2 ')
    .replace(/\s+/g, ' ').trim();
}

/** Money values (satang) in one whitespace token; [] if it isn't money (teller id, date). */
function moneyIn(tok: string): number[] {
  const t = tok.replace(/[^\d,.]/g, '');
  if (!/\d/.test(t) || !/[,.]/.test(t)) return [];
  if (/^\d{1,3}(?:[,.]\d{3})*[.,]\d{2}$/.test(t)) return [+t.replace(/\D/g, '')]; // "16.381.50" = one value
  const glued = t.match(/\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}/g); // "1,000.0025,430.50" = two cells without a gap
  if (glued && glued.length > 1 && glued.join('') === t) return glued.map((g) => +g.replace(/\D/g, ''));
  if (/[.,]\d{2}$/.test(t) || /,\d{5}$/.test(t)) return [+t.replace(/\D/g, '')]; // comma-as-dot / dot dropped
  return [];
}
const money = (s: string) => s.split(' ').flatMap(moneyIn);

const DATE = /^(?:\d{1,3} )?(\d{1,2}) ?[-/.]? ?(\d{2}) ?[-/.]? ?(\d{4}|\d{2})(?![\d,.])/;
function isoDate(d: string, m: string, y: string): string | null {
  let year = +y;
  if (y.length === 2) year = year >= 60 ? 2500 + year - 543 : 2000 + year;
  else if (year > 2400) year -= 543;
  if (+d < 1 || +d > 31 || +m < 1 || +m > 12 || year < 2000 || year > 2100) return null;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Pages' OCR lines in order. `bank` overrides detection (inner pages have no logo); unknown bank → 'OTHER'.
 *  Unknown layout → generic statement parser. Throws Error('unsupported_format') only if no rows at all. */
export function parsePassbook(lines: string[], bank?: Bank): ParsedStatement {
  const b = bank ?? bankFromText(lines.join('\n'));
  try {
    return parsePassbookLayout(lines, b);
  } catch {
    return parseGenericStatement(lines.map(normalizePassbookLine), b);
  }
}

function parsePassbookLayout(lines: string[], bank: Bank): ParsedStatement {
  const norm = lines.map(normalizePassbookLine).filter(Boolean);

  let opening: number | undefined;
  let prev: number | undefined;
  const rows: ParsedRow[] = [];
  for (const line of norm) {
    if (CF.test(line)) continue; // page-bottom total repeats the last balance
    if (BF.test(line)) {
      const m = money(line);
      if (rows.length === 0 && m.length) opening = prev = m[m.length - 1];
      continue;
    }
    const dm = line.match(DATE);
    const date = dm && isoDate(dm[1], dm[2], dm[3]);
    if (!date) continue;
    const rest = line.slice(dm![0].length).trim();
    const vals = money(rest);
    if (!vals.length) continue;
    const balance = vals[vals.length - 1];
    const amounts = vals.slice(0, -1);
    const code = rest.split(/\s*\d/)[0].trim();
    const word: Direction | undefined = IN_CODE.test(code) ? 'in' : OUT_CODE.test(code) ? 'out' : undefined;

    let amount = amounts[0] ?? 0; // 0 = amount unreadable → row fails the check and the user types it
    let direction: Direction = word ?? 'out';
    if (prev !== undefined) {
      const hit = amounts.find((a) => prev! - a === balance || prev! + a === balance);
      if (hit !== undefined) { amount = hit; direction = prev - hit === balance ? 'out' : 'in'; }
      else if (!word) direction = balance >= prev ? 'in' : 'out';
    } else if (opening === undefined) {
      opening = balance + (direction === 'in' ? -amount : amount); // no B/F row: back out the first row
    }
    rows.push({ date, description: code || 'สมุดบัญชี', channel: 'Passbook', amount, direction, balance });
    prev = balance;
  }
  if (!rows.length || opening === undefined) throw new Error('unsupported_format');

  const joined = lines.join('\n').replace(THAI_DIGITS, (d) => String(d.charCodeAt(0) - 0x0e50)); // raw: the letter/digit split breaks x4821
  const acct = joined.match(/x{3}-x-x\d{4}-x/i)?.[0] ?? joined.match(/(?<!\d)\d{3}-?\d-?\d(\d{4})-?\d(?!\d)/)?.[1];
  // title + up to two words; header labels often share the OCR line
  const name = joined.match(/(?:นางสาว|นาง|นาย|น\.ส\.|MRS?\.?|MS\.?|MISS)\s?[^\s\d:]+(?: [^\s\d:]+)?/i)?.[0].split(/\s(?:เลขที่|Account|สาขา|Branch)/i)[0];
  const dates = rows.map((r) => r.date).sort();
  return {
    bank,
    accountNoMasked: !acct ? 'passbook' : acct.length === 4 ? `xxx-x-x${acct}-x` : acct.toLowerCase(),
    accountName: name?.trim() ?? '',
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
    openingBalance: opening,
    closingBalance: rows[rows.length - 1].balance,
    rows,
  };
}

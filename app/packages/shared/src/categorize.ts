import type { Category, MonthSummary, TxLike } from './contract';

// First match wins; order matters (e.g. salary before generic transfer-in).
const RULES: [Category, RegExp][] = [
  ['salary', /เงินเดือน|salary|payroll|บจก|บริษัท.*จำกัด/i],
  ['rent', /ค่าเช่า|ค่าห้อง|หอพัก|อพาร์ท|apartment|rent|condo|คอนโด/i],
  ['food', /line ?man|grab ?food|foodpanda|robinhood|shopeefood|7-?eleven|เซเว่น|ร้านอาหาร|อาหาร|กาแฟ|cafe|coffee|starbucks|amazon|\bmk\b|kfc|mcdonald|lotus|makro|big ?c\b|\btops\b/i],
  ['transport', /\bgrab\b|bolt|bts|mrt|taxi|แท็กซี่|ปตท|ptt|shell|bangchak|บางจาก|น้ำมัน|ทางด่วน|easy ?pass|m-?flow|รถไฟ/i],
  ['bills', /\bais\b|true ?move|truemoney|dtac|3bb|ค่าโทรศัพท์|ค่าไฟ|ค่าน้ำ|การไฟฟ้า|การประปา|\bmea\b|\bpea\b|internet|อินเทอร์เน็ต/i],
  ['entertainment', /netflix|spotify|youtube|disney|steam|playstation|major|sf ?cinema|โรงหนัง|คอนเสิร์ต|game/i],
  ['shopping', /shopee|lazada|central|uniqlo|tiktok ?shop|ช้อป|ห้าง|ikea|watsons|boots/i],
  ['health', /โรงพยาบาล|hospital|clinic|คลินิก|ร้านยา|pharmacy|ฟิตเนส|fitness/i],
  ['insurance', /ประกัน|insurance|aia|เมืองไทยประกัน|allianz|fwd/i],
  ['savings_invest', /กองทุน|fund|ssf|rmf|thaiesg|หุ้น|stock|settrade|finnomena|ออมทรัพย์|ฝากประจำ/i],
  ['debt', /สินเชื่อ|ผ่อน|loan|บัตรเครดิต|credit card|ktc|ufc|aeon|กยศ/i],
  ['education', /ค่าเทอม|tuition|course|คอร์ส|udemy|หนังสือ|book/i],
  ['family', /แม่|พ่อ|ครอบครัว|น้อง|mom|dad|family/i],
];

/** Rule-based category guess; api may refine with Claude. */
export function guessCategory(description: string, direction: 'in' | 'out'): Category {
  if (direction === 'in') {
    if (RULES[0][1].test(description)) return 'salary';
    return 'other_income';
  }
  for (const [cat, re] of RULES) if (cat !== 'salary' && re.test(description)) return cat;
  return 'other';
}

const minutes = (t: TxLike) => {
  const [h, m] = t.time!.split(':').map(Number);
  return Date.parse(`${t.date}T00:00:00Z`) / 60000 + h * 60 + m;
};

/** Pairs [outId, inId]: same amount leaves one own account and lands in another within 10 minutes. */
export function detectOwnTransfers(txs: TxLike[]): [string, string][] {
  // shortcut: rows without a time are never paired (too many false matches on round amounts)
  const timed = txs.filter((t) => t.time);
  const ins = timed.filter((t) => t.direction === 'in');
  const used = new Set<string>();
  const pairs: [string, string][] = [];
  for (const o of timed.filter((t) => t.direction === 'out')) {
    let best: TxLike | undefined;
    let bestGap = Infinity;
    for (const i of ins) {
      if (used.has(i.id) || i.accountId === o.accountId || i.amount !== o.amount) continue;
      const gap = Math.abs(minutes(i) - minutes(o));
      if (gap <= 10 && gap < bestGap) { best = i; bestGap = gap; }
    }
    if (best) { used.add(best.id); pairs.push([o.id, best.id]); }
  }
  return pairs;
}

/** Per month (YYYY-MM). own_transfer rows are skipped; byCategory = outgoing spend per category. */
export function summarizeMonths(txs: TxLike[]): MonthSummary[] {
  const map = new Map<string, MonthSummary>();
  for (const t of txs) {
    if (t.category === 'own_transfer') continue;
    const month = t.date.slice(0, 7);
    let s = map.get(month);
    if (!s) map.set(month, (s = { month, income: 0, spend: 0, net: 0, byCategory: {} }));
    if (t.direction === 'in') s.income += t.amount;
    else {
      s.spend += t.amount;
      const c = t.category ?? 'other';
      s.byCategory[c] = (s.byCategory[c] ?? 0) + t.amount;
    }
    s.net = s.income - s.spend;
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

import type { Category } from "@fjm/shared";

const nf = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

/** satang (integer) → "฿12,345.00" */
export const baht = (satang: number, digits: 0 | 2 = 2) =>
  `${satang < 0 ? "-" : ""}฿${(digits ? nf : nf0).format(Math.abs(satang) / 100)}`;

/** "12.34" (baht string from an input) → satang, or null if not a number */
export const toSatang = (s: string): number | null => {
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) && s.trim() !== "" ? Math.round(n * 100) : null;
};

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
/** "2026-05" → "พ.ค. 69" */
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${TH_MONTHS[m - 1]} ${String(y + 543).slice(2)}`;
};
/** "2026-05-03" → "3 พ.ค. 69" */
export const dateLabel = (d: string) => `${Number(d.slice(8, 10))} ${monthLabel(d.slice(0, 7))}`;

export const CATEGORY_LABEL: Record<Category, string> = {
  salary: "💼 เงินเดือน",
  other_income: "💰 รายได้อื่น",
  food: "🍜 อาหาร",
  transport: "🚇 เดินทาง",
  shopping: "🛍️ ช้อปปิ้ง",
  bills: "🧾 ค่าบิล",
  rent: "🏠 ค่าเช่า",
  health: "💊 สุขภาพ",
  entertainment: "🎬 บันเทิง",
  education: "📚 การศึกษา",
  family: "👪 ครอบครัว",
  savings_invest: "📈 ออม/ลงทุน",
  insurance: "🛡️ ประกัน",
  debt: "💳 หนี้",
  own_transfer: "🔁 โอนระหว่างบัญชีตัวเอง",
  other: "📦 อื่น ๆ",
};

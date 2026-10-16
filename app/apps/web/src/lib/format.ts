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
  salary: "เงินเดือน",
  other_income: "รายได้อื่น",
  food: "อาหาร",
  transport: "เดินทาง",
  shopping: "ช้อปปิ้ง",
  bills: "ค่าบิล",
  rent: "ค่าเช่า",
  health: "สุขภาพ",
  entertainment: "บันเทิง",
  education: "การศึกษา",
  family: "ครอบครัว",
  savings_invest: "ออม/ลงทุน",
  insurance: "ประกัน",
  debt: "หนี้",
  own_transfer: "โอนระหว่างบัญชีตัวเอง",
  other: "อื่น ๆ",
};

/** Day/month/CE-year as typed → ISO date, or a Thai error. Empty → { iso: "" }. */
export function parseBirthDate(d: string, m: string, y: string, today: Date): { iso: string; error?: string } {
  if (!d && !m && !y) return { iso: "" };
  if (!d || !m || !y) return { iso: "", error: "กรอกวัน เดือน ปี ให้ครบ" };
  const [dn, mn, yn] = [Number(d), Number(m), Number(y)];
  if (yn >= 2400) return { iso: "", error: "กรุณากรอกปี ค.ศ. (เช่น 1999 ไม่ใช่ 2542)" };
  if (y.length !== 4) return { iso: "", error: "ปีต้องเป็นตัวเลข 4 หลัก (ค.ศ.)" };
  if (mn < 1 || mn > 12) return { iso: "", error: "เดือนต้องอยู่ระหว่าง 1–12" };
  const last = new Date(Date.UTC(yn, mn, 0)).getUTCDate();
  if (dn < 1 || dn > last) return { iso: "", error: `เดือนนี้มีแค่ ${last} วัน` };
  const iso = `${y}-${String(mn).padStart(2, "0")}-${String(dn).padStart(2, "0")}`;
  const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (iso > t) return { iso: "", error: "วันเกิดอยู่ในอนาคต ตรวจอีกครั้ง" };
  return { iso };
}

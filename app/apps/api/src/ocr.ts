import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Logger } from '@nestjs/common';
import { createWorker, PSM, type Worker } from 'tesseract.js';
import jsQRModule from 'jsqr';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const log = new Logger('OCR');
const req = createRequire(import.meta.url);
const jsQR = jsQRModule.default; // CJS module: default export sits on .default under nodenext

// Traineddata ships inside node_modules (@tesseract.js-data/*) so OCR works offline in Docker — no CDN fetch.
// tesseract.js wants all langs under one langPath, so copy the two .gz files into a tmp dir once.
function langDir() {
  const dir = join(tmpdir(), 'fjm-tessdata');
  mkdirSync(dir, { recursive: true });
  for (const code of ['tha', 'eng']) {
    copyFileSync(join(dirname(req.resolve(`@tesseract.js-data/${code}/package.json`)), '4.0.0_best_int', `${code}.traineddata.gz`), join(dir, `${code}.traineddata.gz`));
  }
  return dir;
}
let worker: Promise<Worker> | undefined;
// shortcut: one shared worker serialises OCR jobs; use a tesseract.js scheduler if concurrent uploads get slow
const getWorker = () =>
  (worker ??= createWorker(['tha', 'eng'], 1, { langPath: langDir(), cacheMethod: 'none' }).then(async (w) => {
    await w.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN, preserve_interword_spaces: '1' });
    return w;
  }).catch((e: unknown) => { worker = undefined; throw e; }));

/** PaddleOCR PP-OCRv5 Thai sidecar (apps/ocr, docs/ocr.md): far better Thai than tesseract; returns null if unset/down. */
async function paddleOcr(img: Buffer): Promise<{ lines: string[]; confidence: number } | null> {
  if (!process.env.OCR_URL) return null;
  try {
    const fd = new FormData();
    fd.append('file', new Blob([new Uint8Array(img)]), 'img');
    const r = await fetch(`${process.env.OCR_URL}/ocr`, { method: 'POST', body: fd, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`ocr ${r.status}`);
    const j = (await r.json()) as { lines: string[]; boxes: { score: number }[] };
    const confidence = j.boxes.length ? j.boxes.reduce((a, b) => a + b.score, 0) / j.boxes.length : 0;
    return { lines: j.lines.map(cleanThai).filter(Boolean), confidence };
  } catch (e) {
    log.warn(`paddle ocr failed, falling back to tesseract: ${(e as Error).message}`);
    return null;
  }
}

/** OCR text lines of one image (PNG/JPEG) + mean confidence 0..1. Paddle sidecar first, tesseract fallback.
 *  scale > 1 upsamples phone screenshots for tesseract (measured: fixes Thai month abbreviations); Paddle ignores it. */
export async function ocrImage(img: Buffer, scale = 1): Promise<{ lines: string[]; confidence: number }> {
  const p = await paddleOcr(img);
  if (p) return p;
  if (scale !== 1) {
    const im = await loadImage(img);
    if (im.width * scale > 2400) scale = Math.max(1, 2400 / im.width); // big phone photos: upsampling only costs time
    const cv = createCanvas(Math.round(im.width * scale), Math.round(im.height * scale));
    const g = cv.getContext('2d');
    g.filter = 'grayscale(1)';
    g.drawImage(im, 0, 0, cv.width, cv.height);
    img = cv.toBuffer('image/png');
  }
  const { data } = await (await getWorker()).recognize(img);
  return { lines: data.text.split('\n').map(cleanThai).filter(Boolean), confidence: data.confidence / 100 };
}

/** Tesseract writes sara am as nikhahit + sara aa; normalise it and collapse whitespace. */
export const cleanThai = (s: string) => s.replace(/ำา|ํา/g, 'ำ').replace(/\s+/g, ' ').trim();

export async function decodeQr(img: Buffer): Promise<string | null> {
  const im = await loadImage(img);
  const cv = createCanvas(im.width, im.height);
  const g = cv.getContext('2d');
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, im.width, im.height);
  return jsQR(new Uint8ClampedArray(d.data.buffer, d.data.byteOffset, d.data.length), im.width, im.height)?.data ?? null;
}

// ---------- slip fields ----------
export interface SlipFields {
  amount?: number;  // satang
  date?: string;    // YYYY-MM-DD
  time?: string;    // HH:mm
  fromName?: string;
  toName?: string;
  bank?: string;
  ref?: string;
}

const BANK_CODES: Record<string, string> = { '002': 'BBL', '004': 'KBANK', '006': 'KTB', '011': 'TTB', '014': 'SCB', '025': 'BAY', '030': 'GSB', '069': 'KKP', '073': 'LHB' };
const BANK_WORDS: [string, RegExp][] = [
  ['KBANK', /กสิกร|K\s?PLUS|KBank/i], ['SCB', /ไทยพาณิชย์|\bSCB\b/i], ['BBL', /กรุงเทพ|Bangkok Bank|Bualuang/i],
  ['KTB', /กรุงไทย|Krungthai/i], ['BAY', /กรุงศรี|Krungsri/i], ['TTB', /ทหารไทย|\bttb\b/i], ['GSB', /ออมสิน|\bGSB\b/i],
];
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const EN_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
// OCR drops/doubles dots and invents vowel marks ("ก.ุย." for ก.ย.) → compare letters, then consonants only
const letters = (s: string) => s.replace(/[.\s]/g, '').toLowerCase();
const consonants = (s: string) => letters(s).replace(/[ัิ-ฺ็-๎]/g, '');
const monthOf = (m: string) => {
  for (const norm of [letters, consonants]) {
    for (const xs of [TH_MONTHS, TH_MONTHS_FULL, EN_MONTHS]) {
      const i = xs.findIndex((x) => norm(m).startsWith(norm(x)));
      if (i >= 0) return i;
    }
  }
  return -1;
};
const pad = (n: number) => String(n).padStart(2, '0');
/** 2-digit years on Thai slips are BE (69 → 2569 → 2026); 4-digit > 2400 is BE. */
const ceYear = (y: string) => (y.length === 2 ? 2500 + +y - 543 : +y > 2400 ? +y - 543 : +y);
const MONEY = /\d{1,3}(?:,\d{3})+\.\d{2}|\d+\.\d{2}/;
const toSatang = (s: string) => Math.round(parseFloat(s.replace(/,/g, '')) * 100);
const NAME = /^(?:นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.|MR\.?|MRS\.?|MS\.?|MISS|บจก\.?|บริษัท|หจก\.?|ร้าน)\s?\S/i;

export function parseSlipText(raw: string): SlipFields {
  const lines = raw.split('\n').map(cleanThai).filter(Boolean);
  const text = lines.join('\n');
  const f: SlipFields = {};

  const amtLine = lines.find((l) => /จำนวน|amount/i.test(l) && !/ค่าธรรมเนียม|fee/i.test(l) && MONEY.test(l))
    ?? lines.find((l) => /บาท|THB|฿/.test(l) && !/ค่าธรรมเนียม|fee/i.test(l) && MONEY.test(l));
  if (amtLine) f.amount = toSatang(amtLine.match(MONEY)![0]);

  const dm = text.match(/(\d{1,2})\s*([฀-๿][฀-๿.\s]{1,12}?|[A-Za-z]{3,9})\.?\s*(\d{4}|\d{2})(?!\d)/);
  const nm = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4}|\d{2})(?!\d)/);
  if (dm && monthOf(dm[2]) >= 0) f.date = `${ceYear(dm[3])}-${pad(monthOf(dm[2]) + 1)}-${pad(+dm[1])}`;
  else if (nm) f.date = `${ceYear(nm[3])}-${pad(+nm[2])}-${pad(+nm[1])}`;

  const tm = text.match(/(?<!\d)([01]?\d|2[0-3])[:.]([0-5]\d)(?!\d|\.\d{2}\b)/);
  if (tm) f.time = `${pad(+tm[1])}:${tm[2]}`;

  const rm = text.match(/(?:เลขที่รายการ|รหัสอ้างอิง|เลขอ้างอิง|Ref(?:erence)?\.?\s*(?:No\.?|ID)?)\s*[:：]?\s*([A-Z0-9]{8,})/i);
  if (rm) f.ref = rm[1];

  const names = lines.filter((l) => NAME.test(l)).map((l) => l.replace(/\s+/g, ' '));
  [f.fromName, f.toName] = names;
  f.bank = BANK_WORDS.find(([, re]) => re.test(text))?.[0];
  return f;
}

/** Slip-verify mini QR (EMVCo TLV): tag 00 → {00 API id, 01 sending bank code, 02 transaction ref}. Returns null for other QRs. */
export function parseSlipQr(payload: string): { qrRef: string; bank?: string } | null {
  const tlv = (s: string) => {
    const out: Record<string, string> = {};
    for (let i = 0; i + 4 <= s.length; ) {
      const id = s.slice(i, i + 2), len = +s.slice(i + 2, i + 4);
      if (!Number.isInteger(len)) return null;
      out[id] = s.slice(i + 4, i + 4 + len);
      i += 4 + len;
    }
    return out;
  };
  // shortcut: CRC (tag 91) not verified — the ref is only used for de-duplication, never as proof of payment
  const sub = tlv(tlv(payload)?.['00'] ?? '');
  if (!sub?.['02'] || sub['00'] !== '000001') return null;
  return { qrRef: sub['02'], bank: BANK_CODES[sub['01'] ?? ''] };
}

export interface SlipRead extends SlipFields { qrRef?: string; confidence: number }

/** Read one slip image: QR (exact ref) + local OCR (Paddle, else tesseract) + regex. Slip images never leave the server. */
export async function readSlip(img: Buffer): Promise<SlipRead> {
  const [qr, ocr] = await Promise.all([decodeQr(img).catch(() => null), ocrImage(img, 1.5)]);
  const f = parseSlipText(ocr.lines.join('\n'));
  let confidence = ocr.confidence;
  const q = qr ? parseSlipQr(qr) : null;
  if (!f.amount || !f.date) confidence = Math.min(confidence, 0.3);
  if (!f.time) confidence = Math.min(confidence, 0.8);
  return { ...f, bank: f.bank ?? q?.bank, qrRef: q?.qrRef, confidence: Math.round(confidence * 100) / 100 };
}

/** OCR every rendered page; returns text lines in reading order (same shape as pdfItemsToLines output). */
export async function ocrPages(pngs: Buffer[], scale = 1): Promise<string[]> {
  const out: string[] = [];
  for (const p of pngs) out.push(...(await ocrImage(p, scale)).lines);
  // OCR drops/garbles date separators (2809-26, 22.0926); the row parser needs dd-mm-yy
  return out.map((l) => l.replace(/^(\d{2})[-/.]?(\d{2})[-/.]?(\d{2}(?:\d{2})?)(?=\s)/, '$1-$2-$3'));
}

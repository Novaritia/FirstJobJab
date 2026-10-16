import { Injectable, Logger } from '@nestjs/common';
import { CATEGORIES, projectGrowth, type Category } from '@fjm/shared';
import { PrismaService } from './prisma.service.js';
import { StatsService, CATEGORY_TH, baht, todayIct } from './stats.service.js';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };
/** Flat table for the web: Thai header keys, money in baht. */
export type ChatData = Record<string, string | number>[];

const B = (satang: number) => Math.round(satang) / 100;
const CAT = (c: string) => CATEGORY_TH[c as Category] ?? c;
export function toTable(tool: string, r: any): ChatData | undefined {
  switch (tool) {
    case 'search_transactions':
      return r.rows.map((t: any) => ({ วันที่: t.date, รายการ: t.description, หมวด: CAT(t.category), 'รับ/จ่าย': t.direction === 'in' ? 'รับ' : 'จ่าย', 'จำนวน (฿)': B(t.amount) }));
    case 'get_summary':
      return r.months.map((m: any) => ({ เดือน: m.month, 'รายรับ (฿)': B(m.income), 'รายจ่าย (฿)': B(m.spend), 'คงเหลือ (฿)': B(m.net) }));
    case 'get_category_totals':
      return r.totals.map((t: any) => ({ หมวด: CAT(t.category), 'จำนวน (฿)': B(t.amount) }));
    case 'get_tax':
      return r.brackets.map((b: any) => ({ 'เงินได้สุทธิ (฿)': `${B(b.from).toLocaleString('en-US')}–${b.to === null ? '' : B(b.to).toLocaleString('en-US')}`, อัตรา: `${Math.round(b.rate * 100)}%`, 'ภาษี (฿)': B(b.tax) }));
    case 'get_streak':
      return r.recent.map((e: any) => ({ วันที่: new Date(e.at).toISOString().slice(0, 10), ประเภท: e.kind, 'รายการใหม่': e.rows, '🔥': '+1' }));
    case 'get_loan_ready':
      return [{ 'เดือนต่อเนื่อง': r.continuousMonths, 'ต้องการ (เดือน)': r.required, 'รายได้เฉลี่ย (฿)': B(r.avgIncome), 'รายจ่ายเฉลี่ย (฿)': B(r.avgSpend), 'ค่างวดสูงสุด (฿)': B(r.maxInstallment) }];
    case 'get_growth':
      return r.points.map((p: any) => ({ ปีที่: p.month / 12, 'เงินที่ออม (฿)': B(p.contributed), 'มูลค่า (฿)': B(p.value) }));
    default:
      return undefined;
  }
}
type Json = Record<string, unknown>;

/** Mask digit runs ≥min (account/ID/phone); keeps 4-digit years so "ภาษีปี 2026" still works. */
export const maskDigits = (s: string, min = 4) =>
  s.replace(/\d+/g, (m) => (m.length < min || /^(19|20)\d{2}$/.test(m) ? m : 'x'.repeat(m.length)));
/** User-typed text: amounts like "3000" must survive; phone (9–10), account (10), ID (13) are ≥7 digits. */
const maskUser = (s: string) => maskDigits(s, 7);

/** Deep copy for the LLM: strings masked, satang → baht (except non-money counters). */
const NOT_MONEY = new Set(['month', 'year', 'current', 'best', 'continuousMonths', 'required', 'rate', 'count', 'years', 'annualReturn', 'okCount', 'failCount', 'daysLeft', 'updatesThisMonth', 'rows', 'gained']);
export function forLlm(v: unknown, key = ''): unknown {
  if (typeof v === 'string') return maskDigits(v);
  if (typeof v === 'number') return NOT_MONEY.has(key) ? v : Math.round(v) / 100;
  if (Array.isArray(v)) return v.map((x) => forLlm(x, key));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, forLlm(x, k)]));
  return v;
}

export type Intent = 'spend_month' | 'top_category' | 'tax' | 'streak' | 'loan';
export function matchIntent(text: string): Intent | null {
  const t = text.toLowerCase();
  if (/ภาษี|tax/.test(t)) return 'tax';
  if (/กู้|ผ่อน|loan|สินเชื่อ/.test(t)) return 'loan';
  if (/streak|สตรีค|ต่อเนื่อง|ขาดเดือน/.test(t)) return 'streak';
  if (/(อะไร|หมวด).*(มากสุด|มากที่สุด|เยอะสุด|เยอะที่สุด)|top/.test(t)) return 'top_category';
  if (/ใช้(ไป|เงิน)?.*(เท่าไ|เท่าไหร่|เท่าไร)|จ่ายไป|spend/.test(t)) return 'spend_month';
  return null;
}

const SYSTEM = [
  'คุณคือผู้ช่วยของ FirstJobJab ตอบคำถามเกี่ยวกับข้อมูลการเงินของผู้ใช้คนนี้เท่านั้น โดยใช้เครื่องมือที่มีเพื่อดึงข้อมูลจริง',
  'ตอบเป็นภาษาไทยง่ายๆ สุภาพ เป็นกันเอง สั้น กระชับ เงินแสดงเป็น ฿ พร้อมคอมมา ปัดเป็นบาทเต็ม เช่น ฿27,250 (ตัวเลขเงินจากเครื่องมือเป็นหน่วยบาทแล้ว)',
  'ลงท้ายด้วย "ครับ" เสมอ ห้ามใช้ ค่ะ/จ้า/จ๊ะ/น้า ห้ามใช้อีโมจิ ห้ามใช้ markdown (ไม่มี ** หรือ #) เขียนเป็นข้อความธรรมดา ถ้าเป็นรายการให้ขึ้นบรรทัดใหม่นำด้วย "- "',
  'เรียกชื่อหมวดเป็นภาษาไทยเท่านั้น ห้ามใส่ชื่อภาษาอังกฤษในวงเล็บ เช่น "อาหาร" ไม่ใช่ "อาหาร (food)"',
  'คำถามเรื่องตัวเลข รายการ ภาษี streak หรือการกู้ ต้องเรียกเครื่องมือก่อนตอบเสมอ',
  'ถ้าข้อมูลไม่มีหรือไม่พอ ให้บอกตรงๆ และแนะนำให้อัปโหลด statement ห้ามเดาตัวเลข',
  'ไม่ใช่คำแนะนำทางการเงินหรือภาษี ถ้าเป็นเรื่องตัดสินใจสำคัญให้บอกว่าเป็นตัวเลขประมาณการ',
  'ปฏิเสธสุภาพถ้าถูกถามเรื่องที่ไม่เกี่ยวกับข้อมูลการเงินของผู้ใช้',
  `วันนี้คือ ${todayIct()}`,
].join('\n');

const date = { type: 'string', description: 'YYYY-MM-DD' };
const TOOLS: { name: string; description: string; parameters: Json }[] = [
  { name: 'get_summary', description: 'รายรับ/รายจ่ายรายเดือนของ N เดือนล่าสุด; topSpend คือยอดรวมทุกเดือนในช่วงนั้น ถ้าถามหมวดของเดือนเดียวให้ใช้ get_category_totals', parameters: { type: 'object', properties: { months: { type: 'integer' } } } },
  {
    name: 'search_transactions', description: 'ค้นหารายการเดินบัญชี',
    parameters: { type: 'object', properties: { query: { type: 'string' }, from: date, to: date, category: { type: 'string', enum: [...CATEGORIES] }, direction: { type: 'string', enum: ['in', 'out'] }, limit: { type: 'integer' } } },
  },
  { name: 'get_category_totals', description: 'ยอดใช้จ่ายรวมแยกตามหมวดในช่วงวันที่', parameters: { type: 'object', properties: { from: date, to: date }, required: ['from', 'to'] } },
  { name: 'get_tax', description: 'ประมาณการภาษีเงินได้ทั้งปี', parameters: { type: 'object', properties: { year: { type: 'integer' } } } },
  { name: 'get_streak', description: 'ไฟ 🔥 streak: +1 ทุกครั้งที่อัปเดตข้อมูลใหม่ ต้องอัปเดตอย่างน้อยทุก 30 วันไม่งั้นไฟดับ (current, best, daysLeft) และ coverage = เดือนต่อเนื่องที่มี statement สำหรับความพร้อมกู้', parameters: { type: 'object', properties: {} } },
  { name: 'get_loan_ready', description: 'ความพร้อมกู้: เดือนต่อเนื่อง รายได้/รายจ่ายเฉลี่ย ค่างวดสูงสุดที่ผ่อนไหว', parameters: { type: 'object', properties: {} } },
  {
    name: 'get_growth', description: 'จำลองเงินออมโต (monthlySaving เป็นบาท, annualReturn เช่น 0.05)',
    parameters: { type: 'object', properties: { monthlySaving: { type: 'number' }, annualReturn: { type: 'number' }, years: { type: 'integer' } }, required: ['monthlySaving', 'annualReturn', 'years'] },
  },
];

const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
const num = (v: unknown, min: number, max: number, def: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, min), max) : def);

@Injectable()
export class ChatService {
  private log = new Logger('Chat');
  constructor(private prisma: PrismaService, private stats: StatsService) {}

  /** Tools run as the session user only; args come from the LLM so every one is clamped/validated. */
  async runTool(userId: string, name: string, a: Json): Promise<unknown> {
    switch (name) {
      case 'get_summary': {
        const { months, topSpend } = await this.stats.summary(userId, num(a.months, 1, 24, 3), false);
        return { months, topSpend };
      }
      case 'search_transactions': {
        const rows = await this.prisma.transaction.findMany({
          where: {
            userId, hidden: false, date: { gte: isDate(a.from), lte: isDate(a.to) },
            description: typeof a.query === 'string' && a.query ? { contains: a.query.slice(0, 100), mode: 'insensitive' } : undefined,
            category: (CATEGORIES as readonly string[]).includes(a.category as string) ? (a.category as string) : undefined,
            direction: a.direction === 'in' || a.direction === 'out' ? a.direction : undefined,
          },
          orderBy: [{ date: 'desc' }, { time: 'desc' }],
          take: num(a.limit, 1, 50, 20),
          select: { date: true, time: true, description: true, amount: true, direction: true, category: true },
        });
        return { count: rows.length, rows };
      }
      case 'get_category_totals': {
        const from = isDate(a.from), to = isDate(a.to);
        const g = await this.prisma.transaction.groupBy({
          by: ['category'], where: { userId, hidden: false, direction: 'out', category: { not: 'own_transfer' }, date: { gte: from, lte: to } },
          _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } },
        });
        return { from, to, totals: g.map((x) => ({ category: x.category, amount: x._sum.amount ?? 0 })) };
      }
      case 'get_tax': return this.stats.tax(userId, num(a.year, 2000, 2100, Number(todayIct().slice(0, 4))));
      case 'get_streak': return this.stats.streak(userId);
      case 'get_loan_ready': return this.stats.loanReady(userId);
      case 'get_growth': {
        const points = projectGrowth({
          monthlySaving: Math.round(num(a.monthlySaving, 0, 1e8, 0) * 100), annualReturn: num(a.annualReturn, -0.5, 1, 0.03), years: Math.round(num(a.years, 1, 60, 5)),
        });
        return { points: points.filter((p) => p.month % 12 === 0) }; // yearly points keep the prompt small
      }
      default: return { error: 'unknown_tool' };
    }
  }

  async chat(userId: string, messages: ChatMsg[]): Promise<{ reply: string; data?: ChatData; tools: string[] }> {
    const tools: string[] = [];
    let data: ChatData | undefined;
    const call = async (name: string, args: Json) => {
      tools.push(name);
      const result = await this.runTool(userId, name, args ?? {});
      data = toTable(name, result) ?? data;
      return forLlm(JSON.parse(JSON.stringify(result))) as Json; // Dates → ISO strings
    };
    try {
      let reply: string | null = null;
      if (process.env.GEMINI_API_KEY) reply = await this.gemini(messages, call);
      else if (process.env.OPENAI_API_KEY) reply = await this.openai(messages, call);
      if (reply) return { reply, data, tools };
    } catch (e) {
      this.log.warn(`llm failed, using fallback: ${(e as Error).message}`);
    }
    return { ...(await this.fallback(userId, messages.at(-1)?.content ?? '')), tools: [] };
  }

  private async gemini(messages: ChatMsg[], call: (n: string, a: Json) => Promise<Json>) {
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const contents: Json[] = messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: maskUser(m.content) }] }));
    for (let round = 0; round < 5; round++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] }, contents,
          ...(round < 4 ? { tools: [{ functionDeclarations: TOOLS }] } : {}), // max 4 tool rounds, then force an answer
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!r.ok) throw new Error(`gemini ${r.status}`);
      const content = ((await r.json()) as { candidates?: { content?: { parts?: Json[] } }[] }).candidates?.[0]?.content;
      const parts = content?.parts ?? [];
      const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall as { name: string; args?: Json });
      if (!calls.length) return parts.map((p) => (typeof p.text === 'string' ? p.text : '')).join('').trim() || null;
      contents.push({ role: 'model', parts }); // echo as received (keeps thought signatures)
      contents.push({ role: 'user', parts: await Promise.all(calls.map(async (c) => ({ functionResponse: { name: c.name, response: await call(c.name, c.args ?? {}) } }))) });
    }
    return null;
  }

  private async openai(messages: ChatMsg[], call: (n: string, a: Json) => Promise<Json>) {
    const msgs: Json[] = [{ role: 'system', content: SYSTEM }, ...messages.map((m) => ({ role: m.role, content: maskUser(m.content) }))];
    for (let round = 0; round < 5; round++) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: msgs,
          ...(round < 4 ? { tools: TOOLS.map((t) => ({ type: 'function', function: t })) } : {}),
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!r.ok) throw new Error(`openai ${r.status}`);
      const msg = ((await r.json()) as { choices?: { message?: Json & { tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[] }).choices?.[0]?.message;
      if (!msg?.tool_calls?.length) return typeof msg?.content === 'string' ? msg.content.trim() || null : null;
      msgs.push(msg);
      for (const c of msg.tool_calls) {
        let args: Json = {};
        try { args = JSON.parse(c.function.arguments) as Json; } catch { /* bad args → defaults */ }
        msgs.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(await call(c.function.name, args)) });
      }
    }
    return null;
  }

  /** No LLM key (or LLM down): answer common Thai questions from stats. */
  async fallback(userId: string, text: string): Promise<{ reply: string; data?: ChatData }> {
    const intent = matchIntent(text);
    const fb = (tool: string, result: unknown, reply: string) => ({ reply, data: toTable(tool, result) });
    switch (intent) {
      case 'spend_month':
      case 'top_category': {
        const { months, topSpend } = await this.stats.summary(userId, intent === 'spend_month' ? 1 : 3, false);
        const m = months.at(-1);
        if (!m) return { reply: 'ยังไม่มีข้อมูล ลองอัปโหลด statement ก่อนนะ' };
        if (intent === 'spend_month') return fb('get_summary', { months, topSpend }, `เดือน ${m.month} ใช้ไป ฿${baht(m.spend)} รายรับ ฿${baht(m.income)} เหลือ ฿${baht(m.net)}`);
        const t = topSpend[0];
        return fb('get_summary', { months, topSpend }, t ? `${months.length} เดือนล่าสุด ใช้กับ${CATEGORY_TH[t.category as Category]}มากที่สุด รวม ฿${baht(t.amount)}` : 'ยังไม่มีรายจ่ายในช่วงนี้');
      }
      case 'tax': {
        const year = Number(todayIct().slice(0, 4));
        const t = await this.stats.tax(userId, year);
        return fb('get_tax', t, `ประมาณการภาษีปี ${year}: ฿${baht(t.tax)} (เงินได้สุทธิ ฿${baht(t.netIncome)}) เป็นตัวเลขประมาณการ ไม่ใช่คำแนะนำภาษี`);
      }
      case 'streak': {
        const s = await this.stats.streak(userId);
        return fb('get_streak', s, s.current
          ? `🔥 ${s.current} (สูงสุด ${s.best}) อัปเดตครั้งถัดไปภายใน ${s.daysLeft} วัน ไม่งั้นไฟดับ`
          : `ไฟดับอยู่ (สูงสุด ${s.best}) อัปโหลด statement หรือสลิปใหม่เพื่อจุดไฟอีกครั้ง`);
      }
      case 'loan': {
        const l = await this.stats.loanReady(userId);
        return fb('get_loan_ready', l, `มี statement ต่อเนื่อง ${l.continuousMonths}/${l.required} เดือน ค่างวดที่ผ่อนไหวประมาณ ฿${baht(l.maxInstallment)}/เดือน (ประมาณการ ไม่ใช่การอนุมัติสินเชื่อ)`);
      }
      default:
        return { reply: 'ลองถามได้เลย เช่น "เดือนนี้ใช้ไปเท่าไหร่" "ใช้เงินกับอะไรมากสุด" "ภาษีปีนี้เท่าไหร่" "streak เท่าไหร่" "กู้ได้เท่าไหร่"' };
    }
  }
}

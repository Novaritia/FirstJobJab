import { Logger } from '@nestjs/common';

const log = new Logger('LLM');

/**
 * Rewrites an aggregate-only Thai summary into friendlier Thai via a free-tier LLM.
 * Gemini if GEMINI_API_KEY, else OpenAI if OPENAI_API_KEY, else returns null (caller keeps the template).
 * Privacy: callers pass only aggregate numbers/category names — never names, IDs, account numbers.
 */
export async function polishThai(template: string): Promise<string | null> {
  const prompt =
    'เขียนสรุปการเงินต่อไปนี้ใหม่เป็นภาษาไทยที่เป็นกันเอง เข้าใจง่ายสำหรับคนเพิ่งเริ่มทำงาน ไม่เกิน 3 ประโยค ' +
    'ห้ามเปลี่ยนตัวเลข ห้ามเพิ่มข้อมูลใหม่ ตอบเฉพาะข้อความสรุป:\n\n' + template;
  try {
    if (process.env.GEMINI_API_KEY) {
      const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`gemini ${r.status}`);
      const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() || null;
    }
    if (process.env.OPENAI_API_KEY) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] }),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`openai ${r.status}`);
      const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      return j.choices?.[0]?.message?.content?.trim() || null;
    }
  } catch (e) {
    log.warn(`polish failed, using template: ${(e as Error).message}`);
  }
  return null;
}

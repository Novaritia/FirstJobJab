import { HttpException } from '@nestjs/common';

function creds() {
  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voice) throw new HttpException('voice_unavailable', 503);
  return { key, voice };
}

/** Thai text → mp3. */
export async function tts(text: string): Promise<Buffer> {
  const { key, voice } = creds();
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
    // eleven_multilingual_v2 has no Thai; v4 does (docs, 2026-10)
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_v4', language_code: 'th' }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new HttpException(`tts_failed_${r.status}`, 502);
  return Buffer.from(await r.arrayBuffer());
}

/** Audio → Thai transcript (Scribe). */
export async function stt(audio: Buffer, mime: string): Promise<string> {
  const { key } = creds();
  const form = new FormData();
  form.append('model_id', process.env.ELEVENLABS_STT_MODEL_ID || 'scribe_v2');
  form.append('language_code', 'th');
  form.append('file', new Blob([new Uint8Array(audio)], { type: mime }), 'audio');
  const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST', headers: { 'xi-api-key': key }, body: form, signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new HttpException(`stt_failed_${r.status}`, 502);
  return ((await r.json()) as { text?: string }).text?.trim() ?? '';
}

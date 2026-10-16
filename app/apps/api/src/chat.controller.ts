import { Body, Controller, HttpCode, HttpException, Post, Req as NestReq, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, UserId, type Req } from './auth.js';
import { AuditService } from './audit.service.js';
import { ChatService, type ChatMsg } from './chat.js';
import { stt, tts } from './elevenlabs.js';
import { parse } from './validation.js';

const Msgs = z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) })).max(20);
const Body_ = z.object({ messages: Msgs.min(1).refine((m) => m.at(-1)!.role === 'user', 'last message must be from user') });
const AUDIO = /^audio\/(webm|ogg|mpeg|mp3|mp4|wav|x-m4a)/;

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private chat: ChatService, private audit: AuditService) {}

  @Post()
  @HttpCode(200)
  async ask(@UserId() userId: string, @Body() body: unknown, @NestReq() req: Req) {
    const { reply, data, tools } = await this.chat.chat(userId, parse(Body_, body).messages);
    await this.audit.log(req, 'chat', { after: { tools } }); // never the message content
    return { reply, data };
  }

  @Post('voice')
  @HttpCode(200)
  async voice(@UserId() userId: string, @NestReq() req: Req) {
    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) throw new HttpException('voice_unavailable', 503);
    let audio: Buffer | undefined;
    let mime = '';
    let history: ChatMsg[] = [];
    for await (const part of req.parts()) {
      if (part.type === 'file') {
        if (part.fieldname !== 'audio') { part.file.resume(); continue; }
        mime = part.mimetype;
        audio = await part.toBuffer();
      } else if (part.fieldname === 'history' && typeof part.value === 'string' && part.value) {
        let raw: unknown;
        try { raw = JSON.parse(part.value); } catch { throw new HttpException('history must be JSON', 400); }
        history = parse(Msgs.max(19), raw);
      }
    }
    if (!audio?.length) throw new HttpException('audio_required', 400);
    if (!AUDIO.test(mime)) throw new HttpException('unsupported_audio', 415);
    const transcript = await stt(audio, mime);
    if (!transcript) throw new HttpException('no_speech', 422);
    const { reply, data, tools } = await this.chat.chat(userId, [...history, { role: 'user', content: transcript.slice(0, 2000) }]);
    await this.audit.log(req, 'chat', { after: { tools, voice: true } });
    return { transcript, reply, data, audio: (await tts(reply)).toString('base64') };
  }
}

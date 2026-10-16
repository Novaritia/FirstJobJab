import { BadRequestException, Body, Controller, Get, HttpCode, Post, Put, Req as NestReq, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from './prisma.service.js';
import { AuditService } from './audit.service.js';
import { AuthGuard, UserId, type Req } from './auth.js';
import { encryptStr, envKey } from './crypto.js';
import { parse } from './validation.js';
import { acceptConsents, PRIVACY_VERSION, REQUIRED_PURPOSES, TERMS_VERSION } from './security-util.js';

export const CONSENT_VERSION = '2026-10-16';
const PURPOSES = ['terms', 'privacy', 'planning', 'loan_summary', 'improve'] as const;

const PiiBody = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(d)), 'invalid date'),
  nationalId: z.string().transform((s) => s.replace(/[\s-]/g, '')).pipe(z.string().regex(/^\d{13}$/, 'must be 13 digits')),
});
const ConsentBody = z.object({ purpose: z.enum(PURPOSES), granted: z.boolean() });
const Reconsent = z.object({ termsVersion: z.literal(TERMS_VERSION), privacyVersion: z.literal(PRIVACY_VERSION) });

@Controller('profile')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  @Put('pii')
  async putPii(@UserId() userId: string, @Body() body: unknown, @NestReq() req: Req) {
    const b = parse(PiiBody, body);
    const key = envKey('PII_KEY');
    const data = { birthDateEnc: encryptStr(b.birthDate, key), nationalIdEnc: encryptStr(b.nationalId, key) };
    await this.prisma.pii.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    await this.audit.log(req, 'pii_change'); // never log the values
    return { ok: true };
  }

  @Get('consents')
  async consents(@UserId() userId: string) {
    const rows = await this.prisma.consent.findMany({ where: { userId }, orderBy: { at: 'desc' }, distinct: ['purpose'] });
    return { consents: rows.map(({ purpose, granted, version, at }) => ({ purpose, granted, version, at })) };
  }

  @Put('consents')
  async putConsent(@UserId() userId: string, @Body() body: unknown, @NestReq() req: Req) {
    const b = parse(ConsentBody, body);
    // terms/privacy/planning are the contract itself: leaving = deleting the account (DELETE /account)
    if (!b.granted && REQUIRED_PURPOSES.includes(b.purpose)) throw new BadRequestException('required_consent');
    await this.prisma.consent.create({ data: { userId, ...b, version: CONSENT_VERSION } });
    await this.audit.log(req, b.granted ? 'consent_give' : 'consent_withdraw', { target: b.purpose });
    return { ok: true };
  }

  @Post('reconsent')
  @HttpCode(200)
  async reconsent(@UserId() userId: string, @Body() body: unknown, @NestReq() req: Req) {
    parse(Reconsent, body);
    await acceptConsents(this.prisma, userId);
    await this.audit.log(req, 'consent_give', { target: `terms+privacy@${TERMS_VERSION}` });
    return { ok: true };
  }
}

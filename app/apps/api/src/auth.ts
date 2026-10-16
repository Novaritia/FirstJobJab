import {
  Body, CanActivate, Controller, createParamDecorator, ExecutionContext, Get, HttpCode, HttpException,
  Injectable, Post, Req as NestReq, Res, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { z } from 'zod';
import { PrismaService } from './prisma.service.js';
import { AuditService } from './audit.service.js';
import { encryptStr, envKey, hmacIp, sha256 } from './crypto.js';
import { acceptConsents, deviceOf, locationOf, needsReconsent, PRIVACY_VERSION, TERMS_VERSION } from './security-util.js';
import { parse } from './validation.js';

export interface SessionUser { id: string; email: string; displayName: string; hasPii: boolean; createdAt: Date }
export type Req = FastifyRequest & { user?: SessionUser; sessionId?: string };

const SESSION_DAYS = 30;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Req>();
    const token = req.cookies?.sid;
    if (!token) throw new UnauthorizedException('unauthorized');
    const s = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { include: { pii: { select: { userId: true } } } } },
    });
    if (!s || s.expiresAt < new Date() || s.user.deletedAt) throw new UnauthorizedException('unauthorized');
    const { id, email, displayName, createdAt, pii } = s.user;
    req.user = { id, email, displayName, createdAt, hasPii: !!pii };
    req.sessionId = s.id;
    if (Date.now() - s.lastSeenAt.getTime() > 5 * 60_000) await this.prisma.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } });
    return true;
  }
}

export const UserId = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<Req>().user!.id);

// shortcut: in-memory limiter, single instance only; move to Redis/Cloudflare when scaled out
const fails = new Map<string, { n: number; until: number }>();
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60_000;
export function loginLimited(key: string) {
  const f = fails.get(key);
  return !!f && f.until > Date.now() && f.n >= MAX_FAILS;
}
export function loginFailed(key: string) {
  const f = fails.get(key);
  fails.set(key, f && f.until > Date.now() ? { n: f.n + 1, until: f.until } : { n: 1, until: Date.now() + WINDOW_MS });
}

const Register = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
  displayName: z.string().trim().min(1).max(100),
  acceptTerms: z.literal(true, { error: 'must accept terms' }),
  termsVersion: z.literal(TERMS_VERSION, { error: 'outdated terms version' }),
  privacyVersion: z.literal(PRIVACY_VERSION, { error: 'outdated privacy version' }),
});
const Login = z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().max(200) });

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private async startSession(userId: string, req: Req, res: FastifyReply) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
    const ua = req.headers['user-agent'] ?? '';
    const s = await this.prisma.session.create({ data: { userId, tokenHash: sha256(token), expiresAt, device: deviceOf(ua), location: locationOf(req.ip) } });
    res.setCookie('sid', token, {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt,
    });
    return s.id;
  }

  /** Login history for the user. Retention 90 days: older rows of this user are pruned here. */
  private async loginEvent(userId: string, req: Req, success: boolean, sessionId?: string) {
    const ua = req.headers['user-agent'] ?? '';
    await this.prisma.loginEvent.deleteMany({ where: { userId, at: { lt: new Date(Date.now() - 90 * 86400_000) } } });
    await this.prisma.loginEvent.create({
      data: {
        userId, success, sessionId, userAgent: ua.slice(0, 300), device: deviceOf(ua), location: locationOf(req.ip),
        ipEnc: req.ip ? encryptStr(req.ip, envKey('PII_KEY')) : null, ipHmac: req.ip ? hmacIp(req.ip, envKey('IP_HMAC_KEY')) : null,
      },
    });
  }

  private async userView(id: string): Promise<SessionUser> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id }, include: { pii: { select: { userId: true } } } });
    return { id: u.id, email: u.email, displayName: u.displayName, createdAt: u.createdAt, hasPii: !!u.pii };
  }

  @Post('register')
  async register(@Body() body: unknown, @NestReq() req: Req, @Res({ passthrough: true }) res: FastifyReply) {
    const b = parse(Register, body);
    if (await this.prisma.user.findUnique({ where: { email: b.email } })) throw new HttpException('email_taken', 409);
    const u = await this.prisma.user.create({
      data: { email: b.email, displayName: b.displayName, passwordHash: await argon2.hash(b.password, { type: argon2.argon2id }) },
    });
    await acceptConsents(this.prisma, u.id);
    await this.loginEvent(u.id, req, true, await this.startSession(u.id, req, res));
    await this.audit.log(req, 'register', { userId: u.id });
    return { user: await this.userView(u.id) };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @NestReq() req: Req, @Res({ passthrough: true }) res: FastifyReply) {
    const b = parse(Login, body);
    const key = `${req.ip}|${b.email}`;
    if (loginLimited(key)) throw new HttpException('too_many_attempts', 429);
    const u = await this.prisma.user.findUnique({ where: { email: b.email } });
    if (!u || !u.passwordHash || !(await argon2.verify(u.passwordHash, b.password))) {
      loginFailed(key);
      if (u) await this.loginEvent(u.id, req, false);
      await this.audit.log(req, 'login_fail', { userId: u?.id ?? null });
      throw new UnauthorizedException('invalid_credentials');
    }
    fails.delete(key);
    await this.loginEvent(u.id, req, true, await this.startSession(u.id, req, res));
    await this.audit.log(req, 'login_ok', { userId: u.id });
    return { user: await this.userView(u.id) };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@NestReq() req: Req, @Res({ passthrough: true }) res: FastifyReply) {
    const token = req.cookies?.sid;
    if (token) {
      const s = await this.prisma.session.findUnique({ where: { tokenHash: sha256(token) } });
      if (s) {
        await this.prisma.session.delete({ where: { id: s.id } });
        await this.audit.log(req, 'logout', { userId: s.userId });
      }
    }
    res.clearCookie('sid', { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@NestReq() req: Req) {
    return { user: { ...req.user, needsReconsent: await needsReconsent(this.prisma, req.user!.id) } };
  }
}

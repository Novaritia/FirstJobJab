import { Body, Controller, Delete, Get, HttpCode, HttpException, NotFoundException, Param, Post, Req as NestReq, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { unlink } from 'node:fs/promises';
import * as argon2 from 'argon2';
import { z } from 'zod';
import { PrismaService } from './prisma.service.js';
import { AuditService } from './audit.service.js';
import { AuthGuard, loginFailed, loginLimited, UserId, type Req } from './auth.js';
import { decryptStr, envKey, sha256 } from './crypto.js';
import { parse } from './validation.js';

@Controller('security')
@UseGuards(AuthGuard)
export class SecurityController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  @Get('logins')
  async logins(@UserId() userId: string, @NestReq() req: Req) {
    const rows = await this.prisma.loginEvent.findMany({ where: { userId }, orderBy: { at: 'desc' }, take: 100 });
    const key = envKey('PII_KEY');
    return {
      logins: rows.map((e) => ({
        at: e.at, success: e.success, ip: e.ipEnc ? decryptStr(e.ipEnc, key) : null, device: e.device, location: e.location,
        current: !!e.sessionId && e.sessionId === req.sessionId,
      })),
    };
  }

  @Get('sessions')
  async sessions(@UserId() userId: string, @NestReq() req: Req) {
    const rows = await this.prisma.session.findMany({ where: { userId, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: 'desc' } });
    return {
      sessions: rows.map((s) => ({ id: s.id, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, device: s.device, location: s.location, current: s.id === req.sessionId })),
    };
  }

  @Delete('sessions/:id')
  async revoke(@UserId() userId: string, @Param('id') id: string, @NestReq() req: Req) {
    const { count } = await this.prisma.session.deleteMany({ where: { id, userId } });
    if (!count) throw new NotFoundException('not_found');
    await this.audit.log(req, 'session_revoke', { target: id });
    return { ok: true };
  }

  @Post('sessions/revoke-others')
  @HttpCode(200)
  async revokeOthers(@UserId() userId: string, @NestReq() req: Req) {
    const { count } = await this.prisma.session.deleteMany({ where: { userId, id: { not: req.sessionId } } });
    await this.audit.log(req, 'session_revoke_others', { after: { count } });
    return { ok: true, revoked: count };
  }
}

const DeleteBody = z.object({ password: z.string().min(1).max(200) });

@Controller('account')
@UseGuards(AuthGuard)
export class AccountController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /** Re-auth, then erase personal data. User row is anonymised (not deleted) so consents + audit_log remain as legal proof. */
  @Delete()
  async remove(@UserId() userId: string, @Body() body: unknown, @NestReq() req: Req, @Res({ passthrough: true }) res: FastifyReply) {
    const { password } = parse(DeleteBody, body);
    const key = `${req.ip}|delete|${userId}`;
    if (loginLimited(key)) throw new HttpException('too_many_attempts', 429);
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!u.passwordHash || !(await argon2.verify(u.passwordHash, password))) {
      loginFailed(key);
      throw new UnauthorizedException('invalid_credentials');
    }
    const files = await this.prisma.upload.findMany({ where: { userId }, select: { filePath: true } });
    const where = { userId };
    await this.prisma.$transaction([
      this.prisma.transaction.deleteMany({ where }), // edits cascade
      this.prisma.upload.deleteMany({ where }),
      this.prisma.slip.deleteMany({ where }),
      this.prisma.categoryRule.deleteMany({ where }),
      this.prisma.account.deleteMany({ where }),
      this.prisma.pii.deleteMany({ where }),
      this.prisma.loginEvent.deleteMany({ where }),
      this.prisma.session.deleteMany({ where }),
      this.prisma.user.update({ where: { id: userId }, data: { email: `deleted:${sha256(u.email)}`, displayName: 'deleted', passwordHash: '', deletedAt: new Date() } }),
    ]);
    for (const f of files) if (f.filePath) await unlink(f.filePath).catch(() => undefined); // already gone is fine
    await this.audit.log(req, 'account_delete', { userId });
    res.clearCookie('sid', { path: '/' });
    return { ok: true };
  }
}

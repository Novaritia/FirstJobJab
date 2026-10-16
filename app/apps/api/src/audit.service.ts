import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { auditHash, envKey, GENESIS, hmacIp, type AuditRow } from './crypto.js';
import type { Req } from './auth.js';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /** Append one entry. Advisory lock serialises the chain. Never UPDATE/DELETE audit_log. */
  async log(req: Req | null, action: string, opts: { userId?: string | null; target?: string; before?: unknown; after?: unknown } = {}) {
    const row: AuditRow = {
      userId: opts.userId ?? req?.user?.id ?? null,
      actor: opts.userId ?? req?.user?.id ? 'user' : 'anonymous',
      action,
      target: opts.target ?? null,
      before: opts.before ?? null,
      after: opts.after ?? null,
      ipHmac: req?.ip ? hmacIp(req.ip, envKey('IP_HMAC_KEY')) : null,
      userAgent: (req?.headers['user-agent'] as string | undefined)?.slice(0, 300) ?? null,
      at: new Date().toISOString(),
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(727274)`;
      const last = await tx.auditLog.findFirst({ orderBy: { id: 'desc' }, select: { hash: true } });
      const prevHash = last?.hash ?? GENESIS;
      await tx.auditLog.create({
        data: {
          ...row,
          before: (row.before ?? undefined) as object | undefined,
          after: (row.after ?? undefined) as object | undefined,
          at: new Date(row.at),
          prevHash,
          hash: auditHash(prevHash, row),
        },
      });
    });
  }
}

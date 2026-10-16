import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { isThaiNationalId, normalizeThaiPhone } from '@fjm/shared';
import { PrismaService } from './prisma.service.js';
import { decryptStr, encryptStr, envKey } from './crypto.js';

/** Full decrypted profile. Server-side only (tax pack export, PDF unlock) — never send nationalId to the client. */
export interface DecryptedProfile {
  displayName: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  nationalId: string | null;
  birthDate: string | null; // YYYY-MM-DD
  monthlySalary: number | null; // satang
}

const nullable = <T extends z.ZodType>(s: T) => z.preprocess((v) => (v === '' ? null : v), s.nullable()).optional();
const digits = (s: string) => s.replace(/[\s-]/g, '');

/** Every field optional (PUT = patch); '' or null clears an optional field. Error messages are the codes returned in `fields`. */
export const ProfileBody = z.object({
  displayName: z.string().trim().min(1, 'required').max(60, 'too_long').optional(),
  fullName: nullable(z.string().trim().min(2, 'too_short').max(120, 'too_long')),
  phone: nullable(z.string().refine((s) => normalizeThaiPhone(s), 'invalid_phone').transform((s) => normalizeThaiPhone(s)!)),
  nationalId: nullable(z.string().transform(digits).refine(isThaiNationalId, 'invalid_national_id')),
  birthDate: nullable(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_date').refine((d) => !Number.isNaN(Date.parse(d)) && d >= '1900-01-01' && d <= new Date().toISOString().slice(0, 10), 'invalid_date')),
  /** baht per month (integer or 2-dp), stored as satang */
  monthlySalary: nullable(z.number('invalid_salary').min(0, 'invalid_salary').max(10_000_000, 'invalid_salary').transform((b) => Math.round(b * 100))),
}).strict();
export type ProfilePatch = z.infer<typeof ProfileBody>;

export function parseProfile(body: unknown): ProfilePatch {
  const r = ProfileBody.safeParse(body);
  if (r.success) return r.data;
  const fields = Object.fromEntries(r.error.issues.map((i) => [String(i.path[0] ?? '_'), i.message]));
  throw new BadRequestException({ message: 'invalid_profile', fields });
}

/** x-xxxx-xxxxx-12-3 (last 3 digits visible) */
export const maskNationalId = (id: string) => `x-xxxx-xxxxx-${id.slice(10, 12)}-${id.slice(12)}`;

const ENC = { fullName: 'fullNameEnc', phone: 'phoneEnc', nationalId: 'nationalIdEnc', birthDate: 'birthDateEnc' } as const;

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async decrypted(userId: string): Promise<DecryptedProfile> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { pii: true } });
    const key = envKey('PII_KEY');
    const dec = (s: string | null | undefined) => (s ? decryptStr(s, key) : null);
    const p = u.pii;
    return {
      displayName: u.displayName, email: u.email,
      fullName: dec(p?.fullNameEnc), phone: dec(p?.phoneEnc), nationalId: dec(p?.nationalIdEnc), birthDate: dec(p?.birthDateEnc),
      monthlySalary: p?.monthlySalary ?? null,
    };
  }

  /** Safe for the client: national ID masked. */
  async view(userId: string) {
    const { nationalId, ...p } = await this.decrypted(userId);
    return { ...p, nationalIdMasked: nationalId ? maskNationalId(nationalId) : null, hasNationalId: !!nationalId };
  }

  /** Returns the names of changed fields (for the audit log; never the values). */
  async update(userId: string, b: ProfilePatch): Promise<string[]> {
    const key = envKey('PII_KEY');
    const pii: Record<string, string | number | null> = {};
    for (const [f, col] of Object.entries(ENC)) {
      const v = b[f as keyof typeof ENC];
      if (v !== undefined) pii[col] = v === null ? null : encryptStr(v, key);
    }
    if (b.monthlySalary !== undefined) pii.monthlySalary = b.monthlySalary;
    if (b.displayName !== undefined) await this.prisma.user.update({ where: { id: userId }, data: { displayName: b.displayName } });
    if (Object.keys(pii).length) await this.prisma.pii.upsert({ where: { userId }, create: { userId, ...pii }, update: pii });
    return Object.keys(b).filter((k) => b[k as keyof ProfilePatch] !== undefined);
  }
}

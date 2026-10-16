import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw new BadRequestException(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  return r.data;
}

/** `?limit&page` (or `&offset`) → Prisma take/skip, same style as GET /transactions. */
export function paging(q: unknown, defaultLimit: number, maxLimit = 200): { take: number; skip: number } {
  const f = parse(z.object({
    limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
    page: z.coerce.number().int().min(1).optional(),
    offset: z.coerce.number().int().min(0).default(0),
  }), q ?? {});
  return { take: f.limit, skip: f.page ? (f.page - 1) * f.limit : f.offset };
}

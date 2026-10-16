import { Filter, listQuery } from './transactions.controller.js';

const q = (raw: Record<string, string>) => listQuery('u1', Filter.parse(raw));

describe('listQuery', () => {
  it('defaults: first 50, newest first, hidden included (old behaviour)', () => {
    const r = q({});
    expect(r).toMatchObject({ take: 50, skip: 0 });
    expect(r.where.hidden).toBeUndefined();
    expect(r.where.OR).toBeUndefined();
    expect(r.orderBy[0]).toEqual({ date: 'desc' });
  });

  it('searches description/note case-insensitively and Thai category names', () => {
    const r = q({ q: ' อาหาร ', hidden: 'exclude', direction: 'out', minAmount: '100', maxAmount: '5000' });
    expect(r.where).toMatchObject({ userId: 'u1', hidden: false, direction: 'out', amount: { gte: 100, lte: 5000 } });
    expect(r.where.OR).toEqual([
      { description: { contains: 'อาหาร', mode: 'insensitive' } },
      { note: { contains: 'อาหาร', mode: 'insensitive' } },
      { category: { in: ['food'] } },
    ]);
  });

  it('pages by page or offset and sorts by amount', () => {
    expect(q({ limit: '20', page: '3' })).toMatchObject({ take: 20, skip: 40 });
    expect(q({ offset: '7' }).skip).toBe(7);
    expect(q({ sort: 'amount_asc' }).orderBy[0]).toEqual({ amount: 'asc' });
  });

  it('rejects out-of-range limits', () => {
    expect(Filter.safeParse({ limit: '501' }).success).toBe(false);
    expect(Filter.safeParse({ limit: '0' }).success).toBe(false);
    expect(Filter.safeParse({ hidden: 'all' }).success).toBe(false);
  });
});

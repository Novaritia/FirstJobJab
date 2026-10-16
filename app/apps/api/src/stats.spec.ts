import { computeCoverage, computeFire } from './stats.service.js';

describe('computeCoverage', () => {
  it('counts the run ending at the latest covered month and lists gaps', () => {
    const s = computeCoverage(new Set(['2025-11', '2026-04', '2026-05', '2026-07', '2026-08', '2026-09']), '2026-10');
    expect(s.continuousMonths).toBe(3);
    expect(s.missing).toContain('2026-06');
    expect(s.expiringSoon).toEqual(['2025-12']); // 10 months old; 2026-01 is only 9
    expect(s.months[0].month).toBe('2025-11');
    expect(s.months.at(-1)!.month).toBe('2026-09');
  });

  it('shows the last 6 months uncovered for a new user', () => {
    const s = computeCoverage(new Set(), '2026-10');
    expect(s).toMatchObject({ continuousMonths: 0, missing: ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'] });
  });
});

describe('computeFire', () => {
  const d = (iso: string) => new Date(iso);
  const ev = (iso: string, rows = 5) => ({ at: d(iso), kind: 'statement', rows });

  it('+1 per update, several per day count, re-upload (0 rows) adds nothing', () => {
    const f = computeFire([ev('2026-10-01T03:00:00Z'), ev('2026-10-01T04:00:00Z'), ev('2026-10-01T05:00:00Z', 0), ev('2026-10-10T03:00:00Z', 1)], d('2026-10-16T00:00:00Z'));
    expect(f).toMatchObject({ current: 3, best: 3, updatesThisMonth: 3 });
    expect(f.daysLeft).toBe(25); // 24d 3h left → rounds up
    expect(f.expiresAt).toEqual(d('2026-11-09T03:00:00Z'));
    expect(f.recent).toHaveLength(3);
  });

  it('goes out after >30 days, keeps best, restarts from 1', () => {
    const evs = [ev('2026-01-01T00:00:00Z'), ev('2026-01-02T00:00:00Z'), ev('2026-01-03T00:00:00Z')];
    expect(computeFire(evs, d('2026-02-03T00:00:00Z'))).toMatchObject({ current: 0, best: 3, daysLeft: 0, expiresAt: null });
    expect(computeFire([...evs, ev('2026-03-01T00:00:00Z')], d('2026-03-02T00:00:00Z'))).toMatchObject({ current: 1, best: 3 });
    expect(computeFire([], d('2026-03-02T00:00:00Z'))).toMatchObject({ current: 0, best: 0, lastUpdateAt: null });
  });
});

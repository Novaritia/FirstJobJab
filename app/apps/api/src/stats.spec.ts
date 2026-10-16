import { computeStreak } from './stats.service.js';

describe('computeStreak', () => {
  it('counts the run ending at the latest covered month and lists gaps', () => {
    const s = computeStreak(new Set(['2025-11', '2026-04', '2026-05', '2026-07', '2026-08', '2026-09']), '2026-10');
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
    expect(s.missing).toContain('2026-06');
    expect(s.expiringSoon).toEqual(['2025-12']); // 10 months old; 2026-01 is only 9
    expect(s.months[0].month).toBe('2025-11');
    expect(s.months.at(-1)!.month).toBe('2026-09');
  });

  it('shows the last 6 months uncovered for a new user', () => {
    const s = computeStreak(new Set(), '2026-10');
    expect(s).toMatchObject({ current: 0, best: 0, missing: ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'] });
  });
});

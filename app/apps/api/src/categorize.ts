import { guessCategory, type Category, type Direction } from '@fjm/shared';

export const rulePattern = (description: string) => description.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 200);

/** Rule-based guess, then the user's own rules (made from their category edits) win. Longest matching pattern first. */
export function categorize(description: string, direction: Direction, rules: { pattern: string; category: string }[]): Category {
  const d = rulePattern(description);
  const hit = rules.filter((r) => r.pattern && d.includes(r.pattern)).sort((a, b) => b.pattern.length - a.pattern.length)[0];
  return (hit?.category as Category | undefined) ?? guessCategory(description, direction);
}

/** Theme chart colour N (1-5), falling back to the older --cat-N accents. Recharts-free so pages can colour legends cheaply. */
export const chartColor = (n: number) => `var(--chart-${n}, var(--cat-${n}))`;
/** Neutral slot for the folded "อื่น ๆ" slice. */
export const OTHER_COLOR = "var(--cat-6)";

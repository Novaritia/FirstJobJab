# Design: FirstJobJab web

Recorded from the built UI (2026-10-16). Source of truth: `src/app/globals.css`, `src/components/ui.tsx`.

## World
The direction is pinned by the brief: a Dime!-like modern Thai fintech look in blue and sky. It combines **glass** for chrome with **neumorphism** for content.
- **Glass** (`.glass`): landing top pill bar, mobile top bar, mobile bottom tab bar, `<dialog>`s. It is a translucent fill with an 18px blur, saturate 1.4, and a 1px light border.
- **Hero money card** (`.glass-hero`): a navy-tinted blue glass gradient with white text. It is used for the one big figure on each screen (net this month, tax, max installment, landing demo).
- **Neumorphic** (`shadow-neu` / `shadow-neu-in`): content cards (`Card`, rounded-3xl), inputs, selects, toggles, and secondary "soft" buttons. Inputs are inset.
- **Primary action**: a solid `bg-primary` pill (`Button`, `ButtonLink`), with one per screen.
- **Background**: a fixed blue→sky linear gradient plus two blurred radial colour blobs.

## Tokens (CSS vars on `:root`; dark values via `prefers-color-scheme`)
| Role | Light | Dark |
|---|---|---|
| bg / bg-2 | #E4EDF8 / #D6ECFB | #172235 / #0F1B2E |
| surface / surface-2 | #E4EDF8 / #F3F7FC | #172235 / #1D2B42 |
| primary / on-primary | #1D4ED8 / #FFF | #60A5FA / #0B1A2E |
| accent (charts) | #0EA5E9 | #38BDF8 |
| text / muted | #0F2744 / #4A5D78 | #E6EEF8 / #9FB0C8 |
| success / warning / danger | #166534 / #92400E / #B91C1C | #4ADE80 / #FBBF24 / #F87171 |

The success and warning colours were darkened from the tech plan's values so they reach 4.5:1 on the light surfaces. Each status colour has a `*-bg` tint for badges and banners.

Glass falls back to the solid `--glass-solid` colour when `backdrop-filter` is unsupported or `prefers-reduced-transparency: reduce` is set.

## Type
- UI: IBM Plex Sans Thai 400–700 (`--font-plex`). It was pinned by the tech plan and supports Thai.
- Display: Anuphan 600/700 (`font-display`), used for h1, the wordmark, and hero money figures.
- Money always uses `.num` (tabular numerals) and is formatted by `baht()` in `src/lib/format.ts`.

## Components
`Card`, `Button`/`ButtonLink` (primary · soft · danger · ghost; min-height 44px), `Badge` (ok · warn · manual · edited · info; always text plus emoji, never colour alone), `Field`, `ErrorNote` (role=alert), `Loading` (role=status), `PageTitle`. Charts in `components/charts.tsx` (Recharts) use CSS vars, so they follow the theme.

## Layout
- Mobile: single column, glass top bar plus a 5-item glass bottom tab bar; tax and loan are reached from the top bar and the dashboard shortcuts.
- `md`: 2 columns. `lg+`: 240px side nav. `xl`: 3-column dashboard.

## Rules
- One primary pill per screen. Every empty state names the next action, usually "อัปโหลด statement".
- Icons come from lucide-react. Emoji only appear as friendly accents in badges, category labels, and the 🔥 streak.
- No eyebrows above headings and no gradient text.
- Motion: one authored moment, the confetti and pop when the streak goes up after confirming an upload. It is disabled under `prefers-reduced-motion`.
- Browser surfaces are themed: selection, caret, scrollbar, accent-color, and a 3px primary focus ring.

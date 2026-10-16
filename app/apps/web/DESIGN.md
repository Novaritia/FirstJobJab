# Design: FirstJobJab web

Recorded from the built UI on 2026-10-16. This replaces the earlier glass/neumorphism look, which should not be brought back. The source of truth is `src/app/globals.css` and `src/components/ui.tsx`.

## World
The brief pins the look: a Stripe-dashboard grammar that is clear, sharp, information-dense and calm.
- **Surfaces**: a neutral canvas (`bg`) with white `surface` panels. Every container has a 1px `line` border and hairline dividers inside. There are no gradients, blobs, or glass.
- **Corners**: panels and dialogs 6px (`rounded-md`), buttons and inputs 4px (`rounded`), badges and bars 2px (`rounded-sm`). Only toggle switches and dots are round.
- **Elevation**: none on panels. `shadow-pop` is reserved for dialogs, the confirm celebration, chart tooltips, and the landing demo figure.
- **Blue is the accent, not the page.** It is used for primary buttons, active nav (`primary-soft` fill with `primary` text), links, focus rings, the key figure (net savings, tax, max installment), and chart bars.
- **Sections**: content is grouped under `SectionLabel`s and in `Card`s whose `title` prop gives a header row separated by a hairline. Tables use a `subtle` header row, row dividers, and right-aligned tabular numbers.

## Tokens (CSS vars; dark via `prefers-color-scheme`)
| Role | Light | Dark |
|---|---|---|
| bg / surface / subtle | #F6F8FA / #FFF / #F3F5F8 | #0B1120 / #111827 / #172033 |
| line / line-strong | #E3E8EE / #CBD3DD | #253046 / #34425E |
| primary / hover / soft / on-primary | #1D4ED8 / #1E40AF / #EAF0FD / #FFF | #7AA2F7 / #9AB8FA / #1B2A4A / #0B1120 |
| text / muted | #1A2433 / #556172 | #E6EBF2 / #9AA7BA |
| success / warning / danger | #15803D / #A34A06 / #B91C1C | #4ADE80 / #FBBF24 / #F87171 |

Each status colour has a `*-bg` tint. All text pairs meet at least 4.5:1.

## Type
One family: IBM Plex Sans Thai 400–700, with a 15px base. Headings are only bolder and larger: h1 is 24px bold, panel titles are 15px semibold, and labels are 14px muted. Money always uses `.num` (tabular numerals) and is right-aligned in tables.

## Components
- `Card` (with optional `title` and `action`), `SectionLabel`, `PageTitle` (title and subtitle on the left, primary action on the right, hairline below).
- `Button` variants: primary, soft (outlined), danger, ghost. Height is 44px on mobile and 36px on desktop.
- `Badge`: ok, warn, manual, edited, info. Always text plus emoji.
- Also `Field`, `ErrorNote`, and `Loading` (skeleton lines).
- Charts: `CategoryBars` is an HTML table with share bars, and `GrowthChart` uses Recharts with a thin line and a dashed line for contributions.

## Layout
- **Desktop (≥1024)**: 240px left sidebar grouped as ภาพรวม / ข้อมูล / วางแผน / บัญชี.
- **Tablet (768–1023)**: a 64px icon rail that expands with a toggle button.
- **Mobile (<768)**: top bar plus a 5-tab bottom bar. Sections stack and table rows become row lists. There is no horizontal scroll at 360px.

## Rules
- One primary button per page header. Every empty state names the next action.
- No pills for actions, no eyebrow labels, no gradient text, and no coloured side-borders.
- Icons come from lucide-react. Emoji appear only in badges, category labels, and the 🔥 streak.
- Motion: a single moment, the confetti when the streak goes up after confirming an upload. It is turned off under `prefers-reduced-motion`.

# Design: FirstJobJab web

Updated 2026-10-16: the UI now runs on shadcn/ui primitives with a modern minimal white and blue theme. The source of truth is `src/app/globals.css` (tokens), `src/components/shadcn/*` (primitives) and `src/components/ui.tsx` (app building blocks). Do not bring back the earlier glass or neumorphism look.

## World
This is a calm, modern, minimal money app for first jobbers. It should feel easy and friendly while staying precise.
- **Surfaces**: a very light cool-blue canvas (`bg`) holds white `surface` cards. Each card has a 1px `line` border and a barely-there `shadow-card`, with hairline dividers inside. There are no decorative gradients, blobs or glass. Only masks (the hero grid fade) and the skeleton shimmer use gradients.
- **Corners**: cards and panels are 10px (`rounded-lg`), buttons, inputs and selects are 8px (`rounded` / `rounded-md`), badges are 6px (`rounded-sm`/`rounded-md`), and dialogs are 14px (`rounded-xl`). Switches, avatars and dots are round.
- **Elevation**: cards use only `shadow-card`. `shadow-pop` is for dialogs, popovers, toasts and chart tooltips.
- **Blue is the accent, not the page.** Use it for primary buttons, the active nav item (`primary-soft` fill with `primary` text), links, focus rings, key figures and the first chart series.
- **Easy for first jobbers**: show one primary action per view, use plain Thai labels, keep touch targets at 44px on mobile, give every empty state its next step, and write errors in sentences that say how to fix them.

## Primitives (shadcn/ui, new-york style, Radix, Tailwind 4)
`components.json` sets the `ui` alias to `@/components/shadcn`. This keeps it apart from `@/components/ui`, which is the app wrapper file.
The installed primitives are button, card, chart, badge, skeleton, tabs, switch, select, input, label, dialog, dropdown-menu, sheet, tooltip, separator, progress, avatar, popover, table and sonner.
Add more with: `corepack pnpm dlx shadcn@latest add <name>`. On Windows, the CLI's own `pnpm add` step needs a `pnpm` on PATH. Then change any `from "cn"` import to `from "@/lib/utils"`.
The root layout already mounts `<TooltipProvider>` and `<Toaster position="top-center" richColors closeButton />`. Call `toast.success("…")` from `sonner`.

## Tokens (CSS vars; dark via `prefers-color-scheme`, or force it with `.dark` / `.light` on `<html>`)
| Role (shadcn var / app alias) | Light | Dark |
|---|---|---|
| background / `bg` (canvas) | #F5F8FC | #0B1220 |
| card, popover, sidebar / `surface`, `shell` | #FFFFFF | #111A2E / #131D33 / #0E1628 |
| `subtle` (table heads, quiet fills) · secondary | #F2F5FA · #F1F5F9 | #16213A · #18233B |
| border / `line` · input / `line-strong` | #E3E9F1 · #CBD5E1 | #22304A · #33445F |
| foreground / `text` | #0F172A | #E6ECF5 |
| muted-foreground / `muted` (text) | #556275 (5.9:1 on white) | #9AA8BD |
| primary · `primary-hover` · `primary-soft`, accent · `on-primary` | #2563EB (5.2:1 with white) · #1D4ED8 · #EFF5FF · #FFF | #6EA0FF · #8DB4FF · #172A4D · #0B1220 |
| ring | #2563EB | #6EA0FF |
| success / warning / danger (text) | #15803D / #B45309 / #B91C1C | #4ADE80 / #FBBF24 / #F87171 |
| success-bg / warning-bg / danger-bg | #ECFDF3 / #FFF7E8 / #FEF1F1 | #10291C / #2E230C / #331616 |
| destructive (filled button) | #DC2626 | #F87171 |
| chart-1…6 = `cat-1…6` | #2563EB blue, #D97706 amber, #0D9488 teal, #7C3AED violet, #E11D48 rose, #64748B slate | #6EA0FF, #FBBF24, #2DD4BF, #A78BFA, #FB7185, #94A3B8 |
| blue-50…900 | #EFF5FF #DBE8FE #BFD5FE #93B8FD #6094FA #3B76F6 #2563EB #1D4ED8 #1E40AF #1E3A8A | inverted (50 is the darkest tint) |
| ink-50…900 (slate) | #F8FAFC … #0F172A | inverted |

- **Gotcha**: the Tailwind colour `muted` is the muted **text** colour, so `text-muted` works as it always has. For a muted fill, use `bg-secondary` or `bg-subtle`, not `bg-muted`.
- The chart order is colour-blind friendly: blue then amber come first, and the rest separate by hue and lightness. Category colours always sit beside a text label. Use `var(--chart-n)` in shadcn `ChartConfig`.
- Every text pair is at least 4.5:1. Each status colour has a `*-bg` tint for soft notes and badges.
- The landing page's deep `band` vars live in `src/app/landing.css`.
- Tailwind `dark:` utilities follow `prefers-color-scheme`. The `.dark` / `.light` classes switch only the CSS vars, and since nearly all colour comes from vars, that is enough.

## Landing sections (tonal bands, left-aligned, each with heading + one-line subtitle)
1. Hero on `bg` over the faint ledger grid: the upload-every-month / 6-month streak promise, with the live audit figure.
2. Ticker on a white band between hairlines.
3. Streak + upload types on `blue-50`: the 6-cell streak track (example data) and the drag-drop mock (PDF e-statement, slip, passbook photo).
4. "ทำงานยังไง" on `subtle`: a numbered ledger list, not a card grid.
5. Pricing on the deep `band` (the one sanctioned dark band): Free outlined, Plus as a white card with a 2px blue border and "แนะนำ" label, add-ons as a ledger list. Paid buttons read "เร็ว ๆ นี้" (aria-disabled).
6. Footer on `bg`: brand + disclaimer, product links, legal links.


## Type
The app uses one family, IBM Plex Sans Thai 400–700, at a 15px base. Headings differ only by weight and size: h1 is 24px bold with tight tracking, card titles are 15px semibold, and labels are 14px medium. Money always uses `.num` (tabular numerals) and is right-aligned in tables.

## Components (`@/components/ui`, built on shadcn; the API is unchanged)
- `Card`: has an optional `title` and `action`. With a title, it gets a header row above a hairline.
- `SectionLabel` and `PageTitle`: the title and subtitle sit on the left, the primary action on the right, with a hairline below.
- `Button` / `ButtonLink`: the variants are `primary` (filled blue), `soft` (outlined), `danger` (outlined red), and `ghost` (blue text with a soft hover). The shadcn names `default`, `outline`, `secondary`, `destructive` and `link` also work. Buttons are 44px tall on mobile and 36px on desktop. `pending` disables the button, sets `aria-busy` and shows a spinner without changing its size.
- `Badge` kinds: `ok`, `warn`, `manual`, `edited` and `info`. A badge always has text.
- Also `Field` (label + control + hint), `ErrorNote` (icon + message), `Loading` (Skeleton lines), `Req` / `RequiredLegend`, `useApi`, and `cx` (now `cn`, tailwind-merge aware).
- For tabs, switches, selects, dialogs, sheets, tooltips, tables, progress, charts and toasts, use `@/components/shadcn/*` directly.

## Layout
- **Desktop (≥1024)**: 240px left sidebar grouped as ภาพรวม / ข้อมูล / วางแผน / บัญชี.
- **Tablet (768–1023)**: a 64px icon rail that expands with a toggle button.
- **Mobile (<768)**: top bar plus a 5-tab bottom bar. Sections stack and table rows become row lists. There is no horizontal scroll at 360px.

## Rules
- One primary button per page header. Every empty state names the next action.
- No pill-shaped action buttons, no eyebrow labels, no gradient text, and no coloured side-borders.
- No emoji in the UI; icons come from lucide-react (status icons in success/warning/danger, categories via `CATEGORY_ICON` / `<CategoryLabel>` in `src/lib/category-icons.tsx`, the streak flame is lucide `Flame` in the `--streak` orange).
- Motion: calm and precise, easing `cubic-bezier(0.16,1,0.3,1)`, transform/opacity/clip-path only, never bouncy. Landing: the hero figure is a looping "live audit" (scan row moves down, checks resolve, the misread row turns amber then its amount rolls to the corrected value, KPIs roll up, then the next synthetic month/bank), a faint ledger grid with a rare thin blue light along one line, a slow ticker of checked rows, and one-shot reveals for the streak cells and steps. App: restrained, with a pulsing live dot by the data date, skeleton shimmer, share bars and the growth line drawing once, 150ms hover/press feedback, a gentle flicker on the streak flame icon, the due streak month's slow ring, and the confetti when the streak goes up. Every loop sits in `<Loop>`/`useActive` and pauses offscreen or when the tab is hidden. Under `prefers-reduced-motion` nothing moves spatially or loops: the audit figure shows its resolved state (also the SSR markup), and only colour/opacity state changes remain.

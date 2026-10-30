# SAP / WMS Command Center — Next.js

Next.js 15 (App Router) + React 19 + TypeScript port of `MyDashboard.html`, rebuilt
with **Tailwind CSS v4**, **shadcn/ui**, and **lucide-react** icons.

## Run

```bash
pnpm install
pnpm dev                     # http://localhost:3000
pnpm build && pnpm start     # production
```

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (CSS-first config; `app/globals.css`) + **shadcn/ui** (Radix)
- **lucide-react** for icons; **next-themes** for dark mode; **sonner** for toasts
- **Chart.js** (analytics) and **SheetJS `xlsx`** (Excel I/O, loaded on demand)

## Structure

```
app/
  layout.tsx        root layout + metadata, ThemeProvider (next-themes) + Toaster (sonner)
  page.tsx          renders <Dashboard />
  globals.css       Tailwind v4 entry + shadcn design tokens (palette mapped 1:1)
components/
  Dashboard.tsx     all state: projects, notes, pins, filters, theme, modals, toasts
  KpiStrip.tsx  OverviewView.tsx  ProjectsView.tsx  AnalyticsView.tsx
  NotesView.tsx  PinBoardView.tsx  QuarterSummary.tsx  NoteCard.tsx  NoteComposer.tsx
  ui.tsx            shared kit: PinMark (🔨), ProjectRow, Bar, StatusRing, badges, row actions, fields
  ui/               shadcn/ui primitives (button, badge, dialog, alert-dialog, input, textarea,
                    select, tabs, table, checkbox, slider, scroll-area, sonner)
  desktop/          floating always-on-top pinned window
  modals/           ProjectModal (add / edit / convert note), ConfirmDelete, NoteEdit, Pin, AddPin
lib/
  types.ts  constants.ts  utils.ts (cn + helpers)  seed.ts
  excel.ts          Excel upload parsing + 3-sheet export (SheetJS, loaded on demand)
  usePersistentState.ts   hydration-safe localStorage hook
components.json       shadcn configuration
postcss.config.mjs     Tailwind v4 PostCSS plugin
```

## Pinning & the desktop

- Click the pin button on any project row: it becomes 🔨, the row gets an amber highlight, and it lands on the Pin Board
  (change the marker in one place: `PIN_EMOJI` in `lib/constants.ts`).
- **Pop out on desktop** (Pin Board, or the header button) opens a small always-on-top window of pinned items in
  Chrome/Edge that updates live; other browsers get a normal popup.
- **Reminders on** sends desktop notifications per pin (daily / weekly) while the dashboard is open.
- In Chrome/Edge use *Install app* (address-bar icon) to run it as its own desktop window with a taskbar icon.

Keyboard: `/` search · `n` new project · `1–5` tabs · `?` help · `Ctrl+Enter` save in forms.

## Behaviour notes

- Projects, notes, pins and the active tab persist in localStorage. "Reset sample data" (All Projects tab)
  restores the seed list, with Undo.
- The theme (light/dark) is handled by `next-themes` and persists across reloads.
- `xlsx` is installed from SheetJS's official CDN tarball (the npm registry copy is
  outdated and has known advisories).
- The original colour palette (accent/done/wip/parked/open + quarters) is preserved
  through CSS variables in `app/globals.css`, exposed as Tailwind tokens
  (`bg-status-done-bg`, `text-status-wip-txt`, `bg-q2-bg`, …).

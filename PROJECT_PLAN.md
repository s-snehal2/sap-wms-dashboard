# SAP / WMS Command Center — Project Documentation & Roadmap

> FY 2026-27 · AD & ND Plants
> **Last updated:** 2026-10-30

A Next.js port of the standalone `MyDashboard.html`, now built with Tailwind CSS v4
and shadcn/ui. This document is the single source of truth for what the application
does today and what is planned next. The **Status Tracker** at the bottom is the
living checklist — update it as work progresses.

---

## 1. Overview

The SAP/WMS Command Center is a single-page dashboard for tracking SAP / WMS
projects, capturing notes and ideas, and pinning high-priority items for daily
monitoring across two plants (AD & ND).

- Five tabs: **Overview**, **All Projects**, **Analytics**, **Notes & Ideas**, **Pin Board**
- Project CRUD with conversions from notes
- KPI strip + quarter-wise filtering
- Excel import and 3-sheet export (SheetJS, loaded on demand)
- Dark / light theme (persisted via next-themes)
- Projects, notes, pins and the last open tab persist in `localStorage` (with a "Reset sample data" link + undo)
- Pinned items are marked 🔨 everywhere, can float in an always-on-top desktop window, and send desktop reminders

---

## 2. Tech Stack

| Layer       | Choice                                                          |
| ----------- | --------------------------------------------------------------- |
| Framework   | Next.js 15 (App Router)                                         |
| UI          | React 19                                                        |
| Language    | TypeScript (strict)                                             |
| Styling     | **Tailwind CSS v4** (CSS-first config)                          |
| UI kit      | **shadcn/ui** (Radix primitives, "new-york")                    |
| Icons       | **lucide-react**                                                |
| Theming     | **next-themes** (class-based `dark`) — persisted                 |
| Toasts      | **sonner**                                                      |
| Charts      | Chart.js 4 (`chart.js/auto`)                                    |
| Spreadsheet | SheetJS (`xlsx` 0.20.3, from official CDN tarball)              |
| Package Mgr | pnpm                                                            |
| Linting     | `next lint` script — **no ESLint config yet**                   |
| Testing     | **None configured**                                             |

---

## 3. Architecture & File Map

```
app/
  layout.tsx            Root layout, metadata, ThemeProvider + Toaster
  page.tsx              Renders <Dashboard />
  globals.css           Tailwind v4 entry + shadcn design tokens (palette mapped 1:1)
components/
  Dashboard.tsx         Top-level state: projects, notes, pins, filters, theme, modals, toasts
  KpiStrip.tsx          Clickable KPI cards (Total / WIP / Done / Parked / Avg)
  OverviewView.tsx      Active projects, status ring, avg-by-type, quarter summary, all-projects list
  ProjectsView.tsx      Sortable/filterable project table (shadcn Table)
  AnalyticsView.tsx     Chart.js donut + top-12 bar + parked list
  NotesView.tsx         Note composer, category filter pills, note grid
  NoteCard.tsx          Individual note card (edit / convert / delete)
  NoteComposer.tsx      Reusable textarea + category select (page & inline variants)
  PinBoardView.tsx      Pinned cards, quarter summary, sort + filter
  QuarterSummary.tsx    Quarter-wise project cards with click-to-filter
  ui.tsx                Shared kit: Section, Badge/StatusBadge/QBadge/PidBadge, PinMark (🔨), Bar/ProgressBar,
                        StatusRing, ProjectRow, RowActions, FilterPill, Field, SelectField, class strings
  ui/                   shadcn/ui primitives (button, badge, dialog, alert-dialog, input,
                        textarea, select, tabs, table, checkbox, slider, scroll-area, sonner)
  desktop/
    useFloatingWindow.ts  Opens a Document Picture-in-Picture window (Chrome/Edge) or popup fallback
    FloatingPins.tsx      Live pinned-project list portalled into that window
  modals/
    ProjectModal.tsx    Add / edit / convert-note project form (Dialog)
    ConfirmDeleteModal  Delete confirmation (AlertDialog)
    NoteEditModal.tsx   Edit a note (Dialog)
    PinModal.tsx        Create / edit a pin (Dialog)
    AddPinModal.tsx     Pick a project to pin (Dialog)
lib/
  types.ts              Status, Quarter, Project, Note, Pin, ToastType, TabId
  constants.ts          Status colors, quarters, note categories, options, class maps, storage keys
  utils.ts              cn() + status/type/quarter classes, pct parsing, pid formatting, averages
  seed.ts               SEED_PROJECTS (24) + SEED_NOTES (6)
  excel.ts              parseProjectsFile() + exportWorkbook() (3 sheets)
  usePersistentState.ts hydration-safe localStorage hook
  usePinReminders.ts    desktop notifications per pin remind interval
app/manifest.ts         PWA manifest (install as a desktop app in Chrome/Edge)
components.json         shadcn configuration
postcss.config.mjs      Tailwind v4 PostCSS plugin
```

All interactive components are client components (`"use client"`). There is no
server-side data layer; `app/page.tsx` simply mounts `<Dashboard />`.

---

## 4. Features

### 4.1 Overview tab
- **Active projects** panel (WIP + Parked) with progress bars and row actions.
- **Status ring** (SVG donut) with WIP / Done / Parked / Open legend counts.
- **Avg progress by type** (MIS / New Process / Project).
- **Quarter-wise summary** cards — click a quarter to filter all projects.
- **All projects list** sorted by progress; edit / pin / delete per row.

### 4.2 All Projects tab
- Filter pills: `All · WIP · Parked · Open · Done · MIS · New Process · Project · AD · ND · Q1–Q4`.
- Sortable columns (ID, Sr., Project, Type, Plant, System, Quarter, Progress).
- Inline progress bar colored by status; add-project button.

### 4.3 Analytics tab
- Completion-rate ring.
- Status-breakdown doughnut chart (Chart.js).
- Top 12 projects by completion (horizontal bar, colored by status).
- Parked projects list ("needs attention").

### 4.4 Notes & Ideas tab
- Compose a note with a category: `idea · discussion · issue · research · requirement`.
- Category filter pills + live count.
- Cards support **Edit**, **→ Project** (convert), and **Delete**.
- Converted notes show the generated project ID and are struck through.

### 4.5 Pin Board tab
- Pin any project with priority (`critical/high/medium/low`), a reminder interval
  (`daily/weekly/always`), and an optional pin note.
- Sort by priority / progress / recently pinned; local search filter.
- Quarter-wise pinned summary.
- Unpin or jump to project edit from a card.

### 4.6 Cross-cutting
- **Global search** (project name, ID, plant, system, type).
- **KPI strip filters** drive the Overview project list.
- **Theme toggle** (light/dark) via next-themes; persists across reloads.
- **Toast** notifications via sonner (success / error / info).
- **Excel** upload (import projects) and download (export workbook).

---

## 5. Data Model (`lib/types.ts`)

| Type       | Fields                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------- |
| `Project`  | `pid, sr, name, type, plant, sys, mod, phase, status, pct, notes, quarter`               |
| `Note`     | `id, cat, text, date, converted, projPid`                                                |
| `Pin`      | `pid, priority, note, remind, addedAt`                                                   |
| `Status`   | `"Done" \| "WIP" \| "Parked" \| "Open"`                                                   |
| `NoteCat`  | `"idea" \| "discussion" \| "issue" \| "research" \| "requirement"`                       |
| `Priority` | `"critical" \| "high" \| "medium" \| "low"`                                              |
| `Quarter`  | `"Q1" \| "Q2" \| "Q3" \| "Q4"`                                                           |
| `TabId`    | `"overview" \| "projects" \| "analytics" \| "notes" \| "pinboard"`                       |

Selector option lists live in `lib/constants.ts` (`OPTIONS`): type, plant,
system, module, status, phase. Tailwind class maps for status/quarter/note-category
live there too so dynamic values stay build-visible to Tailwind.

---

## 6. State & Persistence

| Data          | Storage        | Key                       | Persists? |
| ------------- | -------------- | ------------------------- | --------- |
| Projects      | localStorage   | `sap_wms_projects_v1`     | ✅ (Reset sample data + Undo) |
| Notes         | localStorage   | `sap_wms_notes_v1`        | ✅ |
| Pins          | localStorage   | `sap_wms_pins_v1`         | ✅ |
| Theme         | localStorage (next-themes) | `theme`       | ✅ |
| Active tab    | localStorage   | `sap_wms_tab_v1`          | ✅ |
| Reminders     | localStorage   | `sap_wms_notify_v1`, `sap_wms_reminded_v1` | ✅ |
| Filters       | Component state| —                         | ❌ |

`usePersistentState` (`lib/usePersistentState.ts`) reads **after mount** so
server and client render the same seed first, then writes only once hydrated.

> Project IDs are assigned by a session `pidCounter` (`formatPid`) so IDs are
> never reused after a delete within the same session.

---

## 7. Excel Import / Export (`lib/excel.ts`)

**Import** — `parseProjectsFile(file)` reads the first sheet and maps headers:
`Sr.No, Project ID, Project Details / Project Name, Project Type, Plant,
System, Module, Project Phase, Project Status, % Work, Tasks Details,
Quarter / Qtr / FY Quarter`. `% Work` accepts both `0.75` and `75`.

**Export** — `exportWorkbook(projects, notes)` writes three sheets:
1. `Projects` — all project fields (`% Work` formatted as percent).
2. `Notes & Ideas` — note id, category, text, date, converted flag, project ID.
3. `Summary` — totals, WIP/Done/Parked/Open counts, average progress, note stats.

Filename: `SAP_WMS_Dashboard_<YYYY-MM-DD>.xlsx`.

---

## 8. UI Migration — Tailwind v4 + shadcn/ui + lucide (completed)

The presentation layer was rewritten from hand-written CSS to Tailwind v4 with
shadcn/ui primitives and lucide icons. All features and behaviour are unchanged;
the original visual design was preserved by mapping the palette into design tokens.

**Token mapping** (`app/globals.css`): `--primary` = `#7F77DD` (accent);
status and quarter colours exposed as `--color-status-*` / `--color-q*` with
light values in `:root` and dark overrides in `.dark`.

**Icon mapping** (old `Icons.tsx` → lucide): Plus→`Plus`, Search→`Search`,
Upload/Download→`Upload`/`Download`, Pencil/Trash→`Pencil`/`Trash2`,
Pin/Unpin→`Pin`/`PinOff`, Doc→`FileText`, Check→`Check`, Brand→`LayoutGrid`,
theme ☀/🌙→`Sun`/`Moon`.

**Component mapping**: custom `Modal`/`ModalTitle` → `Dialog`; delete confirm →
`AlertDialog`; custom `Select` → shadcn `Select`; custom badges/progress/rows →
shadcn `Badge`/`Progress` + Tailwind. Custom toast state → `sonner`; custom
`data-theme` toggle → `next-themes`.

### 8.1 Migration track
| ID     | Step                                                             | Status |
| ------ | ---------------------------------------------------------------- | ------ |
| UI-1   | Install Tailwind v4 + shadcn deps (lucide, cva, clsx, tailwind-merge, next-themes, sonner, Radix) | ✅ Done |
| UI-2   | Configure Tailwind (`postcss.config.mjs`, `components.json`), add `cn()` to `lib/utils.ts` | ✅ Done |
| UI-3   | Rewrite `globals.css` with palette-mapped tokens + dark mode      | ✅ Done |
| UI-4   | Add shadcn primitives under `components/ui/`                      | ✅ Done |
| UI-5   | Rewrite shared kit (`ui.tsx`) + swap `Icons.tsx` for lucide       | ✅ Done |
| UI-6   | Migrate leaf components (KpiStrip, QuarterSummary, NoteCard, NoteComposer) | ✅ Done |
| UI-7   | Migrate views (Overview, Projects, Analytics, Notes, PinBoard)    | ✅ Done |
| UI-8   | Migrate modals to shadcn Dialog / AlertDialog                     | ✅ Done |
| UI-9   | Migrate Dashboard shell (Tabs, nav, sonner toasts, next-themes)   | ✅ Done |
| UI-10  | Verify build / typecheck / runtime smoke test                     | ✅ Done |

---

## 9. Roadmap / Enhancement Backlog

Status legend: `⬜ Planned` · `🔄 In Progress` · `✅ Done` · `⛔ Blocked` · `⏸ Deferred`
Effort: `S` ≈ ≤1 day · `M` ≈ 2–5 days · `L` ≈ >1 week

### 9.1 Data & Persistence
| ID      | Item                                                                 | Priority | Effort | Status | Notes |
| ------- | -------------------------------------------------------------------- | -------- | ------ | ------ | ----- |
| DATA-1  | Persist projects to localStorage (currently reset to seed on reload) | High     | M      | ✅ Done | Keep an explicit "reset to seed" button |
| DATA-3  | Optional backend API + database for shared multi-user data           | High     | L      | ⬜ Planned | Enables collaboration beyond one browser |

### 9.2 Import / Export
| ID      | Item                                                   | Priority | Effort | Status | Notes |
| ------- | ------------------------------------------------------ | -------- | ------ | ------ | ----- |
| IO-1    | Import notes from Excel (only projects importable now) | Medium   | M      | ⬜ Planned | Mirror the export sheet 2 schema |
| IO-2    | Add CSV / PDF / print export                           | Medium   | M      | ⬜ Planned | PDF via browser print or a lib |
| IO-3    | Validate + preview rows before applying an upload      | Medium   | M      | ⬜ Planned | Prevent silent bad imports |

### 9.3 Features
| ID      | Item                                                              | Priority | Effort | Status | Notes |
| ------- | ----------------------------------------------------------------- | -------- | ------ | ------ | ----- |
| FEAT-1  | Global search across notes & pins (search is projects-only today) | Medium   | S      | ⬜ Planned | Extend `filtered` logic in `Dashboard.tsx` |
| FEAT-2  | Real reminders/notifications using the pin `remind` field         | Medium   | M      | ✅ Done | Field is display-only today |
| FEAT-3  | Undo action for deletes (currently immediate)                     | Medium   | S      | ✅ Done | Toast action + short buffer |
| FEAT-4  | More analytics (trends over time, by plant/module)                | Low      | M      | ⬜ Planned | Build on Chart.js setup |

### 9.4 Quality & Tooling
| ID      | Item                                                       | Priority | Effort | Status | Notes |
| ------- | ---------------------------------------------------------- | -------- | ------ | ------ | ----- |
| QA-1    | Add ESLint config (`next lint` referenced, no config/dep)  | High     | S      | ⬜ Planned | `eslint-config-next` |
| QA-2    | Add unit/component tests (Vitest + React Testing Library)  | High     | M      | ⬜ Planned | Cover utils + excel + views |
| QA-3    | Add error boundary + graceful failure handling             | Medium   | S      | ⬜ Planned | Wrap Dashboard |
| QA-4    | Accessibility: modal focus trapping + keyboard navigation  | Medium   | M      | ⬜ Planned | Radix Dialog handles most of this already |

### 9.5 Tech Debt
| ID      | Item                                                                        | Priority | Effort | Status | Notes |
| ------- | --------------------------------------------------------------------------- | -------- | ------ | ------ | ----- |
| DEBT-1  | Remove dead CSS (`.view`, `.g3`, `.q-filter-active`, `.pin-meta-tag`, `.pin-from-note`) | Low | S | ✅ Done | Removed by the Tailwind rewrite |
| DEBT-2  | Reconcile `status` vs `phase` (`PRD-Live` treated as Done in places)        | Low      | S      | ⬜ Planned | See `normStatus` / `statusClass` |
| DEBT-3  | Clarify KPI-filter vs project-filter interaction                            | Low      | S      | ✅ Done | Two filters affect the list |
| DEBT-4  | Add `eslint` + unused-file check to catch stale shadcn primitives           | Low      | S      | ✅ Done | e.g. `progress.tsx` / `tooltip.tsx` may be unused |

---

## 10. Status Tracker (master table)

| ID      | Area      | Item                                              | Priority | Effort | Status     |
| ------- | --------- | ------------------------------------------------- | -------- | ------ | ---------- |
| UI-1    | Migration | Install Tailwind + shadcn deps                    | High     | S      | ✅ Done |
| UI-2    | Migration | Configure Tailwind + cn()                         | High     | S      | ✅ Done |
| UI-3    | Migration | Rewrite globals.css tokens                        | High     | M      | ✅ Done |
| UI-4    | Migration | Add shadcn primitives                             | High     | M      | ✅ Done |
| UI-5    | Migration | Shared kit + lucide icons                         | High     | M      | ✅ Done |
| UI-6    | Migration | Leaf components                                   | Medium   | M      | ✅ Done |
| UI-7    | Migration | Views                                             | Medium   | L      | ✅ Done |
| UI-8    | Migration | Modals                                            | Medium   | M      | ✅ Done |
| UI-9    | Migration | Dashboard shell                                   | High     | M      | ✅ Done |
| UI-10   | Migration | Verify build / typecheck / smoke test             | High     | S      | ✅ Done |
| DATA-1  | Data      | Persist projects                                  | High     | M      | ✅ Done |
| DATA-3  | Data      | Backend API + database                            | High     | L      | ⬜ Planned |
| IO-1    | Excel     | Import notes                                      | Medium   | M      | ⬜ Planned |
| IO-2    | Excel     | CSV / PDF / print export                          | Medium   | M      | ⬜ Planned |
| IO-3    | Excel     | Upload validation + preview                       | Medium   | M      | ⬜ Planned |
| FEAT-1  | Feature   | Global search across notes & pins                 | Medium   | S      | ⬜ Planned |
| FEAT-2  | Feature   | Pin reminders / notifications                     | Medium   | M      | ✅ Done |
| FEAT-3  | Feature   | Undo deletes                                      | Medium   | S      | ✅ Done |
| FEAT-4  | Feature   | Expanded analytics                                | Low      | M      | ⬜ Planned |
| QA-1    | Quality   | ESLint config                                     | High     | S      | ⬜ Planned |
| QA-2    | Quality   | Unit/component tests                              | High     | M      | ⬜ Planned |
| QA-3    | Quality   | Error boundary                                    | Medium   | S      | ⬜ Planned |
| QA-4    | Quality   | Modal focus trapping / a11y                       | Medium   | M      | ⬜ Planned |
| DEBT-1  | Debt      | Remove dead CSS                                   | Low      | S      | ✅ Done |
| DEBT-2  | Debt      | Reconcile status vs phase                         | Low      | S      | ⬜ Planned |
| DEBT-3  | Debt      | Clarify filter interaction                        | Low      | S      | ✅ Done |
| DEBT-4  | Debt      | Add eslint + unused-file check                    | Low      | S      | ✅ Done |

### How to track
- Move an item to `🔄 In Progress` when work starts; `✅ Done` only when merged/verified.
- Use `⛔ Blocked` with a reason in Notes, or `⏸ Deferred` when deprioritized.
- Add a dated line to the Changelog whenever a status changes.

---

## 11. Known Issues / Tech Debt

- **No ESLint config** even though `package.json` exposes `next lint`.
- **No tests** — no runner, no specs.
- **Reminders need the dashboard open** — notifications come from the open tab / installed app window;
  a fully closed browser can't notify (would need Web Push + a backend, or an Electron/Tauri wrapper).
- **Always-on-top floating window is Chrome/Edge only** (Document Picture-in-Picture); other browsers get a normal popup.
- **`PRD-Live` ambiguity** — `normStatus` maps it to `Done` for status, but it
  remains the value of `phase`; two different fields can both read "done".
- **Doc drift risk** — README / PROJECT_PLAN must stay in sync with actual files.

---

## 12. Changelog

| Date       | Change                                                             |
| ---------- | ------------------------------------------------------------------ |
| 2026-10-16 | Created PROJECT_PLAN.md — full app documentation + enhancement backlog. |
| 2026-10-16 | Migrated UI to Tailwind CSS v4 + shadcn/ui + lucide-react; dark mode via next-themes, toasts via sonner. Build, typecheck and runtime smoke test pass. |
| 2026-10-30 | 🔨 pin marker + amber highlight on every pinned row/card; one-click pin with "Add details"; 🔨 Pinned filter & KPI card; inline priority on Pin Board. |
| 2026-10-30 | UX: projects/tab persist, undo for deletes/unpins/uploads/reset, active-filter chips, clickable rows & chart bars, keyboard shortcuts (/, n, 1–5, ?, Ctrl+Enter). |
| 2026-10-30 | Desktop: floating always-on-top pinned window, desktop reminders, PWA manifest + icon. |
| 2026-10-30 | De-duplication: shared Section/ProjectRow/Bar/StatusRing/PidBadge/FilterPill; QuarterSummary reused by Pin Board; Analytics doughnut replaced by StatusRing; option lists centralised; Excel import de-dupes IDs/rows; removed unused card/label/progress/separator/tooltip + 4 Radix deps. |

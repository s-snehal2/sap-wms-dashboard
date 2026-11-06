"use client";
import { useMemo, useState } from "react";
import { CornerDownLeft, ExternalLink, RotateCcw, Search, X } from "lucide-react";

import { PIN_EMOJI, QUARTER_LABELS, STATUS_KEYS, statusColor } from "@/lib/constants";
import type { Project, Quarter, Remark } from "@/lib/types";
import { cn, qOf } from "@/lib/utils";
import { formatDateTime } from "./Remarkpanel";
import { Bar, PidBadge, StatusBadge } from "./ui";

/*
 * Analytics explorer: click any tile, bar, cell or row to filter EVERYTHING.
 * Filters combine; each chart ignores its own filter so every option stays visible (cross-filtering).
 */

interface Props {
  projects: Project[];
  remarks: Remark[];
  isPinned: (pid: string) => boolean;
  onTogglePin: (pid: string) => void;
  /** Opens the project's edit dialog. */
  onEdit: (pid: string) => void;
  onAddRemark: (pid: string, text: string) => void;
  /** HODs and admins see other people's projects → show the People breakdown. */
  showOwner: boolean;
}

type Dim = "q" | "status" | "plant" | "sys" | "type" | "owner";
type Filters = Record<Dim, string[]> & { bucket: string | null; quiet: boolean; pinned: boolean; text: string };
type Except = Partial<Record<Dim | "bucket" | "quiet" | "pinned", boolean>>;

const EMPTY: Filters = { q: [], status: [], plant: [], sys: [], type: [], owner: [], bucket: null, quiet: false, pinned: false, text: "" };
const QS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];
const BUCKETS: [string, number, number][] = [["0%", 0, 0], ["1–25%", 1, 25], ["26–50%", 26, 50], ["51–75%", 51, 75], ["76–100%", 76, 100]];
const QUIET_DAYS = 14;
const DIM_LABEL: Record<Dim, string> = { q: "Quarter", status: "Status", plant: "Plant", sys: "System", type: "Type", owner: "Person" };

const card = "bg-card border rounded-2xl px-5 py-4 min-w-0";
const h2 = "text-[15px] font-semibold";
const hint = "text-[11px] text-fg3";
const selected = "border-primary ring-2 ring-primary/25 bg-accent";
const avg = (ps: Project[]) => (ps.length ? Math.round(ps.reduce((s, p) => s + p.pct, 0) / ps.length) : 0);
const ownerOf = (p: Project) => p.ownerName || "—";
/** Empty values show as "—" (so they still get a label in every chart and filter). */
const plantOf = (p: Project) => p.plant?.trim() || "—";
const sysOf = (p: Project) => p.sys?.trim() || "—";
const typeOf = (p: Project) => p.type?.trim() || "—";
/** Distinct values, most common first. */
const valuesOf = (ps: Project[], f: (p: Project) => string) => {
  const m = new Map<string, number>();
  ps.forEach((p) => m.set(f(p), (m.get(f(p)) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
};

export default function AnalyticsView({ projects, remarks, isPinned, onTogglePin, onEdit, onAddRemark, showOwner }: Props) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<"pct" | "status" | "pid">("pct");
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const toggle = (dim: Dim, v: string) =>
    setF((cur) => ({ ...cur, [dim]: cur[dim].includes(v) ? cur[dim].filter((x) => x !== v) : [...cur[dim], v] }));
  const clearAll = () => setF(EMPTY);

  /* ── remarks per project → latest remark + "quiet" projects ── */
  const { latestBy, remarksBy, quiet } = useMemo(() => {
    const by = new Map<string, Remark[]>();
    remarks.forEach((r) => by.set(r.pid, [...(by.get(r.pid) ?? []), r]));
    by.forEach((list) => list.sort((a, b) => b.at.localeCompare(a.at)));
    const cutoff = Date.now() - QUIET_DAYS * 86_400_000;
    const q = new Set(
      projects.filter((p) => p.status !== "Done" && !((by.get(p.pid)?.[0] && new Date(by.get(p.pid)![0].at).getTime() >= cutoff))).map((p) => p.pid)
    );
    return { remarksBy: by, latestBy: new Map([...by].map(([k, v]) => [k, v[0]])), quiet: q };
  }, [projects, remarks]);

  /* ── filtering ── */
  const match = (p: Project, ex: Except = {}) => {
    const dims: [Dim, string][] = [["q", qOf(p)], ["status", p.status], ["plant", plantOf(p)], ["sys", sysOf(p)], ["type", typeOf(p)], ["owner", ownerOf(p)]];
    for (const [d, v] of dims) if (!ex[d] && f[d].length && !f[d].includes(v)) return false;
    if (!ex.bucket && f.bucket) {
      const b = BUCKETS.find((x) => x[0] === f.bucket)!;
      if (p.pct < b[1] || p.pct > b[2]) return false;
    }
    if (!ex.quiet && f.quiet && !quiet.has(p.pid)) return false;
    if (!ex.pinned && f.pinned && !isPinned(p.pid)) return false;
    const t = f.text.trim().toLowerCase();
    if (t && !`${p.name} ${p.pid} ${p.notes}`.toLowerCase().includes(t)) return false;
    return true;
  };
  const pick = (ex?: Except) => projects.filter((p) => match(p, ex));
  const F = pick();
  const anyFilter = JSON.stringify(f) !== JSON.stringify(EMPTY);
  const count = (ps: Project[], s: string) => ps.filter((p) => p.status === s).length;

  const plants = valuesOf(projects, plantOf);
  const systems = valuesOf(projects, sysOf);
  const types = valuesOf(projects, typeOf);
  const owners = valuesOf(projects, ownerOf);

  /* ── chips ── */
  const chips: { label: string; remove: () => void }[] = [];
  (Object.keys(DIM_LABEL) as Dim[]).forEach((d) => f[d].forEach((v) => chips.push({ label: `${DIM_LABEL[d]}: ${v}`, remove: () => toggle(d, v) })));
  if (f.bucket) chips.push({ label: `Progress: ${f.bucket}`, remove: () => setF((c) => ({ ...c, bucket: null })) });
  if (f.quiet) chips.push({ label: `Quiet ${QUIET_DAYS}+ days`, remove: () => setF((c) => ({ ...c, quiet: false })) });
  if (f.pinned) chips.push({ label: `${PIN_EMOJI} Pinned`, remove: () => setF((c) => ({ ...c, pinned: false })) });
  if (f.text.trim()) chips.push({ label: `Search: “${f.text.trim()}”`, remove: () => setF((c) => ({ ...c, text: "" })) });

  /* ── chart inputs (each ignores its own filter) ── */
  const QP = pick({ q: true });
  const maxQ = Math.max(1, ...QS.map((q) => QP.filter((p) => qOf(p) === q).length));
  const SP = pick({ status: true });
  const HP = pick({ plant: true, sys: true });
  const TP = pick({ type: true });
  const OP = pick({ owner: true });
  const BP = pick({ bucket: true });
  const bucketN = BUCKETS.map((b) => BP.filter((p) => p.pct >= b[1] && p.pct <= b[2]).length);
  const maxB = Math.max(1, ...bucketN);
  const maxHeat = Math.max(1, ...plants.flatMap((pl) => systems.map((sy) => HP.filter((p) => plantOf(p) === pl && sysOf(p) === sy).length)));

  const statusOnly = (s: string) => f.status.length === 1 && f.status[0] === s;
  const kpis = [
    { label: "Projects", value: F.length, sub: `${avg(F)}% average progress`, color: "var(--primary)", on: false, onClick: () => setF((c) => ({ ...c, status: [] })) },
    ...(
      [
        ["WIP", "In progress"],
        ["Done", "Completed"],
        ["Parked", "Parked"],
        ["Open", "Open"],
      ] as const
    ).map(([s, label]) => ({
      label,
      value: count(F, s),
      sub: F.length ? `${Math.round((count(F, s) / F.length) * 100)}% of selection` : "—",
      color: statusColor(s),
      on: statusOnly(s),
      onClick: () => setF((c) => ({ ...c, status: statusOnly(s) ? [] : [s] })),
    })),
    {
      label: `Quiet ${QUIET_DAYS}+ days`,
      value: F.filter((p) => quiet.has(p.pid)).length,
      sub: "not done · no recent remark",
      color: "#C2410C",
      on: f.quiet,
      onClick: () => setF((c) => ({ ...c, quiet: !c.quiet })),
    },
    {
      label: `${PIN_EMOJI} Pinned`,
      value: F.filter((p) => isPinned(p.pid)).length,
      sub: "your pins in selection",
      color: "#D97706",
      on: f.pinned,
      onClick: () => setF((c) => ({ ...c, pinned: !c.pinned })),
    },
  ];

  const order: Record<string, number> = { Parked: 0, WIP: 1, Open: 2, Done: 3 };
  const rows = [...F].sort((a, b) =>
    sort === "pid" ? a.pid.localeCompare(b.pid) : sort === "status" ? (order[a.status] ?? 9) - (order[b.status] ?? 9) || b.pct - a.pct : b.pct - a.pct || a.pid.localeCompare(b.pid)
  );
  const detail = open ? projects.find((p) => p.pid === open) : undefined;

  const addRemark = () => {
    const t = draft.trim();
    if (!t || !detail) return;
    onAddRemark(detail.pid, t);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[18px] font-semibold">{anyFilter ? `${F.length} of ${projects.length} projects` : `All ${projects.length} projects`}</div>
          <div className={hint}>Click any tile, bar, cell or row to filter everything · click again to undo</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 h-9 px-3 rounded-lg border bg-card min-w-[240px]">
            <Search className="size-3.5 text-fg3" />
            <span className="sr-only">Search projects</span>
            <input
              type="search"
              value={f.text}
              onChange={(e) => setF((c) => ({ ...c, text: e.target.value }))}
              placeholder="Search name, ID or notes…"
              className="flex-1 bg-transparent outline-none text-xs"
            />
          </label>
          <button onClick={clearAll} disabled={!anyFilter} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border bg-card text-xs font-medium hover:border-primary disabled:opacity-40">
            <RotateCcw className="size-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Active filters */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
          <span className={hint}>Filtered by</span>
          {chips.map((c) => (
            <button key={c.label} onClick={c.remove} className="inline-flex items-center gap-1.5 h-7 pl-3 pr-2 rounded-full border border-primary/40 bg-accent text-accent-foreground text-[11px] font-semibold hover:border-primary" aria-label={`Remove ${c.label}`}>
              {c.label} <X className="size-3" />
            </button>
          ))}
          <button onClick={clearAll} className="text-[11px] font-semibold text-accent-foreground hover:underline px-1">
            Clear all
          </button>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        {kpis.map((k) => (
          <button key={k.label} onClick={k.onClick} aria-pressed={k.on} className={cn("text-left flex flex-col gap-1.5 px-4 py-3 rounded-2xl border bg-card transition-colors hover:border-primary/60 min-h-[96px]", k.on && selected)}>
            <span className="flex items-center gap-2 text-[11px] font-semibold text-fg2">
              <span className="size-2.5 rounded-[3px]" style={{ background: k.color }} />
              {k.label}
            </span>
            <span className="text-[26px] font-semibold leading-none tabular-nums">{k.value}</span>
            <span className={hint}>{k.sub}</span>
          </button>
        ))}
      </div>

      {/* Quarter + status */}
      <div className="grid grid-cols-12 gap-4 max-[900px]:grid-cols-1">
        <section className={cn(card, "col-span-7 max-[900px]:col-span-1")}>
          <div className="flex justify-between items-baseline mb-3">
            <h2 className={h2}>Projects by quarter</h2>
            <span className={hint}>click a bar · stacked by status</span>
          </div>
          <div className="grid grid-cols-4 gap-4 items-end h-[220px]">
            {QS.map((q) => {
              const ps = QP.filter((p) => qOf(p) === q);
              const on = f.q.includes(q);
              const dim = f.q.length > 0 && !on;
              return (
                <button
                  key={q}
                  onClick={() => toggle("q", q)}
                  aria-pressed={on}
                  aria-label={`${q}: ${ps.length} projects, ${avg(ps)}% average`}
                  className={cn("flex flex-col items-center justify-end gap-2 h-full p-2 rounded-xl border-2 border-transparent transition-all hover:bg-bg2", on && "border-primary bg-accent", dim && "opacity-45")}
                >
                  <span className="text-[13px] font-semibold tabular-nums">
                    {ps.length} <span className="text-fg3 font-normal text-[11px]">· {avg(ps)}%</span>
                  </span>
                  <span className="flex flex-col-reverse w-full max-w-[84px] rounded-lg overflow-hidden bg-bg3 transition-all" style={{ height: Math.max(4, Math.round((ps.length / maxQ) * 140)) }}>
                    {STATUS_KEYS.filter((s) => count(ps, s)).map((s) => (
                      <span key={s} className="block w-full" style={{ height: `${(count(ps, s) / ps.length) * 100}%`, background: statusColor(s) }} />
                    ))}
                  </span>
                  <span className="text-[12px] font-bold">
                    {q} <span className="font-normal text-fg3 text-[11px]">{QUARTER_LABELS[q].replace(/^Q\d\s*/, "")}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={cn(card, "col-span-5 max-[900px]:col-span-1 flex flex-col gap-3")}>
          <div className="flex justify-between items-baseline">
            <h2 className={h2}>Status</h2>
            <span className={hint}>pick one or more</span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden bg-bg3">
            {STATUS_KEYS.filter((s) => count(SP, s)).map((s) => (
              <span key={s} className="block h-full transition-all" style={{ width: `${(count(SP, s) / SP.length) * 100}%`, background: statusColor(s) }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_KEYS.map((s) => {
              const n = count(SP, s);
              const on = f.status.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggle("status", s)}
                  aria-pressed={on}
                  className={cn("text-left flex flex-col gap-1.5 px-3.5 py-3 rounded-xl border bg-bg2 transition-all hover:border-primary/60", on && selected, f.status.length > 0 && !on && "opacity-50")}
                >
                  <span className="flex items-center gap-2 text-[12px] font-semibold">
                    <span className="size-2.5 rounded-[3px]" style={{ background: statusColor(s) }} />
                    {s}
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[22px] font-semibold leading-none tabular-nums">{n}</span>
                    <span className={hint}>{SP.length ? Math.round((n / SP.length) * 100) : 0}%</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Plant × System, type, progress */}
      <div className="grid grid-cols-12 gap-4 max-[900px]:grid-cols-1">
        <section className={cn(card, "col-span-6 max-[900px]:col-span-1")}>
          <div className="flex justify-between items-baseline mb-3">
            <h2 className={h2}>Plant × System</h2>
            <span className={hint}>click a cell</span>
          </div>
          <div className="overflow-x-auto">
            <div className="grid gap-1.5 min-w-[380px]" style={{ gridTemplateColumns: `76px repeat(${systems.length}, minmax(56px, 1fr))` }}>
              <span />
              {systems.map((sy) => (
                <span key={sy} className="text-[10px] font-semibold text-fg3 text-center truncate" title={sy}>
                  {sy}
                </span>
              ))}
              {plants.map((pl) => [
                <span key={pl} className="text-[12px] font-bold flex items-center truncate" title={pl}>
                  {pl}
                </span>,
                ...systems.map((sy) => {
                  const n = HP.filter((p) => plantOf(p) === pl && sysOf(p) === sy).length;
                  const on = f.plant.length === 1 && f.plant[0] === pl && f.sys.length === 1 && f.sys[0] === sy;
                  const a = n === 0 ? 0.05 : Math.min(1, 0.18 + (n / maxHeat) * 0.82);
                  return (
                    <button
                      key={pl + sy}
                      onClick={() => setF((c) => ({ ...c, plant: on ? [] : [pl], sys: on ? [] : [sy] }))}
                      aria-pressed={on}
                      aria-label={`${pl} · ${sy}: ${n} projects`}
                      className={cn("h-11 rounded-lg text-[14px] font-semibold tabular-nums transition-all border", on ? "border-foreground border-[3px]" : "border-border")}
                      style={{ background: `rgba(127, 119, 221, ${a.toFixed(2)})`, color: a > 0.55 ? "#fff" : undefined }}
                    >
                      {n}
                    </button>
                  );
                }),
              ])}
            </div>
          </div>
        </section>

        <section className={cn(card, "col-span-3 max-[900px]:col-span-1 flex flex-col gap-2")}>
          <h2 className={cn(h2, "mb-1")}>Type</h2>
          {types.map((t) => {
            const ps = TP.filter((p) => typeOf(p) === t);
            const on = f.type.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggle("type", t)}
                aria-pressed={on}
                className={cn("text-left flex flex-col gap-1.5 px-3 py-2.5 rounded-xl border bg-bg2 transition-all hover:border-primary/60", on && selected, f.type.length > 0 && !on && "opacity-50")}
              >
                <span className="flex justify-between text-[12px]">
                  <span className="font-semibold truncate">{t}</span>
                  <span className="text-fg3 shrink-0">
                    <b className="text-foreground">{ps.length}</b> · {avg(ps)}%
                  </span>
                </span>
                <Bar pct={avg(ps)} color="var(--primary)" className="flex-none" />
              </button>
            );
          })}
        </section>

        <section className={cn(card, "col-span-3 max-[900px]:col-span-1")}>
          <h2 className={cn(h2, "mb-3")}>Progress</h2>
          <div className="grid grid-cols-5 gap-1.5 items-end h-[130px]">
            {BUCKETS.map(([label], i) => {
              const on = f.bucket === label;
              return (
                <button
                  key={label}
                  onClick={() => setF((c) => ({ ...c, bucket: on ? null : label }))}
                  aria-pressed={on}
                  aria-label={`${label} progress: ${bucketN[i]} projects`}
                  className={cn("flex flex-col items-center justify-end gap-1 h-full rounded-lg hover:bg-bg2", f.bucket && !on && "opacity-40")}
                >
                  <span className="text-[11px] font-semibold tabular-nums">{bucketN[i]}</span>
                  <span className={cn("block w-full max-w-[36px] rounded-t-md rounded-b-sm transition-all", on ? "bg-accent-foreground" : "bg-primary")} style={{ height: Math.max(4, Math.round((bucketN[i] / maxB) * 96)) }} />
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-5 gap-1.5 mt-1.5 text-[9px] text-fg3 text-center">
            {BUCKETS.map(([label]) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </section>
      </div>

      {/* People (HOD / admin) */}
      {showOwner && owners.length > 1 && (
        <section className={card}>
          <div className="flex justify-between items-baseline mb-3">
            <h2 className={h2}>People</h2>
            <span className={hint}>click a person</span>
          </div>
          <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
            {owners.map((o) => {
              const ps = OP.filter((p) => ownerOf(p) === o);
              const on = f.owner.includes(o);
              return (
                <button
                  key={o}
                  onClick={() => toggle("owner", o)}
                  aria-pressed={on}
                  className={cn("grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 items-center px-3.5 py-2.5 rounded-xl border bg-bg2 text-left transition-all hover:border-primary/60", on && selected, f.owner.length > 0 && !on && "opacity-50")}
                >
                  <span className="text-[13px] font-semibold truncate">{o}</span>
                  <span className="text-[11px] text-fg3 tabular-nums">
                    <b className="text-foreground">{ps.length}</b> · {avg(ps)}%
                  </span>
                  <span className="col-span-2 flex h-2 rounded-full overflow-hidden bg-bg3">
                    {STATUS_KEYS.filter((s) => count(ps, s)).map((s) => (
                      <span key={s} className="block h-full" style={{ width: `${(count(ps, s) / ps.length) * 100}%`, background: statusColor(s) }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* List + detail */}
      <div className="grid grid-cols-12 gap-4 items-start max-[1000px]:grid-cols-1">
        <section className={cn("bg-card border rounded-2xl overflow-hidden min-w-0 col-span-8 max-[1000px]:col-span-1")}>
          <div className="flex flex-wrap justify-between items-center gap-2 px-5 py-3 border-b">
            <h2 className={h2}>{anyFilter ? `${F.length} matching project${F.length === 1 ? "" : "s"}` : "All projects"}</h2>
            <div className="flex items-center gap-1.5">
              <span className={hint}>Sort</span>
              <div className="flex bg-bg2 rounded-lg p-0.5">
                {(
                  [
                    ["pct", "Progress"],
                    ["status", "Status"],
                    ["pid", "ID"],
                  ] as const
                ).map(([k, label]) => (
                  <button key={k} onClick={() => setSort(k)} aria-pressed={sort === k} className={cn("h-7 px-2.5 rounded-md text-[11px] font-semibold text-fg3", sort === k && "bg-card text-foreground shadow-sm")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {rows.length ? (
            <div className="max-h-[520px] overflow-y-auto">
              {rows.map((p) => {
                const on = open === p.pid;
                return (
                  <button
                    key={p.pid}
                    onClick={() => setOpen(on ? null : p.pid)}
                    aria-pressed={on}
                    className={cn(
                      "grid grid-cols-[92px_minmax(0,1fr)_76px_140px] gap-3 items-center w-full px-5 py-2.5 border-t first:border-t-0 text-left text-xs transition-colors hover:bg-bg2 max-[700px]:grid-cols-[80px_minmax(0,1fr)_70px]",
                      on && "bg-accent shadow-[inset_3px_0_0_var(--primary)]"
                    )}
                  >
                    <span className="flex items-center gap-1">
                      <PidBadge pid={p.pid} />
                      {isPinned(p.pid) && <span title="Pinned">{PIN_EMOJI}</span>}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block truncate text-[10px] text-fg3">
                        {qOf(p)} · {p.plant} · {p.sys} · {p.type}
                        {showOwner && p.ownerName ? ` · ${p.ownerName}` : ""}
                      </span>
                    </span>
                    <StatusBadge status={p.status} />
                    <span className="flex items-center gap-2 max-[700px]:hidden">
                      <Bar pct={p.pct} color={statusColor(p.status)} />
                      <span className="w-8 text-right font-semibold tabular-nums">{p.pct}%</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-12 px-5 text-center text-[13px] text-fg3 flex flex-col items-center gap-3">
              No projects match these filters.
              <button onClick={clearAll} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                Clear filters
              </button>
            </div>
          )}
        </section>

        <aside className={cn(card, "col-span-4 max-[1000px]:col-span-1 flex flex-col gap-3.5 lg:sticky lg:top-0")}>
          {detail ? (
            <>
              <div className="flex items-center justify-between">
                <PidBadge pid={detail.pid} />
                <button onClick={() => setOpen(null)} aria-label="Close details" className="size-8 rounded-lg border flex items-center justify-center text-fg3 hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </div>
              <h3 className="text-[16px] font-semibold leading-snug">{detail.name}</h3>
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg2">
                <StatusBadge status={detail.status} />
                {qOf(detail)} · {detail.plant} · {detail.sys} · {detail.type}
              </div>
              {showOwner && detail.ownerName && (
                <div className="text-[12px] text-fg2">
                  Owner: <b className="text-foreground">{detail.ownerName}</b>
                  {detail.editable === false && <span className="ml-1.5 text-[10px] uppercase tracking-wide px-1.5 rounded-full bg-bg3">view only</span>}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-fg3">Progress</span>
                  <b>{detail.pct}%</b>
                </div>
                <Bar pct={detail.pct} color={statusColor(detail.status)} className="h-2.5 flex-none" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.07em] text-fg3 mb-1">Notes</div>
                <div className="text-[12px] leading-relaxed">{detail.notes || <span className="text-fg3">No notes yet.</span>}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.07em] text-fg3 mb-1.5">
                  Remarks {remarksBy.get(detail.pid)?.length ? `(${remarksBy.get(detail.pid)!.length})` : ""}
                </div>
                <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
                  {(remarksBy.get(detail.pid) ?? []).slice(0, 5).map((r, i) => (
                    <div key={r.id} className={cn("rounded-lg border px-2.5 py-1.5", i === 0 ? "bg-accent/70 border-primary/40" : "bg-bg2")}>
                      <div className={cn("text-[12px] whitespace-pre-wrap break-words", i === 0 && "text-primary font-medium")}>{r.text}</div>
                      <div className="text-[10px] text-fg3 mt-0.5">
                        {r.author ? `${r.author} · ` : ""}
                        {formatDateTime(r.at)}
                      </div>
                    </div>
                  ))}
                  {!latestBy.get(detail.pid) && <div className="text-[12px] text-fg3">No remarks yet.</div>}
                </div>
                <div className="relative mt-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRemark())}
                    placeholder="Add a remark and press Enter…"
                    aria-label={`Add remark for ${detail.pid}`}
                    maxLength={500}
                    className="w-full h-9 pl-3 pr-16 rounded-lg border bg-bg2 text-xs outline-none focus:border-primary"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[10px] text-fg3 pointer-events-none">
                    Enter <CornerDownLeft className="size-3" />
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => onTogglePin(detail.pid)}
                  aria-pressed={isPinned(detail.pid)}
                  className={cn(
                    "h-9 px-3 rounded-lg border text-xs font-semibold transition-colors",
                    isPinned(detail.pid) ? "bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200" : "bg-card hover:border-primary"
                  )}
                >
                  {isPinned(detail.pid) ? `${PIN_EMOJI} Pinned · unpin` : "Pin to board"}
                </button>
                <button onClick={() => onEdit(detail.pid)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                  Open project <ExternalLink className="size-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-[13px] text-fg3 leading-relaxed">Click a project in the list to see its details, remarks and pin it here.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

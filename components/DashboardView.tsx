"use client";
import { useMemo, useState } from "react";
import {
  AlertCircle, ArrowRight, BarChart3, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, Factory, Layers,
  Lightbulb, Pause, Play, Tag, TrendingUp, TriangleAlert, Trophy, X,
} from "lucide-react";

import { STATUS_KEYS, statusColor } from "@/lib/constants";
import type { Project, Quarter, Remark } from "@/lib/types";
import { cn, qOf } from "@/lib/utils";
import { formatDateTime } from "./Remarkpanel";
import { StatusBadge } from "./ui";

/*
 * Management dashboard (overview). Everything is live and clickable:
 * dropdowns, KPI cards, donut legends, plant bars and quarter cards filter the whole page;
 * project rows open the project.
 */

interface Props {
  projects: Project[];
  remarks: Remark[];
  onEdit: (pid: string) => void;
  /** "View all" in Needs attention → the Analytics explorer. */
  onViewAll: () => void;
}

const QS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];
const Q_META: Record<Quarter, { months: string; color: string }> = {
  Q1: { months: "Apr – Jun", color: "#3B82F6" },
  Q2: { months: "Jul – Sep", color: "#22A06B" },
  Q3: { months: "Oct – Dec", color: "#E08A1E" },
  Q4: { months: "Jan – Mar", color: "#7C5CDB" },
};
const TYPE_COLORS = ["#3B82F6", "#22A06B", "#F59E0B", "#8B5CF6", "#EC4899", "#94A3B8"];
const QUIET_DAYS = 14;
const DAY = 86_400_000;

const card = "bg-card border rounded-2xl p-5 min-w-0";
const cardTitle = "flex items-center gap-2 text-[15px] font-bold";
const avg = (ps: Project[]) => (ps.length ? Math.round(ps.reduce((s, p) => s + p.pct, 0) / ps.length) : 0);
const pctOf = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
const val = (v: string | undefined) => v?.trim() || "—";
const plantName = (pl: string) => (pl === "—" ? "No plant" : `${pl} Plant`);
const valuesOf = (ps: Project[], f: (p: Project) => string) => {
  const m = new Map<string, number>();
  ps.forEach((p) => m.set(f(p), (m.get(f(p)) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
};

/* ── tiny SVG charts ── */

function Donut({ parts, total, onPick, active }: { parts: { label: string; n: number; color: string }[]; total: number; onPick: (l: string) => void; active: string }) {
  const r = 52;
  const C = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="relative size-[150px] shrink-0">
      <svg viewBox="0 0 140 140" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--bg3)" strokeWidth="20" />
        {parts.filter((p) => p.n).map((p) => {
          const len = (p.n / (total || 1)) * C;
          const el = (
            <circle
              key={p.label}
              cx="70" cy="70" r={r} fill="none" stroke={p.color} strokeWidth={active === p.label ? 24 : 20}
              strokeDasharray={`${len} ${C}`} strokeDashoffset={-off}
              opacity={active && active !== p.label ? 0.35 : 1}
              className="cursor-pointer transition-all"
              onClick={() => onPick(p.label)}
            />
          );
          off += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[30px] font-bold leading-none tabular-nums">{total}</span>
        <span className="text-[12px] text-fg2 mt-0.5">Total</span>
      </div>
    </div>
  );
}

function Spark({ values, color, id }: { values: number[]; color: string; id: string }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [4 + (i * 92) / (values.length - 1), 30 - (v / max) * 24]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 34" className="w-[76px] h-[36px] shrink-0 max-[1250px]:hidden" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L96,34 L4,34 Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Select({ icon, label, value, onChange, options }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className={cn("relative flex items-center gap-2 h-11 pl-3 pr-9 rounded-xl border bg-card text-[13px] cursor-pointer hover:border-primary/60", value !== "all" && "border-primary ring-2 ring-primary/20")}>
      <span className="text-primary">{icon}</span>
      <span className="text-fg2">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-transparent font-semibold outline-none cursor-pointer pr-1" aria-label={label}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="size-4 text-fg3 absolute right-3 pointer-events-none" />
    </label>
  );
}

export default function DashboardView({ projects, remarks, onEdit, onViewAll }: Props) {
  const [plant, setPlant] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [quarter, setQuarter] = useState<"all" | Quarter>("all");

  const plants = valuesOf(projects, (p) => val(p.plant));
  const types = valuesOf(projects, (p) => val(p.type));
  const typeColor = (t: string) => TYPE_COLORS[types.indexOf(t) % TYPE_COLORS.length];

  const F = projects.filter(
    (p) =>
      (plant === "all" || val(p.plant) === plant) &&
      (type === "all" || val(p.type) === type) &&
      (status === "all" || p.status === status) &&
      (quarter === "all" || qOf(p) === quarter)
  );
  const total = F.length;
  const count = (ps: Project[], s: string) => ps.filter((p) => p.status === s).length;
  const toggle = (cur: string, v: string, set: (v: string) => void) => set(cur === v ? "all" : v);
  const anyFilter = plant !== "all" || type !== "all" || status !== "all" || quarter !== "all";

  /* remarks → last activity per project */
  const lastRemark = useMemo(() => {
    const m = new Map<string, Remark>();
    remarks.forEach((r) => {
      const cur = m.get(r.pid);
      if (!cur || r.at > cur.at) m.set(r.pid, r);
    });
    return m;
  }, [remarks]);

  /* KPI cards — sparkline = count per quarter */
  const perQ = (ps: Project[]) => QS.map((q) => ps.filter((p) => qOf(p) === q).length);
  const kpis = [
    { key: "all", label: "Total Projects", n: total, icon: <Layers className="size-6" />, color: "#3B82F6", tint: "rgba(59,130,246,.08)", line: perQ(F) },
    { key: "WIP", label: "In Progress", n: count(F, "WIP"), icon: <Play className="size-6 fill-current" />, color: statusColor("WIP"), tint: "rgba(55,138,221,.08)", line: perQ(F.filter((p) => p.status === "WIP")) },
    { key: "Done", label: "Completed", n: count(F, "Done"), icon: <Check className="size-6" strokeWidth={3} />, color: statusColor("Done"), tint: "rgba(29,158,117,.09)", line: perQ(F.filter((p) => p.status === "Done")) },
    { key: "Parked", label: "Parked", n: count(F, "Parked"), icon: <Pause className="size-6 fill-current" />, color: statusColor("Parked"), tint: "rgba(239,159,39,.1)", line: perQ(F.filter((p) => p.status === "Parked")) },
    { key: "Open", label: "Open", n: count(F, "Open"), icon: <AlertCircle className="size-6" />, color: "#8A8984", tint: "rgba(136,135,128,.08)", line: perQ(F.filter((p) => p.status === "Open")) },
  ];

  /* plant summary */
  const plantRows = plants
    .map((pl) => {
      const ps = F.filter((p) => val(p.plant) === pl);
      return { pl, ps, n: ps.length, avg: avg(ps) };
    })
    .filter((r) => r.n > 0 || plant === r.pl);
  const maxPlant = Math.max(1, ...plantRows.map((r) => r.n));
  const PLANT_COLORS = ["#3B82F6", "#22A06B", "#E08A1E", "#7C5CDB"];

  /* quarters */
  const qRows = QS.map((q) => {
    const ps = F.filter((p) => qOf(p) === q);
    return { q, n: ps.length, done: count(ps, "Done") };
  });
  const maxQ = Math.max(4, ...qRows.map((r) => r.n));
  const lx = (i: number) => 22 + i * 92;
  const ly = (v: number) => 92 - (v / maxQ) * 72;

  /* top 12 */
  const top = [...F].sort((a, b) => b.pct - a.pct || a.pid.localeCompare(b.pid)).slice(0, 12);

  /* insights */
  const done = count(F, "Done");
  const topPlant = plantRows.slice().sort((a, b) => b.n - a.n)[0];
  const wip = count(F, "WIP");

  /* needs attention: parked or quiet (not done, no remark in 14 days) */
  const now = Date.now();
  const attention = F.filter((p) => p.status !== "Done")
    .map((p) => {
      const last = lastRemark.get(p.pid);
      const days = last ? Math.floor((now - new Date(last.at).getTime()) / DAY) : null;
      return { p, last, days };
    })
    .filter((x) => x.p.status === "Parked" || x.days === null || x.days >= QUIET_DAYS)
    .sort((a, b) => Number(b.p.status === "Parked") - Number(a.p.status === "Parked") || (b.days ?? 9999) - (a.days ?? 9999));

  const chips = [
    plant !== "all" && { label: `Plant: ${plant}`, clear: () => setPlant("all") },
    type !== "all" && { label: `Type: ${type}`, clear: () => setType("all") },
    status !== "all" && { label: `Status: ${status}`, clear: () => setStatus("all") },
    quarter !== "all" && { label: `Quarter: ${quarter}`, clear: () => setQuarter("all") },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select icon={<CalendarDays className="size-4" />} label="Fiscal Year" value="all" onChange={() => {}} options={[{ value: "all", label: "2026-27" }]} />
        <Select icon={<Factory className="size-4" />} label="Plant" value={plant} onChange={setPlant} options={[{ value: "all", label: "All Plants" }, ...plants.map((p) => ({ value: p, label: p }))]} />
        <Select icon={<Tag className="size-4" />} label="Project Type" value={type} onChange={setType} options={[{ value: "all", label: "All Types" }, ...types.map((t) => ({ value: t, label: t }))]} />
        <Select icon={<CheckCircle2 className="size-4" />} label="Status" value={status} onChange={setStatus} options={[{ value: "all", label: "All Status" }, ...STATUS_KEYS.map((s) => ({ value: s, label: s }))]} />
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 ml-1">
            {quarter !== "all" && (
              <button onClick={() => setQuarter("all")} className="inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full border border-primary/40 bg-accent text-accent-foreground text-[12px] font-semibold" aria-label={`Remove Quarter ${quarter}`}>
                Quarter: {quarter} <X className="size-3" />
              </button>
            )}
            {anyFilter && (
              <button
                onClick={() => {
                  setPlant("all");
                  setType("all");
                  setStatus("all");
                  setQuarter("all");
                }}
                className="text-[12px] font-semibold text-accent-foreground hover:underline px-1"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div className="grid gap-3 grid-cols-5 max-[1100px]:grid-cols-3 max-[700px]:grid-cols-1">
        {kpis.map((k) => {
          const on = k.key !== "all" && status === k.key;
          return (
            <button
              key={k.key}
              onClick={() => (k.key === "all" ? setStatus("all") : toggle(status, k.key, setStatus))}
              aria-pressed={on}
              className={cn("flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-md", on && "ring-2")}
              style={{ background: k.tint, borderColor: on ? k.color : undefined, ["--tw-ring-color" as string]: k.color }}
              title={k.key === "all" ? "Show all statuses" : `Show only ${k.label}`}
            >
              <span className="size-12 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm" style={{ background: k.color }}>
                {k.icon}
              </span>
              <span className="flex flex-col min-w-0 flex-1">
                <span className="text-[28px] font-bold leading-none tabular-nums">{k.n}</span>
                <span className="text-[13px] text-fg2 mt-1 whitespace-nowrap">{k.label}</span>
              </span>
              <Spark values={k.line} color={k.color} id={`spark-${k.key}`} />
            </button>
          );
        })}
      </div>

      {/* ── Type / Plant / Quarter ── */}
      <div className="grid gap-4 grid-cols-12 max-[1100px]:grid-cols-1">
        <section className={cn(card, "col-span-4 max-[1100px]:col-span-1")}>
          <h2 className={cardTitle}>
            <BarChart3 className="size-5 text-primary" /> Project Type Summary
          </h2>
          <div className="flex items-center gap-5 mt-4 flex-wrap">
            <Donut parts={types.map((t) => ({ label: t, n: F.filter((p) => val(p.type) === t).length, color: typeColor(t) }))} total={total} active={type === "all" ? "" : type} onPick={(t) => toggle(type, t, setType)} />
            <div className="flex flex-col gap-1.5 flex-1 min-w-[170px]">
              {types.map((t) => {
                const n = F.filter((p) => val(p.type) === t).length;
                return (
                  <button key={t} onClick={() => toggle(type, t, setType)} aria-pressed={type === t} className={cn("grid grid-cols-[14px_1fr_auto_44px] items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] text-left hover:bg-bg2", type === t && "bg-accent", type !== "all" && type !== t && "opacity-50")}>
                    <span className="size-3.5 rounded-[3px]" style={{ background: typeColor(t) }} />
                    <span className="truncate">{t === "—" ? "Not set" : t}</span>
                    <span className="font-semibold tabular-nums">{n}</span>
                    <span className="text-right text-fg2 tabular-nums">{pctOf(n, total)}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className={cn(card, "col-span-4 max-[1100px]:col-span-1")}>
          <h2 className={cardTitle}>
            <Factory className="size-5 text-primary" /> Plant-wise Project Summary
          </h2>
          {/* Bars on top, one status table per plant underneath (wraps when there are many plants). */}
          <div className="flex items-end justify-around gap-3 mt-4 h-[170px] border-b">
            {plantRows.map((r, i) => (
              <button key={r.pl} onClick={() => toggle(plant, r.pl, setPlant)} aria-pressed={plant === r.pl} aria-label={`${plantName(r.pl)}: ${r.n} projects`} className={cn("flex flex-col items-center justify-end gap-1.5 h-full group flex-1 max-w-[110px]", plant !== "all" && plant !== r.pl && "opacity-45")}>
                <span className="text-[18px] font-bold tabular-nums">{r.n}</span>
                <span className="w-12 rounded-t-lg transition-all group-hover:opacity-85" style={{ height: Math.max(6, Math.round((r.n / maxPlant) * 120)), background: `linear-gradient(180deg, ${PLANT_COLORS[i % 4]}, ${PLANT_COLORS[i % 4]}cc)` }} />
              </button>
            ))}
          </div>
          <div className="flex justify-around gap-3 mt-1.5">
            {plantRows.map((r) => (
              <span key={r.pl} className="flex-1 max-w-[110px] text-center text-[12px] font-bold truncate" title={plantName(r.pl)}>
                {plantName(r.pl)}
              </span>
            ))}
          </div>
          <div className="grid gap-x-4 gap-y-3 mt-4 grid-cols-[repeat(auto-fill,minmax(118px,1fr))]">
            {plantRows.map((r) => (
              <div key={r.pl} className="flex flex-col gap-1 min-w-0">
                <span className="text-[12px] font-bold border-b pb-1 mb-0.5 truncate">{plantName(r.pl)}</span>
                {STATUS_KEYS.map((st) => (
                  <span key={st} className="flex items-center gap-1.5 text-[12px]">
                    <span className="size-2.5 rounded-[2px] shrink-0" style={{ background: statusColor(st) }} />
                    <span className="flex-1 text-fg2 truncate">{st === "WIP" ? "In Progress" : st === "Done" ? "Completed" : st}</span>
                    <span className="font-semibold tabular-nums">{count(r.ps, st)}</span>
                  </span>
                ))}
                <span className="text-[11px] font-semibold text-primary mt-1">Avg Progress {r.avg}%</span>
              </div>
            ))}
          </div>
        </section>

        <section className={cn(card, "col-span-4 max-[1100px]:col-span-1")}>
          <h2 className={cardTitle}>
            <CalendarDays className="size-5 text-primary" /> Fiscal Year Quarterly Summary
          </h2>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {qRows.map((r) => {
              const on = quarter === r.q;
              return (
                <button
                  key={r.q}
                  onClick={() => setQuarter(on ? "all" : r.q)}
                  aria-pressed={on}
                  className={cn("flex flex-col items-center gap-0.5 rounded-xl py-2.5 px-1 border-2 transition-all", on ? "border-current" : "border-transparent", quarter !== "all" && !on && "opacity-45")}
                  style={{ background: `${Q_META[r.q].color}1a`, color: Q_META[r.q].color }}
                >
                  <span className="text-[16px] font-bold">{r.q}</span>
                  <span className="text-[10px] text-fg2">{Q_META[r.q].months}</span>
                  <span className="text-[22px] font-bold leading-tight text-foreground tabular-nums">{r.n}</span>
                  <span className="text-[9px] text-fg2">Projects</span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-foreground mt-0.5">
                    <CheckCircle2 className="size-3" style={{ color: statusColor("Done") }} /> {r.done} Completed
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-4 text-[11px] text-fg2 mt-2.5">
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 rounded bg-[#3B82F6]" /> Initiated</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 rounded" style={{ background: statusColor("Done") }} /> Completed</span>
          </div>
          <svg viewBox="0 0 320 112" className="w-full h-[112px]" role="img" aria-label={`Projects initiated per quarter: ${qRows.map((r) => `${r.q} ${r.n}`).join(", ")}; completed: ${qRows.map((r) => `${r.q} ${r.done}`).join(", ")}`}>
            {[0, maxQ / 2, maxQ].map((t) => (
              <g key={t}>
                <line x1="18" x2="314" y1={ly(t)} y2={ly(t)} stroke="var(--border)" strokeDasharray="3 3" />
                <text x="4" y={ly(t) + 3} fontSize="8" fill="var(--fg3)">{Math.round(t)}</text>
              </g>
            ))}
            {[
              { key: "n" as const, color: "#3B82F6" },
              { key: "done" as const, color: statusColor("Done") },
            ].map((s) => (
              <g key={s.key}>
                <polyline points={qRows.map((r, i) => `${lx(i)},${ly(r[s.key])}`).join(" ")} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
                {qRows.map((r, i) => (
                  <g key={r.q}>
                    <circle cx={lx(i)} cy={ly(r[s.key])} r="3.5" fill="var(--card)" stroke={s.color} strokeWidth="2" />
                    <text x={lx(i)} y={ly(r[s.key]) - 7} fontSize="9" fontWeight="700" textAnchor="middle" fill="var(--foreground)">{r[s.key]}</text>
                  </g>
                ))}
              </g>
            ))}
            {qRows.map((r, i) => (
              <text key={r.q} x={lx(i)} y="108" fontSize="9" textAnchor="middle" fill="var(--fg2)">{r.q}</text>
            ))}
          </svg>
        </section>
      </div>

      {/* ── Status / Top 12 / Insights ── */}
      <div className="grid gap-4 grid-cols-12 max-[1100px]:grid-cols-1">
        <section className={cn(card, "col-span-4 max-[1100px]:col-span-1")}>
          <h2 className={cardTitle}>
            <BarChart3 className="size-5 text-primary" /> Status Breakdown
          </h2>
          <div className="flex items-center gap-5 mt-4 flex-wrap">
            <Donut parts={STATUS_KEYS.map((s) => ({ label: s, n: count(projects.filter((p) => (plant === "all" || val(p.plant) === plant) && (type === "all" || val(p.type) === type) && (quarter === "all" || qOf(p) === quarter)), s), color: statusColor(s) }))}
              total={projects.filter((p) => (plant === "all" || val(p.plant) === plant) && (type === "all" || val(p.type) === type) && (quarter === "all" || qOf(p) === quarter)).length}
              active={status === "all" ? "" : status} onPick={(s) => toggle(status, s, setStatus)} />
            <div className="flex flex-col gap-1.5 flex-1 min-w-[170px]">
              {STATUS_KEYS.map((s) => {
                const base = projects.filter((p) => (plant === "all" || val(p.plant) === plant) && (type === "all" || val(p.type) === type) && (quarter === "all" || qOf(p) === quarter));
                const n = count(base, s);
                return (
                  <button key={s} onClick={() => toggle(status, s, setStatus)} aria-pressed={status === s} className={cn("grid grid-cols-[14px_1fr_auto_44px] items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] text-left hover:bg-bg2", status === s && "bg-accent", status !== "all" && status !== s && "opacity-50")}>
                    <span className="size-3.5 rounded-[3px]" style={{ background: statusColor(s) }} />
                    <span>{s}</span>
                    <span className="font-semibold tabular-nums">{n}</span>
                    <span className="text-right text-fg2 tabular-nums">{pctOf(n, base.length)}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className={cn(card, "col-span-4 max-[1100px]:col-span-1")}>
          <h2 className={cardTitle}>
            <Trophy className="size-5 text-amber-500" /> Top 12 by Completion %
          </h2>
          <div className="flex flex-col gap-1 mt-3 max-h-[230px] overflow-y-auto pr-1">
            {top.map((p) => (
              <button key={p.pid} onClick={() => onEdit(p.pid)} title={p.name} className="grid grid-cols-[70px_1fr_40px] items-center gap-2.5 px-1.5 py-1 rounded-md text-[12px] text-left hover:bg-bg2">
                <span className="font-semibold tabular-nums">{p.pid}</span>
                <span className="h-3 rounded-full bg-bg3 overflow-hidden">
                  <span className="block h-full rounded-full transition-all" style={{ width: `${p.pct}%`, background: statusColor(p.status) }} />
                </span>
                <span className="text-right font-semibold tabular-nums">{p.pct}%</span>
              </button>
            ))}
            {!top.length && <div className="text-[13px] text-fg3 py-6 text-center">No projects match these filters.</div>}
          </div>
        </section>

        <section className={cn(card, "col-span-4 max-[1100px]:col-span-1")}>
          <h2 className={cardTitle}>
            <Lightbulb className="size-5 text-primary" /> Key Management Insights
          </h2>
          <div className="grid grid-cols-3 divide-x mt-4">
            <div className="flex flex-col items-center text-center gap-1 px-2">
              <TrendingUp className="size-6 text-primary" />
              <span className="text-[26px] font-bold tabular-nums mt-1">{avg(F)}%</span>
              <span className="text-[13px] text-fg2 leading-snug">Average Progress<br />({done} of {total} completed)</span>
            </div>
            <button onClick={() => topPlant && toggle(plant, topPlant.pl, setPlant)} className="flex flex-col items-center text-center gap-1 px-2 rounded-lg hover:bg-bg2">
              <Building2 className="size-6 text-primary" />
              <span className="text-[20px] font-bold mt-1.5">{topPlant ? plantName(topPlant.pl) : "—"}</span>
              <span className="text-[13px] text-fg2 leading-snug">{topPlant ? `${pctOf(topPlant.n, total)}% Projects` : ""}<br />{topPlant ? `(${topPlant.n} of ${total})` : ""}</span>
            </button>
            <button onClick={() => toggle(status, "WIP", setStatus)} className="flex flex-col items-center text-center gap-1 px-2 rounded-lg hover:bg-bg2">
              <CheckCircle2 className="size-6" style={{ color: statusColor("Done") }} />
              <span className="text-[20px] font-bold mt-1.5">{wip} Projects</span>
              <span className="text-[13px] text-fg2 leading-snug">In Progress<br />({pctOf(wip, total)}% of Total)</span>
            </button>
          </div>
        </section>
      </div>

      {/* ── Needs attention ── */}
      <section className="bg-card border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h2 className={cardTitle}>
            <TriangleAlert className="size-5 text-red-500" /> Needs Attention
            <span className="text-[12px] font-normal text-fg3 ml-1">parked, or no remark for {QUIET_DAYS}+ days · {attention.length}</span>
          </h2>
          <button onClick={onViewAll} className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent-foreground hover:underline">
            View All <ArrowRight className="size-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead>
              <tr className="border-y bg-bg2 text-left text-fg2">
                <th className="px-5 py-2 font-semibold">Project Code</th>
                <th className="px-3 py-2 font-semibold">Project</th>
                <th className="px-3 py-2 font-semibold">Project Type</th>
                <th className="px-3 py-2 font-semibold">Plant</th>
                <th className="px-3 py-2 font-semibold">Last Update</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Quiet (Days)</th>
                <th className="px-5 py-2 font-semibold">Latest Remark</th>
              </tr>
            </thead>
            <tbody>
              {attention.slice(0, 6).map(({ p, last, days }) => (
                <tr key={p.pid} onClick={() => onEdit(p.pid)} className="border-b last:border-b-0 cursor-pointer hover:bg-bg2" title="Open project">
                  <td className="px-5 py-2.5 font-semibold tabular-nums">{p.pid}</td>
                  <td className="px-3 py-2.5 max-w-[260px] truncate" title={p.name}>{p.name}</td>
                  <td className="px-3 py-2.5">{val(p.type)}</td>
                  <td className="px-3 py-2.5">{val(p.plant)}</td>
                  <td className="px-3 py-2.5 text-fg2">{last ? formatDateTime(last.at) : "No remarks yet"}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={p.status} /></td>
                  <td className="px-3 py-2.5 font-bold text-red-600 dark:text-red-400 tabular-nums">{days === null ? "—" : `+${days}`}</td>
                  <td className="px-5 py-2.5 max-w-[260px] truncate text-fg2" title={last?.text}>{last?.text ?? p.notes ?? ""}</td>
                </tr>
              ))}
              {!attention.length && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-fg3">Nothing needs attention — every active project has a recent remark.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

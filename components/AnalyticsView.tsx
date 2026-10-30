"use client";
import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { STATUS_KEYS, statusColor } from "@/lib/constants";
import type { Project } from "@/lib/types";
import { avgPct, cn, countBy } from "@/lib/utils";
import { Bar, Empty, ProjectRow, RowActionHandlers, Section, StatusRing, cardHd, clickProps, clickableCard, tag } from "./ui";

interface Props extends RowActionHandlers {
  projects: Project[];
  /** Jump to All Projects filtered to this status. */
  onShowStatus: (s: string) => void;
}

const legRow = "flex flex-wrap gap-2.5 mt-3";
const legItem = "flex items-center gap-1.5 text-[11px] text-fg2";
const legSq = "size-[9px] rounded-[2px] shrink-0";

const Legend = ({ counts, onPick }: { counts?: Record<string, number>; onPick?: (s: string) => void }) => (
  <div className={legRow}>
    {STATUS_KEYS.map((k) => (
      <span
        key={k}
        className={cn(legItem, onPick && "cursor-pointer rounded px-1.5 py-0.5 -mx-0.5 hover:bg-bg2 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/50")}
        {...(onPick ? { ...clickProps(() => onPick(k)), title: `Show ${k} projects` } : {})}
      >
        <span className={legSq} style={{ background: statusColor(k) }} />
        {k}
        {counts && ` — ${counts[k]}`}
      </span>
    ))}
  </div>
);

export default function AnalyticsView({ projects, onShowStatus, ...actions }: Props) {
  const barRef = useRef<HTMLCanvasElement>(null);
  const onEditRef = useRef(actions.onEdit);
  onEditRef.current = actions.onEdit;

  const n = projects.length || 1;
  const counts = Object.fromEntries(STATUS_KEYS.map((k) => [k, countBy(projects, k)]));
  const top12 = [...projects].sort((a, b) => b.pct - a.pct).slice(0, 12);
  const compRate = Math.round((counts.Done / n) * 100);
  const parked = projects.filter((p) => p.status === "Parked").sort((a, b) => b.pct - a.pct);

  useEffect(() => {
    if (!barRef.current) return;
    const tc = "rgba(128,128,128,.55)";
    const chart = new Chart(barRef.current, {
      type: "bar",
      data: {
        labels: top12.map((p) => p.pid),
        datasets: [{ data: top12.map((p) => p.pct), backgroundColor: top12.map((p) => statusColor(p.status)), borderRadius: 4, borderSkipped: false }],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { title: (items) => top12[items[0].dataIndex]?.name ?? "", label: (i) => ` ${i.parsed.x}% · ${top12[i.dataIndex].status}` } },
        },
        animation: { duration: 450 },
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        onClick: (_e, els) => els[0] && onEditRef.current(top12[els[0].index].pid),
        onHover: (e, els) => {
          const t = e.native?.target as HTMLElement | undefined;
          if (t) t.style.cursor = els.length ? "pointer" : "default";
        },
        scales: {
          x: { min: 0, max: 100, grid: { color: "rgba(128,128,128,.1)" }, ticks: { color: tc, font: { size: 10 }, callback: (v) => `${v}%` } },
          y: { grid: { color: "transparent" }, ticks: { color: tc, font: { size: 10 } } },
        },
      },
    });
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3 max-[900px]:grid-cols-1">
        <div
          className={cn("bg-card border rounded-lg px-[18px] py-4 flex items-center gap-5", clickableCard)}
          title="Click to see completed projects"
          {...clickProps(() => onShowStatus("Done"))}
        >
          <div className="relative inline-flex items-center justify-center size-[100px]">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(128,128,128,.1)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={statusColor("Done")}
                strokeWidth="8"
                strokeDasharray={`${Math.round((251 * compRate) / 100)} 251`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute text-center">
              <div className="text-xl font-semibold" style={{ color: statusColor("Done") }}>
                {compRate}%
              </div>
              <div className="text-[10px] text-fg3">done</div>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1.5">Completion rate</div>
            <div className="text-xs text-fg2">
              {counts.Done} of {projects.length} projects done
            </div>
            <div className="text-xs text-fg2 mt-0.5">Avg overall progress: {avgPct(projects)}%</div>
            <div className="text-[10px] text-accent-foreground mt-1.5">View completed →</div>
          </div>
        </div>
        <Section>
          <div className={cardHd}>
            Status breakdown <span className={tag}>click a status</span>
          </div>
          <div className="flex items-center gap-5">
            <StatusRing projects={projects} size={110} />
            <Legend counts={counts} onPick={onShowStatus} />
          </div>
        </Section>
      </div>

      <Section className="mb-3">
        <div className={cardHd}>
          Top 12 by completion % <span className={tag}>click a bar to edit</span>
        </div>
        <div className="relative" style={{ height: top12.length * 36 + 50 }}>
          <canvas ref={barRef} role="img" aria-label={`Top 12: ${top12.map((p) => `${p.pid} ${p.pct}%`).join(", ")}`} />
        </div>
        <Legend />
      </Section>

      <Section>
        <div className={cardHd}>
          Parked — needs attention <span className={tag}>click a row to unpark</span>
        </div>
        {parked.length ? (
          parked.map((p) => (
            <ProjectRow
              key={p.pid}
              project={p}
              meta={
                <>
                  {p.plant} · {p.sys}
                </>
              }
              {...actions}
            >
              <div className="flex-1 max-w-[160px] flex items-center gap-1.5">
                <Bar pct={p.pct} color={statusColor("Parked")} />
                <span className="text-[11px] font-semibold min-w-[28px] text-right text-status-parked-txt">{p.pct}%</span>
              </div>
            </ProjectRow>
          ))
        ) : (
          <Empty>No parked projects 🎉</Empty>
        )}
      </Section>
    </>
  );
}

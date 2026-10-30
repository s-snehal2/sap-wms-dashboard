"use client";
import { useMemo, useState } from "react";
import { Fragment } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, MessageSquarePlus } from "lucide-react";
import { PIN_EMOJI, PROJECT_FILTERS, statusColor } from "@/lib/constants";
import type { Project, Remark } from "@/lib/types";
import { cn, qOf, typeClass } from "@/lib/utils";
import { Badge, Bar, FilterPill, PidBadge, PinMark, QBadge, RowActions, RowActionHandlers, StatusBadge, pinnedHighlight } from "./ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import RemarksPanel, { formatDateTime } from "./Remarkpanel";

type SortCol = keyof Pick<Project, "pid" | "sr" | "name" | "type" | "plant" | "sys" | "quarter" | "pct">;

interface Props extends RowActionHandlers {
  projects: Project[];
  filter: string;
  onFilter: (f: string) => void;
  onReset: () => void;
  remarks: Remark[];
  onAddRemark: (pid: string, text: string) => void;
  onDeleteRemark: (id: string) => void;
}

const COLS: { key: SortCol | null; label: string; width?: number }[] = [
  { key: "pid", label: "ID", width: 80 },
  { key: "sr", label: "Sr.", width: 34 },
  { key: "name", label: "Project" },
  { key: "type", label: "Type", width: 82 },
  { key: "plant", label: "Plant", width: 56 },
  { key: "sys", label: "System", width: 60 },
  { key: "quarter", label: "Quarter", width: 62 },
  { key: "pct", label: "Progress", width: 130 },
  { key: null, label: "Remarks", width: 210 },
  { key: null, label: "Actions", width: 96 },
];

export default function ProjectsView({ projects, filter, onFilter, onReset, remarks, onAddRemark, onDeleteRemark, ...actions }: Props) {
  const [sortCol, setSortCol] = useState<SortCol>("sr");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [openRemarks, setOpenRemarks] = useState<string | null>(null);

  const remarksByPid = useMemo(() => {
    const m = new Map<string, Remark[]>();
    for (const r of remarks) m.set(r.pid, [...(m.get(r.pid) ?? []), r]);
    return m;
  }, [remarks]);

  const rows = useMemo(
    () =>
      [...projects].sort((a, b) => {
        const va = a[sortCol] ?? 0;
        const vb = b[sortCol] ?? 0;
        return typeof va === "string" ? va.localeCompare(String(vb)) * sortDir : ((va as number) - (vb as number)) * sortDir;
      }),
    [projects, sortCol, sortDir]
  );

  const setSort = (col: SortCol) => {
    if (col === sortCol) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortCol(col);
      setSortDir(1);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {PROJECT_FILTERS.map((f) => (
            <FilterPill key={f} active={filter === f} onClick={() => onFilter(filter === f && f !== "All" ? "All" : f)}>
              {f === "Pinned" ? `${PIN_EMOJI} Pinned` : f}
            </FilterPill>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-fg3">
          <span>{rows.length} shown · click a row to edit</span>
          <button className="underline underline-offset-2 hover:text-foreground" onClick={onReset} title="Replace all projects with the built-in sample list (undo available)">
            Reset sample data
          </button>
        </div>
      </div>

      <div className="bg-card border rounded-lg px-[18px] py-4 overflow-x-auto">
        <Table className="min-w-[980px] table-fixed text-xs">
          <colgroup>
            {COLS.map((c) => (
              <col key={c.label} style={c.width ? { width: c.width } : undefined} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLS.map((c) => (
                <TableHead
                  key={c.label}
                  onClick={c.key ? () => setSort(c.key!) : undefined}
                  aria-sort={c.key && sortCol === c.key ? (sortDir === 1 ? "ascending" : "descending") : undefined}
                  className={cn(
                    "group h-auto px-2 py-2 text-[10px] font-semibold uppercase tracking-[.06em] text-fg3 border-b",
                    c.key ? "cursor-pointer select-none hover:text-fg2" : "cursor-default"
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {c.key &&
                      (sortCol === c.key ? (
                        sortDir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-0 group-hover:opacity-50" />
                      ))}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const pinned = actions.isPinned?.(p.pid) ?? false;
              const pr = remarksByPid.get(p.pid) ?? [];
              const latest = pr.reduce<Remark | undefined>((a, r) => (!a || r.at > a.at ? r : a), undefined);
              const open = openRemarks === p.pid;
              return (
                <Fragment key={p.pid}>
                <TableRow className={cn("hover:bg-bg2 cursor-pointer", pinned && pinnedHighlight, open && "bg-bg2 border-b-0")} onClick={() => actions.onEdit(p.pid)}>
                  <TableCell className="px-2 py-2">
                    <PidBadge pid={p.pid} />
                  </TableCell>
                  <TableCell className="px-2 py-2 text-fg3 text-[11px]">{p.sr}</TableCell>
                  <TableCell className="px-2 py-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium truncate" title={p.name}>
                        {p.name}
                      </span>
                      {pinned && <PinMark compact />}
                    </div>
                    <div className="text-[10px] text-fg3 mt-px truncate" title={p.notes || undefined}>
                      {p.phase}
                      {p.notes ? " · " + p.notes : ""}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-2">
                    <Badge cls={typeClass(p.type)}>{p.type}</Badge>
                  </TableCell>
                  <TableCell className="px-2 py-2 text-[11px]">{p.plant}</TableCell>
                  <TableCell className="px-2 py-2 text-[11px] text-fg2">{p.sys}</TableCell>
                  <TableCell className="px-2 py-2">
                    <QBadge q={qOf(p)} />
                  </TableCell>
                  <TableCell className="px-2 py-2">
                    <div className="flex items-center gap-1 mb-[3px]">
                      <span className="text-[10px] font-semibold">{p.pct}%</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <Bar pct={p.pct} color={statusColor(p.status)} className="flex-none mt-[3px]" />
                  </TableCell>
                  <TableCell className="px-2 py-2">
                    <button
                      className={cn(
                        "w-full text-left rounded-md px-2 py-1 border border-transparent transition-colors hover:border-primary hover:bg-accent",
                        open && "border-primary bg-accent"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenRemarks(open ? null : p.pid);
                      }}
                      title={open ? "Hide remarks" : latest ? "View / add remarks" : "Add a remark"}
                      aria-expanded={open}
                    >
                      {latest ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[11px] text-foreground">{latest.text}</span>
                            {pr.length > 1 && <span className="shrink-0 text-[9px] font-semibold px-1.5 rounded-full bg-primary text-primary-foreground">{pr.length}</span>}
                          </div>
                          <div className="text-[10px] text-fg3">{formatDateTime(latest.at)}</div>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-fg3">
                          <MessageSquarePlus className="size-3.5" /> Add remark
                        </span>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="px-2 py-2">
                    <RowActions pid={p.pid} {...actions} />
                  </TableCell>
                </TableRow>
                {open && (
                  <TableRow className={cn("hover:bg-transparent", pinned && pinnedHighlight)}>
                    <TableCell colSpan={COLS.length} className="px-2 pb-3 pt-0 whitespace-normal">
                      <RemarksPanel pid={p.pid} remarks={pr} onAdd={onAddRemark} onDelete={onDeleteRemark} onClose={() => setOpenRemarks(null)} />
                    </TableCell>
                  </TableRow>
                )}
                </Fragment>
              );
            })}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={COLS.length} className="text-center py-8 text-fg3 text-[13px]">
                  {filter === "Pinned" ? `Nothing pinned yet — click the pin button on any row to mark it ${PIN_EMOJI}` : "No projects match"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

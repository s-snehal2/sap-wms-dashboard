// "use client";
// import { useState } from "react";
// import { Plus } from "lucide-react";
// import { NOTE_DOT_COLORS, QUARTER_LABELS, STATUS_KEYS, statusColor } from "@/lib/constants";
// import type { Note, NoteCat, Project, Quarter } from "@/lib/types";
// import { avgPct, cn, countBy, qOf } from "@/lib/utils";
// import NoteCard from "./NoteCard";
// import NoteComposer from "./NoteComposer";
// import QuarterSummary from "./QuarterSummary";
// import { Button } from "./ui/button";
// import { Bar, Empty, ProgressBar, ProjectRow, QBadge, RowActionHandlers, Section, StatusBadge, StatusRing, cardHd, clickProps, tag } from "./ui";
//
// interface Props extends RowActionHandlers {
//   projects: Project[];
//   filtered: Project[];
//   notes: Note[];
//   quarterFilter: Quarter | null;
//   onQuarterFilter: (q: Quarter | null) => void;
//   onAddNote: (text: string, cat: NoteCat) => boolean;
//   onEditNote: (id: string) => void;
//   onConvertNote: (id: string) => void;
//   onDeleteNote: (id: string) => void;
//   onViewAllNotes: () => void;
//   statusFilter: string | null;
//   onStatusFilter: (s: string | null) => void;
//   typeFilter: string;
//   onTypeFilter: (t: string) => void;
// }
//
// export default function OverviewView(props: Props) {
//   const { projects, filtered, notes, quarterFilter, onQuarterFilter, onEdit, onTogglePin, onDelete, isPinned } = props;
//   const actions = { onEdit, onTogglePin, onDelete, isPinned };
//   const [composing, setComposing] = useState(false);
//
//   const active = filtered.filter((p) => p.status === "WIP" || p.status === "Parked");
//   const byType = ["MIS", "New Process", "Project"].map((t) => {
//     const ps = projects.filter((p) => p.type === t);
//     return { t, n: ps.length, a: avgPct(ps) };
//   });
//   const recentNotes = [...notes].sort((a, b) => Number(a.converted) - Number(b.converted) || b.date.localeCompare(a.date)).slice(0, 6);
//   const pendingNotes = notes.filter((n) => !n.converted).length;
//   const catCounts = notes.reduce<Record<string, number>>((acc, n) => ({ ...acc, [n.cat]: (acc[n.cat] || 0) + 1 }), {});
//   // Pinned projects float to the top, then by progress.
//   const sorted = [...filtered].sort((a, b) => Number(isPinned?.(b.pid)) - Number(isPinned?.(a.pid)) || b.pct - a.pct);
//
//   return (
//     <>
//       <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3 mb-3 max-[900px]:grid-cols-1">
//         <Section>
//           <div className={cardHd}>
//             Active projects <span className={tag}>{active.length}</span>
//           </div>
//           {active.length ? (
//             active.map((p) => (
//               <ProjectRow
//                 key={p.pid}
//                 project={p}
//                 meta={
//                   <>
//                     {p.plant} · {p.sys} · {p.phase} · <QBadge q={qOf(p)} />
//                   </>
//                 }
//                 onEdit={onEdit}
//                 onTogglePin={onTogglePin}
//                 isPinned={isPinned}
//               >
//                 <ProgressBar pct={p.pct} status={p.status} />
//                 <StatusBadge status={p.status} />
//               </ProjectRow>
//             ))
//           ) : (
//             <Empty>No active projects match current filters.</Empty>
//           )}
//         </Section>
//
//         <div className="flex flex-col gap-3">
//           <Section>
//             <div className={cardHd}>
//               Status <span className={tag}>click to filter</span>
//             </div>
//             <div className="flex items-center gap-3.5">
//               <StatusRing projects={projects} />
//               <div className="flex-1">
//                 {STATUS_KEYS.map((l) => (
//                   <div
//                     key={l}
//                     className={cn(
//                       "flex items-center justify-between py-1 px-1.5 -mx-1.5 border-b last:border-b-0 rounded cursor-pointer transition-colors hover:bg-bg2 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
//                       props.statusFilter === l && "bg-accent text-accent-foreground"
//                     )}
//                     title={props.statusFilter === l ? "Click to clear" : `Show only ${l}`}
//                     aria-pressed={props.statusFilter === l}
//                     {...clickProps(() => props.onStatusFilter(props.statusFilter === l ? null : l))}
//                   >
//                     <div className="flex items-center gap-1.5 text-xs">
//                       <span className="size-2 rounded-full shrink-0" style={{ background: statusColor(l) }} />
//                       {l}
//                     </div>
//                     <span className="text-[13px] font-semibold">{countBy(projects, l)}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </Section>
//
//           <Section>
//             <div className={cardHd}>
//               Avg progress by type <span className={tag}>click to filter</span>
//             </div>
//             {byType.map(({ t, n, a }) => (
//               <div
//                 key={t}
//                 className={cn(
//                   "mb-1 last:mb-0 px-1.5 py-1 -mx-1.5 rounded cursor-pointer transition-colors hover:bg-bg2 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
//                   props.typeFilter === t && "bg-accent"
//                 )}
//                 title={props.typeFilter === t ? "Click to clear" : `Show only ${t}`}
//                 aria-pressed={props.typeFilter === t}
//                 {...clickProps(() => props.onTypeFilter(props.typeFilter === t ? "All" : t))}
//               >
//                 <div className="flex justify-between items-baseline mb-1">
//                   <span className="text-xs">
//                     {t} <span className="text-[10px] text-fg3">· {n} projects</span>
//                   </span>
//                   <span className="text-xs font-semibold">{a}%</span>
//                 </div>
//                 <Bar pct={a} color="#7F77DD" className="flex-none" />
//               </div>
//             ))}
//           </Section>
//         </div>
//       </div>
//
//       <div className="mb-3">
//         <div className={`${cardHd} mb-2.5`}>
//           Quarter-wise Summary
//           <span className={tag}>click a quarter to filter</span>
//         </div>
//         <QuarterSummary projects={projects} active={quarterFilter} onToggle={onQuarterFilter} />
//       </div>
//
//       <Section className="mb-3">
//         <div className={cardHd}>
//           All {filtered.length} projects{quarterFilter ? ` — ${QUARTER_LABELS[quarterFilter]}` : ""} — pinned first, then by progress
//           <span className={tag}>click a row to edit</span>
//         </div>
//         {sorted.map((p) => (
//           <ProjectRow
//             key={p.pid}
//             project={p}
//             pidClassName="w-[68px] text-center"
//             meta={
//               <>
//                 {p.type} · {p.plant} · {p.sys}
//               </>
//             }
//             {...actions}
//           >
//             <div className="w-[200px] shrink-0 flex items-center gap-1.5 max-[700px]:w-[90px]">
//               <Bar pct={p.pct} color={statusColor(p.status)} className="h-1.5" />
//               <span className="text-[11px] font-medium min-w-[28px] text-right tabular-nums">{p.pct}%</span>
//             </div>
//             <StatusBadge status={p.status} />
//           </ProjectRow>
//         ))}
//         {!sorted.length && <Empty>No projects match current filters.</Empty>}
//       </Section>
//
//       <Section>
//         <div className={cardHd}>
//           <div className="flex items-center gap-2">
//             Notes &amp; Ideas
//             {pendingNotes > 0 && <span className="font-semibold text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{pendingNotes} open</span>}
//           </div>
//           <div className="flex items-center gap-2">
//             <div className="flex gap-1.5">
//               {(Object.keys(NOTE_DOT_COLORS) as NoteCat[]).map((cat) =>
//                 catCounts[cat] ? (
//                   <span key={cat} title={cat} className="text-[10px] flex items-center gap-1 text-fg3">
//                     <span className="size-[7px] rounded-full inline-block" style={{ background: NOTE_DOT_COLORS[cat] }} />
//                     {catCounts[cat]}
//                   </span>
//                 ) : null
//               )}
//             </div>
//             <Button variant="outline" size="sm" className="text-[11px] h-7 px-2.5" onClick={() => setComposing(true)}>
//               <Plus className="size-2.5" /> Add note
//             </Button>
//             <Button variant="outline" size="sm" className="text-[11px] h-7 px-2.5" onClick={props.onViewAllNotes}>
//               View all {notes.length}
//             </Button>
//           </div>
//         </div>
//
//         {composing && <NoteComposer variant="inline" autoFocus onAdd={props.onAddNote} onCancel={() => setComposing(false)} />}
//
//         {recentNotes.length ? (
//           <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
//             {recentNotes.map((n) => (
//               <NoteCard key={n.id} note={n} onEdit={props.onEditNote} onConvert={props.onConvertNote} onDelete={props.onDeleteNote} />
//             ))}
//           </div>
//         ) : (
//           <div className="text-center text-fg3 text-[13px] p-6">No notes yet. Click &quot;Add note&quot; to capture your first idea.</div>
//         )}
//       </Section>
//     </>
//   );
// }

"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Download, LayoutGrid, Moon, PictureInPicture2, Plus, Search, Sun, Upload, X } from "lucide-react";
import { LS_NOTES, LS_PINS, LS_PROJECTS, LS_REMARKS, LS_TAB, PIN_EMOJI, QUARTER_LABELS } from "@/lib/constants";
import { exportWorkbook, parseProjectsFile } from "@/lib/excel";
import { SEED_NOTES, SEED_PROJECTS } from "@/lib/seed";
import type { Note, NoteCat, Pin as PinType, Priority, Project, Quarter, Remark, TabId } from "@/lib/types";
import { usePersistentState } from "@/lib/usePersistentState";
import { usePinReminders } from "@/lib/usePinReminders";
import { cn, formatPid, maxIdNum, prefillName, qOf, today } from "@/lib/utils";

import AnalyticsView from "./AnalyticsView";
import FloatingPins from "./desktop/FloatingPins";
import { useFloatingWindow } from "./desktop/useFloatingWindow";
import KpiStrip from "./KpiStrip";
import NotesView from "./NotesView";
// import OverviewView from "./OverviewView";
import PinBoardView from "./PinBoardView";
import ProjectsView from "./ProjectsView";
import { Button } from "./ui/button";
import { Hammer } from "./ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import AddPinModal from "./modals/AddPinModal";
import ConfirmDeleteModal from "./modals/ConfirmDeleteModal";
import NoteEditModal from "./modals/NoteEditModal";
import PinModal from "./modals/PinModal";
import ProjectModal, { ProjectDraft } from "./modals/ProjectModal";

type ModalState =
  | { kind: "project"; pid?: string }
  | { kind: "convert"; noteId: string }
  | { kind: "confirmDelete"; pid: string }
  | { kind: "editNote"; id: string }
  | { kind: "pin"; pid: string }
  | { kind: "addPin" }
  | null;

const TABS: { id: TabId; label: string }[] = [
  // { id: "overview", label: "Overview" },
  { id: "projects", label: "All Projects" },
  { id: "analytics", label: "Analytics" },
   { id: "pinboard", label: "Pin Board" },
  { id: "notes", label: "Notes & Ideas" },

];

const isProjectList = (v: unknown) => Array.isArray(v) && v.every((p) => p && typeof p.pid === "string" && typeof p.name === "string");
const isPinList = (v: unknown) => Array.isArray(v) && v.every((p) => p && typeof p.pid === "string");

export default function Dashboard() {
  const [projects, setProjects] = usePersistentState<Project[]>(LS_PROJECTS, SEED_PROJECTS, isProjectList);
  const [notes, setNotes] = usePersistentState<Note[]>(LS_NOTES, SEED_NOTES, (v) => Array.isArray(v) && v.length > 0);
  const [pinsRaw, setPins] = usePersistentState<PinType[]>(LS_PINS, [], isPinList);
  const [tab, setTab] = usePersistentState<TabId>(LS_TAB, "overview", (v) => TABS.some((t) => t.id === v));
  const [remarks, setRemarks] = usePersistentState<Remark[]>(LS_REMARKS, [], Array.isArray);
  const [remindersOn, setRemindersOn] = usePersistentState<boolean>("sap_wms_notify_v1", false, (v) => typeof v === "boolean");

  const [search, setSearch] = useState("");
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);
  const [quarterFilter, setQuarterFilter] = useState<Quarter | null>(null);
  const [projFilter, setProjFilter] = useState("All");
  const [notesFilter, setNotesFilter] = useState<NoteCat | "all">("all");
  const [modal, setModal] = useState<ModalState>(null);

  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = mounted && resolvedTheme === "dark";
  const searchRef = useRef<HTMLInputElement>(null);
  const floating = useFloatingWindow();

  // Never reuse a project ID, even after deletes.
  const pidCounter = useRef(SEED_PROJECTS.length + 1);
  const nextPid = () => {
    const n = Math.max(pidCounter.current, maxIdNum(projects.map((p) => p.pid)) + 1);
    pidCounter.current = n + 1;
    return formatPid(n);
  };

  useEffect(() => setMounted(true), []);
  const closeModal = useCallback(() => setModal(null), []);

  /* ── derived ── */
  // One pin per project, and only for projects that still exist (e.g. after an Excel upload).
  const pins = useMemo(() => {
    const exists = new Set(projects.map((p) => p.pid));
    const seen = new Set<string>();
    return pinsRaw.filter((p) => exists.has(p.pid) && !seen.has(p.pid) && seen.add(p.pid));
  }, [pinsRaw, projects]);
  const pinnedSet = useMemo(() => new Set(pins.map((p) => p.pid)), [pins]);
  const isPinned = useCallback((pid: string) => pinnedSet.has(pid), [pinnedSet]);
  const pendingNotes = notes.filter((n) => !n.converted).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return projects.filter((p) => {
      if (kpiFilter && p.status !== kpiFilter) return false;
      if (quarterFilter && qOf(p) !== quarterFilter) return false;
      if (projFilter === "Pinned" && !pinnedSet.has(p.pid)) return false;
      if (projFilter !== "All" && projFilter !== "Pinned" && !(p.status === projFilter || p.type === projFilter || p.plant.includes(projFilter) || qOf(p) === projFilter)) return false;
      if (q && ![p.name, p.pid, p.plant, p.sys, p.type, p.notes].some((s) => s.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [projects, search, kpiFilter, quarterFilter, projFilter, pinnedSet]);

  /* ── projects ── */
  const saveProject = (draft: ProjectDraft, editPid?: string) => {
    if (editPid) {
      setProjects((ps) => ps.map((p) => (p.pid === editPid ? { ...draft, pid: editPid } : p)));
      toast.info(`${editPid} updated`);
    } else {
      const pid = nextPid();
      setProjects((ps) => [...ps, { ...draft, pid }]);
      toast.success(`${pid} created`, { action: { label: `${PIN_EMOJI} Pin it`, onClick: () => pinNow(pid) } });
    }
    closeModal();
  };

  const deleteProject = (pid: string) => {
    const idx = projects.findIndex((p) => p.pid === pid);
    const proj = projects[idx];
    const pin = pinsRaw.find((p) => p.pid === pid);
    const projRemarks = remarks.filter((r) => r.pid === pid);
    setProjects((ps) => ps.filter((p) => p.pid !== pid));
    setPins((ps) => ps.filter((p) => p.pid !== pid));
    setRemarks((rs) => rs.filter((r) => r.pid !== pid));
    closeModal();
    toast.error(`${pid} deleted`, {
      action: {
        label: "Undo",
        onClick: () => {
          setProjects((ps) => [...ps.slice(0, idx), proj, ...ps.slice(idx)]);
          if (pin) setPins((ps) => [...ps, pin]);
          if (projRemarks.length) setRemarks((rs) => [...rs, ...projRemarks]);
          toast.success(`${pid} restored`);
        },
      },
    });
  };

  const resetProjects = () => {
    const before = projects;
    setProjects(SEED_PROJECTS);
    toast.info("Projects reset to sample data", { action: { label: "Undo", onClick: () => setProjects(before) } });
  };

  /* ── remarks ── */
  const addRemark = (pid: string, text: string) => {
    const at = new Date().toISOString();
    setRemarks((rs) => [...rs, { id: `R${Date.now()}${Math.random().toString(36).slice(2, 6)}`, pid, text, at }]);
    toast.success(`Remark added to ${pid}`);
  };
  const deleteRemark = (id: string) => {
    const r = remarks.find((x) => x.id === id);
    setRemarks((rs) => rs.filter((x) => x.id !== id));
    if (r) toast.info("Remark deleted", { action: { label: "Undo", onClick: () => setRemarks((rs) => [...rs, r]) } });
  };

  /* ── notes ── */
  /** Clicking a note card: open notes get edited, converted notes open the project they became. */
  const openNote = (id: string) => {
    const n = notes.find((x) => x.id === id);
    if (n?.converted && n.projPid && projects.some((p) => p.pid === n.projPid)) setModal({ kind: "project", pid: n.projPid });
    else setModal({ kind: "editNote", id });
  };
  const addNote = (text: string, cat: NoteCat) => {
    if (!text) {
      toast.error("Type a note first");
      return false;
    }
    setNotes((ns) => [...ns, { id: `N${String(maxIdNum(ns.map((n) => n.id)) + 1).padStart(3, "0")}`, cat, text, date: today(), converted: false, projPid: null }]);
    toast.success("Note added");
    return true;
  };

  const saveNote = (id: string, text: string, cat: NoteCat) => {
    if (!text) return void toast.error("Note cannot be empty");
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, text, cat } : n)));
    closeModal();
    toast.info("Note updated");
  };

  const deleteNote = (id: string) => {
    const idx = notes.findIndex((n) => n.id === id);
    const note = notes[idx];
    setNotes((ns) => ns.filter((n) => n.id !== id));
    closeModal();
    toast.error("Note removed", { action: { label: "Undo", onClick: () => setNotes((ns) => [...ns.slice(0, idx), note, ...ns.slice(idx)]) } });
  };

  const saveConverted = (noteId: string, draft: ProjectDraft) => {
    const pid = nextPid();
    setProjects((ps) => [...ps, { ...draft, pid }]);
    setNotes((ns) => ns.map((n) => (n.id === noteId ? { ...n, converted: true, projPid: pid } : n)));
    closeModal();
    toast.success(`${pid} created from note`);
  };

  /* ── pins ── */
  /** One click = pinned (high priority, weekly). Details are optional via the toast or the Pin Board. */
  const pinNow = (pid: string) => {
    setPins((ps) => [...ps.filter((p) => p.pid !== pid), { pid, priority: "high", remind: "weekly", note: "", addedAt: today() }]);
    toast.success(`${PIN_EMOJI} ${pid} pinned`, {
      description: "Highlighted everywhere and added to the Pin Board.",
      action: { label: "Add details", onClick: () => setModal({ kind: "pin", pid }) },
    });
  };

  const savePin = (pid: string, data: { priority: Priority; remind: string; note: string }) => {
    const existing = pinsRaw.find((p) => p.pid === pid);
    const pin: PinType = { pid, ...data, addedAt: existing?.addedAt ?? today() };
    setPins((ps) => [...ps.filter((p) => p.pid !== pid), pin]);
    closeModal();
    toast.success(existing ? `${PIN_EMOJI} Pin updated` : `${PIN_EMOJI} Pinned to board`);
  };

  const unpin = (pid: string) => {
    const old = pinsRaw.find((p) => p.pid === pid);
    setPins((ps) => ps.filter((p) => p.pid !== pid));
    closeModal();
    toast.info(`Unpinned ${pid}`, old ? { action: { label: "Undo", onClick: () => setPins((ps) => [...ps.filter((p) => p.pid !== pid), old]) } } : undefined);
  };

  const setPriority = (pid: string, priority: Priority) => setPins((ps) => ps.map((p) => (p.pid === pid ? { ...p, priority } : p)));
  const togglePin = (pid: string) => (isPinned(pid) ? unpin(pid) : pinNow(pid));

  /* ── desktop ── */
  const openProjectFromDesktop = useCallback((pid: string) => setModal({ kind: "project", pid }), []);
  usePinReminders(pins, projects, remindersOn, openProjectFromDesktop);

  const toggleFloating = async () => {
    if (floating.win) return floating.close();
    const mode = await floating.open();
    if (mode === "blocked") toast.error("The browser blocked the popup — allow popups for this site and try again");
    else if (mode === "popup") toast.info("Opened in a small window", { description: "For an always-on-top window over your desktop, use Chrome or Edge." });
    else toast.success(`${PIN_EMOJI} Pinned items are floating on your desktop`, { description: "It stays on top of other apps and updates live." });
  };

  const toggleReminders = async () => {
    if (remindersOn) {
      setRemindersOn(false);
      return void toast.info("Desktop reminders off");
    }
    if (typeof Notification === "undefined") return void toast.error("This browser doesn't support desktop notifications");
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm !== "granted") return void toast.error("Notifications are blocked — allow them in the site settings (🔒 icon in the address bar)");
    setRemindersOn(true);
    new Notification(`${PIN_EMOJI} Desktop reminders on`, { body: "Pinned projects will remind you daily or weekly (per pin) while the dashboard is open." });
  };

  /* ── excel ── */
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { projects: rows, duplicates } = await parseProjectsFile(file);
      if (!rows.length) return void toast.error("No projects found in the first sheet");
      const before = projects;
      setProjects(rows);
      pidCounter.current = maxIdNum(rows.map((p) => p.pid)) + 1;
      setKpiFilter(null);
      setQuarterFilter(null);
      toast.success(`Loaded ${rows.length} projects from ${file.name}`, {
        description: duplicates ? `${duplicates} duplicate row${duplicates > 1 ? "s" : ""} skipped` : undefined,
        action: { label: "Undo", onClick: () => setProjects(before) },
      });
    } catch {
      toast.error("Couldn't read that Excel file — check it's .xlsx or .xls");
    }
  };

  const onExport = async () => {
    try {
      toast.success(`Downloaded: ${await exportWorkbook(projects, notes)}`);
    } catch {
      toast.error("Export failed — please try again");
    }
  };

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "n") {
        e.preventDefault();
        setModal({ kind: "project" });
      } else if (/^[1-5]$/.test(e.key)) {
        setTab(TABS[Number(e.key) - 1].id);
      } else if (e.key === "?") {
        toast.info("Keyboard shortcuts", { description: "/ search · n new project · 1–5 switch tabs · Esc clear search · Ctrl+Enter save in forms" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, setTab]);

  const rowHandlers = {
    onEdit: (pid: string) => setModal({ kind: "project", pid }),
    onTogglePin: togglePin,
    onDelete: (pid: string) => setModal({ kind: "confirmDelete", pid }),
    isPinned,
  };

  /* ── active filter chips ── */
  const chips = [
    kpiFilter && { label: `Status: ${kpiFilter}`, clear: () => setKpiFilter(null) },
    quarterFilter && { label: QUARTER_LABELS[quarterFilter], clear: () => setQuarterFilter(null) },
    projFilter !== "All" && { label: projFilter === "Pinned" ? `${PIN_EMOJI} Pinned` : projFilter, clear: () => setProjFilter("All") },
    search.trim() && { label: `“${search.trim()}”`, clear: () => setSearch("") },
  ].filter(Boolean) as { label: string; clear: () => void }[];
  const clearAll = () => {
    setKpiFilter(null);
    setQuarterFilter(null);
    setProjFilter("All");
    setSearch("");
  };

  /* ── modal rendering ── */
  const renderModal = () => {
    if (!modal) return null;
    switch (modal.kind) {
      case "project": {
        const project = modal.pid ? projects.find((p) => p.pid === modal.pid) : undefined;
        return (
          <ProjectModal
            project={project}
            defaultSr={projects.length + 1}
            onSave={(d) => saveProject(d, project?.pid)}
            onDelete={project ? () => setModal({ kind: "confirmDelete", pid: project.pid }) : undefined}
            onClose={closeModal}
            onInvalid={() => toast.error("Project name is required")}
          />
        );
      }
      case "convert": {
        const note = notes.find((n) => n.id === modal.noteId);
        if (!note) return null;
        return (
          <ProjectModal
            fromNote={{ text: note.text, prefillName: prefillName(note.text) }}
            defaultSr={projects.length + 1}
            onSave={(d) => saveConverted(note.id, d)}
            onClose={closeModal}
            onInvalid={() => toast.error("Project name is required")}
          />
        );
      }
      case "confirmDelete": {
        const project = projects.find((p) => p.pid === modal.pid);
        return project ? <ConfirmDeleteModal project={project} onConfirm={() => deleteProject(project.pid)} onClose={closeModal} /> : null;
      }
      case "editNote": {
        const note = notes.find((n) => n.id === modal.id);
        return note ? <NoteEditModal note={note} onSave={(t, c) => saveNote(note.id, t, c)} onDelete={() => deleteNote(note.id)} onClose={closeModal} /> : null;
      }
      case "pin": {
        const project = projects.find((p) => p.pid === modal.pid);
        return project ? (
          <PinModal project={project} existing={pins.find((p) => p.pid === modal.pid)} onSave={(d) => savePin(project.pid, d)} onUnpin={() => unpin(project.pid)} onClose={closeModal} />
        ) : null;
      }
      case "addPin":
        return <AddPinModal projects={projects} isPinned={isPinned} onPick={(pid) => setModal({ kind: "pin", pid })} onClose={closeModal} />;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <div className="flex items-center justify-between px-6 h-[54px] border-b bg-background z-50 gap-3 flex-wrap max-[1000px]:h-auto max-[1000px]:py-2">
        <div className="flex items-center gap-2.5">
          <div className="size-[30px] rounded-lg bg-primary flex items-center justify-center shrink-0">
            <LayoutGrid className="size-4 text-white" />
          </div>
          <div>
            <div className="text-[15px] font-semibold">SAP / WMS Command Center</div>
            <div className="text-[11px] text-fg3">
              FY 2026-27 · AD &amp; ND Plants · {projects.length} projects
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-fg3" />
            <input
              ref={searchRef}
              className="pl-[30px] pr-7 py-1.5 rounded-md border bg-bg2 text-xs w-[200px] outline-none transition-all focus:w-[240px] focus:border-primary"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (tab !== "overview" && tab !== "projects") setTab("projects");
              }}
              onKeyDown={(e) => e.key === "Escape" && (setSearch(""), e.currentTarget.blur())}
              aria-label="Search projects"
            />
            {search ? (
              <button className="absolute right-1.5 top-1/2 -translate-y-1/2 text-fg3 hover:text-foreground" onClick={() => setSearch("")} aria-label="Clear search">
                <X className="size-3.5" />
              </button>
            ) : (
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-fg3 border rounded px-1 leading-4 pointer-events-none">/</kbd>
            )}
          </div>
          <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border-strong bg-bg2 text-xs text-fg2 cursor-pointer transition-colors whitespace-nowrap hover:border-primary hover:text-accent-foreground hover:bg-accent">
            <Upload className="size-3.5" /> Upload
            <input type="file" accept=".xlsx,.xls" onChange={onUpload} className="hidden" />
          </label>
          <Button variant="outline" size="sm" className="text-xs" onClick={onExport} title="Download dashboard data as Excel">
            <Download className="size-3.5" /> Export
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn("size-8", floating.win && "bg-amber-100 border-amber-400 dark:bg-amber-500/20")}
            onClick={toggleFloating}
            title={floating.win ? "Close floating pinned window" : "Pop out pinned items onto the desktop (always on top)"}
            aria-label="Toggle floating pinned window"
          >
            <PictureInPicture2 className="size-4" />
          </Button>
          <Button size="sm" className="text-xs" onClick={() => setModal({ kind: "project" })} title="New project (N)">
            <Plus className="size-3.5" /> Add Project
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => setTheme(isDark ? "light" : "dark")} title="Toggle theme" aria-label="Toggle theme">
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>

      <KpiStrip projects={projects} pinnedCount={pins.length} active={kpiFilter} onToggle={setKpiFilter} onOpenPins={() => setTab("pinboard")} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="flex flex-col flex-1 min-h-0">
        <TabsList className="flex w-full justify-start gap-0 h-auto rounded-none border-b bg-background px-6 py-0 overflow-x-auto">
          {TABS.map((t, i) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              title={`${t.label} (${i + 1})`}
              className={cn(
                "flex-none text-[13px] px-4 py-2.5 rounded-none border-b-2 border-transparent -mb-px text-fg3 hover:text-fg2",
                "data-[state=active]:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              )}
            >
              {t.id === "pinboard" && <Hammer className="mr-1" />}
              {t.label}
              {t.id === "notes" && pendingNotes > 0 && <span className="text-[10px] px-1.5 py-px rounded-full bg-accent text-accent-foreground ml-1 align-middle">{pendingNotes}</span>}
              {t.id === "pinboard" && pins.length > 0 && (
                <span className="text-[10px] px-1.5 py-px rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 ml-1 align-middle">{pins.length}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {chips.length > 0 && (tab === "overview" || tab === "projects") && (
            <div className="flex items-center gap-1.5 flex-wrap mb-4 text-[11px] animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-fg3">
                Showing {filtered.length} of {projects.length} · filtered by
              </span>
              {chips.map((c) => (
                <button key={c.label} onClick={c.clear} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground border border-primary/40 hover:border-primary" title="Remove filter">
                  {c.label} <X className="size-3" />
                </button>
              ))}
              {chips.length > 1 && (
                <button onClick={clearAll} className="text-fg3 hover:text-foreground underline underline-offset-2 ml-1">
                  Clear all
                </button>
              )}
            </div>
          )}
{/*
          <TabsContent value="overview">
            <OverviewView
              projects={projects}
              filtered={filtered}
              notes={notes}
              quarterFilter={quarterFilter}
              onQuarterFilter={setQuarterFilter}
              onAddNote={addNote}
              onViewAllNotes={() => setTab("notes")}
              onEditNote={openNote}
              onConvertNote={(noteId) => setModal({ kind: "convert", noteId })}
              onDeleteNote={deleteNote}
              statusFilter={kpiFilter}
              onStatusFilter={setKpiFilter}
              typeFilter={projFilter}
              onTypeFilter={setProjFilter}
              {...rowHandlers}
            />
          </TabsContent>*/}
          <TabsContent value="projects">
            <ProjectsView
              projects={filtered}
              filter={projFilter}
              onFilter={setProjFilter}
              onReset={resetProjects}
              remarks={remarks}
              onAddRemark={addRemark}
              onDeleteRemark={deleteRemark}
              {...rowHandlers}
            />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalyticsView
              projects={projects}
              onShowStatus={(st) => {
                clearAll();
                setKpiFilter(st);
                setTab("projects");
              }}
              {...rowHandlers}
            />
          </TabsContent>
          <TabsContent value="notes">
            <NotesView
              notes={notes}
              filter={notesFilter}
              onFilter={setNotesFilter}
              onAdd={addNote}
              onEdit={openNote}
              onConvert={(noteId) => setModal({ kind: "convert", noteId })}
              onDelete={deleteNote}
            />
          </TabsContent>
          <TabsContent value="pinboard">
            <PinBoardView
              pins={pins}
              projects={projects}
              onAddPin={() => setModal({ kind: "addPin" })}
              onEditPin={(pid) => setModal({ kind: "pin", pid })}
              onEditProject={rowHandlers.onEdit}
              onUnpin={unpin}
              onSetPriority={setPriority}
              onQuarter={(q) => {
                clearAll();
                setQuarterFilter(q);
                setProjFilter("Pinned");
                setTab("projects");
              }}
              floatingOpen={!!floating.win}
              onToggleFloating={toggleFloating}
              remindersOn={remindersOn}
              onToggleReminders={toggleReminders}
            />
          </TabsContent>
        </div>
      </Tabs>

      {renderModal()}
      {floating.win && <FloatingPins win={floating.win} pins={pins} projects={projects} onOpen={openProjectFromDesktop} onUnpin={unpin} />}
    </div>
  );
}

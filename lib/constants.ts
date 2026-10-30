import type { NoteCat, Priority, Quarter, Status } from "./types";

export const STATUS_COLORS: Record<string, string> = {
  Done: "#1D9E75",
  WIP: "#378ADD",
  Parked: "#EF9F27",
  Open: "#888780",
};

/** Canonical status order used by every list, legend and chart. */
export const STATUS_KEYS: Status[] = ["WIP", "Done", "Parked", "Open"];
export const statusColor = (s: string) => STATUS_COLORS[s] || STATUS_COLORS.Open;

/** Marker shown on everything that is pinned. Change it here to change it everywhere. */
export const PIN_EMOJI = "🔨";

export const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];
export const QUARTER_LABELS: Record<Quarter, string> = {
  Q1: "Q1 Apr–Jun",
  Q2: "Q2 Jul–Sep",
  Q3: "Q3 Oct–Dec",
  Q4: "Q4 Jan–Mar",
};
export const QUARTER_COLORS: Record<Quarter, string> = {
  Q1: "#378ADD",
  Q2: "#1D9E75",
  Q3: "#EF9F27",
  Q4: "#7F77DD",
};

export const NOTE_CATS: { id: NoteCat; label: string }[] = [
  { id: "idea", label: "Idea" },
  { id: "discussion", label: "Discussion" },
  { id: "issue", label: "Issue" },
  { id: "research", label: "Research" },
  { id: "requirement", label: "Requirement" },
];
export const NOTE_DOT_COLORS: Record<NoteCat, string> = {
  idea: "#1D9E75",
  discussion: "#378ADD",
  issue: "#E24B4A",
  research: "#7F77DD",
  requirement: "#EF9F27",
};

export const NOTE_CARD_CLASS: Record<NoteCat, string> = {
  idea: "bg-[#EAF3DE] border-[#97C459] dark:bg-[#0a2010] dark:border-[#1D9E75]",
  discussion: "bg-[#E6F1FB] border-[#85B7EB] dark:bg-[#071828] dark:border-[#378ADD]",
  issue: "bg-[#FCEBEB] border-[#F09595] dark:bg-[#2a0a0a] dark:border-[#E24B4A]",
  research: "bg-[#EEEDFE] border-[#AFA9EC] dark:bg-[#1a1535] dark:border-[#7F77DD]",
  requirement: "bg-[#FAEEDA] border-[#FAC775] dark:bg-[#201800] dark:border-[#EF9F27]",
};
export const NOTE_TAG_CLASS: Record<NoteCat, string> = {
  idea: "text-[#085041] dark:text-[#6ee7a0]",
  discussion: "text-[#0C447C] dark:text-[#67e8f9]",
  issue: "text-[#A32D2D] dark:text-[#f87171]",
  research: "text-[#3C3489] dark:text-[#a78bfa]",
  requirement: "text-[#633806] dark:text-[#fbbf24]",
};
export const NOTE_PILL_CLASS: Record<NoteCat | "all", string> = {
  all: "bg-accent text-accent-foreground border-primary",
  idea: "bg-[#EAF3DE] text-[#085041] border-[#1D9E75]",
  discussion: "bg-[#E6F1FB] text-[#0C447C] border-[#378ADD]",
  issue: "bg-[#FCEBEB] text-[#A32D2D] border-[#E24B4A]",
  research: "bg-[#EEEDFE] text-[#3C3489] border-[#7F77DD]",
  requirement: "bg-[#FAEEDA] text-[#633806] border-[#EF9F27]",
};

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "critical", label: "🔴 Critical" },
  { value: "high", label: "🟠 High" },
  { value: "medium", label: "🔵 Medium" },
  { value: "low", label: "⚪ Low" },
];
export const PRIORITY_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export const REMIND_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "always", label: "Always visible" },
];
/** Milliseconds between desktop reminders for each interval ("always" = shown in the floating window, no popups). */
export const REMIND_MS: Record<string, number> = { daily: 24 * 3600e3, weekly: 7 * 24 * 3600e3 };

export const PRIORITY_BADGE_CLASS: Record<Priority, string> = {
  critical: "bg-[#FCEBEB] text-[#A32D2D] dark:bg-[#2a0a0a] dark:text-[#f87171]",
  high: "bg-[#FAEEDA] text-[#633806] dark:bg-[#201800] dark:text-[#fbbf24]",
  medium: "bg-[#E6F1FB] text-[#0C447C] dark:bg-[#071828] dark:text-[#67e8f9]",
  low: "bg-[#F1EFE8] text-[#444441] dark:bg-[#1a1a24] dark:text-[#9090a8]",
};

export const OPTIONS = {
  type: ["Project", "MIS", "New Process"],
  plant: ["AD", "ND", "AD & ND"],
  sys: ["SAP", "SAP/WMS", "WMS", "BW", "Others"],
  mod: ["PP", "PM", "ALL", "SD", "MM", "QM"],
  status: ["Open", "WIP", "Parked", "Done"],
  phase: ["Open", "Dev & Test", "WIP", "PRD-Live"],
};

export const QUARTER_OPTIONS = QUARTERS.map((q) => ({ value: q, label: QUARTER_LABELS[q] }));

export const PROJECT_FILTERS = ["All", "Pinned", "WIP", "Parked", "Open", "Done", "MIS", "New Process", "Project", "AD", "ND", "Q1", "Q2", "Q3", "Q4"];

export const LS_NOTES = "sap_wms_notes_v1";
export const LS_PINS = "sap_wms_pins_v1";
export const LS_PROJECTS = "sap_wms_projects_v1";
export const LS_TAB = "sap_wms_tab_v1";
export const LS_REMARKS = "sap_wms_remarks_v1";
export const LS_REMINDED = "sap_wms_reminded_v1";

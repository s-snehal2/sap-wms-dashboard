import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Project } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const statusClass = (s: string) =>
  s === "Done" || s === "PRD-Live"
    ? "bg-status-done-bg text-status-done-txt"
    : s === "WIP"
      ? "bg-status-wip-bg text-status-wip-txt"
      : s === "Parked"
        ? "bg-status-parked-bg text-status-parked-txt"
        : "bg-status-open-bg text-status-open-txt";

export const typeClass = (t: string) =>
  t === "MIS" ? "bg-accent text-accent-foreground" : t === "New Process" ? "bg-status-done-bg text-status-done-txt" : "bg-status-open-bg text-status-open-txt";

export const quarterClass = (q?: string) =>
  q === "Q1"
    ? "bg-q1-bg text-q1-txt"
    : q === "Q2"
      ? "bg-q2-bg text-q2-txt"
      : q === "Q3"
        ? "bg-q3-bg text-q3-txt"
        : q === "Q4"
          ? "bg-q4-bg text-q4-txt"
          : "bg-qna-bg text-qna-txt";

export const qOf = (p: Project) => p.quarter || "Q1";

export const normStatus = (s: unknown) => {
  const v = String(s ?? "").trim();
  return v === "PRD-Live" ? "Done" : v || "Open";
};

export const parsePct = (v: unknown) => {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n > 1 ? Math.round(n) : Math.round(n * 100);
};

/** Highest number found in a list of ids like "CMC0012" / "N007". */
export const maxIdNum = (ids: string[]) => ids.reduce((m, id) => Math.max(m, parseInt(id.replace(/\D/g, ""), 10) || 0), 0);

export const formatPid = (n: number) => `CMC${String(n).padStart(4, "0")}`;

export const today = () => new Date().toISOString().split("T")[0];

export const avgPct = (ps: Project[]) => (ps.length ? Math.round(ps.reduce((a, p) => a + p.pct, 0) / ps.length) : 0);

export const countBy = (ps: Project[], status: string) => ps.filter((p) => p.status === status).length;

export const statusCounts = (ps: Project[]) => ({
  WIP: countBy(ps, "WIP"),
  Done: countBy(ps, "Done"),
  Parked: countBy(ps, "Parked"),
  Open: countBy(ps, "Open"),
});

/** First ~70 characters of a note, cut on a word boundary — used to prefill a project name. */
export const prefillName = (text: string) => {
  let out = "";
  for (const w of text.split(/\s+/)) {
    const next = (out + " " + w).trim();
    if (next.length > 70) break;
    out = next;
  }
  return out;
};

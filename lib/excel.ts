import type { Note, Project } from "./types";
import { avgPct, countBy, formatPid, maxIdNum, normStatus, parsePct } from "./utils";

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

/**
 * Read the first sheet of an uploaded .xlsx/.xls into projects.
 * Duplicate rows (same ID + same name) are skipped, and clashing IDs are re-numbered,
 * so every project keeps a unique ID (edits, pins and deletes key off it).
 */
export async function parseProjectsFile(file: File): Promise<{ projects: Project[]; duplicates: number }> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  const parsed = rows
    .map((r, i) => {
      const idCell = clean(r["Project ID"]);
      return {
        pid: /^CMC\d+$/.test(idCell) ? idCell : "",
        sr: Number(r["Sr.No"] || r["Sr No"]) || i + 1,
        name: clean(r["Project Details"] || r["Project Name"]) || `Project ${i + 1}`,
        type: clean(r["Project Type"]) || "Project",
        plant: clean(r["Plant"]) || "AD",
        sys: clean(r["System"]) || "SAP",
        mod: clean(r["Module"]) || "PP",
        phase: clean(r["Project Phase"]) || "Open",
        status: normStatus(r["Project Status"] || "Open"),
        pct: parsePct(r["% Work"] || 0),
        notes: clean(r["Tasks Details"]),
        quarter: clean(r["Quarter"] || r["Qtr"] || r["FY Quarter"]) || "Q1",
      };
    })
    .filter((p) => p.name.length > 1);

  const used = new Set<string>();
  const seenRows = new Set<string>();
  let next = maxIdNum(parsed.map((p) => p.pid)) + 1;
  let duplicates = 0;
  const projects: Project[] = [];
  for (const p of parsed) {
    const rowKey = `${p.pid}|${p.name.toLowerCase()}|${p.plant}|${p.type}`;
    if (seenRows.has(rowKey)) {
      duplicates++;
      continue;
    }
    seenRows.add(rowKey);
    if (!p.pid || used.has(p.pid)) p.pid = formatPid(next++);
    used.add(p.pid);
    projects.push(p);
  }
  return { projects, duplicates };
}

/** Download projects, notes and a summary as a 3-sheet workbook. */
export async function exportWorkbook(projects: Project[], notes: Note[]): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const projHeaders = ["Sr.No", "Project ID", "Fiscal Year", "Quarter", "Project Type", "Plant", "Project Details", "System", "Module", "Project Phase", "Project Status", "% Work", "Tasks Details"];
  const projRows = projects.map((p) => [p.sr, p.pid, "2026-27", p.quarter || "Q1", p.type, p.plant, p.name, p.sys, p.mod, p.phase, p.status, p.pct / 100, p.notes || ""]);
  const ws1 = XLSX.utils.aoa_to_sheet([projHeaders, ...projRows]);
  ws1["!cols"] = [7, 12, 10, 8, 14, 10, 55, 10, 8, 18, 14, 8, 45].map((wch) => ({ wch }));
  const PCT_COL = 11;
  for (let r = 1; r <= projRows.length; r++) {
    const cell = ws1[XLSX.utils.encode_cell({ r, c: PCT_COL })];
    if (cell) cell.z = "0%";
  }
  XLSX.utils.book_append_sheet(wb, ws1, "Projects");

  const notesHeaders = ["Note ID", "Category", "Note / Discussion", "Date Added", "Converted to Project", "Project ID"];
  const notesRows = notes.map((n) => [n.id, n.cat.charAt(0).toUpperCase() + n.cat.slice(1), n.text, n.date, n.converted ? "Yes" : "No", n.projPid || ""]);
  const ws2 = XLSX.utils.aoa_to_sheet([notesHeaders, ...notesRows]);
  ws2["!cols"] = [10, 14, 60, 14, 20, 12].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws2, "Notes & Ideas");

  const count = (s: string) => countBy(projects, s);
  const total = projects.length;
  const avg = avgPct(projects);
  const exportedOn = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const ws3 = XLSX.utils.aoa_to_sheet([
    ["SAP / WMS Command Center — Project Summary"],
    ["FY 2026-27 · AD & ND Plants"],
    ["Exported on", exportedOn],
    [],
    ["Metric", "Value"],
    ["Total Projects", total],
    ["WIP (In Progress)", count("WIP")],
    ["Completed (Done / PRD-Live)", count("Done")],
    ["Parked", count("Parked")],
    ["Open", count("Open")],
    ["Average Progress (%)", avg + "%"],
    [],
    ["Notes & Ideas", ""],
    ["Total Notes", notes.length],
    ["Converted to Projects", notes.filter((n) => n.converted).length],
    ["Pending / Open Notes", notes.filter((n) => !n.converted).length],
  ]);
  ws3["!cols"] = [{ wch: 32 }, { wch: 20 }];
  ws3["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  XLSX.utils.book_append_sheet(wb, ws3, "Summary");

  const fileName = `SAP_WMS_Dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}

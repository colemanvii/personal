/* TABLET — persistence.
 *
 * Two layers, merged so neither can lose the other's work:
 *   1. the browser's localStorage (survives refreshes and browser restarts)
 *   2. tablet/data/board.json on this computer, when TABLET runs through
 *      serve.py (survives clearing the browser, and gives a file to back up)
 *
 * Merging is per entry: the newer edit wins, and a deleted entry leaves a
 * tombstone so it cannot come back from the other copy.
 */
import {DEFAULT_PROJECTS} from "./extract.js";

export const KEY = "tablet.board.v1";
export const SCHEMA = 1;

export function emptyBoard() {
  return {schema: SCHEMA, projects: DEFAULT_PROJECTS.map(p => ({...p})), entries: [], deleted: [], updatedAt: ""};
}

export function normalize(b) {
  const board = emptyBoard();
  if (!b || typeof b !== "object") return board;
  if (Array.isArray(b.projects) && b.projects.length) board.projects = b.projects.filter(p => p && p.id && p.name);
  if (Array.isArray(b.entries)) board.entries = b.entries.filter(e => e && e.id);
  if (Array.isArray(b.deleted)) board.deleted = b.deleted.filter(Boolean);
  board.updatedAt = b.updatedAt || "";
  return board;
}

export function merge(a, b) {
  a = normalize(a); b = normalize(b);
  const deleted = [...new Set([...a.deleted, ...b.deleted])];
  const gone = new Set(deleted);
  const byId = new Map();
  for (const e of [...a.entries, ...b.entries]) {
    if (gone.has(e.id)) continue;
    const prev = byId.get(e.id);
    if (!prev || (e.updatedAt || "") > (prev.updatedAt || "")) byId.set(e.id, e);
  }
  const projects = [...a.projects];
  for (const p of b.projects) if (!projects.some(x => x.id === p.id)) projects.push(p);
  return {
    schema: SCHEMA, projects, deleted,
    entries: [...byId.values()].sort((x, y) => (y.createdAt || "").localeCompare(x.createdAt || "")),
    updatedAt: [a.updatedAt, b.updatedAt].sort().at(-1) || "",
  };
}

export function loadLocal() {
  try { return normalize(JSON.parse(localStorage.getItem(KEY) || "null")); }
  catch { return emptyBoard(); }
}

export function saveLocal(board) {
  localStorage.setItem(KEY, JSON.stringify(board));
}

export async function serverAvailable() {
  try {
    const r = await fetch("api/health", {cache: "no-store"});
    return r.ok && (await r.json()).tablet === true;
  } catch { return false; }
}

export async function loadServer() {
  const r = await fetch("api/board", {cache: "no-store"});
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`board read failed: ${r.status}`);
  return normalize(await r.json());
}

export async function saveServer(board) {
  const r = await fetch("api/board", {method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify(board)});
  if (!r.ok) throw new Error(`board write failed: ${r.status}`);
}

export async function loadInbox() {
  const r = await fetch("api/inbox", {cache: "no-store"});
  return r.ok ? (await r.json()).items || [] : [];
}

export async function clearInboxItem(id) {
  await fetch(`api/inbox/${encodeURIComponent(id)}`, {method: "DELETE"});
}

export function newId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
}

export function toMarkdown(board) {
  const lines = [`# TABLET — exported ${new Date().toISOString().slice(0, 10)}`, ""];
  for (const p of board.projects) {
    const es = board.entries.filter(e => e.projectId === p.id);
    if (!es.length) continue;
    lines.push(`## ${p.name}`, "");
    for (const e of es) {
      lines.push(`### ${e.person || e.opportunity || e.summary}${e.archived ? " (archived)" : ""}`);
      for (const [k, v] of [["Category", e.category], ["Opportunity", e.opportunity], ["Status", e.status], ["Summary", e.summary],
        ["Next action", e.nextAction], ["Date", e.date], ["Source", e.sourceUrl]]) if (v) lines.push(`- **${k}:** ${v}`);
      lines.push("", ...e.original.split("\n").map(l => `> ${l}`), "");
    }
  }
  return lines.join("\n");
}

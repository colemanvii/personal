/* TABLET — extraction.
 *
 * Reads pasted text and proposes an entry. Pure functions, no network, no model:
 * every proposed field carries its basis so the person approving it can see
 * where it came from.
 *
 *   verbatim  — the words are in the text exactly
 *   inferred  — derived by a visible rule from words that are in the text
 *   suggested — a phrasing TABLET offers; needs the person's confirmation
 *   source    — taken from the capture's provenance (link, URL, capture time)
 *   empty     — nothing in the text supports a value, so none is proposed
 *
 * Rules that keep it honest:
 *   - a person is proposed only when a full name appears in the text
 *   - a next action is proposed only when the text expresses an intention
 *   - status is never "Done": completion is something only the person records
 */

export const DEFAULT_PROJECTS = [
  {id: "freeman", name: "Freeman", aliases: ["freeman gc", "freemangc", "freeman general contracting"]},
  {id: "bfg", name: "Built for Generations", aliases: ["bfg", "built-for-generations"]},
  {id: "art", name: "Art", aliases: ["painting", "paintings", "drawing", "drawings", "exhibition", "gallery", "studio work"]},
  {id: "personal", name: "Personal", aliases: ["photography", "my photography", "family"]},
  {id: "tangerine", name: "Tangerine", aliases: []},
];

export const STATUSES = ["Idea", "Prospect", "Active", "Waiting", "Done"];

const lower = s => (s || "").toLowerCase();
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = phrase => new RegExp(`(^|[^a-z0-9])${escapeRe(lower(phrase))}($|[^a-z0-9])`, "i");
const field = (value, basis, note = "") => ({value: value ?? "", basis: value ? basis : "empty", note: value ? note : note});
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const sentences = text => text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);

/* A pasted ChatGPT exchange carries "You said:" / "ChatGPT said:" labels.
   The person's own words are what get extracted from; the whole paste is still
   kept verbatim as the original. */
export function ownWords(text) {
  const t = text || "";
  if (!/(^|\n)\s*(You said:|ChatGPT said:)/i.test(t)) return t;
  const parts = t.split(/(?:^|\n)\s*(You said:|ChatGPT said:)\s*/i);
  const mine = [];
  for (let i = 1; i < parts.length; i += 2) if (/^you/i.test(parts[i])) mine.push(parts[i + 1]);
  return mine.join("\n").trim() || t;
}

/* ---------- source link ---------- */
export function findLink(text, provenanceUrl = "") {
  const urls = (text.match(/https?:\/\/[^\s<>"')\]]+/g) || []).map(u => u.replace(/[.,;:]+$/, ""));
  const chat = urls.find(u => /(^https?:\/\/)(chatgpt\.com|chat\.openai\.com)\//i.test(u));
  if (chat) return field(chat, "verbatim", "Link found in the pasted text");
  if (provenanceUrl) return field(provenanceUrl, "source", "Page the capture came from");
  if (urls[0]) return field(urls[0], "verbatim", "Link found in the pasted text");
  return field("", "empty", "No link supplied");
}

/* ChatGPT project conversations live under /g/g-p-<id>-<slug>/; the slug, when
   present, names the project. */
export function projectSlug(url) {
  const m = /\/g\/g-p-[0-9a-f]+-([a-z0-9-]+)/i.exec(url || "");
  return m ? m[1].replace(/-/g, " ") : "";
}

/* ---------- project ---------- */
export function findProject(text, projects, sourceUrl = "") {
  const t = lower(text);
  const scores = new Map();
  const why = new Map();
  for (const p of projects) {
    let s = 0;
    const negated = new RegExp(`(outside|not for|not|separate from|apart from|unrelated to|other than)( of)?( the)? ${escapeRe(lower(p.name))}`, "i").test(t);
    if (wordRe(p.name).test(t) && !negated) { s += 3; why.set(p.id, `"${p.name}" is named in the text`); }
    for (const a of p.aliases || []) if (a && wordRe(a).test(t) && !negated) {
      s += 1; if (!why.has(p.id)) why.set(p.id, `"${a}" points to ${p.name}`);
    }
    const slug = projectSlug(sourceUrl);
    if (slug && (lower(slug).includes(lower(p.name)) || (p.aliases || []).some(a => a && lower(slug).includes(lower(a))))) {
      s += 2; if (!why.has(p.id)) why.set(p.id, `The ChatGPT project in the link is "${slug}"`);
    }
    if (negated) s -= 5;
    scores.set(p.id, s);
  }
  const ranked = [...scores].filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
  if (!ranked.length || (ranked[1] && ranked[1][1] === ranked[0][1])) {
    return field("", "empty", ranked.length ? "More than one project fits; choose one" : "No project is named; choose one");
  }
  const [id] = ranked[0];
  const p = projects.find(x => x.id === id);
  const basis = wordRe(p.name).test(t) ? "verbatim" : (why.get(id) || "").startsWith("The ChatGPT project") ? "source" : "inferred";
  return field(id, basis, why.get(id));
}

/* ---------- person ---------- */
const NOT_NAMES = new Set(("a an and add also as at be but by call can chatgpt could do email for from get he her him his i if in into is it " +
  "let lets maybe me my need note of on or our put remember she should talk tell the their them then they this to we with you your " +
  "monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october " +
  "november december business development hit list prospect client project photography personal art golf clubhouse construction " +
  "next action status today tomorrow").split(" "));

export function findPeople(text, projects = []) {
  const projectWords = new Set(projects.flatMap(p => [p.name, ...(p.aliases || [])]).flatMap(n => lower(n).split(/\s+/)));
  const re = /\b([A-Z][a-zA-Z'’-]+(?:\s+(?:[A-Z][a-zA-Z'’-]+|[A-Z]\.)){1,3})\b/g;
  const found = [];
  let m;
  while ((m = re.exec(text))) {
    let tokens = m[1].split(/\s+/);
    while (tokens.length && (NOT_NAMES.has(lower(tokens[0])) || projectWords.has(lower(tokens[0])))) tokens.shift();
    while (tokens.length && (NOT_NAMES.has(lower(tokens.at(-1))) || projectWords.has(lower(tokens.at(-1))))) tokens.pop();
    if (tokens.length < 2 || tokens.some(w => NOT_NAMES.has(lower(w)) || projectWords.has(lower(w)))) continue;
    const name = tokens.join(" ");
    if (!found.includes(name)) found.push(name);
  }
  return found;
}

export function findPerson(text, projects) {
  const people = findPeople(text, projects);
  if (!people.length) return field("", "empty", "No full name appears in the text");
  const note = people.length > 1 ? `Also named: ${people.slice(1).join(", ")}` : "Name appears in the text";
  return field(people[0], "verbatim", note);
}

/* ---------- category ---------- */
const CATEGORY_RULES = [
  {re: /business[- ]development/i, value: "Business Development", basis: "verbatim"},
  {re: /hit ?list|\bprospect|\blead\b|partnership|pipeline|\bbd\b/i, value: "Business Development", basis: "inferred"},
  {re: /photograph\w*[^.]{0,40}client|client[^.]{0,40}photograph/i, value: "Photography Client", basis: "inferred"},
  {re: /\bclients?\b|commission/i, value: "Client", basis: "inferred"},
  {re: /\bpaint|\bdrawing|\bseries\b|\bcanvas/i, value: "Artwork", basis: "inferred"},
  {re: /\bidea\b|\bconcept\b|what if/i, value: "Idea", basis: "inferred"},
];
export function findCategory(text) {
  for (const r of CATEGORY_RULES) {
    const m = r.re.exec(text);
    if (m) return field(r.value, r.basis, r.basis === "verbatim" ? `"${m[0]}" is in the text` : `From "${m[0].trim()}"`);
  }
  return field("", "empty", "No category is clear from the text");
}

/* ---------- opportunity ---------- */
const OPPORTUNITY_RULES = [
  {re: /club ?houses?/i, value: "Golf clubhouse construction", note: m => `"${m}" read as golf clubhouse construction — confirm`},
  {re: /custom homes?|new homes?/i, value: "Custom home construction"},
  {re: /renovat\w*|remodel\w*/i, value: "Renovation"},
  {re: /commercial (?:build|project|space)\w*/i, value: "Commercial construction"},
  {re: /photograph\w*|photo ?shoots?/i, value: "Photography work"},
  {re: /murals?/i, value: "Mural commission"},
  {re: /portraits?/i, value: "Portrait commission"},
];
export function findOpportunity(text) {
  for (const r of OPPORTUNITY_RULES) {
    const m = r.re.exec(text);
    if (m) return field(r.value, "inferred", r.note ? r.note(m[0]) : `From "${m[0]}"`);
  }
  return field("", "empty", "No specific opportunity is named");
}

/* ---------- status ---------- */
export function findStatus(text) {
  const rules = [
    [/hit ?list|prospect|potential|\blead\b|could|might|explore|maybe/i, "Prospect"],
    [/waiting (?:on|for)|pending|awaiting/i, "Waiting"],
    [/in progress|underway|we(?:'ve| have) started|kicked off/i, "Active"],
  ];
  for (const [re, value] of rules) {
    const m = re.exec(text);
    if (m) return field(value, "inferred", `From "${m[0]}"`);
  }
  return field("Idea", "inferred", "Nothing says more than an idea yet");
}

/* ---------- next action ---------- */
const INTENT = /\b(?:we|i)?\s*(?:need to|needs to|should|want to|have to|must|let'?s|plan to|going to)\s+([^.!?\n]+)/i;
const EXPLICIT = /\bnext(?: step| action)?\s*[:—-]\s*([^\n]+)/i;
export function findNextAction(text, {category, opportunity}) {
  const ex = EXPLICIT.exec(text);
  if (ex) return field(cap(ex[1].trim().replace(/[.]+$/, "")), "verbatim", "Written as the next step in the text");
  const m = INTENT.exec(text);
  if (!m) return field("", "empty", "The text states no next action");
  const clause = m[0].trim();
  if (category === "Business Development") {
    const building = /build|construct|clubhouse|construction/i.test(clause + " " + opportunity);
    const kind = building ? "construction " : "";
    return field(`Explore relevant projects and potential ${kind}partnership`, "suggested",
      `Rephrased from "${clause}" — confirm or rewrite`);
  }
  return field(cap(m[1].trim()), "verbatim", `From "${clause}"`);
}

/* ---------- summary ---------- */
export function summarize(text, {person, opportunity, category, status}) {
  if (person && (opportunity || category)) {
    const what = opportunity ? opportunity.toLowerCase() : category.toLowerCase();
    const s = `${person} — ${status.toLowerCase()} for ${what}` + (category && opportunity ? ` (${category.toLowerCase()})` : "") + ".";
    return field(s, "inferred", "Built from the fields above");
  }
  const first = sentences(text)[0] || "";
  const trimmed = first.replace(/^(add|note|remember|capture)\s*:?\s*/i, "");
  const short = trimmed.length > 140 ? trimmed.slice(0, 137).replace(/\s+\S*$/, "") + "…" : trimmed;
  return field(cap(short), "inferred", "First sentence of the text");
}

/* ---------- the proposal ---------- */
export function propose(rawText, {projects = DEFAULT_PROJECTS, source = {}, now = new Date()} = {}) {
  const original = (rawText || "").replace(/\r\n/g, "\n").trim();
  const text = ownWords(original);
  const link = findLink(text, source.url || "");
  const project = findProject(text, projects, source.url || link.value);
  const person = findPerson(text, projects);
  const category = findCategory(text);
  const opportunity = findOpportunity(text);
  const status = findStatus(text);
  const nextAction = findNextAction(text, {category: category.value, opportunity: opportunity.value});
  const summary = summarize(text, {person: person.value, opportunity: opportunity.value, category: category.value, status: status.value});
  const captured = source.capturedAt ? new Date(source.capturedAt) : now;
  const date = field(localDate(captured), "source", source.capturedAt ? "When it was captured" : "Today");
  return {
    original,
    fields: {project, category, person, opportunity, summary, nextAction, sourceUrl: link, date, status},
    source: {kind: source.kind || "manual-paste", title: source.title || "", url: source.url || "",
      conversationId: source.conversationId || "", messageId: source.messageId || "",
      capturedAt: (source.capturedAt ? new Date(source.capturedAt) : now).toISOString()},
  };
}

export function localDate(d) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ---------- duplicates ---------- */
const words = s => new Set(lower(s).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2));
export function similarity(a, b) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

export function findDuplicates(candidate, entries, {ignoreId = ""} = {}) {
  const out = [];
  for (const e of entries) {
    if (e.id === ignoreId) continue;
    const reasons = [];
    if (candidate.person && e.person && lower(candidate.person).trim() === lower(e.person).trim()) reasons.push("same person");
    const sim = similarity(candidate.original, e.original);
    if (sim >= 0.6) reasons.push(sim > 0.95 ? "same original text" : "nearly the same original text");
    if (reasons.length) out.push({entry: e, reasons});
  }
  return out;
}

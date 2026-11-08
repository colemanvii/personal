/* TABLET — the wall. */
import {propose, findDuplicates, STATUSES, localDate} from "./extract.js";
import {loadLocal, saveLocal, merge, emptyBoard, serverAvailable, loadServer, saveServer, loadInbox, clearInboxItem,
  newId, toMarkdown, normalize} from "./store.js";
import {bookmarklet, readCaptureHash, parseExport} from "./sources.js";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const h = (strings, ...vals) => strings.reduce((out, s, i) => out + s + (i < vals.length ? (vals[i]?.__html ?? esc(vals[i])) : ""), "");
const raw = html => ({__html: html});
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

const FIELDS = [
  ["project", "Project"], ["category", "Category"], ["person", "Person"], ["opportunity", "Opportunity"],
  ["status", "Status"], ["date", "Date"], ["summary", "Working summary"], ["nextAction", "Next action"], ["sourceUrl", "Source conversation"],
];
const BASIS_LABEL = {verbatim: "in your words", inferred: "inferred", suggested: "suggested", source: "from source", empty: "none", edited: "edited"};

let board = emptyBoard();
let server = false;
let showArchive = false;
let query = "";
let inbox = [];
let fresh = "";
let pushTimer = 0;

/* ---------- persistence ---------- */
function commit(mutate, message) {
  mutate(board);
  board.updatedAt = new Date().toISOString();
  saveLocal(board);
  render();
  if (message) toast(message);
  if (server) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => saveServer(board).then(() => stamp("saved to this computer")).catch(() => stamp("saved in browser — file copy failed")), 250);
  }
  stamp(server ? "saving…" : "saved in this browser");
}

function stamp(text) {
  $("#saved").textContent = `${text} · ${new Date().toLocaleTimeString([], {hour: "numeric", minute: "2-digit"})}`;
}

async function boot() {
  board = loadLocal();
  server = await serverAvailable();
  if (server) {
    try {
      const disk = await loadServer();
      board = merge(board, disk || emptyBoard());
      saveLocal(board);
      await saveServer(board);
      inbox = await loadInbox();
    } catch { server = false; }
  }
  try { navigator.storage?.persist?.(); } catch {}
  $("#where").textContent = server ? "board file: tablet/data/board.json" : "browser storage only — run tablet/serve.py for a file copy";
  stamp(board.updatedAt ? "loaded" : "new tablet");
  $("#today").textContent = new Date().toLocaleDateString([], {weekday: "long", day: "numeric", month: "long", year: "numeric"});
  render();
  renderInboxButton();
  takeHash();
  if (server) setInterval(async () => { inbox = await loadInbox().catch(() => inbox); renderInboxButton(); }, 30000);
}

addEventListener("hashchange", takeHash);
addEventListener("storage", e => { if (e.key === "tablet.board.v1") { board = merge(board, loadLocal()); render(); } });

function takeHash() {
  const cap = readCaptureHash(location.hash);
  if (!cap) return;
  history.replaceState(null, "", location.pathname);
  openReview(propose(cap.text, {projects: board.projects, source: cap.source}));
}

/* ---------- the wall ---------- */
function matches(e) {
  if (!query) return true;
  const hay = [e.person, e.opportunity, e.category, e.summary, e.nextAction, e.original, e.status].join(" ").toLowerCase();
  return query.toLowerCase().split(/\s+/).every(w => hay.includes(w));
}

function render() {
  const lanes = board.projects.map(p => {
    const es = board.entries.filter(e => e.projectId === p.id && !!e.archived === showArchive && matches(e));
    const total = board.entries.filter(e => e.projectId === p.id && !e.archived).length;
    return h`<section class="lane" data-project="${p.id}">
      <div class="lane-head"><b>${p.name}</b><span>${showArchive ? `${es.length} archived` : total || ""}</span></div>
      <div class="cards">${raw(es.length ? es.map(card).join("") : `<div class="empty">${showArchive ? "Nothing archived." : query ? "No match." : "Nothing placed yet."}</div>`)}</div>
    </section>`;
  });
  $("#board").innerHTML = lanes.join("");
  $("#archiveBtn").setAttribute("aria-pressed", String(showArchive));
}

function card(e) {
  const title = e.person || e.opportunity || e.summary;
  return h`<button class="card${e.archived ? " archived" : ""}${e.id === fresh ? " fresh" : ""}" data-id="${e.id}">
    <span class="meta"><i class="dot" data-s="${e.status}"></i><span class="what">${e.status}${e.category ? ` · ${e.category}` : ""}</span><span class="when">${fmtDate(e.date)}</span></span>
    <h3>${title}</h3>
    ${raw(e.person && e.opportunity ? h`<span class="opp">${e.opportunity}</span>` : "")}
    ${raw(e.summary && title !== e.summary ? h`<p class="sum">${cap(e.person && e.summary.startsWith(e.person + " — ") ? e.summary.slice(e.person.length + 3) : e.summary)}</p>` : "")}
    ${raw(e.nextAction ? h`<span class="next">${e.nextAction}</span>` : "")}
  </button>`;
}

function fmtDate(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString([], {month: "short", day: "numeric"});
}

$("#board").addEventListener("click", e => {
  const c = e.target.closest(".card");
  if (c) openEntry(c.dataset.id);
});
$("#find").addEventListener("input", e => { query = e.target.value.trim(); render(); });
$("#archiveBtn").addEventListener("click", () => { showArchive = !showArchive; render(); });
$("#captureBtn").addEventListener("click", () => openCapture());
$("#inboxBtn").addEventListener("click", openInbox);

/* ---------- the slab ---------- */
function openSlab(title, html) {
  $("#slabTitle").textContent = title;
  $("#slabBody").innerHTML = html;
  $("#slab").hidden = false;
  $("#scrim").hidden = false;
  $("#slabBody").scrollTop = 0;
}
function closeSlab() { $("#slab").hidden = true; $("#scrim").hidden = true; $("#slabBody").innerHTML = ""; }
$("#closeSlab").addEventListener("click", closeSlab);
$("#scrim").addEventListener("click", closeSlab);
addEventListener("keydown", e => {
  if (e.key === "Escape") { if (!$("#moreMenu").hidden) toggleMenu(false); else if (!$("#slab").hidden) closeSlab(); }
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") $("#slabBody [data-default]")?.click();
});

/* capture: paste, or pick from a ChatGPT export */
function openCapture(prefill = "") {
  openSlab("Capture", h`
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected="true" data-tab="paste">Paste</button>
      <button role="tab" aria-selected="false" data-tab="export">From ChatGPT export</button>
    </div>
    <div data-pane="paste" style="display:grid;gap:14px">
      <p class="hint">Paste the part of a ChatGPT conversation worth keeping. TABLET proposes an entry; nothing is placed until you approve it.</p>
      <textarea class="paste" id="pasteText" placeholder="Add Sean Metcalf to the Freeman business-development hit list…">${prefill}</textarea>
      <div class="f"><div class="label">Source conversation link <span>optional</span></div>
        <input id="pasteLink" type="url" placeholder="https://chatgpt.com/c/…"></div>
      <div class="row"><button class="btn primary" id="readBtn" data-default>Read it</button><span class="hint">⌘/Ctrl + Enter</span></div>
    </div>
    <div data-pane="export" hidden style="display:grid;gap:12px">
      <p class="hint">In ChatGPT: Settings → Data controls → Export data. Unzip the email's file and choose <b>conversations.json</b>. It is read here, on this computer; nothing is uploaded.</p>
      <input type="file" id="exportPick" accept=".json,application/json">
      <div id="exportList"></div>
    </div>`);
  const body = $("#slabBody");
  body.querySelectorAll("[data-tab]").forEach(t => t.addEventListener("click", () => {
    body.querySelectorAll("[data-tab]").forEach(x => x.setAttribute("aria-selected", String(x === t)));
    body.querySelectorAll("[data-pane]").forEach(p => p.hidden = p.dataset.pane !== t.dataset.tab);
  }));
  $("#pasteText").focus();
  $("#readBtn").addEventListener("click", () => {
    const text = $("#pasteText").value;
    if (!text.trim()) return toast("Paste something first");
    const link = $("#pasteLink").value.trim();
    const p = propose(text, {projects: board.projects, source: {kind: "manual-paste"}});
    if (link) p.fields.sourceUrl = {value: link, basis: "source", note: "Link you supplied"};
    if (link) p.source.url = link;
    openReview(p);
  });
  $("#exportPick").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    try { showExport(parseExport(JSON.parse(await file.text()))); }
    catch (err) { $("#exportList").innerHTML = h`<div class="warn">${err.message}</div>`; }
  });
}

function showExport(convs, filter = "") {
  const list = $("#exportList");
  const shown = convs.filter(c => c.title.toLowerCase().includes(filter.toLowerCase())).slice(0, 200);
  list.innerHTML = h`<div class="f"><input id="convFind" type="search" placeholder="Find a conversation (${convs.length})" value="${filter}"></div>
    <div class="convs">${raw(shown.map((c, i) => h`<button data-i="${convs.indexOf(c)}">${c.title}<small>${c.updated ? c.updated.toLocaleDateString() : ""}</small></button>`).join(""))}</div>`;
  $("#convFind").addEventListener("input", e => { const v = e.target.value; showExport(convs, v); const f = $("#convFind"); f.focus(); f.setSelectionRange(v.length, v.length); });
  list.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => showConversation(convs, convs[+b.dataset.i])));
}

function showConversation(convs, c) {
  const msgs = c.messages();
  $("#exportList").innerHTML = h`<div class="row"><button class="btn quiet" id="backConvs">← Conversations</button><b class="grow">${c.title}</b></div>
    <p class="hint">Select words inside a message to keep only those, then press Capture on that message.</p>
    ${raw(msgs.map((m, i) => h`<div class="msg"><div class="label">${m.role === "user" ? "You" : "ChatGPT"} ${m.at ? "· " + m.at.toLocaleString() : ""}</div>
      <pre data-m="${i}">${m.text}</pre><div><button class="btn quiet" data-cap="${i}">Capture</button></div></div>`).join(""))}`;
  $("#backConvs").addEventListener("click", () => showExport(convs));
  $("#exportList").querySelectorAll("[data-cap]").forEach(b => b.addEventListener("click", () => {
    const m = msgs[+b.dataset.cap];
    const sel = String(getSelection()).trim();
    const pre = $(`[data-m="${b.dataset.cap}"]`);
    const text = sel && pre.contains(getSelection().anchorNode) ? sel : m.text;
    openReview(propose(text, {projects: board.projects, source: {kind: "chatgpt-export", url: c.url, title: c.title,
      conversationId: c.id, messageId: m.id, capturedAt: new Date().toISOString()}}));
  }));
}

/* review: the proposed entry, shown for approval */
function fieldHtml(key, label, f, {editing = false} = {}) {
  const basis = editing ? "" : h`<span class="basis" data-b="${f.basis}" data-basis-for="${key}">${BASIS_LABEL[f.basis]}</span>`;
  let input;
  if (key === "project") input = h`<select name="project"><option value="">Choose a project…</option>${raw(board.projects.map(p => h`<option value="${p.id}"${p.id === f.value ? " selected" : ""}>${p.name}</option>`).join(""))}</select>`;
  else if (key === "status") input = h`<select name="status">${raw(STATUSES.map(s => h`<option${s === f.value ? " selected" : ""}>${s}</option>`).join(""))}</select>`;
  else if (key === "date") input = h`<input name="date" type="date" value="${f.value}">`;
  else if (key === "summary" || key === "nextAction") input = h`<textarea name="${key}" rows="2">${f.value}</textarea>`;
  else input = h`<input name="${key}" value="${f.value}"${key === "sourceUrl" ? raw(' type="url" placeholder="https://chatgpt.com/…"') : ""}>`;
  return h`<div class="f" data-field="${key}"><div class="label">${label}${raw(basis)}</div>${raw(input)}${raw(!editing && f.note ? h`<div class="note">${f.note}</div>` : "")}</div>`;
}

function formValues() {
  const out = {};
  $("#slabBody").querySelectorAll("[name]").forEach(el => out[el.name] = el.value.trim());
  return out;
}

function provenanceHtml(src) {
  const kind = {"manual-paste": "Pasted by hand", "chatgpt-selection": "Selected on ChatGPT", "chatgpt-export": "ChatGPT data export", inbox: "Sent to the TABLET inbox", "chatgpt-action": "Sent from ChatGPT"}[src.kind] || src.kind;
  return h`<div class="prov">${kind}${src.title ? ` · “${src.title}”` : ""} · captured ${new Date(src.capturedAt).toLocaleString()}${raw(src.url ? h`<br><a href="${src.url}" target="_blank" rel="noopener noreferrer">${src.url}</a>` : "")}</div>`;
}

function openReview(p, {inboxId = ""} = {}) {
  const f = p.fields;
  openSlab("Proposed entry", h`
    <p class="hint">Check each field. Tags show where a value came from — <b>inferred</b> and <b>suggested</b> values are TABLET's reading, not yours, until you approve.</p>
    <div id="dupes"></div>
    ${raw(fieldHtml("project", "Project", f.project))}
    <div class="grid2">${raw(fieldHtml("person", "Person", f.person) + fieldHtml("category", "Category", f.category))}</div>
    ${raw(fieldHtml("opportunity", "Opportunity", f.opportunity))}
    <div class="grid2">${raw(fieldHtml("status", "Status", f.status) + fieldHtml("date", "Date", f.date))}</div>
    ${raw(fieldHtml("summary", "Working summary", f.summary))}
    ${raw(fieldHtml("nextAction", "Next action", f.nextAction))}
    ${raw(fieldHtml("sourceUrl", "Source conversation", f.sourceUrl))}
    <div><div class="label">Original thought · kept verbatim</div><pre class="original" id="originalText">${p.original}</pre></div>
    ${raw(provenanceHtml(p.source))}
    <div class="row"><button class="btn primary" id="approve" data-default>Place on tablet</button><button class="btn quiet" id="discard">Discard</button></div>`);
  const body = $("#slabBody");
  body.addEventListener("input", e => {
    const key = e.target.name;
    const chip = body.querySelector(`[data-basis-for="${key}"]`);
    if (chip) { chip.dataset.b = "edited"; chip.textContent = BASIS_LABEL.edited; }
    if (key === "person") checkDupes();
  });
  let dupes = [];
  const checkDupes = () => {
    const v = formValues();
    dupes = findDuplicates({person: v.person, original: p.original}, board.entries);
    $("#dupes").innerHTML = dupes.length ? h`<div class="warn"><b>Possible duplicate</b>${raw(dupes.map(d => h`<div>${d.entry.person || d.entry.summary} — ${projectName(d.entry.projectId)}, ${d.entry.status}${d.entry.archived ? " (archived)" : ""}: ${d.reasons.join(", ")}. <a href="#" data-open="${d.entry.id}">Open it</a></div>`).join(""))}</div>` : "";
    $("#approve").textContent = dupes.length ? "Place anyway" : "Place on tablet";
    $("#dupes").querySelectorAll("[data-open]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); openEntry(a.dataset.open); }));
  };
  checkDupes();
  $("#discard").addEventListener("click", async () => { if (inboxId) await dropInbox(inboxId); closeSlab(); toast("Discarded"); });
  $("#approve").addEventListener("click", async () => {
    const v = formValues();
    if (!v.project) { body.querySelector('[name="project"]').focus(); return toast("Choose a project"); }
    const now = new Date().toISOString();
    const basis = {};
    body.querySelectorAll("[data-basis-for]").forEach(c => basis[c.dataset.basisFor] = c.dataset.b);
    const entry = {
      id: newId(), projectId: v.project, category: v.category, person: v.person, opportunity: v.opportunity,
      summary: v.summary, nextAction: v.nextAction, status: v.status, date: v.date || localDate(new Date()), sourceUrl: v.sourceUrl,
      original: p.original, source: p.source, approvedBasis: basis, archived: false, createdAt: now, updatedAt: now,
      revisions: [{at: now, note: "placed" + (dupes.length ? " despite possible duplicate" : "")}],
    };
    fresh = entry.id;
    commit(b => b.entries.unshift(entry), `Placed on ${projectName(entry.projectId)}`);
    if (inboxId) await dropInbox(inboxId);
    closeSlab();
    document.querySelector(`.card[data-id="${entry.id}"]`)?.scrollIntoView({block: "nearest", inline: "nearest"});
  });
}

const projectName = id => board.projects.find(p => p.id === id)?.name || "—";

/* an entry: edit, archive, delete */
function openEntry(id) {
  const e = board.entries.find(x => x.id === id);
  if (!e) return;
  const val = k => ({value: k === "project" ? e.projectId : e[k] ?? "", basis: "verbatim"});
  openSlab(e.person || "Entry", h`
    ${raw(fieldHtml("project", "Project", val("project"), {editing: true}))}
    <div class="grid2">${raw(fieldHtml("person", "Person", val("person"), {editing: true}) + fieldHtml("category", "Category", val("category"), {editing: true}))}</div>
    ${raw(fieldHtml("opportunity", "Opportunity", val("opportunity"), {editing: true}))}
    <div class="grid2">${raw(fieldHtml("status", "Status", val("status"), {editing: true}) + fieldHtml("date", "Date", val("date"), {editing: true}))}</div>
    ${raw(fieldHtml("summary", "Working summary", val("summary"), {editing: true}))}
    ${raw(fieldHtml("nextAction", "Next action", val("nextAction"), {editing: true}))}
    ${raw(fieldHtml("sourceUrl", "Source conversation", val("sourceUrl"), {editing: true}))}
    <div><div class="label">Original thought · kept verbatim</div><pre class="original">${e.original}</pre></div>
    ${raw(provenanceHtml(e.source || {kind: "manual-paste", capturedAt: e.createdAt}))}
    <div class="history">${raw((e.revisions || []).map(r => h`${new Date(r.at).toLocaleString()} — ${r.note}`).join("<br>"))}</div>
    <div class="row"><button class="btn primary" id="save" data-default>Save</button>
      <button class="btn quiet" id="arch">${e.archived ? "Restore" : "Archive"}</button>
      <span class="grow"></span><button class="btn danger" id="del">Delete</button></div>
    <div id="confirm"></div>`);
  $("#save").addEventListener("click", () => {
    const v = formValues();
    if (!v.project) return toast("Choose a project");
    const map = {project: "projectId"};
    const changed = Object.keys(v).filter(k => (e[map[k] || k] ?? "") !== v[k]);
    if (!changed.length) { closeSlab(); return; }
    commit(() => {
      for (const k of changed) e[map[k] || k] = v[k];
      e.updatedAt = new Date().toISOString();
      (e.revisions ||= []).push({at: e.updatedAt, note: "edited " + changed.map(k => FIELDS.find(f => f[0] === k)?.[1].toLowerCase() || k).join(", ")});
    }, "Saved");
    closeSlab();
  });
  $("#arch").addEventListener("click", () => {
    commit(() => {
      e.archived = !e.archived; e.updatedAt = new Date().toISOString();
      (e.revisions ||= []).push({at: e.updatedAt, note: e.archived ? "archived" : "restored"});
    }, e.archived ? "Restored" : "Archived");
    closeSlab();
  });
  $("#del").addEventListener("click", () => {
    $("#confirm").innerHTML = h`<div class="warn"><b>Delete permanently?</b>This removes “${e.person || e.summary}” and its original words from TABLET. Archive keeps it out of sight instead. Export a backup first if unsure.
      <div class="row"><button class="btn danger solid" id="delYes">Delete</button><button class="btn quiet" id="delNo">Keep it</button></div></div>`;
    $("#delNo").addEventListener("click", () => $("#confirm").innerHTML = "");
    $("#delYes").addEventListener("click", () => {
      commit(b => { b.entries = b.entries.filter(x => x.id !== e.id); b.deleted.push(e.id); }, "Deleted");
      closeSlab();
    });
  });
}

/* inbox: captures posted to serve.py by other tools */
function renderInboxButton() {
  $("#inboxBtn").hidden = !server || !inbox.length;
  $("#inboxCount").textContent = inbox.length ? `· ${inbox.length}` : "";
}
async function dropInbox(id) {
  await clearInboxItem(id).catch(() => {});
  inbox = inbox.filter(i => i.id !== id);
  renderInboxButton();
}
function openInbox() {
  openSlab("Inbox", h`<p class="hint">Sent here by connected tools. Each one waits for your review; none is on the tablet yet.</p>
    ${raw(inbox.map(i => h`<div class="msg"><div class="label">${i.source?.title || i.source?.kind} · ${new Date(i.receivedAt).toLocaleString()}</div>
      <pre>${i.text}</pre><div class="row"><button class="btn primary" data-rev="${i.id}">Review</button><button class="btn quiet" data-drop="${i.id}">Dismiss</button></div></div>`).join("") || '<div class="empty">Empty.</div>')}`);
  $("#slabBody").querySelectorAll("[data-rev]").forEach(b => b.addEventListener("click", () => {
    const i = inbox.find(x => x.id === b.dataset.rev);
    openReview(propose(i.text, {projects: board.projects, source: {...i.source, kind: i.source?.kind || "inbox"}}), {inboxId: i.id});
  }));
  $("#slabBody").querySelectorAll("[data-drop]").forEach(b => b.addEventListener("click", async () => { await dropInbox(b.dataset.drop); openInbox(); }));
}

/* ---------- menu ---------- */
function toggleMenu(open) {
  $("#moreMenu").hidden = !open;
  $("#moreBtn").setAttribute("aria-expanded", String(open));
}
$("#moreBtn").addEventListener("click", e => { e.stopPropagation(); toggleMenu($("#moreMenu").hidden); });
document.addEventListener("click", e => { if (!e.target.closest("#moreMenu")) toggleMenu(false); });
$("#moreMenu").addEventListener("click", e => {
  const cmd = e.target.closest("[data-cmd]")?.dataset.cmd;
  toggleMenu(false);
  if (cmd === "export-json") download(`tablet-backup-${localDate(new Date())}.json`, JSON.stringify(board, null, 2), "application/json");
  if (cmd === "export-md") download(`tablet-${localDate(new Date())}.md`, toMarkdown(board), "text/markdown");
  if (cmd === "import") $("#importFile").click();
  if (cmd === "add-project") addProject();
  if (cmd === "bridge") openBridge();
  if (cmd === "archive") { showArchive = !showArchive; render(); }
});

function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], {type}));
  a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Exported ${name}`);
}

$("#importFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const incoming = normalize(JSON.parse(await file.text()));
    const before = board.entries.length;
    commit(b => Object.assign(b, merge(b, incoming)), "");
    toast(`Imported · ${board.entries.length - before} new entries`);
  } catch { toast("That file is not a TABLET backup"); }
});

function addProject() {
  openSlab("Add project", h`<p class="hint">A new lane on the wall. Name it as it is named in ChatGPT so captures find it.</p>
    <div class="f"><div class="label">Name</div><input id="pName" placeholder="e.g. Haven"></div>
    <div class="f"><div class="label">Other words that mean this project <span>optional, comma-separated</span></div><input id="pAliases"></div>
    <div class="row"><button class="btn primary" id="pAdd" data-default>Add lane</button></div>`);
  $("#pName").focus();
  $("#pAdd").addEventListener("click", () => {
    const name = $("#pName").value.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || newId();
    if (board.projects.some(p => p.id === id || p.name.toLowerCase() === name.toLowerCase())) return toast("That project exists");
    const aliases = $("#pAliases").value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    commit(b => b.projects.push({id, name, aliases}), `Added ${name}`);
    closeSlab();
  });
}

function openBridge() {
  const origin = location.origin.startsWith("http") ? location.origin : "http://127.0.0.1:4180";
  openSlab("Connect ChatGPT", h`
    <p class="hint"><b>1 · Paste.</b> Always works. Copy from any ChatGPT conversation, press Capture.</p>
    <p class="hint"><b>2 · Send selection.</b> Drag this to your bookmarks bar. On chatgpt.com, select the words to keep and click it — TABLET opens with them ready for review, linked back to the conversation.</p>
    <div><a class="bm" href="${bookmarklet(origin)}" onclick="event.preventDefault()">→ Tablet</a></div>
    <p class="hint"><b>3 · ChatGPT export.</b> Settings → Data controls → Export data, then Capture → From ChatGPT export.</p>
    <p class="hint"><b>4 · Inbox (for later integrations).</b> ${server ? "Running." : "Needs tablet/serve.py."} Tools that hold the token in <code>tablet/data/inbox-token</code> can POST to <code>${origin}/api/inbox</code>. Their captures wait in the Inbox for your approval.</p>
    <div class="code">curl -X POST ${origin}/api/inbox -H "Authorization: Bearer $(cat tablet/data/inbox-token)" -H "Content-Type: application/json" -d '{"text":"…","source":{"kind":"inbox","title":"…","url":"…"}}'</div>`);
}

/* ---------- toast ---------- */
let toastTimer = 0;
function toast(text) {
  if (!text) return;
  const t = $("#toast");
  t.textContent = text; t.classList.add("on");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 2200);
}

boot();

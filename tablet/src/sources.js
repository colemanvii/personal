/* TABLET — the integration boundary.
 *
 * Every way content reaches TABLET produces the same capture envelope:
 *
 *   {text, source: {kind, url, title, conversationId, messageId, capturedAt}}
 *
 * and every envelope goes through the same proposal-and-approval step. No
 * source writes to the board directly.
 *
 * Kinds in use today:
 *   manual-paste        text pasted into the capture slab
 *   chatgpt-selection   text selected on chatgpt.com, sent by the bookmarklet
 *   chatgpt-export      a message picked from ChatGPT's own data export
 *   inbox               posted by an authenticated client to serve.py
 */

export const TABLET_ORIGIN_DEFAULT = "http://127.0.0.1:4180";

/* The bookmarklet runs in the ChatGPT tab only when the person clicks it, and
   only reads what they have selected plus the page address and title. It
   sends nothing over the network: it opens TABLET with the selection in the
   URL fragment, which never reaches any server. */
export function bookmarklet(origin = TABLET_ORIGIN_DEFAULT) {
  const body = `(()=>{const t=String(getSelection()).trim();if(!t){alert('TABLET: select the words to keep first.');return}` +
    `const p={v:1,kind:'chatgpt-selection',text:t,url:location.href,title:document.title,capturedAt:new Date().toISOString()};` +
    `window.open('${origin}/#capture='+encodeURIComponent(JSON.stringify(p)),'tablet')})()`;
  return "javascript:" + body;
}

export function readCaptureHash(hash) {
  const m = /^#capture=(.+)$/.exec(hash || "");
  if (!m) return null;
  try {
    const p = JSON.parse(decodeURIComponent(m[1]));
    if (!p || typeof p.text !== "string" || !p.text.trim()) return null;
    return {text: p.text.slice(0, 50000), source: {kind: "chatgpt-selection", url: String(p.url || ""), title: String(p.title || ""),
      capturedAt: p.capturedAt || new Date().toISOString()}};
  } catch { return null; }
}

/* ChatGPT data export (Settings → Data controls → Export data) arrives by
   email as a .zip; conversations.json inside it lists every conversation as a
   tree of messages. This reads that file locally — it is never uploaded. */
export function parseExport(json) {
  const list = Array.isArray(json) ? json : Array.isArray(json?.conversations) ? json.conversations : null;
  if (!list) throw new Error("This is not a ChatGPT conversations.json file.");
  return list.filter(c => c && c.mapping).map(c => {
    const id = c.conversation_id || c.id || "";
    return {
      id, title: c.title || "Untitled conversation",
      updated: c.update_time ? new Date(c.update_time * 1000) : c.create_time ? new Date(c.create_time * 1000) : null,
      projectId: typeof c.gizmo_id === "string" && c.gizmo_id.startsWith("g-p-") ? c.gizmo_id : "",
      url: id ? `https://chatgpt.com/c/${id}` : "",
      messages: () => linearize(c),
    };
  }).sort((a, b) => (b.updated || 0) - (a.updated || 0));
}

function linearize(c) {
  const out = [];
  let node = c.current_node && c.mapping[c.current_node];
  const seen = new Set();
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    const m = node.message;
    if (m && m.author && (m.author.role === "user" || m.author.role === "assistant")) {
      const parts = (m.content?.parts || []).filter(p => typeof p === "string");
      const text = parts.join("\n").trim();
      if (text) out.push({id: m.id || node.id, role: m.author.role, text, at: m.create_time ? new Date(m.create_time * 1000) : null});
    }
    node = node.parent && c.mapping[node.parent];
  }
  if (!c.current_node) {
    for (const n of Object.values(c.mapping)) {
      const m = n.message;
      const parts = (m?.content?.parts || []).filter(p => typeof p === "string");
      if (m && (m.author?.role === "user" || m.author?.role === "assistant") && parts.join("").trim())
        out.push({id: m.id || n.id, role: m.author.role, text: parts.join("\n").trim(), at: m.create_time ? new Date(m.create_time * 1000) : null});
    }
    return out.sort((a, b) => (a.at || 0) - (b.at || 0));
  }
  return out.reverse();
}

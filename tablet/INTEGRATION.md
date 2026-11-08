# ChatGPT → TABLET: what is actually available

Researched November 2026. Verify again before building on any item marked
*future*, because these products change quickly.

## The boundary

Every route produces the same envelope and passes through the same approval
step. No route writes to the board directly.

```json
{
  "text": "the words to keep",
  "source": {
    "kind": "manual-paste | chatgpt-selection | chatgpt-export | chatgpt-action | inbox",
    "url": "https://chatgpt.com/c/…",
    "title": "conversation title",
    "conversationId": "…",
    "messageId": "…",
    "capturedAt": "ISO time"
  }
}
```

The provenance (`source`) is stored on the entry next to the verbatim
original and the basis of every field the person approved.

## Routes

| Route | Status | How |
|---|---|---|
| **Paste** | works | Capture → paste → Read it. Works with any ChatGPT plan and any project. |
| **Bookmarklet** | works | ••• → Connect ChatGPT → drag **→ Tablet** to the bookmarks bar. On chatgpt.com, select text and click it. TABLET opens with the selection, the conversation URL and its title. Nothing is sent over the network: the text travels in the URL fragment to your own machine. Links to project conversations (`/g/g-p-…-name/c/…`) usually carry the project's name, and TABLET uses it to choose the lane. |
| **Data export** | works | ChatGPT Settings → Data controls → Export data. The emailed zip contains `conversations.json`. Capture → From ChatGPT export → pick the file, a conversation, then a message (or a selection inside it). The file is read in the browser and never uploaded. It is a snapshot, not a feed. Project membership appears only as an opaque `gizmo_id` (`g-p-…`), which TABLET records but cannot turn into a name. |
| **Inbox** (`POST /api/inbox`) | works locally, ready for future sources | `serve.py` accepts envelopes from tools that hold `tablet/data/inbox-token`, on 127.0.0.1 only. Items wait in the Inbox until approved or dismissed. |
| **ChatGPT custom MCP app / connector with a write action** | *future* | ChatGPT can call a custom MCP server ("developer mode") that exposes a tool such as `send_to_tablet(text, project_hint)`, which would post an envelope to the inbox. This needs a public HTTPS endpoint with OAuth in front of the inbox, and TABLET does not have one yet. Availability is uneven: full MCP support is rolling out to Business, Enterprise and Edu; on those plans, write actions stay off until an admin enables them; and support on Plus/Pro is unclear. ChatGPT also asks for confirmation before write actions, which suits this approval model. |
| **OpenAI API** | not available | The API has no endpoint that reads ChatGPT conversations or Projects. API conversations are separate from ChatGPT's. |
| **Shared links** (`chatgpt.com/share/…`) | link only | Stored as provenance. TABLET does not scrape them, because they are web pages, not an API, and they are read-only snapshots. |
| **Compliance / eDiscovery exports** | not applicable | Enterprise and Edu workspace administration only. |

## Next steps, in order

1. Use paste and the bookmarklet daily, and let the wall prove which
   fields matter.
2. If extraction misses often, replace the rules in `src/extract.js` with a
   model call that returns the same `{value, basis, note}` shape, so the
   approval screen stays unchanged. Keep "never invent" as a test
   (`tests/extract.test.mjs`).
3. To reach TABLET from a phone or a second computer, host the board behind
   a login (for example Cloudflare Access) and keep `serve.py`'s API shape.
4. Then expose `/api/inbox` as a ChatGPT MCP tool behind OAuth, so a
   ChatGPT project can propose entries that still land in the Inbox for
   approval.

## Sources

- [Connecting custom MCP servers in ChatGPT (OpenAI Help Center)](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt)
- [ChatGPT Business release notes](https://help.openai.com/en/articles/11391654-chatgpt-business-release-notes)
- [ChatGPT MCP: setup, plans and limits (2026)](https://coworker.ai/blog/chatgpt-mcp)
- [ChatGPT apps with full MCP access](https://grn.dk/chatgpt-apps-full-mcp-access-governance-comes-first)

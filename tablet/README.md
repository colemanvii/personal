# TABLET — cave wall

A personal working surface. Selected material from ChatGPT conversations
becomes a permanent entry on a single-screen wall, one lane per project.

This folder is **not part of the website**. Only `site/` is deployed
(`wrangler.toml`, `vercel.json`), and board data lives in `tablet/data/`,
which is git-ignored, so entries never reach GitHub or production.

## Run it

```sh
python3 tablet/serve.py
```

Open **http://127.0.0.1:4180**, always at that address. Browser storage
belongs to one address, so `localhost:4180` holds a separate copy.

No installation is needed (Python 3 standard library). Opening `index.html`
straight from disk is not supported, because browsers block its modules.
Any static server works, but only `serve.py` keeps the file copy.

## Use it

1. **Capture** → paste the part of the conversation worth keeping and,
   optionally, its link → **Read it**.
2. TABLET proposes project, person, category, opportunity, status, date,
   summary, next action and source. Each field is tagged:
   *in your words* · *inferred* · *suggested* · *from source* · *none*.
   The original is kept verbatim and cannot be edited.
3. Correct anything, then **Place on tablet**. Nothing is saved before this.
   If the person or the text is already on the wall, a duplicate warning
   appears and the button reads *Place anyway*.
4. Click a card to edit, archive/restore or delete it. Deleting asks for
   confirmation. Every change is logged on the entry.
5. **•••** → export a backup (`.json`, re-importable) or a readable `.md`;
   import a backup; add a project lane; connect ChatGPT.

What extraction will not do: it proposes a person only when a full name
appears in your words. It proposes a next action only when the text states
an intention, and it never marks anything *Done*. It reads your words only:
in a pasted transcript, it reads the "You said:" parts, not ChatGPT's replies.
It is rule-based and runs offline (`src/extract.js`). There is no AI model in
the loop, so it reads plain statements well and long, rambling ones loosely.
That is why every field is shown for approval.

## Where the data is

| Layer | Survives | Location |
|---|---|---|
| Browser storage | refresh, browser restart | `localStorage["tablet.board.v1"]` at `127.0.0.1:4180` |
| Board file | clearing the browser, a new browser | `tablet/data/board.json` (with `serve.py`) |
| Daily backup | a bad day | `tablet/data/backups/board-YYYY-MM-DD.json` |
| Export | losing this computer | wherever you save the `.json` |

The browser copy and the file copy merge entry by entry. The newer edit wins,
and a deleted entry cannot come back from the other copy.

## Projects

The wall starts with Freeman, Built for Generations, Art, Personal and
Tangerine (`DEFAULT_PROJECTS` in `src/extract.js`). Add more lanes from
**••• → Add project**. Give each lane the name used in ChatGPT, plus any
other words that mean it, so captures route themselves.

## Tests

```sh
node --test tablet/tests/extract.test.mjs     # extraction, merge, sources
node tablet/tests/workflow.e2e.cjs            # real browser, needs Playwright
```

The browser test runs the two real cases (Sean Metcalf and Colin Post),
editing, refresh, browser restart, recovery from the file, duplicates,
export, archive, deletion with confirmation, the inbox and the bookmarklet.
It runs its own server on port 4181 with a throwaway data folder.

See [INTEGRATION.md](INTEGRATION.md) for how content can move from ChatGPT.

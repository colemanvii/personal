#!/usr/bin/env python3
"""TABLET local server.

Serves the TABLET page and keeps the board in a file on this computer:

    python3 tablet/serve.py            # then open http://127.0.0.1:4180

Data lives in tablet/data/ (git-ignored, never committed or deployed):

    board.json           the board, rewritten atomically on every change
    backups/board-YYYY-MM-DD.json   the first copy of each day, kept
    inbox.json           captures posted by other tools, awaiting approval
    inbox-token          the secret those tools must present

Endpoints (127.0.0.1 only):

    GET  /api/health      {"tablet": true}
    GET  /api/board       the board, or 404 before the first save
    PUT  /api/board       replace the board (same-origin page only)
    GET  /api/inbox       captures waiting for approval
    POST /api/inbox       add a capture; needs  Authorization: Bearer <inbox-token>
    DELETE /api/inbox/<id>  remove a capture once it is approved or dismissed

Nothing posted to the inbox reaches the board until the person approves it in
TABLET.
"""
import datetime
import http.server
import json
import os
import secrets
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get("TABLET_DATA", ROOT / "data"))
PORT = int(os.environ.get("TABLET_PORT", "4180"))
HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}
MAX_BODY = 5_000_000
SOURCE_KINDS = {"manual-paste", "chatgpt-selection", "chatgpt-export", "chatgpt-action", "inbox"}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def read_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def token():
    path = DATA / "inbox-token"
    if not path.exists():
        DATA.mkdir(parents=True, exist_ok=True)
        path.write_text(secrets.token_urlsafe(32), encoding="utf-8")
        os.chmod(path, 0o600)
    return path.read_text(encoding="utf-8").strip()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, fmt, *args):
        if os.environ.get("TABLET_QUIET") != "1":
            super().log_message(fmt, *args)

    # Only this computer, addressed by name or loopback (blocks DNS rebinding),
    # and only TABLET's own page may change the board.
    def guard(self, write=False):
        if self.headers.get("Host") not in HOSTS:
            self.reply(403, {"error": "host not allowed"})
            return False
        origin = self.headers.get("Origin")
        if write and origin and origin.replace("http://", "") not in HOSTS:
            self.reply(403, {"error": "origin not allowed"})
            return False
        return True

    def reply(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            raise ValueError("too large")
        return json.loads(self.rfile.read(n) or b"null")

    def end_headers(self):
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        if not self.path.startswith("/api/"):
            target = Path(self.translate_path(self.path)).resolve()
            if target == DATA.resolve() or DATA.resolve() in target.parents:
                return self.reply(404, {"error": "not found"})
            return super().do_GET()
        if not self.guard():
            return
        if self.path == "/api/health":
            return self.reply(200, {"tablet": True, "inbox": True})
        if self.path == "/api/board":
            board = read_json(DATA / "board.json", None)
            return self.reply(200, board) if board is not None else self.reply(404, {"error": "no board yet"})
        if self.path == "/api/inbox":
            return self.reply(200, {"items": read_json(DATA / "inbox.json", [])})
        self.reply(404, {"error": "not found"})

    def do_PUT(self):
        if not self.guard(write=True):
            return
        if self.path != "/api/board":
            return self.reply(404, {"error": "not found"})
        try:
            board = self.body()
        except ValueError:
            return self.reply(400, {"error": "bad body"})
        if not isinstance(board, dict) or not isinstance(board.get("entries"), list):
            return self.reply(400, {"error": "not a board"})
        backup = DATA / "backups" / f"board-{datetime.date.today().isoformat()}.json"
        if (DATA / "board.json").exists() and not backup.exists():
            write_json(backup, read_json(DATA / "board.json", {}))
        write_json(DATA / "board.json", board)
        self.reply(200, {"ok": True})

    def do_POST(self):
        if not self.guard():
            return
        if self.path != "/api/inbox":
            return self.reply(404, {"error": "not found"})
        if self.headers.get("Authorization") != f"Bearer {token()}":
            return self.reply(401, {"error": "missing or wrong inbox token"})
        try:
            env = self.body()
        except ValueError:
            return self.reply(400, {"error": "bad body"})
        text = (env or {}).get("text") if isinstance(env, dict) else None
        source = (env or {}).get("source") or {}
        if not isinstance(text, str) or not text.strip() or len(text) > 50_000:
            return self.reply(400, {"error": "text is required (up to 50,000 characters)"})
        if not isinstance(source, dict) or source.get("kind") not in SOURCE_KINDS:
            return self.reply(400, {"error": f"source.kind must be one of {sorted(SOURCE_KINDS)}"})
        item = {
            "id": str(uuid.uuid4()),
            "text": text,
            "source": {k: str(source.get(k, ""))[:2000] for k in ("kind", "url", "title", "conversationId", "messageId", "capturedAt")},
            "receivedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        items = read_json(DATA / "inbox.json", [])
        items.append(item)
        write_json(DATA / "inbox.json", items)
        self.reply(201, {"id": item["id"], "status": "awaiting approval in TABLET"})

    def do_DELETE(self):
        if not self.guard(write=True):
            return
        if not self.path.startswith("/api/inbox/"):
            return self.reply(404, {"error": "not found"})
        target = self.path.rsplit("/", 1)[-1]
        items = read_json(DATA / "inbox.json", [])
        write_json(DATA / "inbox.json", [i for i in items if i.get("id") != target])
        self.reply(200, {"ok": True})


def main():
    token()
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"TABLET  http://127.0.0.1:{PORT}   data: {DATA}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == "__main__":
    main()

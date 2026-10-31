# Retired

Preserved source material. Nothing in this directory is deployed: only `site/`
is published (see `wrangler.toml`), and these paths answer 301 or 404 on
colecalfee.com.

| Here | Former URL | Now |
|---|---|---|
| `art/`, `design/`, `photos/`, `work/` | `/art/`, `/design/`, `/photos/`, `/work/` | 301 → `/index/` |
| `shop/` | `/shop/` | 301 → `/paintings/` |
| `projects/the-cowboyer/` | `/projects/the-cowboyer/` | 301 → `/index/#cowboyer` |
| `projects/kashus-culpepper/` | `/projects/kashus-culpepper/` | 301 → `/index/#kashus` |
| `projects/scout-motors/` | `/projects/scout-motors/` | 301 → `/index/#scout` |
| `archive/333-westover/` | `/archive/333-westover/` | 404 |
| `studies/painting-crops/` | `/studies/painting-crops/` | 404 (crop-planning tooling) |
| `assets/` | `/assets/…` | 404: images no longer shown on the site (earlier crops and sizes) |

These pages still reference `/assets/…` as they did when they were public, so
they will not render fully from here. `studies/painting-crops/apply.py` was
written for the old layout; its target is now `site/paintings/index.html`.

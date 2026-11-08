# The Next Chapter — creative direction study

A design study for colecalfee.com as an artist's world. Nothing in this folder is
deployed: Cloudflare publishes only `site/` (`wrangler.toml`), and `study/` sits
outside it. Production files are untouched.

| Path | What |
|---|---|
| `index.html` | Comparison hub: audit, reference principles, the three directions, Built for Generations, recommendation, proposed deviations |
| `01-index/` | 01 — The Artist's Index (ledger · plates · years) |
| `02-archive/` | 02 — The Living Archive (a 16-spread monograph) |
| `03-playground/` | 03 — The Creative Playground (wall · true scale · pairs · spectrum · 2,557 days) |
| `media/` | Optimized copies of the existing images (`l/` 1800px, `s/` 720px) and `catalogue.js`, the one data file all three read |
| `stills/` | Screenshots used by the hub |
| `tools/build_media.py` | Rebuilds `media/` from `site/assets`, `retired/assets` and the Shopify images |

Run locally:

```sh
python3 -m http.server 4180 --bind 127.0.0.1 --directory study/next-chapter
```

Open http://127.0.0.1:4180. Every prototype fits one viewport on desktop and phone and never scrolls (the current site's rule).

The `index.html` hub has no doctype because it is also published as a Claude artifact, which wraps it in one; the three prototypes are complete documents.

Rebuild media. Paintings are cropped to the canvas using `tools/canvases.json` (from `retired/studies/painting-crops`), and the full photograph is kept as `<id>-studio.webp`. Ten of the full-size photographs come from Cole's Shopify CDN (URLs in `site/index/paintings-archive.js`, without the crop parameters); the other four are `site/assets/paintings/originals`:

```sh
python3 study/next-chapter/tools/build_media.py <folder-of-full-size-painting-photographs-named-by-work-id>
```

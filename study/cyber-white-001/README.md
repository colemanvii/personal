# Cyber White 001 — design study (preview only)

Three directions for colecalfee.com and three for freemangc.com, built as overlays on the real
production source. Nothing here is served by production: `site/` is untouched and Cloudflare
publishes only `site/`.

| Path | What |
|---|---|
| `cole/cw.js` | Variant loader. `?cw=a\|b\|c` selects a direction and keeps it in `window.name` (one tab or frame); `?cw=0` returns to current. |
| `cole/cw-base.css` | Shared optical foundation (white, #fafafa surface, #171717 / #666 ink, #e9e9e9 hairline, instant hover). |
| `cole/cw-a.*` · `cw-b.*` · `cw-c.css` | A Gallery White · B Digital Catalogue · C Zero Interface |
| `showroom/index.html` | Comparison interface: live current-vs-direction frames, four-version screenshot grid, rationale and critique. |
| `build.py` | Builds the preview bundle from `site/` and a Freeman checkout (`colemanvii/freeman`, branch `study/cyber-white-001`). |
| `capture.cjs` | 108 captures (9 pages × 4 versions × 1440×900, 390×844, 375×667) with a no-scroll check. |
| `shots/` | Those captures. |

Freeman overlays live in `colemanvii/freeman` on `study/cyber-white-001`, folder `study/cyber-white-001/`.

```sh
python3 study/cyber-white-001/build.py --freeman ../freeman --out /tmp/cw --localize
python3 -m http.server 4180 --directory /tmp/cw      # open http://127.0.0.1:4180/
node study/cyber-white-001/capture.cjs /tmp/cw
```

To adopt a direction later, its CSS would be folded into the site's own stylesheets (and the
`html[data-cw]` scope removed); nothing in this folder is meant to be linked from production.

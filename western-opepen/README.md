# SECTION LINE (working title; formerly "Western Opepen")

An 80-piece DYNAMIC Opepen set by Cole Calfee: red-ink drawings on paper.
**Phase: artistic development.** Nothing here has been minted, uploaded or submitted.

Start with [`MANIFESTO.md`](MANIFESTO.md), then
[`directions/DIRECTIONS.md`](directions/DIRECTIONS.md).

| Folder | Contents |
|---|---|
| `research/` | Opepen format and rules (verified), exact geometry, set survey (**blocked — see note**), historical sources |
| `critique/` | Critique of the initial concept sheet (awaiting the file) and of the premise |
| `directions/` | Three competing directions with studies, recommendation, six edition groups |
| `studies/` | Twelve composition studies across all six groups, with self-critique and avatar test |
| `registry/` | Working index of all 80 artworks; provenance hashes |
| `production/` | Paper, ink, sizes, capture, colour, naming, metadata, submission prep; geometry templates |
| `editorial/` | The standard every piece must pass |
| `provenance/` | Authorship policy: studies vs. works |
| `originals/` | Hand-made work only (binaries git-ignored) |
| `tools/` | Study generator, renderer, template maker, geometry checker, Opepen reference fetcher |

**Network note.** This workspace was built in a cloud environment whose network policy
blocks `opepen.art` and `api.opepen.art`. Platform rules come from the official
directive on GitHub (snapshot in `research/`); the visual survey of existing sets is
pending until those hosts are allowed.

Rebuild the studies:

```bash
python3 tools/make_studies.py && node tools/render.cjs studies 1600 && node tools/render.cjs directions 1200
```

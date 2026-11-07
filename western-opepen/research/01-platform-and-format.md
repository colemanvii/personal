# Opepen platform and DYNAMIC format — verified requirements

Source of record: the Opepen creative-agent directive, `opepen-app/public/agents.md`
([GitHub](https://github.com/visualizevalue/opepen-app/blob/main/public/agents.md)),
fetched 2026-11-07 and saved verbatim as
[`opepen-agents-directive-snapshot.md`](opepen-agents-directive-snapshot.md). The
directive says it was reviewed against frontend `5ec9468` and API `8f2d7cc` on
2026-09-05. **Re-verify against the live site immediately before submission.**

## What a set is

- 200 permanent set slots. Each revealed set covers 80 existing tokens in six edition
  groups: 1 + 4 + 5 + 10 + 20 + 40. A submission proposes art for existing tokens; it
  does not mint a new collection.
- Selection is collector demand (opt-ins of unrevealed tokens), not likes and not a jury.
  A candidate needs **more than 40 total demand** to be staged; a staged set then has a
  **72-hour consensus window** and needs demand of at least **1, 4, 5, 10, 20 and 40 in
  the respective groups** — excess in one group does not fill another. Reveal token
  allocation is seeded by a future Ethereum block hash.
- Practical consequence for us: the 1/40 group needs forty separate collectors' tokens
  committed to it. Half of the set's holders will own a 1/40. That group has to be
  wanted on its own merits.

## DYNAMIC (our format)

- 80 individually different final artworks.
- **85 populated media slots**: six base slots + 79 variant slots (4+5+10+20+40).
- The base 1/1 *is* the final 1/1; there is no separate 1/1 variant slot.
- For 1/4 … 1/40 the base media is the group's **preview**; each token gets its own
  variant.
- All six base media UUIDs must differ; all 80 final-slot UUIDs must differ. A preview
  may reuse one of its group's variant media; a one-media-per-final-slot rule applies.
- "Dynamic" means per-token variants. It does not require animation.

**Opportunity we will use:** the five group previews are not final artworks, so each can
be a purpose-made image — e.g. the 1/40 preview as the hand-drawn plat of the forty with
its forty stations marked around the perimeter; the 1/4 preview as the four seasons
quartered. (Draw these too; they are part of the physical archive.)

## Media

- Upload limit **15 MB per file** (backend). Picker accepts PNG, JPEG, GIF, SVG, WebP,
  MP4, WebM, GLTF/GLB, HTML; the server validates the detected subtype.
- Square PNG at a consistent high resolution is the practical default; the directive
  gives 2000×2000 as an example, not an enforced minimum. We plan 3000×3000 sRGB, falling
  back to 2400 or high-quality JPEG/WebP if a textured scan exceeds 15 MB (see
  `../production/PRODUCTION.md`).
- Inspect each file full-size and at small gallery/avatar size; inspect the app-generated
  Square and Open Graph previews after upload.

## Submission package (from the directive)

Set name, artist display name, description of idea and process; edition type and six
edition names; six labeled base files; all 79 variants grouped by edition and numbered
from 1 (`base/edition-4.png`, `variants/4/01.png`); base contact sheet and variant contact
sheets; a manifest mapping edition / index / title / filename (record media UUIDs and the
submission UUID after upload); source files; a validation report (counts, dimensions,
sizes, preview issues); the creator's public wallet address and real co-creator addresses
only.

## Things we will not do

Choose `NUMBERED_PRINT` (admin only); unpublish as an editing shortcut (it clears all
opt-ins); publish, sign, or submit without Cole's explicit go-ahead in his own wallet
session. We are in the artistic development phase.

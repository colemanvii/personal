# Physical-to-digital production plan

Principle: the drawing is the work; the file is a faithful record of it. Digital steps
are limited to capture, squaring, cropping, colour calibration and dust removal — every
one logged.

## 1. Materials

**Paper.** One family for the whole set, so the 80 sit together physically and in scans.
100% cotton, acid-free, warm/natural white (the warm tone is part of the language).
- Pen work and dry brush (1/5, 1/10, 1/20, 1/40): a smooth printmaking or hot-press
  sheet that takes a dip pen without feathering, ~250–300 gsm (e.g. Stonehenge Warm White,
  Rives BFK Cream, or a hot-press watercolour paper in natural white). **Test all three
  with your ink before buying in quantity.**
- Wash pieces (1/1, WO-04-02 *Stand*, WO-20-09 *Monarch*): hot-press watercolour paper,
  300 gsm, natural white.
- 1/40 in the field: pre-cut sheets of the same paper on a light board with clips and a
  rain sleeve. Not a sketchbook — every sheet must be identical and loose.

**Ink — iron-oxide red only.** PR101 (synthetic iron oxide: Indian/Venetian/light red) or
PR102 (natural red ochre). Both are ASTM I lightfast and are, literally, earth.
- Avoid dye-based red inks (most fountain-pen and many "drawing" reds) — they fade.
- Make a working ink: tube watercolour or dry pigment + gum arabic + distilled water
  (+ a drop of ox gall for flow). Mix in batches; label every batch (`INK-B01` …) and
  record the batch in the registry for every drawing.
- **1/1 only:** gather iron-rich soil from the drawn section, wash/levigate, dry, mull
  with gum arabic. Lightfastness-test a swatch (half covered, in a south window, 6+
  weeks) before using it on the final sheet.
- Graphite (HB–2H) for construction lines where they remain visible by design.

**Tools.** Dip nibs at three speeds: a fine crow quill (Hunt 102 class) for
engraving-density hatching; a flexible pointed nib for expressive line; a reed/bamboo
pen and a size 2–4 round brush for fast field work. A glass dip pen for single-line
pieces (it holds ink for a long continuous line).

## 2. Drawing sizes (1 Opepen unit = 1, 1.25 or 3 inches)

| Group | Image area | Sheet | Why |
|---|---|---|---|
| 1/40 | 8 × 8 in | 11 × 11 in | 1 in per unit; portable; fits any flatbed |
| 1/20, 1/10, 1/5, 1/4 | 10 × 10 in | 14 × 14 in | Room for density; fits an A3 flatbed |
| 1/1 | 24 × 24 in | 30 × 30 in | Hours of density; needs copy-stand capture |

Margins carry the four registration crosses (from the template), the catalogue ID, the
marginalia (station, date, weather), and the signature — outside the scanned image area
so they can be cropped, but present on the physical work.

## 3. Geometry transfer

1. `python3 tools/make_template.py 8|10|24` → print at 100%, check with a ruler.
2. Lightbox: trace the four registration crosses in graphite on every sheet. Trace the
   figure itself *only* as the piece requires (construction line, or not at all —
   for some pieces draw the figure freehand against the crosses and accept the drift
   only if it passes the gate).

## 4. Capture

- **≤ 11.7 in image:** flatbed scanner, 600 ppi optical, 48-bit (16 bit/channel) RGB,
  all auto-corrections off (no sharpening, no descreen, no dust removal), a colour target
  (IT8 or ColorChecker) scanned alongside on the first sheet of every session.
- **1/1 (24 in):** copy-stand capture — high-resolution camera, cross-polarised lighting
  at 45°, colour target in frame, flat-field correction; stitch tiles if necessary — or a
  fine-art reproduction studio. Target ≥ 400 ppi at original size.
- Shoot a raking-light photo of each drawing too (texture, nib pressure) for the archive.

## 5. Colour and preparation

- Masters: 16-bit TIFF, profiled with the target, in Adobe RGB (1998) or ProPhoto.
- **Do not white-balance the paper to #FFFFFF.** Measure the paper's Lab value once per
  paper batch and normalise every scan to it, so all 80 sit on the same paper tone.
- Square and scale to the registration crosses (perspective transform), crop to the
  exact image square, then run `tools/geometry_check.py`.
- Dust and scanner artefacts only; every retouch noted in the provenance log. No
  cleaning of the artist's marks, ever.

## 6. Export for Opepen

- sRGB, square, 3000 × 3000 px PNG. Check every file is < 15 MB; textured scans may not
  be — fall back to 2400 px PNG, then to maximum-quality JPEG/WebP. Same size for all 80.
- Confirm the upload's detected subtype in the real upload flow with one test file before
  exporting the set.
- Inspect each export at 100%, at 300 px and at 64 px.

## 7. File naming

```
WO-<ed>-<nn>_<slug>_<stage>_v<k>.<ext>
WO-40-07_sta07-stock-tank_scan-raw_v1.tif     raw capture, never edited
WO-40-07_sta07-stock-tank_master_v1.tif       profiled, squared, cropped, dust only
WO-40-07_sta07-stock-tank_export_v1.png       3000 px sRGB for Opepen
WO-40-07_sta07-stock-tank_raking_v1.jpg       raking-light documentation
WO-40-07_sta07-stock-tank_process_01.jpg      phone photos while drawing
```

Folders: `originals/01-drawings-raw/` (process photos), `02-scans-master/`,
`03-prepared/`. **Large binaries do not go in this git repo** — keep masters on two
drives plus cloud; commit only their SHA-256 hashes (`registry/hashes.csv`) and small
previews.

## 8. Metadata (XMP/IPTC in every master and export)

Creator, copyright, title, catalogue ID, edition group, date(s) drawn, location (to
section/station level; never a private home address), medium (paper, ink batch, nibs),
image dimensions, capture device and settings, and the provenance statement: *"Hand-drawn
ink on paper by Cole Calfee. Digital: capture, colour calibration, squaring, cropping and
dust removal only."*

## 9. Submission preparation (DYNAMIC) — only after approval

```
submission/
  base/edition-1.png  edition-4.png … edition-40.png   (1/1 final + five group previews)
  variants/4/01.png … 04.png
  variants/5/01.png … 05.png
  variants/10/01.png … 10.png
  variants/20/01.png … 20.png
  variants/40/01.png … 40.png
  contact-sheets/  manifest.csv  validation-report.md
```

Validation report: 85 slots populated, 80 distinct final media, six distinct base media,
dimensions, byte sizes, colour space, Square/OG preview screenshots. Wallet sign-in,
upload and publish are Cole's actions in his own session.

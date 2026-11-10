# MATERIAL — Motion Language Study 002

This study defines one motion language for four related projects: **Freeman**, **Tangerine / TABLET**, **Cole Calfee** and **Material**. It builds on the approved Freeman Material No. 1 (signature) and No. 2 (eagle).

It has four behaviours with three variations each, plus the two approved pieces running unmodified as the standard. Everything plays on one clock in a synchronized comparison gallery.

**Status: for visual review only.** Nothing here is deployed. Only `site/` is published from this repository, and `/studies/` answers 404 on colecalfee.com. The Freeman repository and the production Freeman website were read, never changed. No implementation is proposed until the studies are reviewed.

## Look at it

```sh
python3 -m http.server 8840 --bind 127.0.0.1      # from the repository root
open http://127.0.0.1:8840/studies/motion-language-002/
```

- `index.html` is the gallery. Every canvas reads one clock, and all loops are 8.00 s, so every seam lands on the same frame. It has a transport (play, frame step, scrub with the beat table marked, seam), tempo (¼×, ½×, 1×), ground (Architectural White or Material ivory), **Signal off** (draws orange as ink, which tests whether a motion still reads without its light), and **Grid** (shows each study's cell grid). You can filter by project or by the variable a study explores.
- `study.html?s=A1` shows one study large. `study.html?s=R1,A1,S3` shows any set side by side on one clock (shift-click ids to add or remove).
- `sheet.html?s=A1&n=16&cols=8` is a contact sheet. Add `&from=0.1&to=0.4` to zoom into a stretch.
- URL state makes a review reproducible: `?t=2.40&ground=ivory&signal=0&grid=1&tempo=0.5`.
- Keys: space play/pause · ← → one frame · L seam · G grid · S signal · W ground. `prefers-reduced-motion` opens paused.

## The grammar

Inherited from the approved Material pieces, unchanged:

1. **One square, one loop.** 1080 × 1080, 8.00 s, 60 fps, 480 frames. Every study is a pure function `draw(ctx, p)`. The gallery, contact sheets, renderer and verifier all call that same function.
2. **1-bit cells.** Everything sits on a whole-cell grid and nothing is drawn sub-pixel or with alpha.
3. **Three inks.** Ink `#332e20`, hairline `#dedbd4`, orange `#f93822`, on Architectural White `#ffffff` (Freeman Architectural White 002) or Material ivory `#fff9f1`.
4. **Easing has a meaning.** Quintic in-out is mechanical travel. Plumb's damped swing (ζ 0.66, ωn 6.8) is something settling into place. Cubic is pixels arriving. Each phase spends 40 % of its span on stagger, in reading or writing order.
5. **Tone and light come only from the 8 × 8 Bayer matrix,** the 1-bit shading of early Macs, in its 65 true levels.
6. **One orange element, and it means state.** It marks a pen start, a print head working, a selection, a latch or a focus. It is never decoration.
7. **Forward, not rewind.** The way back continues in the direction of the way out.

Proposed here:

8. **The beat table.** The approved Material timeline, named and shared: hold 0–1.10 · out 1.10–2.50 · breath 2.50–2.85 · out 2.85–4.25 · hold 4.25–5.85 · back 5.85–6.85 · breath 6.85–7.05 · back 7.05–8.00. Most studies start, breathe and rest on these counts. The scrubber marks them.
9. **Light switches, it doesn't slide.** A lamp turns on or off in dither steps (¼, ½, full) over a few frames. Light never travels across the screen as an object, except in S3, where the light *is* the subject.
10. **A small bitmap face.** An original 5 × 7 capital face with square terminals, set on the same cell grid as the marks, so type and image are one material.

## The studies

| | Study | Project | Varies | Idea |
|---|---|---|---|---|
| R1 | Material No. 1 | Freeman | approved | Signature, 2,278 px, 67 × 34 brick. The approved `motion.js`, unmodified. |
| R2 | Material No. 2 | Freeman | approved | Stamp eagle, 4,472 px, 52 × 86 pillar. The approved `motion.js`, unmodified. |
| **A1** | Printhead | Freeman | geometry | An eight-pin head prints the signature in seven alternating bands, with a line feed between passes. The copy is ejected upward while the carriage returns. Orange only while it prints. |
| **A2** | Growth | Freeman | timing | The eagle grows from its left wingtip (Material's orange-pixel rule). Each pixel arrives at its distance along the ink, so one eased gesture carries 4,472 events. It leaves in the same order. |
| **A3** | Threshold | Cole Calfee | rhythm | COLE CALFEE fades in through the Bayer thresholds in sixteen counted steps, one every six frames, and leaves on the same count. |
| **O1** | Detent | Tangerine / TABLET | timing | NOW · NEXT · OPEN LOOPS · WEEKLY SHEET on one ring, turning a quarter at a time with Plumb's swing on Plumb's counts. The function under the index mark lights once it settles. |
| **O2** | Orrery | Freeman | rhythm | The crosshair at the centre, with three bodies on inclined orbits at 1 : 2 : 3, joined by dotted chords. Bodies behind are drawn smaller. The system realigns at the seam. |
| **O3** | Constellation | Cole Calfee | scale | The Index's 23 works on a sphere, each tied to its two nearest neighbours, turning once at constant speed. This is the only study with no easing. Depth is carried by scale alone, and the nearest work is lit and named. |
| **P1** | Tambour | Tangerine / TABLET | geometry | The TABLET panel sits behind a slatted tambour on a belt that only runs downward, one row per detent. NOW is uncovered first and covered first. Its lamp is lit only while it is open and still. |
| **P2** | Index | Cole Calfee | rhythm | The Index in a five-row window, one entry a second, each click a damped swing. The lamp at the reading line lights between movements. |
| **P3** | Aperture | Freeman | scale | A shutter built on the crosshair. It opens along the level line in Material's three beats (half, a breath, then full) and closes along the plumb line with new plates, so it never reverses. The latch is lit while it is shut. |
| **S1** | Focus | Tangerine / TABLET | rhythm | One lamp per function. Focus moves on an even count of four. The old lamp goes out (½, ¼, off) while the new one comes on two frames behind it. |
| **S2** | Lamp | Material | timing | The Material block at rest. Its orange cell breathes twice a loop, and the glow is Bayer density, not alpha. |
| **S3** | Current | Freeman | geometry | One passage of light along the signature's strokes from the pen's first pixel: armed, then current, then done. |

The Freeman marks are read from the approved files in `reference/` and never redrawn (see `reference/PROVENANCE.md`). The Cole Calfee Index entries come from `site/index/index.html`. The TABLET functions come from Tangerine's `INSTRUMENT.md`.

## Proof

`node tools/verify.cjs` (with the server above) draws every frame of every study and checks the following:

| | Seam identical | Pure | Dark with signal off | Max orange | Still frames | Fingerprint |
|---|---|---|---|---|---|---|
| A1 | ✓ | ✓ | ✓ | 0.025 % | 49 % | `937c5d60` |
| A2 | ✓ | ✓ | ✓ | 0.002 % | 59 % | `87c1a78c` |
| A3 | ✓ | ✓ | ✓ | 0.002 % | 93 % | `61b0eb6e` |
| O1 | ✓ | ✓ | ✓ | 0.034 % | 49 % | `9c0b0520` |
| O2 | ✓ | ✓ | ✓ | 0.012 % | 0 % | `65641de0` |
| O3 | ✓ | ✓ | ✓ | 0.034 % | 0 % | `64ae3320` |
| P1 | ✓ | ✓ | ✓ | 0.012 % | 83 % | `7b6e0d60` |
| P2 | ✓ | ✓ | ✓ | 0.012 % | 63 % | `9f1a9050` |
| P3 | ✓ | ✓ | ✓ | 0.019 % | 84 % | `4b5a3a6a` |
| S1 | ✓ | ✓ | ✓ | 0.151 % | 96 % | `2bb284d0` |
| S2 | ✓ | ✓ | ✓ | 0.238 % | 63 % | `c89a2e00` |
| S3 | ✓ | ✓ | ✓ | 0.188 % | 71 % | `3625d398` |
| R1 | approved fingerprint `-126761301` ✓ · 2,278 px · no overlaps |
| R2 | approved fingerprint `1734470243` ✓ · 4,472 px · no overlaps |

"Max orange" is the largest share of the frame that is ever orange. Orange never exceeds a quarter of one percent. "Still" is the share of frames identical to the previous one, a measure of how much of each loop is at rest. Fingerprints are locked in `tools/fingerprints.json`, so any later change to a study, even a single pixel, is caught. Run `--write` only after an intended change.

## Outputs

- `shots/*.png` (committed) has one still per study at its most legible moment.
- `node tools/render.cjs --film` builds `out/comparison.mp4`, every study on one clock, frame-exact.
- `node tools/render.cjs A1 P3` builds 1080 × 1080, 60 fps MP4s, one per study.
- `node tools/bundle.mjs` builds `out/motion-language-002.html`, the gallery as one self-contained file for review without a server.

`out/` is rebuilt from source and not committed.

## Open questions for review

1. **Which behaviours carry across all four projects?** Signal (S1, S3) and Panel (P1, P3) seem to transfer directly. Orbital is the most Tangerine-specific. O2 risks reading as a generic "network" graphic and is the first candidate to cut.
2. **A1 vs A2 for Freeman Assembly.** Printhead is the most original and most mechanical. Growth is closer to the production pixel-mark intro. They could be one family: Printhead for print and film, Growth for the site.
3. **Ground.** White reads as architecture, ivory as paper. Toggle W and compare against R1 and R2, which stay on their approved ivory.
4. **Type.** Is the study face right for TABLET and Cole Calfee, or should those words stay in Monaco, with the face kept for marks?
5. **S2 Lamp** is the most "Apple object" gesture and also the closest to cliché (a sleep light). Keep it only if it survives the Signal-off test.

## Not done, on purpose

There's no implementation, no change to `site/` or to Freeman, no deploy, and no published page. After review, the next step would be a short proposal naming which studies become which components in which project, each with its own approval.

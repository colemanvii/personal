# The silhouette, exactly

Primary source: [`opepen-schematics.svg`](opepen-schematics.svg) from
`visualizevalue/opepen-api` (`app/Services/OpepenSVG/`), fetched 2026-11-07. Canvas
8×8 units, origin top-left.

| Form | Extent | Exact construction (from the SVG paths) |
|---|---|---|
| Left eye | x 2–4, y 2–4 | Three-quarter circle, centre (3,3), r 1, **plus the square top-left quadrant** (x 2–3, y 2–3). One sharp corner, top-left. |
| Right eye | x 4–6, y 2–4 | Full circle, centre (5,3), r 1. |
| Mouth | x 2–6, y 4–6 | Flat top edge and straight vertical sides from y 4 to 5; bottom corners are quarter circles r 1 (centres (3,5) and (5,5)); flat bottom from x 3 to 5. |
| Torso | x 2–6, y 7–8 | Flat top from x 3 to 5; upper corners are quarter circles r 1 (centres (3,8), (5,8)); base sits **on the canvas edge**. |

Relationships that make it Opepen (and that drift first in hand drawing):

- The two eyes **touch each other** at a single point, (4,3).
- Both eyes **sit on the mouth**: they touch its flat top at (3,4) and (5,4).
- The figure is **four units wide**, centred, with two empty units each side.
- There is a **one-unit gap** (y 6–7) between mouth and torso — the neck. Nothing of the
  figure is in it. (In this set the horizon and the creek live there.)
- The two units above the eyes are empty.
- The torso is cropped by the bottom edge; it is a shoulder line, not a pill.

## The failure modes we watch for

1. **Two circles.** Rounding off the left eye's square corner turns Opepen into a generic
   double-circle face. This is the single most common error, and our own first lariat
   study (B1) made it — the spiral coil ignored the corner. It was caught and fixed;
   the editorial standard makes it a hard fail.
2. **The heart.** Pinching the mouth to a point or merging the eyes into lobes.
3. **The pill / the smile.** Rounding the mouth's top corners, or curving its top edge.
4. **Floating parts.** Gaps between eyes and mouth; torso lifted off the bottom edge.
5. **Scale drift.** Figure grown to fill the canvas or shrunk to a logo.
6. **Costume.** A hat on the eyes, a bandana on the mouth. The silhouette is not a
   cowboy; dressing it up is illustration, not reinterpretation.

## How this is enforced in the studio

- `tools/make_template.py` prints the exact figure at 8, 10 or 24 in with four
  registration crosses outside the image. Crosses go on every sheet before drawing.
- `tools/geometry_check.py` overlays the exact edge on a prepared scan and makes a 64 px
  avatar test. Departures are allowed only when they are deliberate and recorded.
- Hand wobble is welcome. Proportion drift is not.

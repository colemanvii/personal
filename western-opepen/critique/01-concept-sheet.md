# Critique of the initial red Western Opepen concept sheet

**Status: the sheet was not received.** No image came through with the brief, and it is
not in the repository. Drop it into this folder (`critique/`) and I will critique it
line by line against the checklist below. I have not guessed at what it shows.

What I *can* critique now is the premise as stated — "red Western Opepen" — and the
artist's existing red-ink language, which is in this repo.

## The premise, as written

"Western Opepen in red ink" names a **genre and a palette**, not an idea. The Opepen
directive itself warns that "a new palette alone is rarely a complete idea", and a genre
is the same problem one level up: it tells us what things will be in the pictures, not
why they must be Opepen pictures. If you can swap the Opepen for a circle, a square or a
blank card and the drawing still works, the silhouette was just a frame.

Predictable moves a "Western Opepen" will reach for, in roughly the order a viewer has
already imagined them: cowboy hat on the eyes; bandana on the mouth; a brand; a
horseshoe; a cactus; a skull; a sunset behind it; a wanted poster; lasso coils for eyes.
Each is a one-liner. Eighty of them is merchandise.

## The artist's red-ink hand (from `site/assets/RD_tattoo 1 1.png`)

What works and must survive: the speed; the refusal to close shapes; scribbled foliage
that reads as foliage at a distance and as pure mark up close; iron-oxide red on warm
paper; vignettes that dissolve at the edges.

What will not carry eighty Opepens on its own: it is a *flash-sheet* hand — quick,
charming, decorative, built for logos and merch. Every mark is the same speed. A
significant body of work needs at least three speeds: the fast line (kept for the
1/40), the slow observational line (1/10, 1/20), and the patient, near-mechanical
line of the surveyor and the engraver (1/1, 1/4). The set should visibly stretch the
hand, not only showcase it.

## Checklist to apply to the sheet (and to every later drawing)

Geometry (see `../research/02-geometry.md`)
- [ ] Left eye keeps its single square top-left corner. (Most common failure.)
- [ ] Eyes touch each other and touch the mouth's flat top.
- [ ] Mouth: flat top, straight sides, rounded bottom corners only.
- [ ] Neck gap of exactly one unit; torso sits on the bottom edge, rounded shoulders.
- [ ] Figure four units wide, centred, two units of air above.

Idea
- [ ] Is the silhouette doing work, or is it a cookie cutter for an illustration?
- [ ] Would the drawing survive without the Opepen? Would the Opepen survive without
      the drawing? (Both should be "no" — the two must need each other.)
- [ ] Is there a costume (hat, bandana, boots)? Remove it.
- [ ] Does each piece on the sheet propose a *different* relationship to the
      silhouette, or the same one with different props?

Hand
- [ ] How many speeds of line are on the sheet?
- [ ] Is anything over-closed, over-outlined, or cleaned up in a way that kills the mark?

## A live example of geometric drift — from our own studies

Our first render of study B1 (lariat coils as eyes) silently turned the left eye into a
full spiral — the double-circle error — because the coil had no reason to respect a
square corner. The fix (the coil squares off in the corner) is in `tools/make_studies.py`.
The lesson for drawing by hand: any process with its own momentum — a coil, a hatch, a
herd — will round off that corner unless the corner is decided first.

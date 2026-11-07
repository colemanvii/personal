"""
Generate the speculative composition studies for WESTERN OPEPEN / SECTION LINE.

    python3 tools/make_studies.py && node tools/render.cjs studies 1600 && node tools/render.cjs directions 1200
    (render.cjs writes PNG; the committed previews are 1200 px JPEG conversions.)

Every output is stamped "AI COMPOSITION STUDY · NOT ARTWORK". These are
diagrams of decisions for the artist to accept, reject, or redraw by hand.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from sketchkit import (Pen, svg_doc, in_left, in_right, in_mouth, in_torso, in_sil,
                       INK, INK_DARK, GRAPHITE, sil_outline)

ROOT = os.path.join(os.path.dirname(__file__), "..")


def ring_hatch(p, cx, cy, rmax, spacing, region, w=0.9, op=0.8, rmin=0.02, color=INK, gap=0.0):
    r = rmin
    while r <= rmax:
        run = []
        n = max(24, int(2 * math.pi * r / 0.03))
        for i in range(n + 1):
            a = 2 * math.pi * i / n
            x, y = cx + r * math.cos(a), cy + r * math.sin(a)
            if region(x, y) and p.r.random() > gap:
                run.append((x, y))
            else:
                if len(run) > 2:
                    p.line(run, w=w * p.r.uniform(.8, 1.1), amp=0.004, op=op * p.r.uniform(.8, 1), color=color)
                run = []
        if len(run) > 2:
            p.line(run, w=w * p.r.uniform(.8, 1.1), amp=0.004, op=op * p.r.uniform(.8, 1), color=color)
        r += spacing + p.r.uniform(-spacing * .15, spacing * .15)


def meander(p, pts, n=200, wig=0.18, seed_off=0):
    """Smooth wandering path through control points (units)."""
    out = []
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        for i in range(n // len(pts)):
            t = i / (n // len(pts))
            x = x0 + (x1 - x0) * t
            y = y0 + (y1 - y0) * t
            dx, dy = x1 - x0, y1 - y0
            L = math.hypot(dx, dy) or 1
            o = wig * p.noise(seed_off + (len(out)) * 0.08)
            out.append((x - dy / L * o, y + dx / L * o))
    out.append(pts[-1])
    return out


def tree(p, x, y, s=0.12, op=0.85, w=0.9):
    """Scribbled tree crown seen from above."""
    pts = []
    for i in range(26):
        a = i * 0.9 + p.r.uniform(0, .5)
        rr = s * p.r.uniform(.35, 1)
        pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    p.line(pts, w=w, amp=0.006, op=op)


def building(p, x, y, w_, h_, roof=True, op=0.9):
    p.line([(x, y), (x + w_, y), (x + w_, y + h_), (x, y + h_)], close=True, w=1.1, amp=0.003, op=op)
    if roof:
        p.seg(x, y + h_ / 2, x + w_, y + h_ / 2, w=0.8, amp=0.002, op=op * .8)
        p.hatch(lambda a, b: x <= a <= x + w_ and y + h_ / 2 <= b <= y + h_, angle=90, spacing=0.018,
                bbox=(x, y, x + w_, y + h_), w=0.6, ragged=0.0, op=op * .7, sample=0.004)


# ---------------------------------------------------------------------------
# S01  1/1  ONE SQUARE MILE  — the silhouette is land, seen from altitude
# ---------------------------------------------------------------------------
def s01():
    p = Pen(101)
    out = lambda x, y: not in_sil(x, y)
    # section grid: the 8x8 Opepen grid and the survey grid are the same act
    for i in range(1, 8):
        p.seg(i, 0, i, 8, w=0.5, amp=0.004, op=0.22)
        p.seg(0, i, 8, i, w=0.5, amp=0.004, op=0.22)
    # patchwork of outer fields at varied angles, many cells left fallow (blank paper)
    cells = [(0, 0, 25), (1, 0, 0), (2, 0, 90), (5, 0, 0), (6, 0, -30), (7, 1, 90), (0, 2, 0), (7, 3, 60),
             (0, 4, 90), (7, 5, 0), (1, 1, 90), (6, 1, 0), (0, 6, 0), (6, 6, 90)]
    for cx, cy, ang in cells:
        p.hatch(lambda x, y, cx=cx, cy=cy: cx + .06 < x < cx + .94 and cy + .06 < y < cy + .94 and out(x, y),
                angle=ang, spacing=0.07, bbox=(cx, cy, cx + 1, cy + 1), w=0.7, op=0.45, ragged=0.01)
    p.ticks(lambda x, y: out(x, y) and (x < 1 or x > 7 or y < 1), n=500, length=0.04, op=0.5)
    # left eye: pivot circle with its one squared, straight-row corner
    ring_hatch(p, 3, 3, 1.0, 0.045, lambda x, y: in_left(x, y) and not (x <= 3 and y <= 3), w=0.85, op=0.85)
    p.hatch(lambda x, y: 2 <= x <= 3 and 2 <= y <= 3 and in_left(x, y), angle=0, spacing=0.04, bbox=(2, 2, 3, 3), w=0.85, ragged=0.005)
    p.seg(3, 3, 3.95, 2.7, w=1.6, op=0.95)  # pivot arm
    # right eye: center pivot, wheel tracks as darker rings
    ring_hatch(p, 5, 3, 0.99, 0.04, in_right, w=0.8, op=0.8)
    for r in (0.33, 0.62, 0.9):
        ring_hatch(p, 5, 3, r, 1, in_right, w=1.5, op=0.9, rmin=r)
    p.seg(5, 3, 4.2, 3.6, w=1.6, op=0.95)
    p.dot(5, 3, 3)
    # mouth: straight rows with headland turns
    p.hatch(in_mouth, angle=0, spacing=0.035, bbox=(2, 4, 6, 6), w=0.85, ragged=0.01)
    p.outline("mouth", w=1.1, op=0.6)
    # torso: farmstead + shelterbelt along the shoulders
    for i in range(70):
        a = math.radians(p.r.uniform(180, 360))
        side = p.r.choice([3, 5])
        rr = p.r.uniform(.78, .97)
        x, y = side + rr * math.cos(a), 8 + rr * math.sin(a)
        if in_torso(x, y) and (x < 3 or x > 5):
            tree(p, x, y, s=0.07)
    for i in range(18):
        x = 3 + i / 17 * 2
        tree(p, x, 7.1 + p.r.uniform(0, .06), s=0.07)
    building(p, 3.55, 7.45, 0.35, 0.22)
    building(p, 4.1, 7.5, 0.22, 0.16)
    building(p, 4.45, 7.42, 0.12, 0.3, roof=False)
    p.line([(4.0, 7.75), (4.05, 7.9), (4.02, 8.0)], w=1.0, op=0.8)  # lane
    p.hatch(lambda x, y: in_torso(x, y) and y > 7.28 and not (3.5 < x < 4.6 and y < 7.75), angle=-35, spacing=0.03, bbox=(2, 7, 6, 8), w=0.7, ragged=0.01, op=0.7)
    p.outline("torso", w=1.0, op=0.6)
    # creek ignores the grid: it finds the neck, the one gap the figure leaves open
    creek = meander(p, [(8.1, 5.2), (6.6, 6.55), (4.0, 6.45), (1.6, 6.6), (0.9, 7.4), (0.4, 8.1)], n=260, wig=0.12, seed_off=40)
    p.line(creek, w=1.5, op=0.9)
    p.line([(x + .03, y + .035) for x, y in creek], w=0.8, op=0.7)
    for x, y in creek[::5]:
        if not in_sil(x, y + .12):
            tree(p, x + p.r.uniform(-.1, .1), y + p.r.choice([-.12, .14]), s=0.055, op=0.7)
    # section-line roads
    p.seg(0, 1, 8, 1, w=1.2, op=0.7); p.seg(0, 1.04, 8, 1.04, w=0.7, op=0.6)
    p.seg(7, 0, 7, 8, w=1.2, op=0.7); p.seg(7.04, 0, 7.04, 8, w=0.7, op=0.6)
    # plat annotations
    p.text(0.3, 0.32, "SEC. 14", size=10)
    p.text(7.85, 0.32, "N ↑", size=10, anchor="end")
    p.text(7.85, 7.85, "1 mi. = 80 ch.", size=8, anchor="end")
    return p, "S01 · 1/1 · ONE SQUARE MILE"


# ---------------------------------------------------------------------------
# S02  1/4  QUARTER SECTION — Spring (first plowing)
# ---------------------------------------------------------------------------
def s02():
    p = Pen(202)
    out = lambda x, y: not in_sil(x, y)
    p.ticks(out, n=1300, length=0.05, op=0.55, w=0.8)          # unbroken sod
    # freshly broken ground: furrows follow each form's own geometry
    ring_hatch(p, 5, 3, 0.98, 0.055, in_right, w=1.1, op=0.9)
    ring_hatch(p, 3, 3, 0.98, 0.055, lambda x, y: in_left(x, y) and not (x <= 3 and y <= 3), w=1.1, op=0.9)
    p.hatch(lambda x, y: x <= 3 and y <= 3 and in_left(x, y), angle=90, spacing=0.055, bbox=(2, 2, 3, 3), w=1.1, ragged=0.01)
    p.hatch(in_mouth, angle=0, spacing=0.055, bbox=(2, 4, 6, 6), w=1.1, ragged=0.02)
    p.hatch(in_torso, angle=0, spacing=0.055, bbox=(2, 7, 6, 8), w=1.1, ragged=0.02)
    # unplowed strip at the very edge of each field (the plow could not turn there)
    # a single team & plow, small, mid-furrow
    p.line([(4.62, 4.47), (4.78, 4.47)], w=2.4, op=0.95)
    p.line([(4.8, 4.43), (4.96, 4.44), (4.97, 4.5), (4.8, 4.51)], w=1.2, close=True)
    p.line([(4.83, 4.53), (4.85, 4.6)], w=0.8); p.line([(4.93, 4.53), (4.95, 4.6)], w=0.8)
    p.text(0.3, 0.32, "N.E. ¼ — spring, first breaking", size=9, italic=True, family="Georgia, serif")
    return p, "S02 · 1/4 · QUARTER SECTION — SPRING"


# ---------------------------------------------------------------------------
# S03  1/4  QUARTER SECTION — Winter (snow erases; fence posts remember)
# ---------------------------------------------------------------------------
def s03():
    p = Pen(303)
    # the same quarter as S02, under snow. stubble pokes through along the old furrows;
    # everything else is paper. one coyote crossed in the night.
    def stubble(region, rows):
        for row in rows:
            for (x, y) in row:
                if region(x, y) and p.r.random() < 0.09:
                    p.seg(x, y, x + 0.004, y - p.r.uniform(.015, .04), w=0.9, op=0.85, amp=0.001)
    def rings(cx, cy, region):
        out = []
        r = 0.05
        while r < 1:
            out.append([(cx + r * math.cos(a / 60), cy + r * math.sin(a / 60)) for a in range(0, 377)])
            r += 0.055
        return out
    stubble(in_right, rings(5, 3, in_right))
    stubble(lambda x, y: in_left(x, y) and not (x <= 3 and y <= 3), rings(3, 3, in_left))
    vert = [[(2 + k * 0.055, 2 + j / 100) for j in range(100)] for k in range(19)]
    stubble(lambda x, y: x <= 3 and y <= 3 and in_left(x, y), vert)
    horiz = lambda y0, y1: [[(2 + j / 100, y0 + k * 0.055) for j in range(400)] for k in range(int((y1 - y0) / .055))]
    stubble(in_mouth, horiz(4.02, 6))
    stubble(in_torso, horiz(7.02, 8))
    # drift shadows along the north edge of each field (wind from the NW)
    for part in ("left", "right", "mouth", "torso"):
        pts = [pt for pt in sil_outline(part)]
        for i in range(0, len(pts) - 1, 2):
            x, y = pts[i]
            if p.r.random() < 0.5:
                p.seg(x + .02, y + .02, x + .12, y + .035, w=0.45, op=0.35)
    # tracks
    path = meander(p, [(-.1, 5.6), (1.5, 5.2), (3.1, 6.55), (5.4, 6.4), (6.7, 7.4), (8.1, 7.1)], n=240, wig=0.2, seed_off=7)
    for i in range(0, len(path), 2):
        x, y = path[i]
        side = 0.018 if (i // 2) % 2 else -0.018
        p.dot(x, y + side, 1.3, op=0.85)
    p.text(0.3, 0.32, "N.E. ¼ — January, after the blow", size=9, italic=True, family="Georgia, serif")
    return p, "S03 · 1/4 · QUARTER SECTION — WINTER"


# ---------------------------------------------------------------------------
# S04  1/5  IMPROVEMENTS — Dwelling. The silhouette is the absence in a wall.
# ---------------------------------------------------------------------------
def s04():
    p = Pen(404)
    wall = lambda x, y: not in_sil(x, y)
    # board-and-batten: vertical boards, grain, nail heads, weathered gaps
    b = 0.0
    while b < 8:
        bw = p.r.uniform(0.33, 0.48)
        p.hatch(lambda x, y, b=b, bw=bw: b + .02 < x < b + bw - .02 and wall(x, y), angle=90,
                spacing=p.r.uniform(0.022, 0.035), bbox=(b, 0, b + bw, 8), w=0.75, ragged=0.04, keep=0.92, op=0.8, jitter=0.006)
        p.hatch(lambda x, y, b=b: b - .025 < x < b + .025 and wall(x, y), angle=90, spacing=0.012,
                bbox=(b - .03, 0, b + .03, 8), w=1.2, ragged=0.02, op=0.95)
        for ny in (0.6, 2.6, 4.6, 6.6):
            if wall(b + bw / 2, ny):
                p.dot(b + bw / 2, ny, 1.6, op=0.9)
        b += bw
    # the four openings, edges torn/ragged rather than cut
    for part in ("left", "right", "mouth", "torso"):
        p.outline(part, w=0.9, op=0.5, amp=0.02, freq=14)
    # what the openings show: the horizon, far away, through the house
    for x0, x1, y in ((2.05, 3.95, 3.35), (4.05, 5.95, 3.35), (2.05, 5.95, 5.4)):
        p.line([(x, y + 0.02 * p.noise(x * 3)) for x in [x0 + i * (x1 - x0) / 40 for i in range(41)] if in_sil(x, y)], w=0.8, op=0.6)
    p.ticks(lambda x, y: in_mouth(x, y) and y > 5.42, n=120, length=0.04, op=0.5)
    p.ticks(lambda x, y: in_torso(x, y), n=90, length=0.05, op=0.5)
    p.text(7.85, 0.3, "IMPROVEMENT No. 1 — DWELLING, 14 × 16, BOARD", size=8.5, anchor="end")
    return p, "S04 · 1/5 · IMPROVEMENTS — DWELLING"


# ---------------------------------------------------------------------------
# S05  1/5  IMPROVEMENTS — Fence. Spare: the silhouette as a claim in wire.
# ---------------------------------------------------------------------------
def s05():
    p = Pen(505)
    for part in ("left", "right", "mouth", "torso"):
        pts = sil_outline(part)
        for strand, dy in enumerate((-0.045, 0.0, 0.045)):
            p.line([(x, y + dy) for x, y in pts], w=0.55, op=0.75, amp=0.004)
        acc = 0; last = pts[0]
        for (x, y) in pts:
            acc += math.hypot(x - last[0], y - last[1]); last = (x, y)
            if acc > 0.33:
                acc = 0
                p.seg(x, y - 0.07, x + p.r.uniform(-.01, .01), y + 0.07, w=1.6, op=0.95, amp=0.002)
        # barbs
        for i in range(0, len(pts), 3):
            x, y = pts[i]
            p.line([(x - .012, y - .012), (x + .012, y + .012)], w=0.6, op=0.8, amp=0)
            p.line([(x - .012, y + .012), (x + .012, y - .012)], w=0.6, op=0.8, amp=0)
    # a gate left open on the torso
    p.line([(3.0, 7.0), (2.7, 6.78)], w=1.2, op=0.9)
    p.text(7.85, 0.3, "IMPROVEMENT No. 3 — FENCE, 3 WIRE, CEDAR POSTS", size=8.5, anchor="end")
    return p, "S05 · 1/5 · IMPROVEMENTS — FENCE"


# ---------------------------------------------------------------------------
# S06  1/10  STOCK — The Pens. Corral plan; animals behave like animals.
# ---------------------------------------------------------------------------
def cow(p, x, y, a, s=0.075, op=0.9, fill=True):
    ca, sa = math.cos(a), math.sin(a)
    pts = []
    for i in range(18):
        t = 2 * math.pi * i / 18
        ex, ey = s * math.cos(t), s * 0.45 * math.sin(t)
        pts.append((x + ex * ca - ey * sa, y + ex * sa + ey * ca))
    p.line(pts, close=True, w=0.9, op=op, amp=0.004)
    hx, hy = x + ca * s * 1.25, y + sa * s * 1.25
    p.dot(hx, hy, 2.2, op=op)
    if fill:
        p.hatch(lambda u, v: ((u - x) * ca + (v - y) * sa) ** 2 / s ** 2 + ((v - y) * ca - (u - x) * sa) ** 2 / (s * .45) ** 2 < 0.8,
                angle=math.degrees(a) + 60, spacing=0.012, bbox=(x - s, y - s, x + s, y + s), w=0.5, ragged=0, op=op * .8)


def s06():
    p = Pen(606)
    # rails: double line around each pen
    for part in ("left", "right", "mouth", "torso"):
        pts = sil_outline(part)
        p.line(pts, w=1.3, op=0.95)
        cx, cy = {"left": (3, 3), "right": (5, 3), "mouth": (4, 4.9), "torso": (4, 8.2)}[part]
        p.line([(x + (cx - x) * 0.025, y + (cy - y) * 0.025) for x, y in pts], w=0.7, op=0.8)
    # gates (gaps marked) between pens
    p.seg(4.6, 4.0, 5.4, 4.0, w=3.0, color="#F0E8D9", op=1)
    p.seg(3.6, 6.0, 4.4, 7.0, w=0.8, op=0.7); p.seg(3.75, 6.0, 4.55, 7.0, w=0.8, op=0.7)  # alley to chute
    # right eye: round pen — one horse loping, its tracks a worn ring
    ring_hatch(p, 5, 3, 0.86, 0.025, lambda x, y: in_right(x, y) and 0.7 < math.hypot(x - 5, y - 3) < 0.88, w=0.6, op=0.6)
    a = math.radians(-35)
    hx, hy = 5 + 0.78 * math.cos(a), 3 + 0.78 * math.sin(a)
    cow(p, hx, hy, a + math.pi / 2, s=0.11, op=0.95)
    p.line([(hx + .09, hy + .02), (hx + .12, hy + .08)], w=1.0)  # tail
    p.stipple(lambda x, y: in_right(x, y) and math.hypot(x - 5, y - 3) < 0.65, n=80, r=(0.4, 0.8), op=0.35)
    # left eye: cattle crowd into the one square corner — they always do
    placed = 0
    for i in range(400):
        x, y = 2.08 + p.r.random() ** 2.2 * 1.6, 2.08 + p.r.random() ** 2.2 * 1.6
        if in_left(x, y) and placed < 24:
            cow(p, x, y, p.r.uniform(0, 6.28), s=0.075); placed += 1
    # mouth: holding pen, a few head, a water tank
    for x, y, a in ((2.6, 4.6, .3), (2.9, 4.8, 2.6), (3.4, 5.3, 1.2), (5.3, 4.5, 3.4), (4.6, 5.6, 0.1)):
        cow(p, x, y, a)
    ring_hatch(p, 5.6, 5.0, 0.13, 0.03, lambda x, y: True, w=0.7)
    # torso: loading chute, single animal, boards across
    p.hatch(lambda x, y: in_torso(x, y) and 3.7 < x < 4.3, angle=0, spacing=0.09, bbox=(3.6, 7, 4.4, 8), w=1.1, ragged=0)
    cow(p, 4.0, 7.55, math.pi / 2, s=0.1)
    p.ticks(lambda x, y: not in_sil(x, y), n=500, length=0.04, op=0.45)
    p.text(0.3, 0.32, "pens at the home place — 4 p.m.", size=9, italic=True, family="Georgia, serif")
    return p, "S06 · 1/10 · STOCK — THE PENS"


# ---------------------------------------------------------------------------
# S07  1/10  STOCK — Gather. The herd builds the silhouette.
# ---------------------------------------------------------------------------
def s07():
    p = Pen(707)
    n = 0
    tries = 0
    while n < 900 and tries < 90000:
        tries += 1
        x, y = p.r.uniform(1.9, 6.1), p.r.uniform(1.9, 8.05)
        if in_sil(x, y):
            a = math.radians(205 + p.r.gauss(0, 18))   # drifting the same way, into the wind
            cow(p, x, y, a, s=0.048, op=0.9, fill=p.r.random() < 0.6)
            n += 1
    # strays and riders outside
    for x, y in ((1.2, 5.3), (6.8, 2.2), (7.2, 6.9), (0.7, 1.4)):
        cow(p, x, y, math.radians(205), s=0.06)
    for x, y in ((6.9, 4.4), (1.1, 7.2)):
        p.dot(x, y, 2.8); p.line([(x - .06, y), (x + .06, y)], w=1.0)
    # dust trailing downwind
    for i in range(260):
        t = p.r.random()
        x = 6.15 + t * 1.8 + p.r.gauss(0, .12)
        y = 4.2 + t * 1.6 + p.r.gauss(0, .35 + t * .4)
        if not in_sil(x, y):
            p.seg(x, y, x + .18, y + .07, w=0.4, op=0.3 * (1 - t) + .05)
    return p, "S07 · 1/10 · STOCK — GATHER"


# ---------------------------------------------------------------------------
# S08  1/20  FIELD NOTES — Prairie sunflower; engraving vignette ends at the figure
# ---------------------------------------------------------------------------
def s08():
    p = Pen(808)
    # meadow engraved inside the silhouette; hatch weight carries the form
    p.hatch(lambda x, y: in_sil(x, y) and not in_right(x, y), angle=78, spacing=0.03, w=0.8, ragged=0.06, op=0.8)
    p.hatch(lambda x, y: (in_mouth(x, y) or in_torso(x, y)), angle=100, spacing=0.05, w=0.6, ragged=0.08, keep=0.6, op=0.6)
    # grass stems rising above the vignette edge (the specimen refuses the boundary)
    for i in range(36):
        x = p.r.uniform(2.1, 5.9); y0 = p.r.uniform(6.0, 6.0)
        if in_mouth(x, 5.95):
            h = p.r.uniform(0.15, 0.6)
            p.line([(x, 5.9), (x + p.r.uniform(-.06, .06), 5.9 + h * 1.0)], w=0.7, op=0.75)
    # sunflower disk = right eye, phyllotaxis
    g = math.radians(137.508)
    for k in range(1, 520):
        r = 0.04 * math.sqrt(k) * 0.98
        if r > 0.56:
            break
        x, y = 5 + r * math.cos(k * g), 3 + r * math.sin(k * g)
        p.dot(x, y, 1.0 + 1.3 * (1 - r / 0.56), color=INK_DARK, op=0.95)
    # ray florets — they overrun the circle; the edge of the eye is the petal tips' average
    for i in range(21):
        a = 2 * math.pi * i / 21 + p.r.uniform(-.05, .05)
        L = p.r.uniform(0.38, 0.58)
        r0 = 0.56
        base1 = (5 + r0 * math.cos(a - .1), 3 + r0 * math.sin(a - .1))
        base2 = (5 + r0 * math.cos(a + .1), 3 + r0 * math.sin(a + .1))
        tip = (5 + (r0 + L) * math.cos(a), 3 + (r0 + L) * math.sin(a))
        mid1 = (5 + (r0 + L * .5) * math.cos(a - .08), 3 + (r0 + L * .5) * math.sin(a - .08))
        mid2 = (5 + (r0 + L * .5) * math.cos(a + .08), 3 + (r0 + L * .5) * math.sin(a + .08))
        p.line([base1, mid1, tip, mid2, base2], w=0.9, op=0.9)
        p.line([(5 + (r0 + .05) * math.cos(a), 3 + (r0 + .05) * math.sin(a)), (5 + (r0 + L * .8) * math.cos(a), 3 + (r0 + L * .8) * math.sin(a))], w=0.5, op=0.6)
    p.outline("right", w=0.6, op=0.35)
    p.text(0.3, 0.42, "Helianthus petiolaris", size=12, italic=True, family="Georgia, serif", color=INK)
    p.text(0.3, 0.64, "prairie sunflower · ditch, N. line Sec. 14 · Aug.", size=8.5)
    return p, "S08 · 1/20 · FIELD NOTES — PRAIRIE SUNFLOWER"


# ---------------------------------------------------------------------------
# S09  1/20  FIELD NOTES — Nest. Silhouette survives only as pencil construction.
# ---------------------------------------------------------------------------
def s09():
    p = Pen(909)
    for part in ("left", "mouth", "torso"):
        p.outline(part, w=0.6, op=0.45, color=GRAPHITE)
    # nest woven in the right eye: many short arcs around the circle
    for i in range(420):
        r = 0.55 + abs(p.r.gauss(0, 0.17))
        if r > 1.02:
            continue
        a0 = p.r.uniform(0, 6.28); da = p.r.uniform(0.25, 0.9)
        pts = [(5 + (r + p.r.uniform(-.02, .02)) * math.cos(a0 + da * t / 8), 3 + (r + p.r.uniform(-.02, .02)) * math.sin(a0 + da * t / 8)) for t in range(9)]
        p.line(pts, w=p.r.uniform(.5, 1.1), op=0.85, amp=0.01)
    # three eggs, speckled
    for ex, ey, rot in ((4.82, 2.9, .3), (5.18, 2.95, -.4), (5.0, 3.22, 1.2)):
        pts = [(ex + .14 * math.cos(t) * math.cos(rot) - .1 * math.sin(t) * math.sin(rot), ey + .14 * math.cos(t) * math.sin(rot) + .1 * math.sin(t) * math.cos(rot)) for t in [i * 6.283 / 30 for i in range(31)]]
        p.line(pts, w=1.0, op=0.95)
        for k in range(14):
            p.dot(ex + p.r.uniform(-.09, .09), ey + p.r.uniform(-.06, .06), p.r.uniform(.6, 1.4), op=0.8)
    p.text(0.3, 0.42, "Sturnella neglecta — nest, 3 eggs", size=12, italic=True, family="Georgia, serif", color=INK)
    p.text(0.3, 0.64, "in the grass at the fence corner · May · left as found", size=8.5)
    return p, "S09 · 1/20 · FIELD NOTES — NEST"


# ---------------------------------------------------------------------------
# S10–S12  1/40  THE BACK FORTY — forty stations, two chains apart, one mile around
# ---------------------------------------------------------------------------
def s10():
    p = Pen(1010)
    # construction line first, faint; then the land drawn through it
    for part in ("left", "right", "mouth", "torso"):
        p.outline(part, w=0.5, op=0.35)
    hy = 6.5  # the horizon sits in the neck — the one gap in the figure
    p.line([(0, hy + .02 * p.noise(i * .3)) for i in range(1)] + [(x / 10, hy + 0.025 * p.noise(x * .21)) for x in range(0, 81)], w=1.1, op=0.9)
    # fence receding to a vanishing point
    for i in range(14):
        t = i / 13
        x = 0.4 + t * 3.4
        h = 0.55 * (1 - t) ** 1.3 + 0.03
        y = hy + 1.4 * (1 - t) ** 1.2
        p.seg(x, y - h, x, y, w=1.6 * (1 - t) + .4, op=0.9)
    p.line([(0.4, hy + 1.4 - 0.45), (3.8, hy - 0.0)], w=0.5, op=0.7)
    p.line([(0.4, hy + 1.4 - 0.25), (3.8, hy + 0.01)], w=0.5, op=0.7)
    # a cottonwood on the horizon, inside the right eye — the land registers the shape
    for i in range(90):
        a = p.r.uniform(0, 6.28); rr = 0.8 * math.sqrt(p.r.random())
        x, y = 5.05 + rr * math.cos(a), 3.3 + rr * math.sin(a) * 0.75
        pts = [(x + .05 * math.cos(k * 1.7) + p.r.uniform(-.03, .03), y + .04 * math.sin(k * 2.3) + p.r.uniform(-.03, .03)) for k in range(7)]
        shade = y > 3.3
        p.line(pts, w=0.9 if shade else 0.6, op=0.85 if shade else 0.55, amp=0.01)
    p.line([(5.1, hy), (5.12, 4.6), (5.0, 4.1)], w=1.4); p.line([(5.12, 4.7), (5.35, 4.3)], w=0.9)
    # marks inside the figure land heavier (pressure changes when the hand crosses the line)
    p.ticks(lambda x, y: y > hy + .1 and in_sil(x, y), n=380, length=0.07, op=0.95, w=1.1)
    p.ticks(lambda x, y: y > hy + .1 and not in_sil(x, y), n=240, length=0.05, op=0.45, w=0.6)
    p.text(0.3, 0.32, "STA. 1 · 0 ch. · NE cor. · looking W · 7:10 a.m. · still", size=8.5)
    return p, "S10 · 1/40 · THE BACK FORTY — STA. 1"


def s11():
    p = Pen(1111)
    # rain: every stroke the same angle; the figure is only where the rain falls harder
    for i in range(3400):
        x, y = p.r.uniform(-.3, 8), p.r.uniform(-.3, 8)
        ins = in_sil(x, y)
        if not ins and p.r.random() < 0.86:
            continue
        L = p.r.uniform(.08, .2) * (1.3 if ins else 0.8)
        p.seg(x, y, x - L * .3, y + L, w=1.0 if ins else 0.55, op=0.9 if ins else 0.4, amp=0.002)
    p.line([(x / 10, 6.5 + 0.02 * p.noise(x * .3)) for x in range(0, 81)], w=0.7, op=0.5)
    p.text(0.3, 0.32, "STA. 17 · 32 ch. · S line · looking N · 3:40 p.m. · rain from SW", size=8.5)
    return p, "S11 · 1/40 · THE BACK FORTY — STA. 17"


def s12():
    p = Pen(1212)
    # one continuous line, never lifted; then the horizon, then nothing
    order = ["torso", "mouth", "left", "right"]
    pts = []
    for part in order:
        o = sil_outline(part)
        if pts:
            lx, ly = pts[-1]
            k = min(range(len(o)), key=lambda i: (o[i][0] - lx) ** 2 + (o[i][1] - ly) ** 2)
            o = o[k:] + o[:k] + [o[k]]
        pts += o
    p.line(pts, w=1.3, op=0.9, amp=0.025, freq=3)
    p.line([(x / 10, 6.5 + 0.015 * p.noise(x * .25 + 9)) for x in range(-2, 83)], w=0.6, op=0.55)
    for i in range(22):
        x, y = p.r.uniform(.2, 7.8), p.r.uniform(.2, 1.8)
        if not in_sil(x, y):
            p.dot(x, y, p.r.uniform(.6, 1.5), op=0.7)
    p.text(0.3, 0.32, "STA. 31 · 60 ch. · NW cor. · looking E · 9:15 p.m. · could not see the paper", size=8.5)
    return p, "S12 · 1/40 · THE BACK FORTY — STA. 31"


# ---------------------------------------------------------------------------
# Competing directions B and C (A = Section Line is shown via S01/S06/S10)
# ---------------------------------------------------------------------------
def b1():  # SPECIMEN — lariat coils construct the eyes, saddle blanket the mouth
    p = Pen(2101)
    for cx, cy, part in ((5, 3, in_right), (3, 3, in_left)):
        t = 0
        pts = []
        while t < 46:
            r = 0.08 + t * 0.02
            c, sn = math.cos(t), math.sin(t)
            if part == in_left and c < 0 and sn < 0:
                m = max(abs(c), abs(sn)); c, sn = c / m, sn / m   # the coil squares off in the corner
            x, y = cx + r * c, cy + r * sn
            if r <= 0.98:
                pts.append((x, y))
            t += 0.05
        p.line(pts, w=2.2, op=0.9, amp=0.006); p.line([(x + .012, y + .012) for x, y in pts], w=0.7, op=0.6)
    p.hatch(in_mouth, angle=0, spacing=0.11, w=2.5, ragged=0.0, op=0.85)
    p.hatch(in_mouth, angle=90, spacing=0.11, w=0.6, ragged=0.0, op=0.5)
    for i in range(5):
        a0 = math.pi + i * 0.0
        r = 0.9 - i * 0.12
        p.line([(4 + r * math.cos(a), 8.05 + r * 0.9 * math.sin(a)) for a in [math.pi + k * math.pi / 30 for k in range(31)]], w=1.6, op=0.85)
    return p, "B1 · SPECIMEN — LARIAT / BLANKET / SHOE"


def b2():  # SPECIMEN — brand: the silhouette burned into hide
    p = Pen(2202)
    p.hatch(lambda x, y: True, angle=12, spacing=0.03, w=0.5, ragged=0.08, keep=0.85, op=0.35)
    for part in ("left", "right", "mouth", "torso"):
        for k in range(5):
            p.outline(part, w=5 - k * 0.8, op=0.25 + k * 0.15, amp=0.012, color=INK_DARK if k > 2 else INK)
    return p, "B2 · SPECIMEN — THE BRAND"


def b3():  # SPECIMEN — pressed grasses build the forms
    p = Pen(2303)
    for i in range(900):
        x, y = p.r.uniform(1.95, 6.05), p.r.uniform(1.95, 8.05)
        if in_sil(x, y):
            a = math.radians(p.r.uniform(-120, -60))
            L = p.r.uniform(.15, .35)
            pts = [(x + math.cos(a) * L * t / 6 + 0.03 * math.sin(t), y + math.sin(a) * L * t / 6) for t in range(7)]
            p.line(pts, w=0.7, op=0.8)
            if p.r.random() < 0.25:
                ex, ey = pts[-1]
                for k in range(4):
                    p.dot(ex + p.r.uniform(-.02, .02), ey + p.r.uniform(-.03, .03), 1.4)
    return p, "B3 · SPECIMEN — PRESSED GRASSES"


def c1():  # DAYBOOK — thirty days of the same drawing, overlaid
    p = Pen(3101)
    for d in range(30):
        q = Pen(3101 + d)
        dx, dy = p.r.gauss(0, 0.03), p.r.gauss(0, 0.03)
        for part in ("left", "right", "mouth", "torso"):
            q.line([(x + dx, y + dy) for x, y in sil_outline(part)], w=0.6, op=0.28, amp=0.03, freq=4)
        p.items += q.items
    return p, "C1 · DAYBOOK — 30 DAYS, ONE SHEET"


def c2():  # DAYBOOK — wind
    p = Pen(3202)
    for part in ("left", "right", "mouth", "torso"):
        pts = [(x + 0.06 * (y - 2) ** 1.1 * (1 + 0.6 * p.noise(y * 4)), y) for x, y in sil_outline(part)]
        p.line(pts, w=1.2, op=0.9, amp=0.04, freq=9)
    p.text(0.3, 0.32, "Day 12 · wind SW 30 · paper clipped to tailgate", size=8.5)
    return p, "C2 · DAYBOOK — WIND"


def c3():  # DAYBOOK — eyes closed
    p = Pen(3303)
    for part in ("left", "right", "mouth", "torso"):
        o = sil_outline(part)
        drift = p.r.uniform(-.2, .2), p.r.uniform(-.2, .2)
        pts = [(x + drift[0] * i / len(o), y + drift[1] * i / len(o)) for i, (x, y) in enumerate(o)]
        p.line(pts, w=1.5, op=0.9, amp=0.03, freq=3)
    p.text(0.3, 0.32, "Day 40 · drawn with eyes closed, from memory of Day 1", size=8.5)
    return p, "C3 · DAYBOOK — EYES CLOSED"


STUDIES = {"S01-one-square-mile": s01, "S02-quarter-section-spring": s02, "S03-quarter-section-winter": s03,
           "S04-improvements-dwelling": s04, "S05-improvements-fence": s05, "S06-stock-the-pens": s06,
           "S07-stock-gather": s07, "S08-field-notes-sunflower": s08, "S09-field-notes-nest": s09,
           "S10-back-forty-sta-01": s10, "S11-back-forty-sta-17": s11, "S12-back-forty-sta-31": s12}
DIRECTIONS = {"B1-specimen-lariat": b1, "B2-specimen-brand": b2, "B3-specimen-pressed": b3,
              "C1-daybook-thirty-days": c1, "C2-daybook-wind": c2, "C3-daybook-eyes-closed": c3}

if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for folder, table in (("studies", STUDIES), ("directions", DIRECTIONS)):
        for name, fn in table.items():
            if only and only not in name:
                continue
            pen, label = fn()
            with open(os.path.join(ROOT, folder, name + ".svg"), "w") as f:
                f.write(svg_doc(pen, label))
            print("wrote", folder, name, len(pen.items), "marks")

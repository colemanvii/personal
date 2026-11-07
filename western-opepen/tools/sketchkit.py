"""
sketchkit — a small procedural "pen" for SPECULATIVE composition studies.

Everything this module draws is an AI/procedural study for judging composition,
density and silhouette behaviour. It is never final artwork. Final artwork in
this project is drawn by hand by Cole Calfee on paper (see ../provenance/).

Geometry is the official Opepen silhouette on an 8x8 unit canvas, taken
verbatim from visualizevalue/opepen-api opepen-schematics.svg
(snapshot in ../research/opepen-schematics.svg). One unit = 100 px here.
"""
import math
import random

U = 100            # px per Opepen unit
SIZE = 8 * U       # 800 px canvas

PAPER = "#F0E8D9"  # sampled from the artist's existing red-ink sheet
INK = "#8E3420"    # iron-oxide red
INK_DARK = "#5E1F12"
GRAPHITE = "#6B6660"

# --- canonical silhouette (units), verbatim from the schematic -------------
LEFT_EYE = "M3 2 A1 1 0 1 1 2 3 L2 2 Z"          # square top-left corner, 3/4 round
RIGHT_EYE = "M6 3 A1 1 0 1 1 4 3 A1 1 0 1 1 6 3 Z"  # circle c(5,3) r1
MOUTH = "M3 6 A1 1 0 0 1 2 5 L2 4 L6 4 L6 5 A1 1 0 0 1 5 6 Z"
TORSO = "M2 8 A1 1 0 0 1 3 7 L5 7 A1 1 0 0 1 6 8 Z"
PARTS = {"left": LEFT_EYE, "right": RIGHT_EYE, "mouth": MOUTH, "torso": TORSO}


def in_left(x, y):
    if not (2 <= x <= 4 and 2 <= y <= 4):
        return False
    return (x <= 3 and y <= 3) or (x - 3) ** 2 + (y - 3) ** 2 <= 1


def in_right(x, y):
    return (x - 5) ** 2 + (y - 3) ** 2 <= 1


def in_mouth(x, y):
    if not (2 <= x <= 6 and 4 <= y <= 6):
        return False
    if y <= 5 or 3 <= x <= 5:
        return True
    return (x - 3) ** 2 + (y - 5) ** 2 <= 1 or (x - 5) ** 2 + (y - 5) ** 2 <= 1


def in_torso(x, y):
    if not (2 <= x <= 6 and 7 <= y <= 8):
        return False
    if 3 <= x <= 5:
        return True
    return (x - 3) ** 2 + (y - 8) ** 2 <= 1 or (x - 5) ** 2 + (y - 8) ** 2 <= 1


PART_FN = {"left": in_left, "right": in_right, "mouth": in_mouth, "torso": in_torso}


def in_sil(x, y):
    return in_left(x, y) or in_right(x, y) or in_mouth(x, y) or in_torso(x, y)


def sil_outline(part):
    """Sampled outline polygon (units) for a part, used for hand-drawn contours."""
    pts = []
    def arc(cx, cy, r, a0, a1, n=40):
        for i in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    if part == "left":
        pts.append((2, 2)); pts.append((3, 2)); arc(3, 3, 1, -90, 180, 60); pts.append((2, 2))
    elif part == "right":
        arc(5, 3, 1, 0, 360, 72)
    elif part == "mouth":
        pts += [(2, 4), (6, 4), (6, 5)]; arc(5, 5, 1, 0, 90, 20); pts.append((3, 6)); arc(3, 5, 1, 90, 180, 20); pts.append((2, 4))
    elif part == "torso":
        pts.append((2, 8)); arc(3, 8, 1, 180, 270, 20); pts.append((5, 7)); arc(5, 8, 1, 270, 360, 20)
    return pts


# --- noise + pen -----------------------------------------------------------
class Pen:
    def __init__(self, seed=1):
        self.r = random.Random(seed)
        self.items = []
        self._noise = [self.r.uniform(-1, 1) for _ in range(4096)]

    def noise(self, t):
        i = int(math.floor(t)) % 4095
        f = t - math.floor(t)
        f = f * f * (3 - 2 * f)
        return self._noise[i] * (1 - f) + self._noise[i + 1] * f

    # draw a polyline given in UNITS, with hand wobble
    def line(self, pts, w=1.4, amp=0.012, freq=6.0, color=INK, op=0.92, close=False, step=0.05, taper=True):
        if len(pts) < 2:
            return
        pts = list(pts) + ([pts[0]] if close else [])
        res = []
        for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
            d = math.hypot(x1 - x0, y1 - y0)
            n = max(1, int(d / step))
            for i in range(n):
                t = i / n
                res.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
        res.append(pts[-1])
        off = self.r.uniform(0, 3000)
        out = []
        acc = 0.0
        for i, (x, y) in enumerate(res):
            if i:
                acc += math.hypot(x - res[i - 1][0], y - res[i - 1][1])
            j = i + 1 if i + 1 < len(res) else i
            k = i - 1 if i else i
            dx, dy = res[j][0] - res[k][0], res[j][1] - res[k][1]
            L = math.hypot(dx, dy) or 1
            nx, ny = -dy / L, dx / L
            o = amp * (self.noise(off + acc * freq) + 0.35 * self.noise(off * 2 + acc * freq * 4))
            out.append((x + nx * o, y + ny * o))
        d = "M" + " L".join(f"{x*U:.1f} {y*U:.1f}" for x, y in out)
        cap = "round"
        self.items.append(
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w:.2f}" '
            f'stroke-linecap="{cap}" stroke-linejoin="round" opacity="{op:.2f}"/>'
        )

    def seg(self, x0, y0, x1, y1, **kw):
        self.line([(x0, y0), (x1, y1)], **kw)

    def dot(self, x, y, r=1.2, color=INK, op=0.9):
        self.items.append(f'<circle cx="{x*U:.1f}" cy="{y*U:.1f}" r="{r:.2f}" fill="{color}" opacity="{op:.2f}"/>')

    def raw(self, s):
        self.items.append(s)

    def text(self, x, y, s, size=11, color=GRAPHITE, family="'Courier New', monospace", anchor="start", op=0.85, italic=False, rot=0):
        st = ' font-style="italic"' if italic else ""
        tr = f' transform="rotate({rot} {x*U:.1f} {y*U:.1f})"' if rot else ""
        self.items.append(
            f'<text x="{x*U:.1f}" y="{y*U:.1f}" font-size="{size}" fill="{color}" font-family="{family}" '
            f'text-anchor="{anchor}" opacity="{op}"{st}{tr}>{s}</text>'
        )

    # contour of a silhouette part, drawn by hand (optionally twice, like a re-stated line)
    def outline(self, part, passes=1, **kw):
        for p in range(passes):
            pts = [(x + self.r.uniform(-0.006, 0.006), y + self.r.uniform(-0.006, 0.006)) for x, y in sil_outline(part)]
            self.line(pts, **kw)

    # hatching across a region function (units). Segments are found analytically and
    # given ragged, slightly over/undershot ends like real hatching.
    def hatch(self, region, angle=45, spacing=0.06, bbox=(0, 0, 8, 8), w=1.0, jitter=0.02,
              ragged=0.03, keep=1.0, amp=0.008, color=INK, op=0.85, minlen=0.03, sample=0.012):
        x0, y0, x1, y1 = bbox
        a = math.radians(angle)
        dx, dy = math.cos(a), math.sin(a)
        nx, ny = -dy, dx
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        R = math.hypot(x1 - x0, y1 - y0) / 2 + 0.1
        k = -R
        while k <= R:
            kk = k + self.r.uniform(-jitter, jitter)
            inside = False
            start = None
            t = -R
            while t <= R + sample:
                px, py = cx + nx * kk + dx * t, cy + ny * kk + dy * t
                ok = x0 <= px <= x1 and y0 <= py <= y1 and region(px, py)
                if ok and not inside:
                    start = t; inside = True
                elif not ok and inside:
                    self._hseg(cx, cy, nx, ny, dx, dy, kk, start, t, ragged, keep, w, amp, color, op, minlen)
                    inside = False
                t += sample
            if inside:
                self._hseg(cx, cy, nx, ny, dx, dy, kk, start, t, ragged, keep, w, amp, color, op, minlen)
            k += spacing
        return self

    def _hseg(self, cx, cy, nx, ny, dx, dy, kk, t0, t1, ragged, keep, w, amp, color, op, minlen):
        if self.r.random() > keep:
            return
        t0 += self.r.uniform(-ragged, ragged)
        t1 += self.r.uniform(-ragged, ragged)
        if t1 - t0 < minlen:
            return
        p0 = (cx + nx * kk + dx * t0, cy + ny * kk + dy * t0)
        p1 = (cx + nx * kk + dx * t1, cy + ny * kk + dy * t1)
        self.line([p0, p1], w=w * self.r.uniform(0.75, 1.15), amp=amp, color=color, op=op * self.r.uniform(0.8, 1.0))

    def stipple(self, region, n=800, bbox=(0, 0, 8, 8), r=(0.6, 1.4), color=INK, op=0.8):
        x0, y0, x1, y1 = bbox
        c = 0
        tries = 0
        while c < n and tries < n * 40:
            tries += 1
            x, y = self.r.uniform(x0, x1), self.r.uniform(y0, y1)
            if region(x, y):
                self.dot(x, y, self.r.uniform(*r), color=color, op=op * self.r.uniform(0.6, 1))
                c += 1

    def ticks(self, region, n=400, bbox=(0, 0, 8, 8), length=0.06, angle=(-110, -70), w=0.9, color=INK, op=0.8):
        """Short grass/strike marks."""
        x0, y0, x1, y1 = bbox
        c = 0; tries = 0
        while c < n and tries < n * 40:
            tries += 1
            x, y = self.r.uniform(x0, x1), self.r.uniform(y0, y1)
            if region(x, y):
                a = math.radians(self.r.uniform(*angle))
                L = length * self.r.uniform(0.5, 1.4)
                self.line([(x, y), (x + math.cos(a) * L, y + math.sin(a) * L)], w=w, amp=0.003, color=color, op=op * self.r.uniform(0.6, 1))
                c += 1


def svg_doc(pen, label, paper=PAPER, ink_filter=True, extra_defs=""):
    body = "\n".join(pen.items)
    flt = 'filter="url(#ink)"' if ink_filter else ""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" width="{SIZE}" height="{SIZE}">
<defs>
  <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="t"/>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="11"/>
    <feColorMatrix values="0 0 0 0 0.42  0 0 0 0 0.34  0 0 0 0 0.26  0 0 0 0.07 0"/>
  </filter>
  {extra_defs}
</defs>
<rect width="{SIZE}" height="{SIZE}" fill="{paper}"/>
<g {flt}>
{body}
</g>
<rect width="{SIZE}" height="{SIZE}" filter="url(#grain)"/>
<text x="0" y="0" transform="translate(14 {SIZE-14}) rotate(-90)" font-size="7.5" font-family="'Courier New', monospace" fill="#8a8178" opacity="0.9">AI COMPOSITION STUDY · NOT ARTWORK · {label}</text>
</svg>'''

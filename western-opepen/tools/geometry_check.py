"""
Geometry QC for a prepared (squared, cropped-to-image) scan.

    python3 tools/geometry_check.py path/to/WO-40-07_prepared.png [out.png]

Writes an overlay (exact silhouette in cyan over the drawing) and a 64 px
"avatar test" thumbnail beside it, because Opepen work is mostly seen small.
It does NOT judge the drawing: deliberate departures are allowed where the
editorial standard allows them. It makes deviation visible so it is a decision.
"""
import sys
from PIL import Image, ImageDraw

def silhouette_mask(n):
    s = n / 8
    m = Image.new("L", (n, n), 0); d = ImageDraw.Draw(m)
    # left eye: square top-left quadrant + 3/4 circle centred (3,3)
    d.ellipse([2*s, 2*s, 4*s, 4*s], fill=255); d.rectangle([2*s, 2*s, 3*s, 3*s], fill=255)
    d.ellipse([4*s, 2*s, 6*s, 4*s], fill=255)                       # right eye
    d.rectangle([2*s, 4*s, 6*s, 5*s], fill=255); d.rectangle([3*s, 5*s, 5*s, 6*s], fill=255)
    d.ellipse([2*s, 4*s, 4*s, 6*s], fill=255); d.ellipse([4*s, 4*s, 6*s, 6*s], fill=255)  # mouth
    d.rectangle([3*s, 7*s, 5*s, 8*s], fill=255)
    d.ellipse([2*s, 7*s, 4*s, 9*s], fill=255); d.ellipse([4*s, 7*s, 6*s, 9*s], fill=255)  # torso
    d.rectangle([0, 8*s, n, n], fill=0)
    return m

src = Image.open(sys.argv[1]).convert("RGB")
n = min(src.size); src = src.crop((0, 0, n, n))
edge = silhouette_mask(n).filter(__import__("PIL.ImageFilter", fromlist=["x"]).FIND_EDGES)
over = src.copy(); cyan = Image.new("RGB", (n, n), (40, 190, 230))
over.paste(cyan, (0, 0), edge.point(lambda v: 255 if v > 0 else 0))
thumb = src.resize((64, 64), Image.LANCZOS).resize((256, 256), Image.NEAREST)
sheet = Image.new("RGB", (n + 280, n), "white"); sheet.paste(over, (0, 0)); sheet.paste(thumb, (n + 12, 12))
out = sys.argv[2] if len(sys.argv) > 2 else sys.argv[1].rsplit(".", 1)[0] + "_geometry-check.png"
sheet.save(out); print("wrote", out)

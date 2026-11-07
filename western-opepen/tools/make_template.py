"""
Print a lightbox / transfer template of the exact Opepen silhouette at a physical size.

    python3 tools/make_template.py 8      # 1/40  (1 in per Opepen unit)
    python3 tools/make_template.py 10     # 1/4, 1/5, 1/10, 1/20
    python3 tools/make_template.py 24     # 1/1

Output: production/templates/opepen-template-<N>in.svg. Print at 100% (no "fit to page").
The image square is surrounded by a 1 in margin carrying four registration crosses.
Draw the crosses onto every sheet (graphite) before drawing: the scan is later
squared and scaled to them, so geometry can be checked objectively.
Lines are light cyan (non-photo) so they can be used under the sheet or traced faintly.
"""
import os, sys
N = float(sys.argv[1]) if len(sys.argv) > 1 else 10
M = 1.0                      # margin, inches
S = N + 2 * M
u = N / 8                    # inches per Opepen unit
paths = {
    "left": "M3 2 A1 1 0 1 1 2 3 L2 2 Z",
    "right": "M6 3 A1 1 0 1 1 4 3 A1 1 0 1 1 6 3 Z",
    "mouth": "M3 6 A1 1 0 0 1 2 5 L2 4 L6 4 L6 5 A1 1 0 0 1 5 6 Z",
    "torso": "M2 8 A1 1 0 0 1 3 7 L5 7 A1 1 0 0 1 6 8 Z",
}
grid = "".join(f'<line x1="{i}" y1="0" x2="{i}" y2="8"/><line x1="0" y1="{i}" x2="8" y2="{i}"/>' for i in range(9))
cross = lambda x, y: f'<path d="M{x-.25} {y} H{x+.25} M{x} {y-.25} V{y+.25}"/><circle cx="{x}" cy="{y}" r=".08"/>'
crosses = "".join(cross(x, y) for x, y in ((M/2, M/2), (S-M/2, M/2), (M/2, S-M/2), (S-M/2, S-M/2)))
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{S}in" height="{S}in" viewBox="0 0 {S} {S}">
<g fill="none" stroke="#66C7E8" stroke-width="{0.012}">{crosses}</g>
<g transform="translate({M} {M}) scale({u})" fill="none" stroke="#66C7E8">
  <g stroke-width="{0.006/u}" stroke-dasharray="{0.05/u} {0.05/u}">{grid}</g>
  <g stroke-width="{0.016/u}">{''.join(f'<path d="{d}"/>' for d in paths.values())}</g>
</g>
<text x="{M}" y="{S - M/4}" font-size="0.14" font-family="monospace" fill="#66C7E8">OPEPEN TEMPLATE · image {N:g} x {N:g} in · 1 unit = {u:g} in · print at 100% · geometry: visualizevalue/opepen-api opepen-schematics.svg</text>
</svg>'''
out = os.path.join(os.path.dirname(__file__), "..", "production", "templates")
os.makedirs(out, exist_ok=True)
fn = os.path.join(out, f"opepen-template-{N:g}in.svg")
open(fn, "w").write(svg)
print("wrote", fn)

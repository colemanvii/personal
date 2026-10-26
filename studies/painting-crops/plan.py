"""Plan non-destructive 4:5 crops for the two-column iPhone gallery.

Reads canvases.json and each photograph's pixel size, and writes crops.json:
for every work, a crop region in source pixels that Shopify's CDN applies on
request (crop=region&crop_left=..), or null where cropping gains too little.
The photographs on Shopify are never changed.

Rules: the whole canvas plus a margin of 10% of its larger side stays in
frame; the region is 4:5, like the gallery tile; it is never larger than the
photograph and never upscaled; a crop must enlarge the canvas by at least
15% to be worth proposing.

    python3 plan.py <dir of original photographs named by handle>
"""
import json, sys, os
from PIL import Image

MARGIN, MIN_GAIN, TILE_PX = 0.10, 1.15, 516  # 172 pt tile at 3x
here = os.path.dirname(os.path.abspath(__file__))
canvases = {k: v for k, v in json.load(open(os.path.join(here, "canvases.json"))).items() if not k.startswith("_")}
originals = sys.argv[1]
plan = {}
for handle, entry in canvases.items():
    W, H = Image.open(os.path.join(originals, handle + ".jpg")).size
    l, t, r, b = entry["canvas"]
    cl, ct, cr, cb = l * W, t * H, r * W, b * H
    m = MARGIN * max(cr - cl, cb - ct)
    need_w, need_h = (cr - cl) + 2 * m, (cb - ct) + 2 * m
    w = max(need_w, need_h * 4 / 5)
    h = w * 5 / 4
    if w >= W or h >= H:
        plan[handle] = {"crop": None, "gain": 1.0, "reason": "The canvas already fills the photograph; no safe crop gains anything."}
        continue
    cx, cy = (cl + cr) / 2, (ct + cb) / 2
    x = min(max(cx - w / 2, 0), W - w)
    y = min(max(cy - h / 2, 0), H - h)
    region = [round(x), round(y), round(w), round(h)]
    gain = W / w
    item = {"crop": region, "gain": round(gain, 2), "source": [W, H]}
    if gain < MIN_GAIN:
        item.update(crop=None, reason=f"Cropping would enlarge the canvas only {gain:.2f}x; keep the original.")
    elif region[2] < TILE_PX:
        item["resolution"] = f"Crop is {region[2]} px wide: below the {TILE_PX} px a 3x iPhone tile would use; served at its own size, never upscaled."
    if "note" in entry:
        item["note"] = entry["note"]
    plan[handle] = item
json.dump(plan, open(os.path.join(here, "crops.json"), "w"), indent=2)
for k, v in plan.items():
    print(f"{k:26} {('crop ' + str(v['crop'])) if v['crop'] else 'KEEP ORIGINAL':34} gain {v['gain']:.2f}  {v.get('resolution','') and 'LOW-RES'} {v.get('note','') and 'OCCLUDED'}")

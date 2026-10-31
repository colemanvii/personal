"""Write the approved crops into the paintings page as iPhone-only image sources.

For each approved work, the gallery thumbnail becomes
  <picture><source srcset="…crop…" sizes="…"><img …original…></picture>
so gallery thumbnails, on phones and desktop, get Shopify's on-request crop,
while the enlarged viewer (which reads the img's own src) keeps the original
photograph. Held works lose any crop source. Running it again is safe.

    python3 studies/painting-crops/apply.py paintings/index.html
"""
import html, json, os, re, sys

here = os.path.dirname(os.path.abspath(__file__))
crops = json.load(open(os.path.join(here, "crops.json")))
approval = json.load(open(os.path.join(here, "approved.json")))
approved = set(approval["approved"])
# Thumbnail widths: two columns on phones; up to a third of the shell on desktop.
SIZES = "(max-width: 700px) calc(50vw - 25px), min(33vw, 520px)"
page_path = sys.argv[1]
page = open(page_path).read()

# Undo any earlier run: unwrap <picture>, dropping its crop source.
page = re.sub(r'<picture data-crop="[^"]*"><source [^>]*>(<img [^>]*>)</picture>', r"\1", page)

def crop_source(handle, img):
    original = html.unescape(re.search(r'src="([^"]+)"', img).group(1)).split("&width=")[0]
    x, y, w, h = crops[handle]["crop"]
    region = f"&crop=region&crop_left={x}&crop_top={y}&crop_width={w}&crop_height={h}"
    widths = sorted({min(400, w), min(800, w), min(1200, w)})
    srcset = ", ".join(f"{original}{region}&width={n} {n}w" for n in widths)
    return (f'<picture data-crop="{x},{y},{w},{h}"><source '
            f'srcset="{html.escape(srcset)}" sizes="{SIZES}">{img}</picture>')

def wrap(match):
    handle, before, img = match.group(1), match.group(2), match.group(3)
    if handle in approved and crops.get(handle, {}).get("crop"):
        img = crop_source(handle, img)
    return f'data-handle="{handle}">{before}{img}'

page, n = re.subn(r'data-handle="([^"]+)">(<button [^>]*>)(<img [^>]*>)', wrap, page)
open(page_path, "w").write(page)
print(f"{n} works; cropped thumbnails: {', '.join(sorted(approved))}")

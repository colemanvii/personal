"""Build the study's media set and catalogue from the repository's own images.

Every entry below is a real work already present in colemanvii/personal
(site/assets, retired/assets) or already published on Cole's Shopify store
and listed in site/index/paintings-archive.js / site/paintings/index.html.
Titles, roles, years and media are copied from the current site.

Run from the repo root:
  python3 study/next-chapter/tools/build_media.py <shopify_download_dir>

Writes study/next-chapter/media/{l,s}/<id>.webp and media/catalogue.js.
Nothing here touches site/.
"""
import json, os, sys, colorsys, shutil
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = os.getcwd()
SITE = os.path.join(ROOT, 'site/assets')
RET = os.path.join(ROOT, 'retired/assets')
SHOP = sys.argv[1] if len(sys.argv) > 1 else ''  # full-size painting photographs, named by work id
OUT = os.path.join(ROOT, 'study/next-chapter/media')

# Projects: number, title, role, year, discipline(s), external link — all from the live Index.
PROJECTS = [
 ('freeman',   '001', 'Freeman General Contracting', 'Creative direction / Identity / Web', '2026', 'Identity', 'https://www.freemangc.com/'),
 ('kashus',    '002', 'Kashus Culpepper', 'Artwork / 7 releases', '2026', 'Record art', ''),
 ('scout',     '003', 'Scout Motors', 'Illustration', '2026', 'Illustration', ''),
 ('ronnie',    '004', 'Ronnie Hodges Performance Horses', 'Photography', '2022', 'Photography', ''),
 ('teton',     '005', 'Teton Valley Ranch', 'Photography', '2015', 'Photography', ''),
 ('ramsey',    '006', 'Ramsey Hill Contracting', 'Logo', '2026', 'Identity', ''),
 ('ernest',    '007', 'ERNEST', 'Illustration', '2025', 'Illustration', ''),
 ('habitat',   '008', 'Habitat Ranch', 'Photography', '2025', 'Photography', ''),
 ('corey',     '009', 'Corey Kent', 'Artwork / 1 release', '2025', 'Record art', 'https://open.spotify.com/album/3GNybGSzZJEuDRYojyUiPz'),
 ('joseph',    '010', 'Joseph Martin', 'Illustration / Artwork', '2024', 'Illustration', ''),
 ('paintings', '011', 'Paintings', 'Original works', 'Ongoing', 'Painting', ''),
 ('drawings',  '012', 'Drawings', 'Independent work', 'Ongoing', 'Drawing', ''),
 ('weir',      '013', 'Jeff Weir Oilworks', 'Apprentice', '2025', 'Painting', 'https://jeffweiroilworks.com/'),
 ('pbr',       '014', 'PBR', 'Client', '2025', 'Photography', ''),
 ('perle',     '015', 'Hotel Perle', 'Illustration / Brand', '2024—25', 'Illustration', 'https://www.hotelperle.com/'),
 ('bygone',    '016', 'The Bygone', 'Illustration', '2024', 'Illustration', 'https://thebygone.co/'),
 ('gossett',   '017', 'Dylan Gossett — Tree Birds', 'Artwork', '2024', 'Record art', 'https://open.spotify.com/track/0uNzLccqsb5crQ2dcBlakz'),
 ('callahan',  '018', 'Abbie Callahan — Linger', 'Music', '2024', 'Music', 'https://open.spotify.com/track/1HIGTfMjZeqweuDuAmpCRk'),
 ('lastmovie', '019', 'The Last Movie Star', 'Production Intern', '2016', 'Film', 'https://www.imdb.com/title/tt5836316/'),
 ('cowboyer',  '020', 'The Cowboyer', 'Cover studies', '2026', 'Illustration', ''),
 ('mags',      '021', 'Mags Duval', 'Photography', '2024', 'Photography', ''),
 ('musee',     '022', 'Musee for Men', 'Illustration', '2025', 'Illustration', 'https://www.museebath.com/collections/musee-for-men'),
 ('verygently','023', 'verygently', 'Photography', '2025', 'Photography', 'https://open.spotify.com/artist/6G76uCD9fXivb3G4OnnVG8'),
]

S, R, H = 'site', 'ret', 'shop'
# id, source, file, project, title, medium/detail, discipline, year, alt
WORKS = [
 # Paintings (titles + media from paintings-archive.js and paintings/index.html)
 ('red-sea', H, 'red-sea.jpg', 'paintings', 'Red Sea', 'Oil on canvas · 36 × 48 in.', 'Painting', '2026', 'Red Sea, a large red painting leaning in the studio', 'available'),
 ('flowers-mccarty', H, 'flowers-mccarty.jpg', 'paintings', 'Flowers in McCarty Vase', 'Oil on canvas · 24 × 30 in.', 'Painting', '2026', 'Flowers in McCarty Vase, red ground with a bouquet', 'available'),
 ('harvest-1', H, 'harvest-1.jpg', 'paintings', 'Harvest 1', 'Oil on canvas · 36 × 36 in.', 'Painting', '', 'Harvest 1, Oil on canvas', 'sold'),
 ('peace-of-wild-things', H, 'peace-of-wild-things.jpg', 'paintings', 'Peace of Wild Things', 'Oil on canvas · 30 × 30 in.', 'Painting', '', 'Peace of Wild Things, Oil on canvas', 'sold'),
 ('porter-study', H, 'porter-study.jpg', 'paintings', 'Porter Study', 'Oil on linen · 11 × 14 in.', 'Painting', '', 'Porter Study, Oil on linen', 'sold'),
 ('flowers-in-a-jug', H, 'flowers-in-a-jug.jpg', 'paintings', 'Flowers in a jug', 'Oil on canvas · 30 × 30 in.', 'Painting', '', 'Flowers in a jug, Oil on canvas', 'sold'),
 ('nine-ball', H, 'nine-ball.jpg', 'paintings', 'Nine Ball', 'Oil on linen · 11 × 14 in.', 'Painting', '', 'Nine Ball, Oil on linen', 'sold'),
 ('little-window', H, 'little-window.jpg', 'paintings', 'Little Window', 'Oil on linen · 11 × 14 in.', 'Painting', '', 'Little Window, Oil on linen', 'sold'),
 ('zen-buffalo', H, 'zen-buffalo.jpg', 'paintings', 'Zen Buffalo', 'Oil on canvas · 8 × 10 in.', 'Painting', '', 'Zen Buffalo, Oil on canvas', 'sold'),
 ('fj40', H, 'fj40.jpg', 'paintings', 'FJ40', 'Oil on canvas · 18 × 24 in.', 'Painting', '', 'FJ40, Oil on canvas', 'sold'),
 ('scout-painting', H, 'scout-painting.jpg', 'paintings', 'Scout', 'Oil on canvas · 30 × 30 in.', 'Painting', '', 'Scout, Oil on canvas', 'sold'),
 ('target', H, 'target.jpg', 'paintings', 'Target', 'Oil on canvas · 20 × 20 in.', 'Painting', '', 'Target, Oil on canvas', 'sold'),
 ('purple-haze', H, 'purple-haze.jpg', 'paintings', 'Purple Haze', 'Oil on canvas · 20 × 20 in.', 'Painting', '', 'Purple Haze, Oil on canvas', 'sold'),
 ('peach-circuit', H, 'peach-circuit.jpg', 'paintings', 'Peach Circuit', 'Oil and red wine on canvas · 30 × 40 in.', 'Painting', '', 'Peach Circuit, Oil and red wine on canvas', 'sold'),
 # Drawings (captions from the Index)
 ('bison-study', S, '2 2 1.png', 'drawings', 'Bison study', 'Drawing', 'Drawing', '', 'Red ink bison study', ''),
 ('portrait-study', S, '2 611.png', 'drawings', 'Portrait study', 'Drawing', 'Drawing', '', 'Red ink portrait study of a man in a window frame', ''),
 ('lakeside-club', S, '11724 1 3 1.png', 'drawings', 'Lakeside Club', 'Drawing', 'Drawing', '', 'Red ink drawing, Lakeside Club', ''),
 ('broadcast-portrait', S, '11724 10 1.png', 'drawings', 'Broadcast portrait', 'Drawing', 'Drawing', '', 'Red ink portrait of a broadcaster in headphones', ''),
 ('lewis-grizzard', S, '11724 11 1.png', 'drawings', 'Lewis Grizzard', 'Drawing', 'Drawing', '', 'Red ink portrait of Lewis Grizzard', ''),
 ('western-sketchbook-1', S, 'Ivory-Paper-Texture 6 1.png', 'drawings', 'Western sketchbook I', 'Drawing', 'Drawing', '', 'Sketchbook page of western figures in red ink', ''),
 ('western-sketchbook-2', S, 'Ivory-Paper-Texture 8 1.png', 'drawings', 'Western sketchbook II', 'Drawing', 'Drawing', '', 'Sketchbook page with handwriting and figures in red ink', ''),
 ('dog-studies', S, 'Jeauxben_&_George 1.png', 'drawings', 'Dog studies', 'Drawing', 'Drawing', '', 'Red ink studies of two dogs', ''),
 ('sketchbook-3', S, 'RD_tattoo 1 1.png', 'drawings', 'Sketchbook III', 'Drawing', 'Drawing', '', 'Sketchbook page of buildings, riders and a pitcher in red ink', ''),
 ('sketchbook-4', S, 'RD_tattoo 2 1.png', 'drawings', 'Sketchbook IV', 'Drawing', 'Drawing', '', 'Sketchbook page of figures, a lion and handwriting in red ink', ''),
 ('sketchbook-5', S, 'RD_tattoo 3.png', 'drawings', 'Sketchbook V', 'Drawing', 'Drawing', '', 'Sketchbook page with Pour Me Out lettering and a portrait in red ink', ''),
 # Kashus Culpepper
 ('pour-me-out', S, 'pmo.jpg', 'kashus', 'Pour Me Out', 'Single artwork', 'Record art', '2026', 'Pour Me Out cover, a guitarist in cream on red', ''),
 ('jenni', S, 'KC_Jenni_Artwork_1x1-scaled.jpg', 'kashus', 'Jenni', 'Single artwork', 'Record art', '2026', 'Jenni cover with red lips on cream', ''),
 ('act-1', S, 'IMG_2786.JPG', 'kashus', 'Act I: Summer Nights', 'Release artwork', 'Record art', '2026', 'Act I Summer Nights, a child with a boombox drawn in red', ''),
 ('after-me', S, 'Kashus Culpepper After Me 1.png', 'kashus', 'After Me?', 'Single artwork', 'Record art', '2026', 'After Me? cover with a woodcut church', ''),
 ('out-of-my-mind', S, 'Kashus Culpepper Out of My Mind 1.png', 'kashus', 'Out of My Mind', 'Single artwork', 'Record art', '2026', 'Out of My Mind cover with birds circling a moon', ''),
 ('who-hurt-you', S, 'Kashus Culpepper Who Hurt You 1.png', 'kashus', 'Who Hurt You', 'Single artwork', 'Record art', '2026', 'Who Hurt You cover, a guitarist in a window frame', ''),
 ('harvest-moon', S, 'admat.jpg', 'kashus', 'Harvest Moon tour poster', 'Poster', 'Illustration', '2026', 'Harvest Moon tour poster with a howling coyote', ''),
 ('kc-portrait-1', S, 'kc1.jpeg', 'kashus', 'Portrait 01', 'Photograph', 'Photography', '2026', 'Kashus Culpepper seated with a guitar', ''),
 ('kc-portrait-2', S, 'kc2.jpg', 'kashus', 'Portrait 02', 'Photograph', 'Photography', '2026', 'Kashus Culpepper playing guitar on a porch', ''),
 ('kc-live', S, 'kc3.jpg', 'kashus', 'Live performance', 'Photograph', 'Photography', '2026', 'Kashus Culpepper performing in low light', ''),
 # Corey Kent
 ('poster-child', S, 'ck.jpg', 'corey', 'Poster Child EP', 'Cover artwork', 'Record art', '2025', 'Corey Kent Poster Child EP artwork in blue on cream', ''),
 # Scout
 ('scout-1', S, 's1.jpeg', 'scout', 'Scout Motors 01', 'Illustration', 'Illustration', '2026', 'Framed Scout illustration of a vehicle crossing a wide desert landscape', ''),
 ('scout-2', S, 's2.jpeg', 'scout', 'Scout Motors 02', 'Illustration', 'Illustration', '2026', 'Framed Scout illustration of a vehicle alongside horseback riders', ''),
 # Joseph Martin
 ('martin-survives', S, 'joseph-martin-01.webp', 'joseph', 'Martin Survives!', 'Event poster', 'Illustration', '2024', 'Framed Martin Survives event poster, western illustration in red', ''),
 ('dont-call-it-luck', S, 'joseph-martin-02.webp', 'joseph', "Don't Call It Luck!", 'Event poster', 'Illustration', '2024', "Framed Don't Call It Luck event poster, cowboy illustration in red", ''),
 ('jm-cowboy', S, 'cg.png', 'joseph', 'Cowboy', 'Ink illustration', 'Illustration', '2024', 'Red ink illustration of a cowboy in a wide-brimmed hat', ''),
 ('hatmaker', S, 'jm3.png', 'joseph', 'Hatmaker — Double Decker Arts Festival', 'Poster', 'Illustration', '2024', 'Joseph Martin Hatmaker poster in purple with a cowboy on horseback', ''),
 # ERNEST
 ('ernest', S, 'ernest.webp', 'ernest', 'Stars for Second Harvest', 'Event poster', 'Illustration', '2025', 'Framed Stars for Second Harvest event poster for ERNEST', ''),
 # Cowboyer
 ('cowboyer-1', S, 'cowboyer-cover-01.webp', 'cowboyer', 'Cover 01 / Bison', 'Cover study', 'Illustration', '2026', 'The Cowboyer cover with a bison under a colored western sky', ''),
 ('cowboyer-2', S, 'cowboyer-cover-02.webp', 'cowboyer', 'Cover 02 / Orange Rider', 'Cover study', 'Illustration', '2026', 'The Cowboyer orange cover with a small rider', ''),
 ('cowboyer-3', S, 'Group 394.png', 'cowboyer', 'Cover 03 / Red Lasso', 'Cover study', 'Illustration', '2026', 'The Cowboyer cover, a red lasso drawing on cream', ''),
 ('cowboyer-4', S, 'Group 393.png', 'cowboyer', 'Cover 04 / Desert', 'Cover study', 'Illustration', '2026', 'The Cowboyer cover, a figure before a desert cloud', ''),
 # Photography
 ('ronnie-1', S, 'ronnie-hodges-01.webp', 'ronnie', 'Ronnie Hodges 01', 'Photograph', 'Photography', '2022', 'Ronnie Hodges speaking while seated on horseback', ''),
 ('ronnie-2', R, 'ronnie-hodges-02.webp', 'ronnie', 'Ronnie Hodges 02', 'Photograph', 'Photography', '2022', 'Riders and horses in a dusty arena', ''),
 ('ronnie-3', R, 'ronnie-hodges-03.webp', 'ronnie', 'Ronnie Hodges 03', 'Photograph', 'Photography', '2022', 'A man in a straw hat leaning on a rail', ''),
 ('ronnie-4', S, 'ronnie-hodges-04.webp', 'ronnie', 'Ronnie Hodges 04', 'Photograph', 'Photography', '2022', 'Two men resting by a horse enclosure', ''),
 ('teton-1', S, 'teton-valley-ranch.webp', 'teton', 'Teton Valley Ranch 01', 'Photograph', 'Photography', '2015', 'Lone horseback rider on a ridge at Teton Valley Ranch', ''),
 ('teton-2', S, 'IMG_5723.JPG', 'teton', 'Teton Valley Ranch 02', 'Photograph', 'Photography', '2015', 'Ranch worker holding horseshoes beside a timber wall', ''),
 ('teton-3', S, '8F38731E-2435-4C66-ACA2-AB5677516F30.jpg', 'teton', 'Teton Valley Ranch 03', 'Photograph', 'Photography', '2015', 'Pickup truck crossing a vast ranch landscape', ''),
 ('habitat', S, 'habitat-ranch.webp', 'habitat', 'Habitat Ranch', 'Photograph', 'Photography', '2025', 'Habitat Ranch cap and denim portrait', ''),
 ('pbr-portrait', S, 'pbr-portrait.webp', 'pbr', 'PBR 01', 'Photograph', 'Photography', '2025', 'Rodeo participant backstage', ''),
 ('pbr-bull', S, 'pbr-bull.webp', 'pbr', 'PBR 02', 'Photograph', 'Photography', '2025', 'Bull waiting in a rodeo chute', ''),
 ('mags', S, 'M2.jpeg', 'mags', 'Mags Duval', 'Photograph', 'Photography', '2024', 'Portrait of Mags Duval holding a red rose', ''),
 # Identity
 ('freeman-web', S, 'images/freeman-homepage-preview.webp', 'freeman', 'freemangc.com', 'Website', 'Web', '2026', 'Freeman General Contracting homepage with script wordmark', ''),
 ('ramsey-monogram', S, 'rh2 1 (Traced) (Traced).png', 'ramsey', 'Monogram', 'Logo', 'Identity', '2026', 'Ramsey Hill rust-colored RH monogram', ''),
 ('ramsey-arrowhead', S, 'RH1 1 (Traced) (Traced).png', 'ramsey', 'Arrowhead', 'Logo', 'Identity', '2026', 'Ramsey Hill rust-colored arrowhead mark', ''),
 # Studio + unfiled
 ('studio', S, 'images/about-studio-motion.jpg', 'studio', 'Studio', 'Photograph', 'Photography', '', 'A motion-blurred figure walking past colorful paintings on a studio wall', ''),
 ('tops', R, 'D68D863A-E8DF-4D5C-978A-9D968EB72AD2.jpg', 'unfiled', 'Untitled (Tops Bar-B-Q)', 'Photograph · unfiled', 'Photography', '', 'Tops Bar-B-Q sign glowing at dusk', ''),
]

def dominant(im, floor=0.006):
    """Signature colour: the most saturated colour that still covers a real share of the image."""
    sm = im.convert('RGB').resize((64, 64))
    px = list(sm.get_flattened_data()) if hasattr(sm,"get_flattened_data") else list(sm.getdata())
    buckets = {}
    for p in px:
        k = (p[0] // 20, p[1] // 20, p[2] // 20)
        buckets.setdefault(k, []).append(p)
    best, score = None, -1
    for v in buckets.values():
        share = len(v) / len(px)
        if share < floor:
            continue
        r, g, b = [sum(c[i] for c in v) / len(v) for i in range(3)]
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        vivid = s * (1 - abs(l - 0.5) * 1.4)
        sc = (vivid ** 2) * (share ** 0.35)
        if sc > score:
            score, best = sc, (int(r), int(g), int(b), h, l, s)
    r, g, b, h, l, s = best
    return '#%02x%02x%02x' % (r, g, b), round(h, 3), round(l, 3), round(s, 3)

def ink(im):
    """Drawings: the mean colour of the inked pixels, ignoring the ivory paper."""
    sm = im.convert('RGB').resize((256, 256))
    px = list(sm.get_flattened_data()) if hasattr(sm, 'get_flattened_data') else list(sm.getdata())
    inked = [p for p in px if colorsys.rgb_to_hls(*(c / 255 for c in p))[1] < 0.62]
    r, g, b = [sum(p[i] for p in inked) / len(inked) for i in range(3)]
    h, l, s_ = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return '#%02x%02x%02x' % (int(r), int(g), int(b)), round(h, 3), round(l, 3), round(s_, 3)

CANVAS = {k: v for k, v in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'canvases.json'))).items() if not k.startswith('_')}
SHORT = {'freeman': 'Freeman', 'kashus': 'Kashus Culpepper', 'scout': 'Scout Motors', 'ronnie': 'Ronnie Hodges',
         'teton': 'Teton Valley Ranch', 'ramsey': 'Ramsey Hill', 'gossett': 'Dylan Gossett', 'callahan': 'Abbie Callahan',
         'lastmovie': 'The Last Movie Star', 'weir': 'Jeff Weir'}

def main():
    for d in ('l', 's'):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)
    works = []
    for (wid, src, f, proj, title, detail, disc, year, alt, state) in WORKS:
        path = {'site': SITE, 'ret': RET, 'shop': SHOP}[src]
        im = Image.open(os.path.join(path, f))
        im.load()
        if im.mode in ('P', 'LA', 'RGBA'):
            im = im.convert('RGBA')
            bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
            bg.alpha_composite(im)
            im = bg
        im = im.convert('RGB')
        studio = None
        if wid in CANVAS:
            # paintings: the catalogue image is the canvas alone; the studio photograph stays as a second view
            studio = im
            W0, H0 = im.size
            l, t, r, b = CANVAS[wid]['canvas']; tl, tt, tr, tb = CANVAS[wid]['trim']
            l, t, r, b = l * W0, t * H0, r * W0, b * H0; cw, ch = r - l, b - t
            im = im.crop((round(l + cw * tl), round(t + ch * tt), round(r - cw * tr), round(b - ch * tb)))
            for d, edge, q in (('l', 1800, 82), ('s', 720, 78)):
                c = studio.copy(); c.thumbnail((edge, edge), Image.LANCZOS)
                c.save(os.path.join(OUT, d, wid + '-studio.webp'), 'WEBP', quality=q, method=6)
        w, h = im.size
        for d, edge, q in (('l', 1800, 82), ('s', 720, 78)):
            c = im.copy()
            c.thumbnail((edge, edge), Image.LANCZOS)
            c.save(os.path.join(OUT, d, wid + '.webp'), 'WEBP', quality=q, method=6)
        # drawings: take the ink, not the paper
        hexc, hue, light, sat = ink(im) if disc == 'Drawing' else dominant(im)
        p = next(x for x in PROJECTS if x[0] == proj) if proj not in ('studio', 'unfiled') else None
        works.append(dict(id=wid, title=title, detail=detail, discipline=disc,
                          year=year or (p[4] if p else ''), project=proj,
                          alt=alt, state=state, w=w, h=h, ratio=round(w / h, 4),
                          color=hexc, hue=hue, light=light, sat=sat, **({'studio': True} if studio else {})))
    shutil.copy(os.path.join(SITE, 'freeman-eagle.svg'), os.path.join(OUT, 'freeman-eagle.svg'))
    works.insert(next(i for i, w in enumerate(works) if w['id'] == 'freeman-web'),
                 dict(id='freeman-eagle', title='Eagle mark', detail='Identity', discipline='Identity', year='2023',
                      project='freeman', alt='Original Freeman eagle identity mark', state='', w=1080, h=338, ratio=3.1953,
                      color='#2b2b2b', hue=0, light=0.17, sat=0, src='freeman-eagle.svg'))
    projects = [dict(id=a, n=b, title=c, short=SHORT.get(a, c), role=d, year=e, discipline=f, link=g,
                     works=[w['id'] for w in works if w['project'] == a]) for a, b, c, d, e, f, g in PROJECTS]
    with open(os.path.join(OUT, 'catalogue.js'), 'w') as fh:
        fh.write('/* Generated by tools/build_media.py from the repository\'s own images. */\n')
        fh.write('window.CATALOGUE=' + json.dumps({'projects': projects, 'works': works}, ensure_ascii=False, indent=0) + ';\n')
    print(len(works), 'works,', len(projects), 'projects')

main()

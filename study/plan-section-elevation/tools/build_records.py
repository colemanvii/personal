"""Build the archive records for the Plan / Section / Elevation study.

Every field carries a status, so the record never presents a guess as a fact:
  v  verified        stated in a named source in this repository
  i  inferred        derived from a source, but not stated for this work (e.g. a project's year)
  p  study label     a working label assigned for the study, not Cole's
  x  interpretation  a reading of the images by Claude, unconfirmed by Cole
  m  missing         not recorded anywhere available to the study

Sources are the live site's own files. Nothing is invented: no dates, provenance,
collectors or relationships beyond what the sources state; interpretations are
labelled as such. Images are referenced from ../next-chapter/media (one media set).

  python3 study/plan-section-elevation/tools/build_records.py
"""
import json, os, re

ROOT = os.getcwd()
CAT = os.path.join(ROOT, 'study/next-chapter/media/catalogue.js')
OUT = os.path.join(ROOT, 'study/plan-section-elevation/data/records.js')

IDX = 'site/index/index.html (Index row)'
PAN = 'site/index/index.html (project panel)'
PAR = 'site/index/paintings-archive.js'
PAV = 'site/paintings/index.html'

cat = json.loads(open(CAT).read().split('=', 1)[1].rstrip(';\n'))
P = {p['id']: p for p in cat['projects']}

LAYER = {'Painting': 'Painting', 'Drawing': 'Drawing', 'Photography': 'Photography',
         'Record art': 'Design', 'Illustration': 'Design', 'Identity': 'Design', 'Web': 'Design',
         'Music': 'Music', 'Film': 'Film'}

# Titles the study gave to untitled photographs (the site numbers them only within a panel).
STUDY_TITLES = {'ronnie-1', 'ronnie-2', 'ronnie-3', 'ronnie-4', 'teton-1', 'teton-2', 'teton-3', 'pbr-portrait',
                'pbr-bull', 'kc-portrait-1', 'kc-portrait-2', 'kc-live', 'studio', 'tops', 'scout-1', 'scout-2',
                'freeman-web', 'habitat', 'mags', 'jm-cowboy'}
# Images shown on the site whose maker the site does not state.
AUTHOR_UNSTATED = {'kc-portrait-1': 'Shown in the Kashus Culpepper panel; photographer not credited',
                   'kc-portrait-2': 'Shown in the Kashus Culpepper panel; photographer not credited',
                   'kc-live': 'Shown in the Kashus Culpepper panel; photographer not credited',
                   'pbr-portrait': 'Index lists PBR as "Client"; the photographer is not stated',
                   'pbr-bull': 'Index lists PBR as "Client"; the photographer is not stated',
                   'studio': 'Cole appears in the photograph; the photographer is not stated',
                   'tops': 'Unfiled image in retired/assets; no credit recorded'}
# Year printed on a panel caption for this exact image.
CAPTION_YEAR = {'freeman-eagle': ('2023', PAN + ': "IDENTITY / EAGLE MARK / 2023"')}

# Readings of the images by Claude (8 Nov 2026). Unconfirmed; shown as interpretation only.
MOTIFS = {
    'bison': ['bison-study', 'zen-buffalo', 'purple-haze', 'cowboyer-1', 'studio'],
    'riders': ['jm-cowboy', 'cowboyer-3', 'cowboyer-2', 'martin-survives', 'dont-call-it-luck', 'hatmaker',
               'teton-1', 'western-sketchbook-1', 'ronnie-1', 'ronnie-2', 'scout-2'],
    'flowers': ['flowers-in-a-jug', 'flowers-mccarty', 'peace-of-wild-things', 'harvest-1', 'mags'],
    'vehicles': ['fj40', 'scout-painting', 'scout-1', 'scout-2', 'teton-3'],
    'faces': ['lewis-grizzard', 'broadcast-portrait', 'portrait-study', 'kc-portrait-1', 'mags', 'ronnie-3',
              'pbr-portrait', 'sketchbook-5'],
    'guitars': ['pour-me-out', 'who-hurt-you', 'kc-portrait-1', 'kc-portrait-2', 'kc-live'],
}

def f(v, st, src=''):
    return {'v': v, 's': st, 'src': src}

def size_of(detail):
    m = re.search(r'(\d+)\s*×\s*(\d+)\s*in', detail)
    return [int(m.group(1)), int(m.group(2))] if m else None

records = []
counters = {}
for w in cat['works']:
    p = P.get(w['project'])
    pn = p['n'] if p else '000'
    counters[pn] = counters.get(pn, 0) + 1
    no = f"{pn}.{counters[pn]:02d}"
    wid = w['id']
    painting = w['discipline'] == 'Painting'
    src_main = (PAV if w.get('state') == 'available' else PAR) if painting else PAN

    title = f(w['title'], 'p' if wid in STUDY_TITLES else 'v',
              'Numbered for this study; no title recorded' if wid in STUDY_TITLES else src_main)
    if wid in CAPTION_YEAR:
        year = f(CAPTION_YEAR[wid][0], 'v', CAPTION_YEAR[wid][1])
    elif painting or w['project'] in ('drawings', 'studio', 'unfiled'):
        year = f('', 'm', 'No date recorded for this work')
    else:
        year = f(p['year'][:4], 'i', f"{IDX}: project {p['n']} {p['title']}, {p['year']}")

    sz = size_of(w['detail'])
    if painting:
        medium = f(w['detail'].split(' · ')[0], 'v', src_main)
        size = f(f"{sz[0]} × {sz[1]} in.", 'v', src_main)
    elif w['discipline'] == 'Drawing':
        medium = f('', 'm', 'Medium not recorded (the site says "Drawings / Independent work")')
        size = f('', 'm', 'Sheet size not recorded')
    elif w['discipline'] == 'Photography':
        medium = f('Photograph', 'i', 'Index role: ' + (p['role'] if p else 'none'))
        size = f('', 'm', 'Not a sized object; no print size recorded')
    else:
        medium = f(w['detail'], 'i', 'Index role: ' + (p['role'] if p else ''))
        size = f('', 'm', 'No dimensions recorded')

    if wid in AUTHOR_UNSTATED:
        author = f('', 'm', AUTHOR_UNSTATED[wid])
    elif p and w['project'] not in ('paintings', 'drawings'):
        author = f('Cole Calfee · ' + p['role'], 'v', f"{IDX}: {p['title']}, \"{p['role']}\"")
    else:
        author = f('Cole Calfee', 'v', IDX + ': ' + ('Paintings, "Original works"' if painting else 'Drawings, "Independent work"'))

    if w.get('state') == 'sold':
        status = f('Sold', 'v', PAR + ' ("Sold paintings")')
    elif w.get('state') == 'available':
        status = f('Available (live Shopify state, read 7 Nov 2026)', 'v', PAV)
    else:
        status = f('', 'm', 'Not recorded')
    location = f('', 'm', 'Not recorded. Collector information is never inferred.') if painting else None

    rec = dict(id=wid, no=no, layer=LAYER[w['discipline']], discipline=w['discipline'],
               project=w['project'], projectTitle=p['title'] if p else ('Studio' if w['project'] == 'studio' else 'Unfiled'),
               projectNo=pn, client=bool(p and w['project'] not in ('paintings', 'drawings')),
               title=title, year=year, medium=medium, size=size, sizeIn=sz if painting else None,
               author=author, status=status, location=location,
               original=f('', 'm', 'Tangerine reference not linked yet'),
               image=f"{'l'}/{wid}.webp" if not w.get('src') else w['src'], studio=bool(w.get('studio')),
               ratio=w['ratio'], color=w['color'], hue=w['hue'], sat=w['sat'], light=w['light'], alt=w['alt'],
               motifs=[m for m, ids in MOTIFS.items() if wid in ids])
    records.append(rec)

# Index entries with no image in the repository: kept as records so the archive is complete.
for pid in ('lastmovie', 'callahan', 'weir', 'perle', 'bygone', 'musee', 'verygently', 'gossett'):
    p = P[pid]
    disc = {'lastmovie': 'Film', 'callahan': 'Music', 'weir': 'Painting', 'verygently': 'Photography',
            'gossett': 'Record art'}.get(pid, 'Illustration')
    records.append(dict(id=pid, no=p['n'] + '.—', layer=LAYER[disc], discipline=disc, project=pid,
                        projectTitle=p['title'], projectNo=p['n'], client=True,
                        title=f(p['title'], 'v', IDX), year=f(p['year'][:4], 'v', IDX + ': ' + p['year']),
                        medium=f(p['role'], 'v', IDX + ' (role)'), size=f('', 'm', 'Not applicable or not recorded'),
                        sizeIn=None, author=f('Cole Calfee · ' + p['role'], 'v', IDX), status=f('', 'm', 'Not recorded'),
                        location=None, original=f('', 'm', 'No image or file in the repository'),
                        image=None, studio=False, ratio=1, color='#d9d7d1', hue=0, sat=0, light=.85,
                        alt='', link=p['link'], motifs=[]))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as fh:
    fh.write('/* Generated by tools/build_records.py. Each field: v value, s status (v verified, i inferred, '
             'p study label, x interpretation, m missing), src source. */\n')
    fh.write('window.RECORDS=' + json.dumps(records, ensure_ascii=False) + ';\n')
    fh.write('window.MOTIFS=' + json.dumps({k: {'ids': v, 's': 'x', 'src': 'Reading of the images by Claude, 8 Nov 2026. Unconfirmed.'} for k, v in MOTIFS.items()}) + ';\n')
print(len(records), 'records')
from collections import Counter
for k in ('title', 'year', 'medium', 'size', 'author', 'status'):
    print(k, dict(Counter(r[k]['s'] for r in records)))

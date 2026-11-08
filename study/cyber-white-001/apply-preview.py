#!/usr/bin/env python3
"""Cyber White 001 — wire the study into a *preview branch's* deployed folder.

    python3 apply-preview.py <deployed-dir> <overlay-dir>

Copies cw*.js / cw*.css from <overlay-dir> to <deployed-dir>/cyber-white/ and adds one line,
<script src="/cyber-white/cw.js"></script>, before </head> of every page. Without ?cw=a|b|c
the loader returns immediately, so every page renders exactly as production.

Run only on study branches (colecalfee.com: claude/funny-ptolemy-0h5cr9 → site/;
freemangc.com: study/cyber-white-001 → v5/). Production deploys from main (Cole) and
release/approved-v5-2026-10-18 (Freeman); never merge this change into either.
"""
import os, shutil, sys

LINE = '<script src="/cyber-white/cw.js"></script>'
SKIP = {'photographs.html', 'team-os.html'}  # private pages: leave untouched

dst, src = sys.argv[1], sys.argv[2]
cw = os.path.join(dst, 'cyber-white')
os.makedirs(cw, exist_ok=True)
for f in os.listdir(src):
    if f.startswith('cw') and f.endswith(('.js', '.css')):
        shutil.copy2(os.path.join(src, f), os.path.join(cw, f))
for v in 'abc':
    p = os.path.join(cw, 'cw-%s.js' % v)
    if not os.path.exists(p):
        open(p, 'w').write('/* no script for this direction */\n')
n = 0
for d, dirs, files in os.walk(dst):
    dirs[:] = [x for x in dirs if x not in ('cyber-white',) and not x.startswith(('.', '_'))]
    for f in files:
        if not f.endswith('.html') or f in SKIP:
            continue
        p = os.path.join(d, f)
        t = open(p, encoding='utf-8').read()
        if LINE in t or '</head>' not in t:
            continue
        open(p, 'w', encoding='utf-8').write(t.replace('</head>', LINE + '</head>', 1))
        n += 1
print('wired', n, 'pages in', dst)

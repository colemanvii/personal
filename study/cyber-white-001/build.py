#!/usr/bin/env python3
"""Cyber White 001 — build the comparative showroom bundle.

    python3 study/cyber-white-001/build.py --freeman ../freeman --out <dir>

Copies the production source of both sites (colecalfee.com: `site/` on main;
freemangc.com: `v5/` on release/approved-v5-2026-10-18) into one static folder,
then adds the study overlays. Production files in either repository are never edited:
the copies gain one <script> line (the variant loader) and root-absolute URLs are made
relative so both sites can live side by side under one preview host.

Output:
  index.html, showroom.*      the comparison interface
  shots/                      Playwright captures (capture.cjs writes them)
  cole/                       colecalfee.com + cole/cyber-white/ overlays
  freeman/                    freemangc.com V5 + freeman/cyber-white/ overlays
"""
import argparse, os, re, shutil, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
PERSONAL = os.path.abspath(os.path.join(HERE, '..', '..'))
TEXT = ('.html', '.css', '.js', '.svg', '.txt', '.xml', '.json')
IMG = ('.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg', '.pbm', '.woff2')
# Private or operational pages that a design study has no business copying.
FREEMAN_SKIP = {'photographs.html', 'team-os.html', '_headers',
                '_redirects', 'robots.txt', 'sitemap.xml', 'portal-identity.css'}


def rel_prefix(rel_file):
    depth = rel_file.count('/')
    return '../' * depth


def referenced(src_root):
    """Lower-cased basenames of image files that some text file mentions (plain or URL-encoded)."""
    blob = []
    for d, _, files in os.walk(src_root):
        for f in files:
            if f.lower().endswith(TEXT):
                blob.append(open(os.path.join(d, f), encoding='utf-8', errors='ignore').read())
    blob = '\n'.join(blob).lower()
    refs = set()
    for d, _, files in os.walk(src_root):
        for f in files:
            n = f.lower()
            if n in blob or urllib.parse.quote(f).lower() in blob:
                refs.add(n)
    return refs


def copy_site(src, dst, skip=set(), loader_dir='cyber-white'):
    refs = referenced(src)
    for d, dirs, files in os.walk(src):
        dirs[:] = [x for x in dirs if not x.startswith('.') and x not in ('functions', 'cyber-white')]
        for f in files:
            if f in skip:
                continue
            sp = os.path.join(d, f)
            rel = os.path.relpath(sp, src).replace(os.sep, '/')
            low = f.lower()
            if low.endswith(IMG) and not low.endswith('.svg') and low not in refs:
                continue  # unreferenced original (retired material)
            dp = os.path.join(dst, rel)
            os.makedirs(os.path.dirname(dp), exist_ok=True)
            if low.endswith(TEXT):
                t = open(sp, encoding='utf-8').read()
                # A preview branch already carries the root-absolute loader line; the bundle adds its own.
                t = t.replace('<script src="/cyber-white/cw.js"></script>', '')
                pre = rel_prefix(rel) if low.endswith('.html') else None
                if low.endswith(('.html', '.js', '.css')):
                    # JS/CSS resolve against the page (JS) or the sheet (CSS); every Cole/Freeman
                    # script is used by pages at one depth, which html_prefix_for() records.
                    p = pre if pre is not None else html_prefix_for(src, rel)
                    t = re.sub(r'''(["'`(]|url\()/(?=[A-Za-z_])''', lambda m: m.group(1) + (p or './'), t)
                    # A bare root: href="/" and location.assign('/') mean the home page; '/' + key builds a path.
                    t = re.sub(r'''href=(["'])/\1''', lambda m: 'href=' + m.group(1) + (p or '') + 'index.html' + m.group(1), t)
                    t = re.sub(r'''(location\.(?:assign|replace)\()(["'])/\2\)''', lambda m: m.group(1) + m.group(2) + (p or '') + 'index.html' + m.group(2) + ')', t)
                    t = re.sub(r'''(["'])/\1(\s*\+)''', lambda m: m.group(1) + (p or './') + m.group(1) + m.group(2), t)
                if low.endswith('.html'):
                    inject = ('<script src="%s%s/cw.js"></script>'
                              '<script src="%s../preview-host.js" defer></script>') % (pre, loader_dir, pre)
                    t = t.replace('</head>', inject + '</head>', 1) if '</head>' in t else inject + t
                open(dp, 'w', encoding='utf-8').write(t)
            else:
                shutil.copy2(sp, dp)


_used_by = {}


def html_prefix_for(src, rel):
    """Depth of the pages that load a given JS/CSS file (CSS url() resolves to the sheet, so
    stylesheets use their own depth)."""
    if rel.endswith('.css'):
        return rel_prefix(rel)
    if src not in _used_by:
        m = {}
        for d, _, files in os.walk(src):
            for f in files:
                if f.endswith('.html'):
                    r = os.path.relpath(os.path.join(d, f), src).replace(os.sep, '/')
                    t = open(os.path.join(d, f), encoding='utf-8', errors='ignore').read()
                    for s in re.findall(r'src="([^"?]+\.js)', t):
                        m.setdefault(os.path.basename(s), rel_prefix(r))
        _used_by[src] = m
    return _used_by[src].get(os.path.basename(rel), rel_prefix(rel))


def overlay(src_dir, dst_dir):
    os.makedirs(dst_dir, exist_ok=True)
    for f in os.listdir(src_dir):
        if f.startswith('cw') and f.endswith(('.js', '.css')):
            shutil.copy2(os.path.join(src_dir, f), os.path.join(dst_dir, f))
    for v in 'abc':  # the loader always asks for both files
        p = os.path.join(dst_dir, 'cw-%s.js' % v)
        if not os.path.exists(p):
            open(p, 'w').write('/* no script for this direction */\n')


def localize(root):
    """Preview hosts such as claude.ai artifacts allow no third-party images. Copy every
    cdn.shopify.com image the Cole pages reference into _remote/ and point the copies at it."""
    import hashlib, urllib.request, html as H
    os.makedirs(os.path.join(root, '_remote'), exist_ok=True)
    pat = re.compile(r'https://cdn\.shopify\.com/[^"\'\s,)]+')
    for d, _, files in os.walk(root):
        for f in files:
            if not f.endswith(('.html', '.js')):
                continue
            p = os.path.join(d, f)
            t = open(p, encoding='utf-8').read()
            urls = set(pat.findall(t))
            if not urls:
                continue
            pre = '../' * os.path.relpath(p, root).count('/')
            for u in urls:
                real = H.unescape(u)
                name = hashlib.sha1(real.encode()).hexdigest()[:16] + '.jpg'
                dst = os.path.join(root, '_remote', name)
                if not os.path.exists(dst):
                    try:
                        urllib.request.urlretrieve(real, dst)
                    except Exception as e:
                        print('skip', real, e); continue
                t = t.replace(u, pre + '_remote/' + name)
            open(p, 'w', encoding='utf-8').write(t)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--freeman', required=True, help='checkout of colemanvii/freeman (study branch)')
    ap.add_argument('--out', required=True)
    ap.add_argument('--localize', action='store_true',
                    help='copy cdn.shopify.com images into the bundle (hosts whose CSP blocks third-party images)')
    a = ap.parse_args()
    out = os.path.abspath(a.out)
    for sub in ('cole', 'freeman'):
        shutil.rmtree(os.path.join(out, sub), ignore_errors=True)
    os.makedirs(out, exist_ok=True)
    copy_site(os.path.join(PERSONAL, 'site'), os.path.join(out, 'cole'))
    if a.localize:
        localize(os.path.join(out, 'cole'))
    overlay(os.path.join(HERE, 'cole'), os.path.join(out, 'cole', 'cyber-white'))
    fm = os.path.abspath(a.freeman)
    copy_site(os.path.join(fm, 'v5'), os.path.join(out, 'freeman'), skip=FREEMAN_SKIP)
    overlay(os.path.join(fm, 'study', 'cyber-white-001'), os.path.join(out, 'freeman', 'cyber-white'))
    shutil.copy2(os.path.join(HERE, 'preview-host.js'), os.path.join(out, 'preview-host.js'))
    for f in os.listdir(os.path.join(HERE, 'showroom')):
        shutil.copy2(os.path.join(HERE, 'showroom', f), os.path.join(out, f))
    print('built', out)


if __name__ == '__main__':
    main()

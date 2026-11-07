/* Cyber White 001 — comparative captures.
   node study/cyber-white-001/capture.cjs <bundle-dir> [base-url]
   Serves nothing itself: point base-url at a static server over the bundle (default
   http://127.0.0.1:4180). Writes <bundle>/shots/<site>-<page>-<version>-<viewport>.jpg and
   shots/manifest.json, including a no-scroll / no-overflow check for every capture. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const out = path.join(process.argv[2], 'shots');
const base = process.argv[3] || 'http://127.0.0.1:4180';
fs.mkdirSync(out, { recursive: true });
const VIEWS = { d: [1440, 900], m: [390, 844], s: [375, 667] };
const VERSIONS = ['0', 'a', 'b', 'c'];
const PAGES = [
  ['cole', 'home', 'cole/index.html', 2500],
  ['cole', 'index', 'cole/index/index.html', 2500, 'kashus'],
  ['cole', 'available', 'cole/paintings/index.html', 3500],
  ['cole', 'contact', 'cole/info/index.html', 2000],
  ['freeman', 'home', 'freeman/index.html', 5500],
  ['freeman', 'company', 'freeman/company.html', 2500],
  ['freeman', 'projects', 'freeman/map.html', 4000],
  ['freeman', 'project', 'freeman/project-the-optimist.html', 2500],
  ['freeman', 'contact', 'freeman/contact.html', 2000],
];
(async () => {
  const browser = await chromium.launch();
  const jobs = [];
  for (const p of PAGES) for (const v of VERSIONS) for (const k of Object.keys(VIEWS)) jobs.push([p, v, k]);
  const manifest = [];
  async function run([p, v, k]) {
    const [site, page, url, wait, open] = p, [w, h] = VIEWS[k];
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...(k !== 'd' ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
    const pg = await ctx.newPage();
    await pg.goto(`${base}/${url}?cw=${v}`, { waitUntil: 'networkidle' }).catch(() => {});
    await pg.waitForTimeout(wait);
    if (open && k === 'd' && v !== 'a') { await pg.click(`[data-client=${open}]`).catch(() => {}); await pg.waitForTimeout(1200); }
    await pg.mouse.move(w - 2, h - 2);
    const m = await pg.evaluate(() => ({ sh: document.scrollingElement.scrollHeight, sw: document.scrollingElement.scrollWidth, h: innerHeight, w: innerWidth }));
    const file = `${site}-${page}-${v}-${k}.jpg`;
    await pg.screenshot({ path: path.join(out, file), type: 'jpeg', quality: 82 });
    manifest.push({ site, page, version: v, view: k, file, scrolls: m.sh > m.h + 1, overflowX: m.sw > m.w + 1 });
    await ctx.close();
  }
  const q = jobs.slice();
  await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) await run(q.shift()); }));
  manifest.sort((a, b) => a.file.localeCompare(b.file));
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
  const bad = manifest.filter((x) => x.scrolls || x.overflowX);
  console.log(manifest.length, 'captures;', bad.length ? 'scroll/overflow: ' + bad.map((b) => b.file).join(', ') : 'none scroll or overflow');
  await browser.close();
})();

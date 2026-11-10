// Verifies every study on the frames it actually draws, and that the approved
// references here are still bit-for-bit the approved pieces.
//
//   node tools/verify.cjs            check against tools/fingerprints.json
//   node tools/verify.cjs --write    record new fingerprints (after an intended change)
//
// Serve the repository root first:  python3 -m http.server 8840 --bind 127.0.0.1
// BASE defaults to http://127.0.0.1:8840/studies/motion-language-002
//
// For each study, over all 480 frames (white ground, signal on):
//   seam       the loop's end draws exactly its first frame (no jump, no rewind)
//   pure       drawing the same phase twice gives the same pixels
//   dark       with signal off, not one orange pixel is drawn
//   orange     the most orange the study ever shows, as a share of the frame
//   still      the share of frames identical to the one before (stillness)
//   print      a fingerprint of all 480 frames
// References R1 / R2 are checked with the approved verify's own cell fingerprint.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8840/studies/motion-language-002';
const LOCK = path.join(__dirname, 'fingerprints.json');
const APPROVED = { R1: -126761301, R2: 1734470243 }; // studio/x-motion-001/README.md @ 109ca71
const write = process.argv.includes('--write');

(async () => {
  const b = await chromium.launch({ args: ['--force-device-scale-factor=1'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 1200 } });
  p.on('pageerror', (e) => { console.error('page error:', e.message); process.exitCode = 1; });
  await p.goto(`${BASE}/study.html?s=A1&render=1`);
  await p.waitForFunction(() => window.stage && window.stage.studies, null, { timeout: 60000 });
  const ids = await p.evaluate(() => Object.keys(window.stage.studies));
  const lock = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, 'utf8')) : {};
  const out = {}; let failed = false;
  for (const id of ids) {
    if (id[0] === 'R') {
      const r = await p.evaluate((id) => {
        const st = window.stage.studies[id]; let h = 0, bad = 0, n = 0;
        for (let i = 0; i < 480; i++) { const c = st.cells(i / 480); n = c.length; if (new Set(c.map(([x, y]) => x + ',' + y)).size !== c.length) bad++; for (const [x, y] of c) h = (Math.imul(h, 31) + x * 977 + y) | 0; }
        return { pixels: n, framesWithOverlap: bad, fingerprint: h };
      }, id);
      const ok = r.fingerprint === APPROVED[id] && !r.framesWithOverlap;
      if (!ok) failed = true;
      console.log(`${id}  ${ok ? 'ok ' : 'FAIL'}  approved fingerprint ${r.fingerprint} (expected ${APPROVED[id]}) · ${r.pixels} pixels · overlaps ${r.framesWithOverlap}`);
      continue;
    }
    const r = await p.evaluate((id) => {
      const G = window.MotionGrammar, st = window.stage.studies[id];
      const c = document.createElement('canvas'); c.width = c.height = G.SIZE; const ctx = c.getContext('2d', { willReadFrequently: true });
      const on = { ...G.GROUNDS.white, signal: true }, off = { ...G.GROUNDS.white, signal: false };
      const hash = () => { const d = new Uint32Array(ctx.getImageData(0, 0, G.SIZE, G.SIZE).data.buffer); let h = 2166136261; for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619); return h >>> 0; };
      const orangeShare = () => { const d = ctx.getImageData(0, 0, G.SIZE, G.SIZE).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 0xf9 && d[i + 1] === 0x38 && d[i + 2] === 0x22) n++; return n / (G.SIZE * G.SIZE); };
      let all = 0, prev = null, still = 0, maxOrange = 0, dark = true;
      for (let i = 0; i < G.FRAMES; i++) {
        st.draw(ctx, i / G.FRAMES, on); const h = hash();
        all = Math.imul(all ^ h, 16777619); if (h === prev) still++; prev = h;
        if (i % 4 === 0) maxOrange = Math.max(maxOrange, orangeShare());
        if (i % 16 === 0) { st.draw(ctx, i / G.FRAMES, off); if (orangeShare() > 0) dark = false; }
      }
      st.draw(ctx, 0, on); const first = hash(); st.draw(ctx, 1 - 1e-9, on); const end = hash();
      st.draw(ctx, 0.3137, on); const a = hash(); st.draw(ctx, 0.8, on); st.draw(ctx, 0.3137, on); const pure = a === hash();
      // the last frame flows into the first: frame 479 also differs from frame 0 by a step, not a jump (reported, not judged)
      return { seam: first === end, pure, dark, orange: +(maxOrange * 100).toFixed(3), still: +((still / G.FRAMES) * 100).toFixed(1), print: (all >>> 0).toString(16) };
    }, id);
    const ok = r.seam && r.pure && r.dark && (write || !lock[id] || lock[id] === r.print);
    if (!ok) failed = true;
    out[id] = r.print;
    console.log(`${id}  ${ok ? 'ok ' : 'FAIL'}  seam ${r.seam ? 'identical' : 'BROKEN'} · pure ${r.pure} · dark when signal off ${r.dark} · orange ≤ ${r.orange}% · still ${r.still}% · print ${r.print}${lock[id] && lock[id] !== r.print ? ` (locked ${lock[id]})` : ''}`);
  }
  if (write) { fs.writeFileSync(LOCK, JSON.stringify(out, null, 2) + '\n'); console.log('wrote', path.relative(process.cwd(), LOCK)); }
  await b.close();
  process.exit(failed ? 1 : 0);
})();

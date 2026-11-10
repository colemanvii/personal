// Frame-exact renders from the same draw() the gallery uses, encoded with ffmpeg.
//
//   node tools/render.cjs A1 [A2 …]       one 1080 × 1080, 8.00 s, 60 fps MP4 per study → out/<id>.mp4
//   node tools/render.cjs --film          the synchronized comparison: every study on one clock → out/comparison.mp4
//   node tools/render.cjs --stills        one PNG per study at its most legible moment → shots/ (committed)
//
// Options (env): GROUND=white|ivory  SIGNAL=0  CRF=14
// Serve the repository root first:  python3 -m http.server 8840 --bind 127.0.0.1
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process'), os = require('os');
const BASE = process.env.BASE || 'http://127.0.0.1:8840/studies/motion-language-002';
const OUT = path.join(__dirname, '..', 'out');
const ground = process.env.GROUND || 'white', signal = process.env.SIGNAL !== '0', crf = process.env.CRF || '14';
const args = process.argv.slice(2);

// one representative moment per study for stills (seconds)
const STILL = { R1: 5.0, R2: 5.0, A1: 5.0, A2: 3.1, A3: 2.05, O1: 2.4, O2: 1.0, O3: 2.0, P1: 2.1, P2: 2.4, P3: 2.65, S1: 2.0, S2: 2.0, S3: 2.6 };

async function frames(p, dir, n, draw) {
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < n; i++) {
    const data = await p.evaluate(draw, i);
    fs.writeFileSync(path.join(dir, String(i).padStart(4, '0') + '.png'), Buffer.from(data.split(',')[1], 'base64'));
  }
}
const encode = (dir, file) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(dir, '%04d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file]);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--force-device-scale-factor=1', '--font-render-hinting=none'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.error('page error:', e.message));
  await p.goto(`${BASE}/study.html?s=A1&render=1`);
  await p.waitForFunction(() => window.stage && window.stage.studies, null, { timeout: 60000 });
  await p.evaluate(([ground, signal]) => { window.__env = { ...window.MotionGrammar.GROUNDS[ground], signal }; }, [ground, signal]);

  if (args.includes('--stills')) {
    const dir = path.join(__dirname, '..', 'shots'); fs.mkdirSync(dir, { recursive: true });
    for (const [id, t] of Object.entries(STILL)) {
      const data = await p.evaluate(([id, t]) => { const c = document.createElement('canvas'); c.width = c.height = 1080; window.stage.at(id, t / 8, c.getContext('2d'), window.__env); return c.toDataURL('image/png'); }, [id, t]);
      fs.writeFileSync(path.join(dir, `${id}.png`), Buffer.from(data.split(',')[1], 'base64'));
    }
    console.log('stills →', path.relative(process.cwd(), dir));
  }

  if (args.includes('--film')) {
    // 3 columns × 5 rows: the approved references, then one row per behaviour
    const ROWS = [['R1', 'R2', null], ['A1', 'A2', 'A3'], ['O1', 'O2', 'O3'], ['P1', 'P2', 'P3'], ['S1', 'S2', 'S3']];
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ml002-film-'));
    await p.evaluate((ROWS) => {
      const CELL = 400, GUT = 32, LAB = 30, TOP = 64, W = 3 * CELL + 4 * GUT, H = TOP + ROWS.length * (CELL + LAB + GUT) + GUT;
      const c = document.createElement('canvas'); c.width = W; c.height = H + (H % 2); document.body.append(c);
      const off = document.createElement('canvas'); off.width = off.height = 1080;
      window.__film = (i) => {
        const e = window.__env, ctx = c.getContext('2d'), st = window.stage.studies;
        ctx.fillStyle = e.paper; ctx.fillRect(0, 0, c.width, c.height);
        ctx.font = '13px Monaco, "DejaVu Sans Mono", monospace'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = e.ink;
        ctx.fillText('MATERIAL — MOTION LANGUAGE STUDY 002', GUT, 38);
        const s = (i / 60).toFixed(2).padStart(5, '0');
        ctx.fillStyle = e.muted; ctx.textAlign = 'right'; ctx.fillText(`${s} / 08.00 s · F ${String(i).padStart(3, '0')}`, W - GUT, 38); ctx.textAlign = 'left';
        ROWS.forEach((row, r) => row.forEach((id, k) => {
          if (!id) return;
          const x = GUT + k * (CELL + GUT), y = TOP + r * (CELL + LAB + GUT);
          st[id].draw(off.getContext('2d'), i / 480, e);
          ctx.imageSmoothingQuality = 'high'; ctx.drawImage(off, x, y, CELL, CELL);
          ctx.fillStyle = e.hair; ctx.fillRect(x, y, CELL, 1); ctx.fillRect(x, y + CELL - 1, CELL, 1); ctx.fillRect(x, y, 1, CELL); ctx.fillRect(x + CELL - 1, y, 1, CELL);
          ctx.fillStyle = '#f93822'; ctx.fillText(id, x, y + CELL + 20);
          ctx.fillStyle = e.ink; ctx.fillText(`${st[id].title.toUpperCase()}`, x + 34, y + CELL + 20);
          ctx.fillStyle = e.muted; ctx.textAlign = 'right'; ctx.fillText(`${st[id].project.toUpperCase()} · ${st[id].axis.toUpperCase()}`, x + CELL, y + CELL + 20); ctx.textAlign = 'left';
        }));
        return c.toDataURL('image/png');
      };
    }, ROWS);
    await frames(p, tmp, 480, (i) => window.__film(i));
    encode(tmp, path.join(OUT, 'comparison.mp4'));
    fs.rmSync(tmp, { recursive: true });
    console.log('film →', path.relative(process.cwd(), path.join(OUT, 'comparison.mp4')));
  }

  for (const id of args.filter((a) => !a.startsWith('--'))) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `ml002-${id}-`));
    await p.evaluate(() => { if (!window.__c) { window.__c = document.createElement('canvas'); window.__c.width = window.__c.height = 1080; } });
    await frames(p, tmp, 480, new Function('i', `window.stage.at(${JSON.stringify(id)}, i / 480, window.__c.getContext('2d'), window.__env); return window.__c.toDataURL('image/png');`));
    encode(tmp, path.join(OUT, `${id}.mp4`));
    fs.rmSync(tmp, { recursive: true });
    console.log(id, '→', path.relative(process.cwd(), path.join(OUT, `${id}.mp4`)));
  }
  await b.close();
})();

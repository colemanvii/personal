/* Freeman / X motion 001 — three loops, one idea each.
   Artwork is read from production, never redrawn:
     signature  ../../v5/pixel-mark.js   (160 x 61, read back from its finished frame)
     eagle      ../../v5/eagle/stamp.pbm (192 x 60, the approved Stamp)
   Every study is a pure function of loop phase: draw(ctx, p) with p in [0, 1).
   The same function drives the live player and the frame-exact MP4 render. */
(() => {
  'use strict';
  const SIZE = 1080;
  const PAPER = '#fff9f1', INK = '#332e20', ORANGE = '#f93822';
  const MONO = 'Monaco, Menlo, "DejaVu Sans Mono", monospace';

  // ---------- artwork ----------
  function signaturePixels() {
    const c = document.createElement('canvas'); c.width = 160; c.height = 61;
    const m = window.FreemanPixelMark.mount(c, { play: false }); m.destroy();
    const d = c.getContext('2d').getImageData(0, 0, 160, 61).data, out = [];
    for (let y = 0; y < 61; y++) for (let x = 0; x < 160; x++) if (d[(y * 160 + x) * 4 + 3]) out.push([x, y]);
    return out;
  }
  async function eagleBits() {
    const t = await (await fetch('../../v5/eagle/stamp.pbm')).text();
    const L = t.split('\n').filter((l) => l && !l.startsWith('#'));
    const [W, H] = L[1].split(/\s+/).map(Number);
    const bits = L.slice(2).join('').replace(/\s+/g, '');
    const g = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) g[i] = bits[i] === '1' ? 1 : 0;
    return { W, H, g };
  }

  const eaglePts = ({ W, H, g }) => { const out = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y * W + x]) out.push([x, y]); return out; };

  // ---------- easing ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const inOut = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2); // quintic
  const inOut3 = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
  const seg = (p, a, b) => clamp((p - a) / (b - a));

  // =====================================================================
  // 01  SUNDIAL — a drawing becomes a building when it casts a shadow.
  //     The signature stands 4 units proud of the ground. One polar day:
  //     the sun never sets, so the loop is a real orbit, not a rewind.
  // =====================================================================
  function sundial(sig) {
    const D = 8, U = 5, OX = 140, OY = 388, H = 4; // relief height in bitmap units
    const ink = new Set(sig.map(([x, y]) => y * 1000 + x));
    const key = (x, y) => (y + 500) * 1000 + (x + 500);
    return {
      D, name: 'Sundial',
      draw(ctx, p) {
        ctx.fillStyle = PAPER; ctx.fillRect(0, 0, SIZE, SIZE);
        // sun: compass azimuth (0 N, 90 E), clockwise; noon in the south, low midnight sun in the north
        const az = (p * 360 + 315) % 360, r = (d) => (d * Math.PI) / 180;
        const elev = 26 + 14 * Math.cos(r(az - 180));
        const L = H / Math.tan(r(elev));
        const b = r(az + 180), dx = Math.sin(b), dy = -Math.cos(b); // shadow bearing on screen
        const shade = new Set();
        for (const [x, y] of sig) for (let s = 0.25; s <= L; s += 0.25) {
          const sx = Math.round(x + dx * s), sy = Math.round(y + dy * s);
          if (!ink.has(sy * 1000 + sx)) shade.add(key(sx, sy));
        }
        ctx.fillStyle = INK;
        for (const k of shade) {
          const x = (k % 1000) - 500, y = Math.floor(k / 1000) - 500;
          if ((x + y) & 1) continue; // 50% checker, fixed to the ground
          ctx.fillRect(OX + x * U, OY + y * U, U, U);
        }
        for (const [x, y] of sig) ctx.fillRect(OX + x * U, OY + y * U, U, U);
        // the dial: 24 hour ticks where each bearing meets a square inset, and the sun on it
        const inset = 50, cx = SIZE / 2, half = cx - inset;
        const onSquare = (deg) => { const a = r(deg), vx = Math.sin(a), vy = -Math.cos(a), k = half / Math.max(Math.abs(vx), Math.abs(vy)); return [cx + vx * k, cx + vy * k]; };
        for (let h = 0; h < 24; h++) { const [x, y] = onSquare(h * 15); ctx.fillRect(Math.round(x - 2), Math.round(y - 2), 4, 4); }
        const [sx, sy] = onSquare(az);
        ctx.fillStyle = ORANGE; ctx.fillRect(Math.round(sx - U * 1.5), Math.round(sy - U * 1.5), U * 3, U * 3);
      },
    };
  }

  // =====================================================================
  // 02  MATERIAL — nothing added, nothing taken away.
  //     The signature is 2,278 pixels: exactly a 67 x 34 block.
  //     Rows move only sideways, then columns move only up and down:
  //     courses, then plumb. The halfway state is a woven band.
  // =====================================================================
  // ---------------------------------------------------------------------
  // 02  MATERIAL, round 2.
  //  - The woven midpoint is an ordered dither (the Bayer matrix, the 1-bit
  //    shading of early Macs): each column of the band is shaded exactly as
  //    dark as that column of the signature is heavy. The halfway state is
  //    the signature's own tone, not noise.
  //  - Every frame is a true bitmap: pixels move whole units on the grid and
  //    never share a cell, so all 2,278 are on screen in every frame.
  //  - One pixel is orange: the block's first cell in reading order becomes
  //    the signature's first pixel in writing order (the pen's start).
  //  - The way back runs in the same directions as the way out, so the loop
  //    keeps going forward instead of rewinding.
  // ---------------------------------------------------------------------
  // Round 3 (opts.round 3, the default): a held breath on the woven band, and
  // shortest-path balancing so the dither stays as close to pure Bayer as the
  // 67-per-row rule allows. Round 2 is kept as material(sig, { round: 2 }).
  // The rule is general: any 1-bit mark whose pixel count factors into a block
  // at least as tall as its heaviest column. opts: { round, U, BW, BH, label }.
  // Defaults are the signature (67 x 34 at 6 px).
  function material(sig, opts = {}) {
    const R = opts.round || 3;
    const D = 8, U = opts.U || 6;
    const BW = opts.BW || 67, BH = opts.BH || 34;
    const LABEL = opts.label || '2,278';
    if (BW * BH !== sig.length) throw new Error(`${sig.length} pixels is not ${BW} x ${BH}`);
    // centre the mark's ink on the frame, and the block on the mark's ink
    const xsAll = sig.map((p) => p[0]), ysAll = sig.map((p) => p[1]);
    const cx = (Math.min(...xsAll) + Math.max(...xsAll)) / 2, cy = (Math.min(...ysAll) + Math.max(...ysAll)) / 2;
    const OX = Math.round(SIZE / 2 - (cx + 0.5) * U), OY = Math.round(SIZE / 2 - (cy + 0.5) * U);
    const BX = Math.floor(cx - (BW - 1) / 2), BY = Math.floor(cy - (BH - 1) / 2);
    const cols = new Map();
    for (const [x, y] of sig) { if (!cols.has(x)) cols.set(x, []); cols.get(x).push(y); }
    const xs = [...cols.keys()].sort((a, b) => a - b);
    for (const x of xs) cols.get(x).sort((a, b) => a - b);
    // 8 x 8 Bayer threshold matrix
    const bayer = (n) => { let m = [[0]]; while (m.length < n) { const s = m.length, o = []; for (let y = 0; y < 2 * s; y++) { o.push([]); for (let x = 0; x < 2 * s; x++) o[y].push(4 * m[y % s][x % s] + [[0, 2], [3, 1]][(y / s) | 0][(x / s) | 0]); } m = o; } return m; };
    const B = bayer(8), th = (r, x) => B[r % 8][x % 8];
    // M[r] = set of columns row r carries in the band: per column, the c rows with the lowest threshold
    const M = Array.from({ length: BH }, () => new Set());
    for (const x of xs) {
      const order = [...Array(BH).keys()].sort((a, b) => th(a, x) - th(b, x) || a - b);
      for (const r of order.slice(0, cols.get(x).length)) M[r].add(x);
    }
    // the pen's first pixel starts at the block's first cell: row 0 must carry the first column
    const x0 = xs[0];
    if (!M[0].has(x0)) { const r = [...Array(BH).keys()].find((r) => M[r].has(x0)); M[r].delete(x0); M[0].add(x0); }
    if (R >= 3) {
      // Balance by shortest paths: move one pixel at a time from an over-full row to an
      // under-full row along the cheapest chain of in-column moves (Bellman-Ford over the
      // 34 rows). Starting from the per-column optimum, this keeps the total departure
      // from the pure Bayer pattern minimal, and spreads it instead of clumping it.
      const locked = (r, x) => r === 0 && x === x0;
      for (let guard = 0; guard < 5000; guard++) {
        const sums = M.map((m) => m.size);
        if (sums.every((v) => v === BW)) break;
        // edge a -> b: the cheapest column x that a has and b lacks
        const w = [], via = [];
        for (let a = 0; a < BH; a++) { w.push(new Array(BH).fill(Infinity)); via.push(new Array(BH).fill(-1));
          for (const x of M[a]) { if (locked(a, x)) continue; for (let b = 0; b < BH; b++) { if (b === a || M[b].has(x)) continue; const c = th(b, x) - th(a, x); if (c < w[a][b]) { w[a][b] = c; via[a][b] = x; } } } }
        const dist = sums.map((v) => (v > BW ? 0 : Infinity)), prev = new Array(BH).fill(-1);
        for (let it = 0; it < BH; it++) { let ch = false; for (let a = 0; a < BH; a++) { if (dist[a] === Infinity) continue; for (let b = 0; b < BH; b++) { if (w[a][b] === Infinity) continue; const d = dist[a] + w[a][b]; if (d < dist[b] - 1e-9) { dist[b] = d; prev[b] = a; ch = true; } } } if (!ch) break; }
        let u = -1; for (let b = 0; b < BH; b++) if (sums[b] < BW && dist[b] < Infinity && (u < 0 || dist[b] < dist[u])) u = b;
        const path = []; for (let b = u; prev[b] >= 0 && path.length < BH; b = prev[b]) path.unshift([prev[b], b]);
        let ok = path.length > 0;
        for (const [a, b] of path) { const x = via[a][b]; if (!M[a].has(x) || M[b].has(x)) { ok = false; break; } M[a].delete(x); M[b].add(x); }
        if (!ok) throw new Error('balance path failed');
      }
    } else {
      for (let guard = 0; guard < 20000; guard++) {
        const sums = M.map((m) => m.size);
        const o = sums.indexOf(Math.max(...sums)), u = sums.indexOf(Math.min(...sums));
        if (sums[o] === BW && sums[u] === BW) break;
        let best = null, cost = Infinity;
        for (const x of M[o]) { if (M[u].has(x) || (o === 0 && x === x0)) continue; const c = th(u, x) - th(o, x); if (c < cost) { cost = c; best = x; } }
        M[o].delete(best); M[u].add(best);
      }
    }
    if (M.some((m) => m.size !== BW)) throw new Error('band does not balance');
    const px = [];
    M.forEach((set, r) => [...set].sort((a, b) => a - b).forEach((x, k) => px.push({ r, k, x0: BX + k, x1: x, y0: BY + r, y1: 0 })));
    for (const x of xs) px.filter((q) => q.x1 === x).sort((a, b) => a.y0 - b.y0).forEach((q, i) => { q.y1 = cols.get(x)[i]; });
    const first = px.find((q) => q.r === 0 && q.k === 0);
    // seconds: block, courses, plumb, signature, plumb back, courses back
    // round 3 holds the woven band still for a breath on the way out (2.50-2.85 s) and a shorter one on the way back
    const T = R >= 3 ? { spread: [1.1, 2.5], raise: [2.85, 4.25], lower: [5.85, 6.85], gather: [7.05, 8.0] }
                     : { spread: [1.1, 2.5], raise: [2.5, 3.9], lower: [5.8, 6.9], gather: [6.9, 8.0] };
    const STAG = 0.4; // share of each phase spent on the stagger
    const rowE = (q, s, [a, b]) => { const span = b - a, d = span * (1 - STAG), o = (q.r / (BH - 1)) * span * STAG; return inOut(seg(s, a + o, a + o + d)); };
    const colE = (q, s, [a, b]) => { const span = b - a, d = span * (1 - STAG), o = ((q.x1 - xs[0]) / (xs[xs.length - 1] - xs[0])) * span * STAG; return inOut(seg(s, a + o, a + o + d)); };
    const cell = (q, s) => {
      let x, y;
      if (s < T.lower[0]) { x = q.x0 + (q.x1 - q.x0) * rowE(q, s, T.spread); y = q.y0 + (q.y1 - q.y0) * colE(q, s, T.raise); }
      else { y = q.y1 + (q.y0 - q.y1) * colE(q, s, T.lower); x = q.x1 + (q.x0 - q.x1) * rowE(q, s, T.gather); }
      return [Math.round(x), Math.round(y)];
    };
    return {
      D, name: opts.name || (R >= 3 ? 'Material' : 'Material (round 2)'),
      cells(p) { return px.map((q) => cell(q, p * D)); }, // for the conservation check
      draw(ctx, p) {
        const s = p * D;
        ctx.fillStyle = PAPER; ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.fillStyle = INK;
        for (const q of px) { if (q === first) continue; const [x, y] = cell(q, s); ctx.fillRect(OX + x * U, OY + y * U, U, U); }
        const [fx, fy] = cell(first, s);
        ctx.fillStyle = ORANGE; ctx.fillRect(OX + fx * U, OY + fy * U, U, U);
        ctx.fillStyle = INK; ctx.font = `20px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(LABEL, SIZE / 2, SIZE - 64);
      },
    };
  }

  function materialR1(sig) {
    const D = 8, U = 6, OX = 60, OY = 357;
    const BW = 67, BH = 34, BX = 46, BY = 13;
    // signature columns, top to bottom
    const cols = new Map();
    for (const [x, y] of sig) { if (!cols.has(x)) cols.set(x, []); cols.get(x).push(y); }
    const xs = [...cols.keys()].sort((a, b) => a - b);
    for (const x of xs) cols.get(x).sort((a, b) => a - b);
    // deal each column's pixels round-robin across the block's rows: every row receives exactly 67
    const rowTargets = Array.from({ length: BH }, () => []);
    let ptr = 0;
    for (const x of xs) for (let k = 0; k < cols.get(x).length; k++) { rowTargets[ptr].push(x); ptr = (ptr + 1) % BH; }
    if (rowTargets.some((r) => r.length !== BW)) throw new Error('block does not divide');
    // pixel records: block cell -> (woven column, same row) -> (same column, signature row)
    const px = [];
    rowTargets.forEach((targets, r) => { targets.sort((a, b) => a - b); targets.forEach((x, k) => px.push({ r, x0: BX + k, x1: x, y0: BY + r, y1: 0 })); });
    for (const x of xs) {
      const here = px.filter((q) => q.x1 === x).sort((a, b) => a.y0 - b.y0);
      here.forEach((q, i) => { q.y1 = cols.get(x)[i]; });
    }
    // timeline (seconds): hold block, spread rows, raise columns, hold signature, lower, gather
    const T = { spread: [1.0, 2.5], raise: [2.5, 4.0], lower: [5.7, 6.85], gather: [6.85, 8.0] };
    const rowStag = 0.55, colStag = 0.75;
    function rowE(q, s, a, b, rev) { const span = b - a, d = span - rowStag * span / 1.5; const o = (rev ? (BH - 1 - q.r) : q.r) / (BH - 1) * (span - d); return inOut(seg(s, a + o, a + o + d)); }
    function colE(q, s, a, b, rev) { const span = b - a, d = span - colStag * span / 1.5; const f = (q.x1 - 4) / 151; const o = (rev ? 1 - f : f) * (span - d); return inOut(seg(s, a + o, a + o + d)); }
    return {
      D, name: 'Material (round 1)',
      draw(ctx, p) {
        const s = p * D;
        ctx.fillStyle = PAPER; ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.fillStyle = INK;
        for (const q of px) {
          let x = q.x0, y = q.y0;
          if (s < T.lower[0]) {
            x = q.x0 + (q.x1 - q.x0) * rowE(q, s, ...T.spread, false);
            y = q.y0 + (q.y1 - q.y0) * colE(q, s, ...T.raise, false);
          } else {
            y = q.y1 + (q.y0 - q.y1) * colE(q, s, ...T.lower, true);
            x = q.x1 + (q.x0 - q.x1) * rowE(q, s, ...T.gather, true);
          }
          ctx.fillRect(Math.round(OX + x * U), Math.round(OY + y * U), U, U);
        }
        ctx.font = `20px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('2,278', SIZE / 2, SIZE - 64);
      },
    };
  }

  // =====================================================================
  // 03  PLUMB — level and plumb are the first two lines of any building;
  //     the weathervane is the last thing set on it. The eagle holds both:
  //     facing you it is level, turned to the wind it is plumb, and the
  //     vane becomes the crosshair.
  // =====================================================================
  function plumb(eagle) {
    const D = 8, U = 4, PIV = 95; // pivot = the Stamp's centre of mass (x 95.3)
    const { W, H, g } = eagle;
    const ROD = 538;                 // screen x of the rod column (left edge); 4 px wide
    const TOP = 260, CROSS = 540, BOT = 820, ARM = 280;
    const ex = (j) => ROD + j * U;   // dest unit column j relative to pivot
    // four quarter turns, each a damped swing then a rest
    const zeta = 0.66, wn = 6.8, wd = wn * Math.sqrt(1 - zeta * zeta);
    const step = (t) => (t <= 0 ? 0 : 1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * t)));
    function angle(s) {
      // s in seconds; turns start at 0.9, 2.9, 4.9, 6.9 ; frame 0 is the eagle at rest, facing
      let a = 0;
      for (let k = 0; k < 4; k++) a += 90 * step(s - (0.9 + 2 * k));
      // residual of the last turn wraps into the next loop
      a += 90 * (step(s + D - 6.9) - 1);
      return a;
    }
    return {
      D, name: 'Plumb',
      draw(ctx, p) {
        const s = p * D, th = (angle(s) * Math.PI) / 180, c = Math.cos(th);
        ctx.fillStyle = PAPER; ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.fillStyle = INK;
        // project the flat vane: OR every source column into the dest column it lands on
        const dest = new Map();
        for (let x = 0; x < W; x++) {
          const j = Math.round((x - PIV) * c);
          let col = dest.get(j); if (!col) dest.set(j, (col = new Uint8Array(H)));
          for (let y = 0; y < H; y++) if (g[y * W + x]) col[y] = 1;
        }
        for (const [j, col] of dest) for (let y = 0; y < H; y++) if (col[y]) ctx.fillRect(ex(j), TOP + y * U, U, U);
        // rod and arm
        ctx.fillRect(ROD, TOP + H * U, U, BOT - (TOP + H * U));
        ctx.fillRect(ROD + U / 2 - ARM, CROSS - U / 2, ARM * 2, U);
        ctx.fillStyle = ORANGE; ctx.fillRect(ROD + U / 2 - 3 * U / 2 - 2, CROSS - 3 * U / 2 - 2, 3 * U + 4, 3 * U + 4);
        ctx.fillStyle = INK; ctx.font = `22px ${MONO}`; ctx.textBaseline = 'middle';
        ctx.textAlign = 'right'; ctx.fillText('W', ROD + U / 2 - ARM - 18, CROSS + 1);
        ctx.textAlign = 'left'; ctx.fillText('E', ROD + U / 2 + ARM + 18, CROSS + 1);
      },
    };
  }

  window.FreemanMotion = {
    SIZE, PAPER, INK, ORANGE,
    async load() {
      const sig = signaturePixels(), eagle = await eagleBits();
      if (sig.length !== 2278) console.warn('signature pixel count', sig.length);
      const studies = { '01': sundial(sig), '02': material(sig), '03': plumb(eagle) };
      // variants and the eagle build on first use (balancing the eagle's 86 rows takes ~1.5 s)
      const lazy = {
        '02r1': () => materialR1(sig),
        '02r2': () => material(sig, { round: 2 }),
        // Material No. 2: the Stamp eagle. 4,472 pixels; its heaviest column holds 58, so the block
        // must be at least 58 tall: 52 x 86, a pillar where the signature is a brick.
        '04': () => material(eaglePts(eagle), { U: 5, BW: 52, BH: 86, label: '4,472', name: 'Material No. 2' }),
      };
      for (const [k, f] of Object.entries(lazy)) { let v; Object.defineProperty(studies, k, { enumerable: true, get: () => (v = v || f()) }); }
      return studies;
    },
  };
})();

/* MATERIAL — Motion Language Study 002 · grammar
   The shared rules every study is built from. Nothing here is decorative:
   each constant is either inherited from the approved Material No. 1 / No. 2
   (Freeman, study/x-motion-001 @ 109ca71) or is a rule this study proposes.

   Inherited from the approved work
     · 1080 × 1080, 8.00 s loop, 60 fps (480 frames), pure draw(ctx, p)
     · 1-bit cells: everything sits on a whole-cell grid, never sub-pixel
     · quintic in-out for mechanical travel; 40 % of a phase spent on stagger
     · damped swing (ζ 0.66, ωn 6.8) for things that settle physically (Plumb)
     · cubic ease-out for pixels arriving (the production pixel-mark, 1850 ms)
     · 8 × 8 ordered (Bayer) dither as the only way to make tone or light
     · one orange element: it is an annotation of state, never decoration
     · forward, not rewind: the way back continues in the direction of the way out
   Proposed here
     · the beat table (BEATS) — the approved Material timeline, named, so
       every behaviour starts, breathes and rests on the same counts
     · orange is light: it switches on through dither, never fades through alpha */
(() => {
  'use strict';
  const SIZE = 1080, D = 8, FPS = 60, FRAMES = D * FPS;
  const ORANGE = '#f93822';
  const GROUNDS = {
    // Architectural White 002 (Freeman, study/architectural-white-002-company-20261108)
    white: { paper: '#ffffff', ink: '#332e20', hair: '#dedbd4', muted: '#817d75' },
    // the approved Material ground
    ivory: { paper: '#fff9f1', ink: '#332e20', hair: '#e4ddd1', muted: '#777a75' },
  };

  // The approved Material No. 1 round-3 timeline, in seconds.
  //   hold 0–1.10 · out 1.10–2.50 · breath 2.50–2.85 · out 2.85–4.25 · hold 4.25–5.85
  //   back 5.85–6.85 · breath 6.85–7.05 · back 7.05–8.00
  const BEATS = { hold: 1.1, out1: [1.1, 2.5], breath: [2.5, 2.85], out2: [2.85, 4.25], back1: [5.85, 6.85], breath2: [6.85, 7.05], back2: [7.05, 8.0] };
  const STAG = 0.4;

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (s, a, b) => clamp((s - a) / (b - a));
  const inOut5 = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);
  const inOut3 = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
  const out3 = (t) => 1 - (1 - t) ** 3;
  // Plumb's damped swing: 0 → 1 with one soft overshoot, settled by ~0.9 s
  const ZETA = 0.66, WN = 6.8, WD = WN * Math.sqrt(1 - ZETA * ZETA);
  const swing = (t) => (t <= 0 ? 0 : 1 - Math.exp(-ZETA * WN * t) * (Math.cos(WD * t) + (ZETA / Math.sqrt(1 - ZETA * ZETA)) * Math.sin(WD * t)));
  // staggered phase: item i of n inside [a, b], 40 % of the span is stagger
  const stagger = (s, [a, b], f, ease = inOut5, share = STAG) => { const span = b - a, d = span * (1 - share), o = f * span * share; return ease(seg(s, a + o, a + o + d)); };
  // wrap s into [0, D)
  const wrap = (s, P = D) => ((s % P) + P) % P;

  // 8 × 8 Bayer threshold matrix, 0..63 (the approved construction)
  const BAYER = (() => { let m = [[0]]; while (m.length < 8) { const s = m.length, o = []; for (let y = 0; y < 2 * s; y++) { o.push([]); for (let x = 0; x < 2 * s; x++) o[y].push(4 * m[y % s][x % s] + [[0, 2], [3, 1]][(y / s) | 0][(x / s) | 0]); } m = o; } return m; })();
  const bayer = (x, y) => BAYER[((y % 8) + 8) % 8][((x % 8) + 8) % 8];
  // is cell (x, y) lit at level 0..1 ? Light has exactly the matrix's 65 levels:
  // anything under 1/64 is dark, so a fading lamp ends on a true zero.
  const lit = (x, y, level) => bayer(x, y) < Math.floor(level * 64 + 1e-9);

  // ---------- the cell grid ----------
  // A Grid is the only way a study touches the canvas: whole cells, three inks.
  function Grid(ctx, env, U, OX = 0, OY = 0) {
    const C = { ink: env.ink, orange: env.signal ? ORANGE : env.ink, paper: env.paper, hair: env.hair, muted: env.muted };
    let cur = null, K = null; // K: clip window in cells [x0, y0, x1, y1), or null
    const g = {
      U, OX, OY, C,
      clear() { ctx.fillStyle = env.paper; ctx.fillRect(0, 0, SIZE, SIZE); cur = null; },
      color(c) { const v = C[c] || c; if (v !== cur) { ctx.fillStyle = v; cur = v; } return g; },
      clip(x0, y0, x1, y1) { K = x0 === undefined ? null : [x0, y0, x1, y1]; return g; },
      cell(x, y) { if (!(K && (x < K[0] || y < K[1] || x >= K[2] || y >= K[3]))) ctx.fillRect(OX + x * U, OY + y * U, U, U); return g; },
      rect(x, y, w, h) {
        if (K) { const x1 = Math.min(x + w, K[2]), y1 = Math.min(y + h, K[3]); x = Math.max(x, K[0]); y = Math.max(y, K[1]); w = x1 - x; h = y1 - y; }
        if (w > 0 && h > 0) ctx.fillRect(OX + x * U, OY + y * U, w * U, h * U);
        return g;
      },
      // a hairline drawn on whole cells; dash = draw every nth cell
      hline(x0, x1, y, dash = 1) { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (((x % dash) + dash) % dash === 0) g.cell(x, y); },
      vline(x, y0, y1, dash = 1) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) if (((y % dash) + dash) % dash === 0) g.cell(x, y); },
      frame(x, y, w, h) { return g.rect(x, y, w, 1).rect(x, y + h - 1, w, 1).rect(x, y, 1, h).rect(x + w - 1, y, 1, h); },
      // Bresenham line; keep(i, x, y) decides which cells of the run are drawn
      line(x0, y0, x1, y1, keep) {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let e = dx + dy, i = 0;
        for (;;) { if (!keep || keep(i, x0, y0)) g.cell(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } i++; }
      },
      // light: a square lamp of side n whose glow is drawn as dither, never alpha
      lamp(x, y, n, level = 1) { for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (lit(x + i, y + j, level)) g.cell(x + i, y + j); return g; },
      // text in the study's bitmap face, top-left at cell (x, y), dot = k cells
      text(str, x, y, k = 1) { for (const [px, py] of Face.points(str)) g.rect(x + px * k, y + py * k, k, k); return g; },
    };
    return g;
  }

  // ---------- bitmap face ----------
  // An original 5 × 7 capital face drawn for this study: square terminals,
  // no diagonals where a step will do, set with one dot of tracking.
  const GLYPHS = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
    X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
    4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
    7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
    ',': ['..', '..', '..', '..', '..', '.#', '#.'],
    '.': ['.', '.', '.', '.', '.', '.', '#'],
    ':': ['.', '.', '#', '.', '.', '#', '.'],
    '-': ['....', '....', '....', '####', '....', '....', '....'],
    '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
    '·': ['.', '.', '.', '#', '.', '.', '.'],
    '×': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    ' ': ['...', '...', '...', '...', '...', '...', '...'],
  };
  const Face = {
    H: 7,
    width(str) { let w = 0; for (const ch of str) w += (GLYPHS[ch] || GLYPHS[' '])[0].length + 1; return Math.max(0, w - 1); },
    points(str) {
      const out = []; let x0 = 0;
      for (const ch of str) { const gl = GLYPHS[ch] || GLYPHS[' ']; gl.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') out.push([x0 + x, y]); }); x0 += gl[0].length + 1; }
      return out;
    },
  };

  // ---------- mark helpers ----------
  // centre a set of unit points on the frame at U px per point (the approved centring)
  function centre(pts, U) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    return { OX: Math.round(SIZE / 2 - (cx + 0.5) * U), OY: Math.round(SIZE / 2 - (cy + 0.5) * U), cx, cy };
  }
  // the pen's first pixel: the leftmost column's topmost pixel (Material's orange cell)
  const penStart = (pts) => pts.reduce((a, b) => (b[0] < a[0] || (b[0] === a[0] && b[1] < a[1]) ? b : a));
  // geodesic order from a start pixel through 8- (or 4-) connected ink; a gap to the next
  // piece costs its Chebyshev distance, so separate strokes follow on naturally.
  function geodesic(pts, start, conn = 8) {
    const key = (x, y) => y * 4096 + x, idx = new Map(pts.map((p, i) => [key(p[0], p[1]), i]));
    const dist = new Float64Array(pts.length).fill(Infinity), done = new Uint8Array(pts.length);
    let frontier = [idx.get(key(start[0], start[1]))]; dist[frontier[0]] = 0; done[frontier[0]] = 1;
    let left = pts.length - 1;
    for (;;) {
      while (frontier.length) {
        const next = [];
        for (const i of frontier) { const [x, y] = pts[i]; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (conn === 4 && dx && dy) continue; const j = idx.get(key(x + dx, y + dy)); if (j === undefined || done[j]) continue; done[j] = 1; dist[j] = dist[i] + 1; next.push(j); left--; } }
        frontier = next;
      }
      if (!left) break;
      // jump to the nearest unreached pixel: a Chebyshev flood over the empty
      // cells from every reached pixel, remembering which one it came from
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const W = x1 - x0 + 1, H = y1 - y0 + 1, src = new Int32Array(W * H).fill(-1);
      let wave = [];
      for (let i = 0; i < pts.length; i++) if (done[i]) { const c = (pts[i][1] - y0) * W + (pts[i][0] - x0); src[c] = i; wave.push(c); }
      let best = -1, from = -1, bd = 0;
      while (best < 0 && wave.length) {
        bd++; const next = [], hits = [];
        for (const c of wave) { const cx = c % W, cy = (c / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const n = ny * W + nx; if (src[n] >= 0) continue; src[n] = src[c]; next.push(n); const j = idx.get(key(nx + x0, ny + y0)); if (j !== undefined && !done[j]) hits.push([j, src[c]]); } }
        if (hits.length) { hits.sort((a, b) => pts[a[0]][0] - pts[b[0]][0] || pts[a[0]][1] - pts[b[0]][1]); [best, from] = hits[0]; }
        wave = next;
      }
      done[best] = 1; dist[best] = dist[from] + bd; frontier = [best]; left--;
    }
    return dist;
  }

  window.MotionGrammar = { SIZE, D, FPS, FRAMES, ORANGE, GROUNDS, BEATS, STAG, clamp, seg, inOut5, inOut3, out3, swing, stagger, wrap, BAYER, bayer, lit, Grid, Face, centre, penStart, geodesic };
})();

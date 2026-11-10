/* MATERIAL — Motion Language Study 002 · the studies
   Four behaviours × three variations. Each study is a pure function of loop
   phase, draw(ctx, p, env), p in [0, 1); the gallery, the contact sheets, the
   verifier and the MP4 renderer all call the same function.
   env: { paper, ink, hair, muted, signal } — signal false draws orange as ink,
   to test whether the motion still reads without its light. */
(() => {
  'use strict';
  const G = window.MotionGrammar;
  const { SIZE, D, BEATS, seg, inOut5, inOut3, swing, stagger, wrap, lit, Grid, Face, centre, penStart, geodesic } = G;

  // invert an easing (monotone on [0,1]) by bisection
  const invert = (f, v) => { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (f(m) < v) a = m; else b = m; } return (a + b) / 2; };
  const bounds = (pts) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }; };
  // Plumb's four detented turns per loop (0.9, 2.9, 4.9, 6.9 s), with the last
  // turn's residual wrapped into the start of the next loop
  const detents = (s, at, n = at.length) => { let a = 0; for (const t of at) a += swing(s - t); a += swing(s + D - at[at.length - 1]) - 1; return a; };

  // =====================================================================
  // ASSEMBLY — forms emerging from individual pixels
  // =====================================================================

  // A1  PRINTHEAD · geometry
  // The signature is printed, never placed. An eight-pin head crosses the
  // paper in seven bands, alternating direction like a dot-matrix carriage,
  // and the paper line-feeds eight rows between passes. The paper is
  // continuous: the finished copy is ejected upward while the carriage
  // returns, so the loop is a feed, not a rewind.
  function printhead(m) {
    const sig = m.signature, U = 6, b = bounds(sig);
    const OX = centre(sig, U).OX;
    const NB = Math.ceil(b.h / 8), FF = 120, HY = Math.round(SIZE / U / 2 + 8 * (NB - 1) - (b.h - 1) / 2), P = FF + 8 * (NB - 1);
    const rel = sig.map(([x, y]) => [x, y - b.y0]);
    const T = { feed: [1.1, 2.1], print: [2.1, 7.4] }, LF = 0.12;
    const tp = (T.print[1] - T.print[0] - (NB - 1) * LF) / NB;
    const xL = b.x0 - 2, xR = b.x1 + 2;
    function state(s) {
      // Y: paper advanced this loop; k: band being printed (-1 none yet); hx: head column
      if (s < T.feed[0]) return { Y: 0, k: -1, hx: NB % 2 ? xR : xL, on: false, done: true };
      if (s < T.feed[1]) { const e = inOut5(seg(s, ...T.feed)); return { Y: FF * e, k: -1, hx: Math.round((NB % 2 ? xR : xL) + (xL - (NB % 2 ? xR : xL)) * e), on: false, done: true }; }
      if (s >= T.print[1]) return { Y: P, k: NB, hx: NB % 2 ? xR : xL, on: false };
      const u = s - T.print[0], k = Math.min(NB - 1, Math.floor(u / (tp + LF))), w = u - k * (tp + LF);
      const ltr = k % 2 === 0;
      if (w < tp) { const e = inOut5(w / tp); return { Y: FF + 8 * k, k, hx: Math.round(ltr ? xL + (xR - xL) * e : xR - (xR - xL) * e), on: true, ltr }; }
      return { Y: FF + 8 * k + 8 * inOut5((w - tp) / LF), k: k + 1, hx: ltr ? xR : xL, on: false, ltr: !ltr, fed: true };
    }
    return {
      U, OX, OY: 0,
      draw(ctx, p, env) {
        const s = p * D, st = state(s), g = Grid(ctx, env, U, OX, 0); g.clear();
        const Y = Math.round(st.Y);
        // rail
        g.color('hair').rect(Math.floor(-OX / U), HY + 9, Math.ceil(SIZE / U) + 2, 1);
        g.color('ink');
        // previous copy (c = -1) and the copy being printed (c = 0)
        for (const [x, r] of rel) {
          const yPrev = HY + r - 8 * (NB - 1) - Y; if (yPrev > -2) g.cell(x, yPrev);
          if (st.k < 0) continue;
          const band = (r / 8) | 0;
          const printed = band < st.k || (band === st.k && !st.fed && (st.ltr ? x <= st.hx : x >= st.hx));
          if (printed) g.cell(x, HY + r + P - 8 * (NB - 1) - Y);
        }
        // the head: eight pins, lit only while it is printing
        g.color(st.on ? 'orange' : 'ink').rect(st.hx, HY, 1, 8);
      },
      phases: [[0, 1.1, 'hold'], [1.1, 2.1, 'eject + return'], [2.1, 7.4, 'print · 7 bands'], [7.4, 8, 'hold']],
    };
  }

  // A2  GROWTH · timing
  // The Stamp eagle grows from one pixel. Every pixel arrives at its distance
  // from the left wingtip, measured along the ink, so the form spreads the way
  // ink would. Arrival is eased on the whole (cubic in-out over the distance),
  // not per pixel: one gesture, 4,472 events. It leaves in the same order.
  function growth(m) {
    const pts = m.eagle, U = 5, { OX, OY } = centre(pts, U);
    const s0 = penStart(pts), dist = geodesic(pts, s0, 4), maxD = Math.max(...dist);
    const T = { grow: [1.1, 4.25], leave: [5.85, 7.6] };
    const tau = Array.from(dist, (d) => invert(inOut3, d / maxD));
    const seed = pts.findIndex((p) => p === s0);
    return {
      U, OX, OY,
      draw(ctx, p, env) {
        const s = p * D, g = Grid(ctx, env, U, OX, OY); g.clear(); g.color('ink');
        const ga = (s - T.grow[0]) / (T.grow[1] - T.grow[0]), la = (s - T.leave[0]) / (T.leave[1] - T.leave[0]);
        for (let i = 0; i < pts.length; i++) { if (i === seed) continue; if (tau[i] <= ga && !(tau[i] <= la)) g.cell(pts[i][0], pts[i][1]); }
        g.color('orange').cell(s0[0], s0[1]);
      },
      phases: [[0, 1.1, 'seed'], [1.1, 4.25, 'grow · along the ink'], [4.25, 5.85, 'hold'], [5.85, 7.6, 'leave · same order'], [7.6, 8, 'seed']],
    };
  }

  // A3  THRESHOLD · rhythm
  // COLE CALFEE set in the study face at five cells a dot, then brought in
  // through the 8 × 8 Bayer thresholds an early Mac used to fade a screen:
  // sixteen counted steps, one every six frames. The rhythm is the meter of
  // the matrix itself. It leaves by the same count, first in, first out.
  function threshold() {
    const U = 5, k = 5, lines = ['COLE', 'CALFEE'];
    const wDots = Math.max(...lines.map((l) => Face.width(l))), hDots = Face.H * 2 + 3;
    const GW = SIZE / U, X0 = Math.floor((GW - wDots * k) / 2), Y0 = Math.floor((GW - hDots * k) / 2);
    const cells = [];
    lines.forEach((l, li) => { for (const [dx, dy] of Face.points(l)) for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) cells.push([X0 + dx * k + i, Y0 + (dy + li * (Face.H + 3)) * k + j]); });
    // the orange cell: the first cell in reading order with threshold 0 — the first to light
    const first = cells.filter(([x, y]) => G.bayer(x, y) === 0).sort((a, b) => a[1] - b[1] || a[0] - b[0])[0];
    const STEPS = 16, STEP = 0.1, IN = 1.1, OUT = 5.85;
    const level = (s, t0) => Math.max(0, Math.min(STEPS, Math.floor((s - t0) / STEP) + 1)) / STEPS;
    return {
      U, OX: 0, OY: 0,
      draw(ctx, p, env) {
        const s = p * D, g = Grid(ctx, env, U); g.clear(); g.color('ink');
        const a = s >= IN ? level(s, IN) : 0, o = s >= OUT ? level(s, OUT) : 0;
        if (a === 0) return;
        for (const [x, y] of cells) { if (x === first[0] && y === first[1]) continue; const b = G.bayer(x, y); if (b < a * 64 && !(b < o * 64)) g.cell(x, y); }
        if (!(0 < o * 64)) g.color('orange').cell(first[0], first[1]);
      },
      phases: [[0, 1.1, 'empty'], [1.1, 2.7, 'in · 16 counts'], [2.7, 5.85, 'hold'], [5.85, 7.45, 'out · 16 counts'], [7.45, 8, 'empty']],
    };
  }

  // =====================================================================
  // ORBITAL — connected ideas, objects and relationships moving spatially
  // =====================================================================

  // O1  DETENT · timing
  // TABLET's four functions on one ring. Four quarter-turns a loop, each
  // Plumb's damped swing on Plumb's counts (0.9, 2.9, 4.9, 6.9 s): the ring
  // clicks into a detent and settles. The function under the index mark lights
  // once it has arrived — light is the confirmation, not the motion.
  function detent(m) {
    const U = 4, C = 135, R = 102, labels = m.TABLET;
    const ring = []; { let x = R, y = 0, e = 1 - R; while (x >= y) { for (const [a, b] of [[x, y], [y, x], [-x, y], [-y, x], [x, -y], [y, -x], [-x, -y], [-y, -x]]) ring.push([C + a, C + b]); y++; if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; } } }
    // dot the ring evenly by walking it in angle order and keeping every other cell
    const dots = [...new Map(ring.map((c) => [c[0] + ',' + c[1], c])).values()].sort((a, b) => Math.atan2(a[1] - C, a[0] - C) - Math.atan2(b[1] - C, b[0] - C)).filter((_, i) => i % 2 === 0);
    const AT = [0.9, 2.9, 4.9, 6.9];
    return {
      U, OX: 0, OY: 0,
      draw(ctx, p, env) {
        const s = p * D, g = Grid(ctx, env, U); g.clear();
        g.color('ink'); for (const [x, y] of dots) g.cell(x, y);
        g.rect(C, C - R - 8, 1, 4); // the fixed index mark
        const a = 90 * detents(s, AT);
        labels.forEach((l, i) => {
          const th = ((i * 90 - a) * Math.PI) / 180, sx = Math.sin(th), cy = -Math.cos(th);
          const x = Math.round(C + R * sx), y = Math.round(C + R * cy);
          const off = (((i * 90 - a) % 360) + 540) % 360 - 180, on = Math.abs(off) < 8;
          g.color(on ? 'orange' : 'ink').rect(x - 2, y - 2, 5, 5);
          const w = Face.width(l), h = Face.H, rr = R - 12; // set inside the ring, like a dial
          const lx = Math.round(C + rr * sx - w * (1 + sx) / 2), ly = Math.round(C + rr * cy - h * (1 + cy) / 2);
          g.color('ink').text(l, lx, ly);
        });
      },
      phases: [[0, 0.9, 'NOW'], [0.9, 2.9, 'NEXT'], [2.9, 4.9, 'OPEN LOOPS'], [4.9, 6.9, 'WEEKLY SHEET'], [6.9, 8, 'NOW']],
    };
  }

  // O2  ORRERY · rhythm
  // Freeman's crosshair at the centre; three bodies on inclined orbits turning
  // 1, 2 and 3 times a loop, so the system realigns exactly at the seam.
  // Their relationships are drawn as dotted chords that stretch and fold;
  // bodies behind the plane are drawn smaller than bodies in front.
  function orrery() {
    const U = 4, C = 135, K = 0.42, ORB = [[44, 1, 0.0], [76, 2, 0.31], [108, 3, 0.62]];
    const ellipse = (r) => { const n = Math.round((2 * Math.PI * r * 0.75) / 4), out = []; for (let i = 0; i < n; i++) { const t = (2 * Math.PI * i) / n; out.push([Math.round(C + r * Math.sin(t)), Math.round(C + r * K * Math.cos(t))]); } return out; };
    const tracks = ORB.map(([r]) => ellipse(r));
    return {
      U, OX: 0, OY: 0,
      draw(ctx, p, env) {
        const g = Grid(ctx, env, U); g.clear();
        g.color('ink'); for (const t of tracks) for (const [x, y] of t) g.cell(x, y);
        const bodies = ORB.map(([r, n, ph]) => { const t = 2 * Math.PI * (n * p + ph); return { x: Math.round(C + r * Math.sin(t)), y: Math.round(C + r * K * Math.cos(t)), z: Math.cos(t) }; });
        g.color('ink');
        for (let i = 0; i < 3; i++) { const a = bodies[i], b = bodies[(i + 1) % 3]; g.line(a.x, a.y, b.x, b.y, (j) => j % 2 === 0); }
        const body = (o) => { const n = o.z >= 0 ? 7 : 5; g.color('ink').rect(o.x - (n >> 1), o.y - (n >> 1), n, n); };
        bodies.filter((o) => o.z < 0).forEach(body);
        // the crosshair: level and plumb, orange where they cross
        g.color('ink').rect(C - 14, C, 29, 1).rect(C, C - 14, 1, 29);
        g.color('orange').rect(C - 1, C - 1, 3, 3);
        bodies.filter((o) => o.z >= 0).forEach(body);
      },
      phases: [[0, 8, '1 : 2 : 3 turns · realigns at the seam']],
    };
  }

  // O3  CONSTELLATION · scale
  // The 23 works of the Cole Calfee Index as points on a sphere, each tied to
  // its two nearest neighbours. One turn a loop at constant speed — the one
  // study with no easing. Depth is carried only by scale: points are 1, 2 or 3
  // cells, chords thin out behind. The work nearest the viewer is lit, and named.
  function constellation(m) {
    const U = 4, C = 128, R = 92, N = m.INDEX.length, TILT = (20 * Math.PI) / 180;
    const P = Array.from({ length: N }, (_, i) => { const y = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - y * y), t = i * Math.PI * (3 - Math.sqrt(5)); return [r * Math.cos(t), y, r * Math.sin(t)]; });
    const E = new Set(); P.forEach((a, i) => P.map((b, j) => [j, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2]).filter(([j]) => j !== i).sort((u, v) => u[1] - v[1]).slice(0, 2).forEach(([j]) => E.add(i < j ? i + ',' + j : j + ',' + i)));
    const edges = [...E].map((e) => e.split(',').map(Number));
    return {
      U, OX: 0, OY: 0,
      draw(ctx, p, env) {
        const g = Grid(ctx, env, U); g.clear();
        const ph = 2 * Math.PI * p, cs = Math.cos(ph), sn = Math.sin(ph), ct = Math.cos(TILT), st = Math.sin(TILT);
        const Q = P.map(([x, y, z]) => { const x1 = x * cs + z * sn, z1 = -x * sn + z * cs; const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct; return { x: Math.round(C + R * x1), y: Math.round(C - R * y2), z: z2 }; });
        g.color('ink');
        for (const [i, j] of edges) { const z = (Q[i].z + Q[j].z) / 2, every = z > 0.3 ? 2 : z > -0.3 ? 3 : 5; g.line(Q[i].x, Q[i].y, Q[j].x, Q[j].y, (k) => k % every === 0); }
        let f = 0; Q.forEach((q, i) => { if (q.z > Q[f].z) f = i; });
        Q.forEach((q, i) => { const n = q.z > 0.45 ? 3 : q.z > -0.35 ? 2 : 1; if (i !== f) g.rect(q.x - (n >> 1), q.y - (n >> 1), n, n); });
        g.color('orange').rect(Q[f].x - 2, Q[f].y - 2, 5, 5);
        const [no, name] = m.INDEX[f], label = no + '  ' + name;
        g.color('ink').text(label, Math.round((270 - Face.width(label)) / 2), 246);
      },
      phases: [[0, 8, 'one turn · constant speed']],
    };
  }

  // =====================================================================
  // PANEL — information revealed through precise mechanical movements
  // =====================================================================

  // P1  TAMBOUR · geometry
  // TABLET's panel behind a tambour: a slatted cover on a continuous belt.
  // The belt only ever runs downward, one row per detent. Its open half
  // reveals NOW first; its closed half covers NOW first. The lamp at NOW is
  // lit only while NOW is uncovered and still.
  function tambour(m) {
    const U = 4, X0 = 36, W = 198, RH = 28, Y0 = 79, H = RH * 4, labels = m.TABLET, vals = ['01', '03', '05', 'PRINT'];
    const AT = (a) => [0, 1, 2, 3].map((k) => a + k * 0.35), MOVE = 0.3;
    const OPEN = AT(1.1), CLOSE = AT(5.85);
    const belt = (s) => { let r = 0; for (const t of [...OPEN, ...CLOSE]) r += inOut5(seg(s, t, t + MOVE)); return r; }; // rows advanced, 0..8
    return {
      U, OX: 0, OY: 0,
      draw(ctx, p, env) {
        const s = p * D, g = Grid(ctx, env, U); g.clear();
        g.color('hair').frame(X0 - 1, Y0 - 1, W + 2, H + 2);
        for (let k = 1; k < 4; k++) g.rect(X0, Y0 + k * RH, W, 1);
        g.color('ink');
        labels.forEach((l, k) => { const y = Y0 + k * RH + (RH - Face.H) / 2; g.text(l, X0 + 14, y); g.text(vals[k], X0 + W - 14 - Face.width(vals[k]), y); });
        // belt position in cells; the cover occupies belt rows [0, 4) of every 8
        const off = Math.round(belt(s) * RH);
        g.clip(X0, Y0, X0 + W, Y0 + H);
        for (const base of [-8 * RH, 0]) {
          const top = Y0 + base + off, bot = top + H; // cover segment [top, bot)
          for (let y = top; y < bot; y++) {
            const r = (y - top) % 7;
            g.color('paper').rect(X0, y, W, 1);
            if (y === bot - 1) { g.color('ink').rect(X0, y, W, 1); continue; } // leading edge
            if (r === 6) continue; // slat joint
            g.color('ink'); for (let x = X0 + (y & 1); x < X0 + W; x += 2) g.cell(x, y);
          }
        }
        g.clip();
        const nowOpen = s >= OPEN[0] + MOVE && s < CLOSE[0];
        g.color(nowOpen ? 'orange' : 'hair').rect(X0 - 9, Y0 + (RH >> 1) - 1, 3, 3);
      },
      phases: [[0, 1.1, 'closed'], [1.1, 2.45, 'open · 4 detents'], [2.45, 5.85, 'read'], [5.85, 7.2, 'close · 4 detents'], [7.2, 8, 'closed']],
    };
  }

  // P2  INDEX · rhythm
  // The Cole Calfee Index in a five-row window, advancing one entry a second.
  // Each detent is Plumb's swing, so the list lands and settles like a wheel
  // with a click. Eight entries make the loop. The lamp at the reading line
  // lights only between movements.
  function index(m) {
    const U = 4, GW = 270, RH = 18, ROWS = 5, X0 = 14, W = GW - 28, Y0 = Math.round((GW - RH * ROWS) / 2), N = 8;
    const list = m.INDEX.slice(0, N), AT = Array.from({ length: N }, (_, k) => 0.5 + k);
    return {
      U, OX: 0, OY: 0,
      draw(ctx, p, env) {
        const s = p * D, g = Grid(ctx, env, U); g.clear();
        const o = wrap(detents(s, AT), N); // entries advanced
        const shift = Math.round(o * RH);
        g.color('hair').rect(X0, Y0 - 1, W, 1).rect(X0, Y0 + RH * ROWS - 1, W, 1);
        g.clip(X0, Y0, X0 + W, Y0 + RH * ROWS - 1);
        for (let k = -1; k <= ROWS + 1; k++) {
          // entry shown in slot k: the list scrolls upward through the window
          const e = (((k - 2 + Math.floor(o)) % N) + N) % N, y = Y0 + k * RH - (shift - Math.floor(o) * RH);
          const [no, name, yr] = list[e], ty = y + ((RH - Face.H) >> 1);
          g.color('ink').text(no, X0 + 2, ty).text(name, X0 + 26, ty).text(yr, X0 + W - 2 - Face.width(yr), ty);
          g.color('hair').rect(X0, y + RH - 1, W, 1);
        }
        g.clip();
        const settled = wrap(s - AT[0], 1) > 0.6; // 0.6 s after each click
        g.color(settled ? 'orange' : 'hair').rect(X0 - 7, Y0 + 2 * RH + (RH >> 1) - 1, 3, 3);
      },
      phases: AT.map((t, k) => [t, t + 1, String(k + 2).padStart(3, '0')]),
    };
  }

  // P3  APERTURE · scale
  // The eagle behind a shutter built on Freeman's crosshair. It opens along
  // the level line in the approved Material's three beats — half, a breath,
  // full — so the reveal changes scale twice. It closes along the plumb line,
  // with new plates entering from the sides: the mechanism never reverses.
  // The latch at the crossing is lit while the aperture is shut.
  function aperture(m) {
    const pts = m.eagle, U = 5, { OX, OY } = centre(pts, U), b = bounds(pts), M = 8;
    const HALF = Math.ceil((b.w + 2 * M) / 2), HALFV = Math.ceil((b.h + 2 * M) / 2);
    const AX0 = b.x0 - M, AX1 = AX0 + 2 * HALF, MIDX = AX0 + HALF, AY0 = b.y0 - M, AY1 = AY0 + 2 * HALFV, MIDY = AY0 + HALFV;
    const CLOSE = [BEATS.back1[0], 7.05];
    return {
      U, OX, OY,
      draw(ctx, p, env) {
        const s = p * D, g = Grid(ctx, env, U, OX, OY); g.clear();
        g.color('ink'); for (const [x, y] of pts) g.cell(x, y);
        const plate = (x0, y0, x1, y1) => { if (x1 <= x0 || y1 <= y0) return; g.color('paper').rect(x0, y0, x1 - x0, y1 - y0); g.color('ink'); for (let y = y0; y < y1; y++) for (let x = x0 + ((x0 + y) & 1); x < x1; x += 2) g.cell(x, y); };
        if (s < CLOSE[0]) {
          // open along the level line: top plate up, bottom plate down — half, a breath, full
          const d = Math.round(HALFV * (0.5 * inOut5(seg(s, ...BEATS.out1)) + 0.5 * inOut5(seg(s, ...BEATS.out2))));
          plate(AX0, AY0, AX1, MIDY - d); plate(AX0, MIDY + d, AX1, AY1);
          if (d > 0 && d < HALFV) g.color('ink').rect(AX0, MIDY - d - 1, AX1 - AX0, 1).rect(AX0, MIDY + d, AX1 - AX0, 1);
        } else {
          // close along the plumb line: new plates enter from the sides
          const w = Math.round(HALF * inOut5(seg(s, ...CLOSE)));
          plate(AX0, AY0, AX0 + w, AY1); plate(AX1 - w, AY0, AX1, AY1);
          if (w > 0 && w < HALF) g.color('ink').rect(AX0 + w - 1, AY0, 1, AY1 - AY0).rect(AX1 - w, AY0, 1, AY1 - AY0);
        }
        g.color('hair').frame(AX0 - 1, AY0 - 1, AX1 - AX0 + 2, AY1 - AY0 + 2);
        if (s < BEATS.out1[0] || s >= CLOSE[1]) g.color('orange').rect(MIDX - 1, MIDY - 1, 3, 3);
      },
      phases: [[0, 1.1, 'latched'], [1.1, 2.5, 'level · half'], [2.5, 2.85, 'breath'], [2.85, 4.25, 'level · full'], [4.25, 5.85, 'open'], [5.85, 7.05, 'plumb · close'], [7.05, 8, 'latched']],
    };
  }

  // =====================================================================
  // SIGNAL — restrained orange illumination communicating state and focus
  // =====================================================================

  // S1  FOCUS · rhythm
  // TABLET's four functions, one lamp each. Focus moves four times a loop on
  // an even count. Light does not travel: the old lamp goes out and the new
  // one comes on through four dither steps each (1, ½, ¼, 0), the new one two
  // frames behind — a handover you feel more than see.
  function focus(m) {
    const U = 6, GW = 180, labels = m.TABLET, X0 = 40, Y0 = 50, GAP = 24, LS = 6;
    const AT = [1.1, 3.1, 5.1, 7.1], F = 1 / 60;
    // lamp i holds focus for 2 s from AT[i]. Going out: ½, ¼, off on successive
    // frames. Coming on: two dark frames, then ¼, ½, full.
    const level = (s, i) => {
      const dt = wrap(s - AT[i]);
      if (dt < 2) { const n = Math.floor(dt / F + 1e-6) - 2; return n < 0 ? 0 : [0.25, 0.5][n] ?? 1; }
      const k = Math.floor((dt - 2) / F + 1e-6); return [0.5, 0.25][k] ?? 0;
    };
    return {
      U, OX: 0, OY: 0,
      draw(ctx, p, env) {
        const s = p * D, g = Grid(ctx, env, U); g.clear();
        labels.forEach((l, i) => {
          const y = Y0 + i * GAP;
          g.color('ink').text(l, X0 + LS + 8, y);
          const v = level(s, i);
          g.color('hair').frame(X0, y, LS + 1, Face.H);
          if (v > 0) g.color('orange').lamp(X0, y, LS + 1, v);
        });
      },
      phases: [[1.1, 3.1, 'NOW'], [3.1, 5.1, 'NEXT'], [5.1, 7.1, 'OPEN LOOPS'], [7.1, 8, 'WEEKLY SHEET']],
    };
  }

  // S2  LAMP · timing
  // The Material block — 2,278 pixels, 67 × 34 — at rest. Its orange cell is
  // a lamp breathing twice a loop, a four-second breath. The glow is the
  // Bayer matrix, not alpha: light spreads as density, five cells at most,
  // over ink and paper alike.
  function lamp() {
    const U = 6, BW = 67, BH = 34, GW = SIZE / U, X0 = Math.floor((GW - BW) / 2), Y0 = Math.floor((GW - BH) / 2);
    return {
      U, OX: 0, OY: 0,
      draw(ctx, p, env) {
        const s = p * D, g = Grid(ctx, env, U); g.clear();
        g.color('ink').rect(X0, Y0, BW, BH);
        const I = 0.5 - 0.5 * Math.cos((2 * Math.PI * s) / 4); // 0 at the seam, a breath every 4 s
        g.color('orange');
        for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
          const r = Math.max(Math.abs(dx), Math.abs(dy)); if (r === 0) continue;
          const v = I * (1 - r / 9) ** 1.5; if (lit(X0 + dx, Y0 + dy, v)) g.cell(X0 + dx, Y0 + dy);
        }
        g.cell(X0, Y0);
        const L = Grid(ctx, env, 3), lbl = '2,278';
        L.color('ink').text(lbl, Math.round((SIZE / 3 - Face.width(lbl)) / 2), Math.round((Y0 + BH) * 2 + 24));
      },
      phases: [[0, 4, 'breath'], [4, 8, 'breath']],
    };
  }

  // S3  CURRENT · geometry
  // The signature lit by a single passage of light: from the pen's first
  // pixel, a band of orange four pixels deep travels the ink — along the
  // strokes, not across the frame. Before it leaves, the first pixel is lit
  // (armed); after it passes, the mark is plain ink (done).
  function current(m) {
    const sig = m.signature, U = 6, { OX, OY } = centre(sig, U);
    const s0 = penStart(sig), dist = geodesic(sig, s0), maxD = Math.max(...dist), WB = 4;
    const T = [1.1, 4.25];
    return {
      U, OX, OY,
      draw(ctx, p, env) {
        const s = p * D, g = Grid(ctx, env, U, OX, OY); g.clear();
        const f = s < T[0] || s >= BEATS.back2[0] ? -1 : inOut3(seg(s, ...T)) * (maxD + WB);
        const armed = s < T[0] || s >= BEATS.back2[0];
        g.color('ink');
        const hot = [];
        for (let i = 0; i < sig.length; i++) { const d = dist[i]; if (f >= 0 && d <= f && d > f - WB) hot.push(i); else if (!(armed && sig[i] === s0)) g.cell(sig[i][0], sig[i][1]); }
        g.color('orange'); for (const i of hot) g.cell(sig[i][0], sig[i][1]);
        if (armed) g.cell(s0[0], s0[1]);
      },
      phases: [[0, 1.1, 'armed'], [1.1, 4.25, 'current'], [4.25, 7.05, 'done'], [7.05, 8, 'armed']],
    };
  }

  // ---------------------------------------------------------------------
  const BEHAVIOURS = [
    { key: 'assembly', name: 'Assembly', line: 'Forms emerging from individual pixels.' },
    { key: 'orbital', name: 'Orbital', line: 'Connected ideas, objects and relationships moving spatially.' },
    { key: 'panel', name: 'Panel', line: 'Information revealed through precise mechanical movements.' },
    { key: 'signal', name: 'Signal', line: 'Restrained orange illumination communicating state and focus.' },
  ];
  const DEFS = [
    ['A1', 'assembly', 'Printhead', 'Freeman', 'geometry', printhead, 'The signature is printed, not placed: an eight-pin head crosses the paper in seven alternating bands, the paper line-feeds between passes, and the finished copy is ejected upward while the carriage returns. A feed, never a rewind. The head is lit only while it prints.'],
    ['A2', 'assembly', 'Growth', 'Freeman', 'timing', growth, 'The Stamp eagle grows from its left wingtip. Each of 4,472 pixels arrives at its distance along the ink, so one eased gesture carries every pixel. It leaves in the same order.'],
    ['A3', 'assembly', 'Threshold', 'Cole Calfee', 'rhythm', threshold, 'COLE CALFEE fades in through the 8 × 8 Bayer thresholds an early Mac used: sixteen counted steps, one every six frames. It leaves on the same count, first in, first out.'],
    ['O1', 'orbital', 'Detent', 'Tangerine / TABLET', 'timing', detent, 'TABLET’s four functions on one ring. Four quarter-turns, each using Plumb’s damped swing on Plumb’s counts. The function under the index mark lights once it settles: light confirms, motion doesn’t.'],
    ['O2', 'orbital', 'Orrery', 'Freeman', 'rhythm', orrery, 'Freeman’s crosshair at the centre and three bodies on inclined orbits turning 1, 2 and 3 times a loop, joined by dotted chords that stretch and fold. The system realigns exactly at the seam.'],
    ['O3', 'orbital', 'Constellation', 'Cole Calfee', 'scale', constellation, 'The 23 works of the Index as a sphere of linked points, turning once at constant speed. This is the one study with no easing. Depth is carried by scale alone, and the work nearest you is lit and named.'],
    ['P1', 'panel', 'Tambour', 'Tangerine / TABLET', 'geometry', tambour, 'TABLET’s panel behind a slatted tambour on a continuous belt that only ever runs down, one row per detent. NOW is uncovered first and covered first. Its lamp is lit only while it is open and still.'],
    ['P2', 'panel', 'Index', 'Cole Calfee', 'rhythm', index, 'The Index in a five-row window, advancing one entry a second. Each click is Plumb’s swing, so the list lands and settles. The lamp at the reading line lights between movements.'],
    ['P3', 'panel', 'Aperture', 'Freeman', 'scale', aperture, 'A shutter built on the crosshair. It opens along the level line in Material’s three beats (half, a breath, then full), then closes along the plumb line with new plates. It never reverses. The latch is lit while it is shut.'],
    ['S1', 'signal', 'Focus', 'Tangerine / TABLET', 'rhythm', focus, 'One lamp per function, and focus moves on an even count of four. The light doesn’t travel: the old lamp goes out in dither steps (½, ¼, off) while the new one comes on two frames behind it.'],
    ['S2', 'signal', 'Lamp', 'Material', 'timing', lamp, 'The Material block, 2,278 pixels, at rest. Its orange cell breathes twice a loop. The glow is Bayer density spreading over ink and paper, not alpha.'],
    ['S3', 'signal', 'Current', 'Freeman', 'geometry', current, 'One passage of light along the signature’s strokes, starting from the pen’s first pixel. Armed (first pixel lit), then current (a four-pixel band of orange), then done (plain ink).'],
  ];

  window.MotionStudies = {
    BEHAVIOURS,
    async load() {
      const marks = await window.MotionMarks.load();
      const out = {};
      for (const [id, behaviour, title, project, axis, make, idea] of DEFS) {
        const st = make(marks);
        out[id] = { id, behaviour, title, project, axis, idea, D, ...st };
      }
      // the approved references, drawn by the approved file, unmodified
      if (window.FreemanMotion) {
        const ref = await window.FreemanMotion.load();
        out.R1 = { id: 'R1', behaviour: 'reference', title: 'Material No. 1', project: 'Freeman', axis: 'approved', idea: 'Signature · 2,278 pixels · 67 × 34 brick. Drawn by the approved motion.js, unmodified.', D: ref['02'].D, U: 6, approved: '02', draw: (ctx, p) => ref['02'].draw(ctx, p), cells: (p) => ref['02'].cells(p), phases: [[0, 1.1, 'block'], [1.1, 2.5, 'courses'], [2.5, 2.85, 'breath'], [2.85, 4.25, 'plumb'], [4.25, 5.85, 'name'], [5.85, 6.85, 'plumb'], [6.85, 7.05, 'breath'], [7.05, 8, 'courses']] };
        let r2; Object.defineProperty(out, 'R2', { enumerable: true, get() { if (r2) return r2; const st = ref['04']; return r2 = { id: 'R2', behaviour: 'reference', title: 'Material No. 2', project: 'Freeman', axis: 'approved', idea: 'Stamp eagle · 4,472 pixels · 52 × 86 pillar. Drawn by the approved motion.js, unmodified.', D: st.D, U: 5, approved: '04', draw: (ctx, p) => st.draw(ctx, p), cells: (p) => st.cells(p), phases: out.R1.phases }; } });
      }
      return out;
    },
  };
})();

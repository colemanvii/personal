/* MATERIAL — Motion Language Study 002 · player
   One clock for every canvas on the page. Time is loop seconds; a frame is
   1/60 s. All studies share the 8.00 s loop, so every seam lands on the same
   frame. URL state (for reproducible review): ?t=3.25&paused=1&ground=ivory
   &signal=0&grid=1&tempo=0.5 */
(() => {
  'use strict';
  const G = window.MotionGrammar, { D, FPS, FRAMES, GROUNDS } = G;
  const q = new URLSearchParams(location.search);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {
    playing: !(q.get('paused') === '1' || q.has('t') || reduced),
    t: q.has('t') ? +q.get('t') : reduced ? 5 : 0,
    tempo: +(q.get('tempo') || 1),
    ground: GROUNDS[q.get('ground')] ? q.get('ground') : 'white',
    signal: q.get('signal') !== '0',
    grid: q.get('grid') === '1',
  };
  const items = [];
  let last = null, studies = null;
  const env = () => ({ ...GROUNDS[state.ground], signal: state.signal });

  function drawGrid(ctx, st) {
    if (!st.U || st.behaviour === 'reference') return;
    const U = st.U, ox = ((st.OX % U) + U) % U, oy = ((st.OY % U) + U) % U;
    ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = state.ground === 'white' ? '#9ec9e8' : '#c9b9a0';
    for (let x = ox; x <= G.SIZE; x += U) ctx.fillRect(x, 0, 1, G.SIZE);
    for (let y = oy; y <= G.SIZE; y += U) ctx.fillRect(0, y, G.SIZE, 1);
    ctx.restore();
  }
  function paint(it) {
    const p = (((state.t % D) + D) % D) / D, ctx = it.ctx;
    it.study.draw(ctx, p, env());
    if (state.grid) drawGrid(ctx, it.study);
    if (it.head) it.head.style.left = (p * 100).toFixed(3) + '%';
    if (it.phase) { const s = p * D, ph = (it.study.phases || []).find(([a, b]) => s >= a && s < b); it.phase.textContent = ph ? ph[2] : ''; }
  }
  function render() {
    for (const it of items) if (it.visible) paint(it);
    const f = Math.floor((((state.t % D) + D) % D) * FPS + 1e-6) % FRAMES;
    const s = f / FPS;
    for (const o of document.querySelectorAll('.clock')) o.textContent = s.toFixed(2).padStart(5, '0') + ' / ' + D.toFixed(2) + ' s · f ' + String(f).padStart(3, '0');
    for (const r of document.querySelectorAll('[data-act="scrub"]')) if (document.activeElement !== r) r.value = f;
    for (const b of document.querySelectorAll('[data-act="play"]')) { b.textContent = state.playing ? '❚❚' : '▶'; b.setAttribute('aria-label', state.playing ? 'Pause' : 'Play'); }
  }
  function tick(now) {
    if (state.playing) { if (last !== null) state.t = (state.t + ((now - last) / 1000) * state.tempo) % D; last = now; }
    else last = null;
    render();
    requestAnimationFrame(tick);
  }
  const snap = () => { state.t = Math.round((((state.t % D) + D) % D) * FPS) / FPS; };
  const act = {
    play() { state.playing = !state.playing; if (!state.playing) snap(); },
    fwd() { state.playing = false; snap(); state.t = (state.t + 1 / FPS) % D; },
    back() { state.playing = false; snap(); state.t = (state.t - 1 / FPS + D) % D; },
    // the seam: alternate between the last frame and the first
    seam() { state.playing = false; snap(); const f = Math.round(state.t * FPS); state.t = f === FRAMES - 1 ? 0 : (FRAMES - 1) / FPS; },
  };

  function bind() {
    for (const b of document.querySelectorAll('[data-act]')) {
      const k = b.dataset.act;
      if (k === 'scrub') { b.max = FRAMES - 1; b.addEventListener('input', () => { state.playing = false; state.t = +b.value / FPS; }); }
      else b.addEventListener('click', () => act[k]());
    }
    for (const el of document.querySelectorAll('[data-opt]')) {
      const k = el.dataset.opt;
      if (el.type === 'checkbox') { el.checked = state[k]; el.addEventListener('change', () => { state[k] = el.checked; document.documentElement.dataset[k] = state[k] ? '1' : '0'; }); }
      else { el.value = String(state[k]); el.addEventListener('change', () => { state[k] = k === 'tempo' ? +el.value : el.value; document.documentElement.dataset.ground = state.ground; }); }
    }
    document.documentElement.dataset.ground = state.ground;
    const beats = document.querySelector('.beats');
    if (beats) for (const t of [1.1, 2.5, 2.85, 4.25, 5.85, 6.85, 7.05]) { const i = document.createElement('i'); i.style.left = (t / D) * 100 + '%'; i.title = t.toFixed(2) + ' s'; beats.append(i); }
    addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input[type=range], select')) { if (e.key !== ' ') return; }
      const k = e.key.toLowerCase();
      if (e.key === ' ') { e.preventDefault(); act.play(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); act.fwd(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); act.back(); }
      else if (k === 'l') act.seam();
      else if (k === 'g' || k === 's' || k === 'w') {
        const opt = { g: 'grid', s: 'signal', w: 'ground' }[k];
        state[opt] = opt === 'ground' ? (state.ground === 'white' ? 'ivory' : 'white') : !state[opt];
        for (const el of document.querySelectorAll(`[data-opt="${opt}"]`)) { if (el.type === 'checkbox') el.checked = state[opt]; else el.value = state[opt]; }
        document.documentElement.dataset.ground = state.ground;
      }
    });
  }

  window.MotionPlayer = {
    state,
    async load() {
      await document.fonts.ready;
      studies = await window.MotionStudies.load();
      window.stage = {
        studies,
        // used by tools/: draw study id at phase p into ctx (default: the page's first canvas)
        at(id, p, ctx, e) { const c = ctx || document.querySelector('canvas').getContext('2d'); studies[id].draw(c, ((p % 1) + 1) % 1, e || env()); },
        env,
      };
      return studies;
    },
    add(canvas, study, { head, phase } = {}) {
      const it = { canvas, ctx: canvas.getContext('2d'), study, head, phase, visible: true };
      items.push(it);
      if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { it.visible = e.isIntersecting; if (it.visible) paint(it); }, { rootMargin: '200px' }).observe(canvas);
      return it;
    },
    start() {
      bind();
      if (document.body.dataset.render === '1') return;
      requestAnimationFrame(tick);
    },
  };
})();

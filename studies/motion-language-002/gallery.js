/* MATERIAL — Motion Language Study 002 · gallery
   The synchronized comparison: the approved references on top, then one row
   per behaviour. Cards can be filtered by project or by the variable they
   explore, and any two or more can be opened together on one clock. */
(async () => {
  'use strict';
  const P = window.MotionPlayer, studies = await P.load(), D = window.MotionGrammar.D;
  const main = document.getElementById('gallery');
  const rows = [{ key: 'reference', name: 'Approved', line: 'Material No. 1 and No. 2 — the standard every study below is held to. Unmodified.' }, ...window.MotionStudies.BEHAVIOURS];
  const picked = new Set();

  function strip(st) {
    const el = document.createElement('div'); el.className = 'strip';
    for (const [a, b, name] of st.phases || []) { const s = document.createElement('span'); s.style.left = (a / D) * 100 + '%'; s.style.width = ((b - a) / D) * 100 + '%'; s.title = `${a.toFixed(2)}–${b.toFixed(2)} s ${name}`; el.append(s); }
    const head = document.createElement('i'); head.className = 'head'; el.append(head);
    return { el, head };
  }

  for (const row of rows) {
    const ids = Object.keys(studies).filter((id) => (id[0] === 'R' ? 'reference' : studies[id].behaviour) === row.key);
    if (!ids.length) continue;
    const sec = document.createElement('section'); sec.className = 'row'; sec.dataset.row = row.key;
    sec.innerHTML = `<h2><span class="n">${row.key === 'reference' ? '00' : '0' + (window.MotionStudies.BEHAVIOURS.findIndex((b) => b.key === row.key) + 1)}</span> ${row.name}</h2><p class="line">${row.line}</p>`;
    const grid = document.createElement('div'); grid.className = 'cards' + (row.key === 'reference' ? ' ref' : '');
    for (const id of ids) {
      const st = studies[id];
      const fig = document.createElement('figure'); fig.className = 'card'; fig.dataset.id = id; fig.dataset.project = st.project; fig.dataset.axis = st.axis;
      fig.innerHTML = `<a href="study.html?s=${id}" aria-label="Open ${id} ${st.title} alone"><canvas width="1080" height="1080"></canvas></a>
        <figcaption>
          <div class="title"><span><span class="n">${id}</span> ${st.title}</span><label class="pick"><input type="checkbox" value="${id}"> compare</label></div>
          <div class="meta">${st.project} · ${st.axis === 'approved' ? 'approved reference' : 'varies ' + st.axis}</div>
          <div class="idea">${st.idea || ''}</div>
          <div class="now"><span class="phase"></span></div>
        </figcaption>`;
      const { el, head } = strip(st);
      fig.querySelector('.now').before(el);
      grid.append(fig);
      P.add(fig.querySelector('canvas'), st, { head, phase: fig.querySelector('.phase') });
      fig.querySelector('.pick input').addEventListener('change', (e) => { if (e.target.checked) picked.add(id); else picked.delete(id); updateCompare(); });
    }
    sec.append(grid); main.append(sec);
  }

  const cmp = document.querySelector('[data-compare]');
  function updateCompare() {
    const ids = [...picked];
    cmp.href = 'study.html?s=' + (ids.length ? ids.join(',') : 'A1');
    cmp.textContent = ids.length >= 2 ? `Open ${ids.join(' + ')} together →` : ids.length === 1 ? `Open ${ids[0]} alone → (pick another to compare)` : 'Select two or more studies, then open them together →';
  }

  // filters: dim what doesn't match, keep the grid in place so rows stay comparable
  const filter = { project: '', axis: '' };
  for (const b of document.querySelectorAll('[data-filter]')) b.addEventListener('click', () => {
    filter[b.dataset.filter] = b.dataset.v;
    for (const o of document.querySelectorAll(`[data-filter="${b.dataset.filter}"]`)) o.setAttribute('aria-pressed', String(o === b));
    for (const c of document.querySelectorAll('.card')) {
      const ok = (!filter.project || c.dataset.project === filter.project) && (!filter.axis || c.dataset.axis === filter.axis || c.dataset.axis === 'approved');
      c.classList.toggle('dim', !ok);
    }
  });

  P.start();
})();

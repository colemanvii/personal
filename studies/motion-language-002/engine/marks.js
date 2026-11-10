/* MATERIAL — Motion Language Study 002 · marks
   The artwork every study is made from. The Freeman marks are read from the
   approved files vendored byte-for-byte in reference/ (see reference/PROVENANCE.md);
   nothing is redrawn. The Cole Calfee and TABLET words are set in the study's
   own bitmap face (grammar.js). */
(() => {
  'use strict';
  const STAMP = 'reference/freeman-v5/eagle/stamp.pbm';

  // Text assets: inlined by tools/bundle.mjs for the single-file review copy,
  // otherwise fetched next to the page.
  window.MotionAssets = window.MotionAssets || {};
  const nativeFetch = window.fetch.bind(window);
  async function text(path) {
    if (window.MotionAssets[path] !== undefined) return window.MotionAssets[path];
    return (await nativeFetch(path)).text();
  }
  // The approved motion.js asks for '../../v5/eagle/stamp.pbm' (its path inside
  // the Freeman repository). Answer that one request with the vendored copy so
  // the approved file runs here unmodified.
  window.fetch = (url, ...rest) => (String(url) === '../../v5/eagle/stamp.pbm' ? text(STAMP).then((t) => new Response(t)) : nativeFetch(url, ...rest));

  function signature() {
    // exactly as the approved study reads it: mount the production mark finished, read its alpha
    const c = document.createElement('canvas'); c.width = 160; c.height = 61;
    const m = window.FreemanPixelMark.mount(c, { play: false }); m.destroy();
    const d = c.getContext('2d').getImageData(0, 0, 160, 61).data, out = [];
    for (let y = 0; y < 61; y++) for (let x = 0; x < 160; x++) if (d[(y * 160 + x) * 4 + 3]) out.push([x, y]);
    return out;
  }
  async function eagle() {
    const L = (await text(STAMP)).split('\n').filter((l) => l && !l.startsWith('#'));
    const [W, H] = L[1].split(/\s+/).map(Number), bits = L.slice(2).join('').replace(/\s+/g, '');
    const out = []; for (let i = 0; i < W * H; i++) if (bits[i] === '1') out.push([i % W, (i / W) | 0]);
    return out;
  }

  // Cole Calfee — the Index (site/index/index.html, 23 works, in its own order)
  const INDEX = [
    ['001', 'FREEMAN GENERAL CONTRACTING', '2026'], ['002', 'KASHUS CULPEPPER', '2026'], ['003', 'SCOUT MOTORS', '2026'],
    ['004', 'RONNIE HODGES PERFORMANCE HORSES', '2022'], ['005', 'TETON VALLEY RANCH', '2015'], ['006', 'RAMSEY HILL CONTRACTING', '2026'],
    ['007', 'ERNEST', '2025'], ['008', 'HABITAT RANCH', '2025'], ['009', 'COREY KENT', '2025'], ['010', 'JOSEPH MARTIN', '2024'],
    ['011', 'PAINTINGS', 'ONGOING'], ['012', 'DRAWINGS', 'ONGOING'], ['013', 'JEFF WEIR OILWORKS', '2025'], ['014', 'PBR', '2025'],
    ['015', 'HOTEL PERLE', '2024-25'], ['016', 'THE BYGONE', '2024'], ['017', 'DYLAN GOSSETT - TREE BIRDS', '2024'],
    ['018', 'ABBIE CALLAHAN - LINGER', '2024'], ['019', 'THE LAST MOVIE STAR', '2016'], ['020', 'THE COWBOYER', '2026'],
    ['021', 'MAGS DUVAL', '2024'], ['022', 'MUSEE FOR MEN', '2025'], ['023', 'VERYGENTLY', '2025'],
  ];
  // TABLET — the four functions of the panel (tangerine, INSTRUMENT.md)
  const TABLET = ['NOW', 'NEXT', 'OPEN LOOPS', 'WEEKLY SHEET'];

  window.MotionMarks = {
    async load() {
      const sig = signature(), egl = await eagle();
      if (sig.length !== 2278) console.warn('signature pixel count', sig.length);
      if (egl.length !== 4472) console.warn('eagle pixel count', egl.length);
      return { signature: sig, eagle: egl, INDEX, TABLET };
    },
  };
})();

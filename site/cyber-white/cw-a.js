/* A · Gallery White — the only structural additions this direction makes.
   Entrance: hang one real, catalogued work (Flowers in a jug, from the Paintings archive in the
   Index) with its wall label; the label's link opens that exact record (index/#flowers-in-a-jug).
   Index: on desktop the reading pane opens on the first artwork entry instead of an empty pane. */
(function () {
  var base = (document.querySelector('script[src*="cw-a.js"]') || {}).src || '';
  var root = base.replace(/cyber-white\/cw-a\.js.*$/, '');
  var landing = document.querySelector('body.landing .landing-frame');
  if (landing && !document.querySelector('.cwa-hero')) {
    var fig = document.createElement('figure');
    fig.className = 'cwa-hero';
    fig.innerHTML = '<a href="' + root + 'index/#flowers-in-a-jug" aria-label="Flowers in a jug — open in the Index">' +
      '<img src="' + root + 'assets/paintings/originals/flowers-in-a-jug.jpg" alt="Flowers in a jug, oil on canvas, on the studio easel" width="1290" height="1612" decoding="async" fetchpriority="high"></a>';
    landing.appendChild(fig);
    var label = document.createElement('p');
    label.className = 'cwa-label';
    label.innerHTML = '<b>Flowers in a jug</b><span>Oil on canvas · 30 × 30 in.</span><span>Paintings / Index 011</span>';
    landing.appendChild(label);
  }
  var idx = document.querySelector('body.work-index');
  if (idx && matchMedia('(min-width:851px)').matches) {
    var h = decodeURIComponent(location.hash.slice(1));
    var byClient = h && document.querySelector('.expand-button[data-client="' + h.replace(/"/g, '') + '"]');
    // A painting's own id (#flowers-in-a-jug) is read by paintings-archive.js; open its pane here.
    var pick = byClient ? null : document.querySelector('.expand-button[data-client="' + (h ? 'paintings' : 'kashus') + '"]');
    if (pick && pick.getAttribute('aria-expanded') !== 'true') pick.click();
  }
})();

/* B · Digital Catalogue — entrance register.
   The three existing links keep their destinations and accessible names; each gains catalogue
   columns. Every fact is read from the live pages: 23 works and 2015–2026 from the Index,
   two original works from Available, the location line from Contact. */
(function () {
  var nav = document.querySelector('body.landing .seven');
  if (!nav) return;
  var rows = {
    'Index': ['01', 'Selected work, 2015–2026', '23 works'],
    'Available': ['02', 'Original paintings', '02 works'],
    'Contact': ['03', 'Nashville, Tennessee / North Georgia', 'Email, Instagram']
  };
  nav.querySelectorAll('a:not(.name)').forEach(function (a) {
    var label = a.textContent.trim(), r = rows[label];
    if (!r) return;
    a.setAttribute('aria-label', label);
    a.innerHTML = '<span class="cwb-n" aria-hidden="true">' + r[0] + '</span><span class="cwb-t">' + label +
      '</span><span class="cwb-d" aria-hidden="true">' + r[1] + '</span><span class="cwb-c" aria-hidden="true">' + r[2] +
      '</span><span class="cwb-a" aria-hidden="true">→</span>';
  });
  var meta = document.createElement('p');
  meta.className = 'cwb-meta';
  meta.textContent = 'Art, design and photography';
  nav.parentNode.appendChild(meta);
})();

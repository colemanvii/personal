/* Preview-host shim, injected only into the showroom bundle (not part of any design).
   Static artifact hosting has no directory indexes or extensionless URLs, so complete
   same-origin links before the browser follows them: "x/" -> "x/index.html", "/company" -> "company.html". */
(function () {
  function fix(a) {
    if (!a || !a.href || a.target === '_blank') return;
    var u; try { u = new URL(a.href, location.href); } catch (e) { return; }
    if (u.origin !== location.origin) return;
    var last = u.pathname.slice(u.pathname.lastIndexOf('/') + 1);
    if (last === '') u.pathname += 'index.html';
    else if (last.indexOf('.') < 0) u.pathname += '.html';
    else return;
    a.href = u.href;
  }
  document.addEventListener('click', function (e) { fix(e.target.closest && e.target.closest('a[href]')); }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter') fix(e.target.closest && e.target.closest('a[href]')); }, true);
})();

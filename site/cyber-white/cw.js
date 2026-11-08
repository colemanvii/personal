/* Cyber White 001 — variant loader (study only; never linked from production).
   ?cw=a|b|c selects a direction and remembers it in window.name, which belongs to one
   tab or iframe, so side-by-side frames never share a choice. ?cw=0 returns to current. */
(function () {
  var s = document.currentScript, base = s.src.replace(/[^/?#]*([?#].*)?$/, '');
  var q = null; try { q = new URLSearchParams(location.search).get('cw'); } catch (e) {}
  var v = '';
  if (q !== null) { v = /^[abc]$/.test(q) ? q : ''; try { window.name = v ? 'cw:' + v : ''; } catch (e) {} }
  else { var m = /^cw:([abc])$/.exec(window.name || ''); v = m ? m[1] : ''; }
  if (!v) return;
  document.documentElement.setAttribute('data-cw', v);
  document.write('<link rel="stylesheet" href="' + base + 'cw-' + v + '.css">' +
                 '<script src="' + base + 'cw-' + v + '.js" defer><\/script>');
})();

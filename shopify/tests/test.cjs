const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const { fixture, render, root } = require('./renderer.cjs');
const script = fs.readFileSync(root + '/assets/cole-gallery.js', 'utf8');
let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log('PASS ' + name); };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
function dom(html, js = false) {
  const d = new JSDOM(html, { url: 'https://gallery.test/products/test-artwork?preview_theme_id=42', runScripts: 'outside-only', pretendToBeVisual: true });
  d.window.CSS = { escape: (s) => s };
  if (js) d.window.eval(script);
  return d;
}
(async () => {
  const original = dom(await render(fixture()));
  check('Original renders native form, real variant ID and single quantity', () => {
    const form = original.window.document.querySelector('.cc-gallery__form');
    assert.equal(form.action, 'https://gallery.test/cart/add');
    assert.equal(form.method, 'post');
    assert.equal(form.querySelector('[name=id]').value, '101');
    assert.equal(form.querySelector('[name=quantity]').value, '1');
    assert.match(original.window.document.querySelector('.cc-gallery__eyebrow').textContent, /Original painting/);
    assert.doesNotMatch(original.window.document.querySelector('.cc-gallery__facts').textContent, /Edition of/);
  });
  check('No-JavaScript images retain full-image links and remain visible', () => {
    assert.equal(original.window.document.querySelectorAll('[data-media-id]:not([hidden])').length, 2);
    assert.equal(original.window.document.querySelectorAll('a[data-enlarge][href]').length, 2);
  });
  const edition = dom(await render(fixture('edition')));
  check('Print facts and actual option names render without variant enumeration', () => {
    assert.match(edition.window.document.querySelector('.cc-gallery__facts').textContent, /Edition of 50/);
    assert.equal(edition.window.document.querySelectorAll('legend')[0].textContent, 'Size');
    assert.equal(edition.window.document.querySelector('[data-option-id="12"]').getAttribute('href'), '/products/test-artwork?option_values=12,21');
    assert.equal(edition.window.document.querySelector('[data-option-id="22"]').getAttribute('href'), '/products/test-artwork?option_values=11,22');
  });
  for (const kind of ['original', 'edition']) {
    const sold = dom(await render(fixture(kind, 'sold')));
    check(`${kind}: sold state disables purchase with correct terminology`, () => {
      assert.equal(sold.window.document.querySelector('.cc-gallery__buy').disabled, true);
      assert.equal(sold.window.document.querySelector('[data-availability]').textContent, kind === 'original' ? 'Sold' : 'Sold out');
    });
    sold.window.close();
  }
  const missing = dom(await render(fixture('edition', 'missing')));
  check('Nonexistent option combination cannot submit an invented variant', () => {
    assert.equal(missing.window.document.querySelector('.cc-gallery__buy').disabled, true);
    assert.equal(missing.window.document.querySelector('input[name=id]').disabled, true);
    assert.match(missing.window.document.querySelector('[data-availability]').textContent, /unavailable/);
  });
  const sparseData = fixture('unknown');
  sparseData.product.title = '<script>bad</script>';
  sparseData.product.metafields.artwork = {};
  sparseData.product.media = [];
  sparseData.product.featured_image = null;
  sparseData.product.selected_or_first_available_variant.metafields.artwork = {};
  const sparse = dom(await render(sparseData));
  check('Missing classification/media/facts stays neutral and escapes title', () => {
    assert.equal(sparse.window.document.querySelector('.cc-gallery__eyebrow').textContent, 'Artwork');
    assert.equal(sparse.window.document.querySelector('h1 script'), null);
    assert.match(sparse.window.document.querySelector('.cc-gallery__image-missing').textContent, /Image forthcoming/);
    assert.doesNotMatch(sparse.window.document.querySelector('.cc-gallery__facts').textContent, /Edition|Signed|Framing/);
  });
  const d = dom(await render(fixture('edition')), true);
  const w = d.window;
  const element = w.document.querySelector('cole-artwork');
  check('Image control swaps plates and selected state', () => {
    w.document.querySelector('[data-show-image="2"]').click();
    assert.equal(w.document.querySelector('[data-media-id="1"]').hidden, true);
    assert.equal(w.document.querySelector('[data-media-id="2"]').hidden, false);
    assert.equal(w.document.querySelector('[data-show-image="2"]').getAttribute('aria-pressed'), 'true');
  });
  check('Enlargement labels image, and close restores invoking link focus', () => {
    const dialog = w.document.querySelector('dialog');
    dialog.showModal = () => { dialog.open = true; };
    const link = w.document.querySelector('[data-media-id="2"] [data-enlarge]');
    link.click();
    assert.equal(dialog.open, true);
    assert.equal(dialog.querySelector('img').alt, 'Secondary image test fixture');
    dialog.dispatchEvent(new w.Event('close'));
    assert.equal(w.document.activeElement, link);
  });
  let requests = [];
  w.fetch = (url, options) => new Promise((resolve, reject) => {
    requests.push({url, options, resolve});
    options.signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
  w.document.querySelector('[data-option-id="12"]').click();
  check('Loading blocks the previous variant, preserves preview context', () => {
    assert.equal(w.document.querySelector('.cc-gallery__buy').disabled, true);
    assert.equal(element.getAttribute('aria-busy'), 'true');
    assert.equal(requests[0].url.searchParams.get('preview_theme_id'), '42');
    assert.equal(requests[0].url.searchParams.get('section_id'), 'test-main');
    const event = new w.Event('submit', { bubbles: true, cancelable: true });
    w.document.querySelector('.cc-gallery__form').dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
  });
  requests[0].resolve({ok: true, text: async () => render(fixture('edition', 'large'))});
  await tick(); await tick();
  check('Server response updates variant, price, dimensions, image, URL and focus together', () => {
    assert.equal(w.document.querySelector('input[name=id]').value, '202');
    assert.match(w.document.querySelector('[data-price]').textContent, /320/);
    assert.match(w.document.querySelector('.cc-gallery__facts').textContent, /24 × 30/);
    assert.equal(w.document.querySelector('[data-media-id="2"]').hidden, false);
    assert.equal(w.document.activeElement.dataset.optionId, '12');
    assert.equal(new URL(w.location.href).searchParams.get('option_values'), '12,21');
    assert.equal(w.document.querySelector('.cc-gallery__buy').disabled, false);
    assert.equal(element.hasAttribute('aria-busy'), false);
    const event = new w.Event('submit', { bubbles: true, cancelable: true });
    w.document.querySelector('.cc-gallery__form').dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
  });
  w.document.querySelector('[data-option-id="11"]').click();
  w.document.querySelector('[data-option-id="12"]').click();
  check('Rapid selection aborts stale requests', () => assert.equal(requests[1].options.signal.aborted, true));
  requests[2].resolve({ok: true, text: async () => render(fixture('edition', 'sold'))});
  await tick(); await tick();
  check('Sold-out response never re-enables the purchase button', () => assert.equal(w.document.querySelector('.cc-gallery__buy').disabled, true));
  element.remove();
  w.document.body.append(element);
  check('Theme editor reconnection restores enhancement without duplicate registration', () => {
    w.eval(script);
    assert.equal(w.document.querySelectorAll('[data-media-id]:not([hidden])').length, 1);
    w.document.querySelector('[data-show-image="2"]').click();
    assert.equal(w.document.querySelector('[data-media-id="2"]').hidden, false);
  });
  for (const page of [original, edition, missing, sparse, d]) page.window.close();
  console.log(`${checks} checks passed. Local fixture adapter; not a live checkout test.`);
})().catch((e) => { console.error(e); process.exitCode = 1; });

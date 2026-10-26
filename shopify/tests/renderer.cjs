/* Local test adapter, not a Shopify runtime. Production Liquid is the render source. */
const { Liquid } = require('liquidjs');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const escape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const engine = new Liquid({ root: path.join(root, 'snippets'), extname: '.liquid', strictFilters: true });
engine.registerFilter('asset_url', (s) => '/assets/' + s);
engine.registerFilter('stylesheet_tag', (s) => `<link rel="stylesheet" href="${escape(s)}">`);
engine.registerFilter('money_with_currency', (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n / 100) + ' USD');
engine.registerFilter('image_url', (image) => image.src);
engine.registerFilter('image_tag', (src, ...args) => {
  const attrs = Object.fromEntries(args.filter(Array.isArray));
  return `<img src="${escape(src)}" alt="${escape(attrs.alt)}" width="1200" height="1500" loading="${attrs.loading || 'lazy'}">`;
});
engine.registerFilter('metafield_tag', (field) => `<p>${escape(field.value)}</p>`);
engine.registerFilter('default_errors', (errors) => escape(errors));
const field = (value) => ({ value });
function fixture(kind = 'original', state = 'available') {
  const image1 = { id: 1, src: 'https://cdn.shopify.com/s/files/1/0629/9264/6301/files/FCF478AF-A124-4E2D-9957-F94694E76B2E.jpg?v=1792867167' };
  const image2 = { id: 2, src: 'https://cdn.shopify.com/s/files/1/0629/9264/6301/files/9D1F30D8-6388-4E9C-9448-755C26F7A733.jpg?v=1792867129' };
  const variant = { id: state === 'large' ? 202 : 101, price: state === 'large' ? 32000 : 240000, available: state !== 'sold', quantity_rule: { min: 1, increment: 1, max: null }, featured_media: { preview_image: state === 'large' ? image2 : image1 }, metafields: { artwork: { dimensions: field(state === 'large' ? '24 × 30 in.' : '36 × 48 in.') } } };
  const product = {
    title: kind === 'edition' ? 'Edition test — not a listed product' : 'Red sea', url: '/products/test-artwork',
    description: '<p>Oil on canvas.</p>', has_only_default_variant: kind === 'original', requires_selling_plan: false,
    featured_image: image1, selected_or_first_available_variant: state === 'missing' ? null : variant,
    media: [image1, image2].map((image, i) => ({ id: image.id, media_type: 'image', preview_image: image, alt: i ? 'Secondary image test fixture' : 'Red sea, oil on canvas' })),
    metafields: { artwork: { kind: field(kind), medium: field(kind === 'edition' ? 'Archival pigment print' : 'Oil on canvas'), dimensions: field('36 × 48 in.'), edition_size: field(50), paper: field('Cotton rag — test data'), signature: field('Signed — test data'), framing: field('Unframed — test data') } },
    options_with_values: kind === 'original' ? [] : [
      { name: 'Size', position: 1, values: [{id: 11, name: 'Small', selected: state !== 'large', available: true}, {id: 12, name: 'Large', selected: state === 'large', available: true}] },
      { name: 'Framing', position: 2, values: [{id: 21, name: 'Unframed', selected: true, available: true}, {id: 22, name: 'Framed', selected: false, available: false}] }
    ]
  };
  return { product, section: { id: 'test-main', blocks: [], settings: { show_navigation: true, home_url: 'https://colecalfee.com', index_url: 'https://colecalfee.com/index/', paintings_url: 'https://colecalfee.com/paintings/', about_url: 'https://colecalfee.com/info/' } }, shop: { shipping_policy: { body: 'Test policy', url: '/policies/shipping-policy' } }, cart: { item_count: 0 }, routes: { cart_url: '/cart' }, form: {} };
}
async function render(data) {
  let source = fs.readFileSync(path.join(root, 'sections/cole-artwork-product.liquid'), 'utf8');
  // Shopify-specific tags are checked by the official Theme Check tool separately.
  source = source.replace(/{% schema %}[\s\S]*?{% endschema %}/, '')
    .replace(/{%- form 'product',[\s\S]*?-%}/, '<form method="post" action="/cart/add" id="{{ form_id }}" class="cc-gallery__form">')
    .replace(/{%- endform -%}/, '</form>');
  return engine.parseAndRender(source, data);
}
module.exports = { fixture, render, root };

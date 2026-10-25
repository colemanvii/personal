// Server-rendered Paintings pages, in the Plates direction: one work at a time,
// uncropped on a neutral field, its record set beneath like a catalogue entry.

import { formatPrice, sized } from './catalogue.js';

const CONTACT = 'colecalfee@gmail.com';

export const escapeHTML = value => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const pad = n => String(n).padStart(2, '0');

function page({ title, description, canonical, image, body }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<title>${escapeHTML(title)}</title>
<meta name="description" content="${escapeHTML(description)}">
<link rel="canonical" href="${escapeHTML(canonical)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHTML(title)}">
<meta property="og:description" content="${escapeHTML(description)}">
<meta property="og:url" content="${escapeHTML(canonical)}">
${image ? `<meta property="og:image" content="${escapeHTML(image)}">\n<meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">'}
<script>try{const t=sessionStorage.getItem('cole-paper-tone-session-v3');document.documentElement.dataset.tone=['off-white','field-notes','red-earth'].includes(t)?t:'off-white';}catch(e){document.documentElement.dataset.tone='off-white';}</script>
<link rel="stylesheet" href="/assets/css/site.css">
<link rel="stylesheet" href="/assets/css/paintings.css">
</head><body class="paintings"><div class="shell">
<header class="site-head">
  <a class="brand" href="/">Cole Calfee</a>
  <nav class="nav" aria-label="Primary">
  <a href="/index/">Work Index</a>
  <a aria-current="page" href="/paintings/">Paintings</a>
  <a href="/about/">About</a>
  </nav>
</header>
${body}
<footer class="footer"><span>© ${new Date().getUTCFullYear()} Cole Calfee</span><a href="mailto:${CONTACT}">${CONTACT}</a></footer>
</div><script src="/assets/js/site.js"></script></body></html>`;
}

function img(work, image, { sizes, eager = false, transition = false }) {
  const widths = [480, 720, 1080, 1600, 2200].filter(w => !image.width || w <= image.width * 1.05);
  if (!widths.length) widths.push(image.width || 720);
  const srcset = widths.map(w => `${escapeHTML(sized(image.src, w))} ${w}w`).join(', ');
  const fallback = sized(image.src, widths[Math.min(2, widths.length - 1)]);
  const dims = image.width && image.height ? ` width="${image.width}" height="${image.height}"` : '';
  const name = transition ? ` style="view-transition-name:plate-${escapeHTML(work.handle)}"` : '';
  return `<img src="${escapeHTML(fallback)}" srcset="${srcset}" sizes="${sizes}"${dims} alt="${escapeHTML(image.alt || work.title)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"${name}>`;
}

function pending(work, transition) {
  const name = transition ? ` style="view-transition-name:plate-${escapeHTML(work.handle)}"` : '';
  return `<div class="plate-pending"${name}><span>Photograph pending</span></div>`;
}

function status(work, currency, { long = false } = {}) {
  if (work.status === 'available') {
    const price = formatPrice(work.price, currency);
    return `<span class="mark" aria-hidden="true">●</span>Available${long && price ? ` · ${price}` : ''}`;
  }
  if (work.status === 'sold') return '<span class="mark sold" aria-hidden="true">○</span>Sold';
  return '';
}

export function renderArchive({ works, currency }, origin) {
  const available = works.filter(w => w.status === 'available');
  const rest = works.filter(w => w.status !== 'available');
  const meta = work => [work.size, status(work, currency, { long: true })].filter(Boolean).join('<span class="sep" aria-hidden="true"> · </span>');
  const href = work => `/paintings/${encodeURIComponent(work.handle)}/`;
  const plate = (work, eager) => `<li><a class="plate" href="${href(work)}">
      <div class="plate-field">${img(work, work.images[0], { sizes: '(min-width: 900px) 44vw, calc(100vw - 36px)', eager, transition: true })}</div>
      <div class="plate-cap"><span class="plate-title">${escapeHTML(work.title)}</span>${meta(work) ? `<span class="plate-meta">${meta(work)}</span>` : ''}</div>
    </a></li>`;
  // Works without a photograph keep their place as a line in the record,
  // set like the Work Index, rather than as a screen of empty frame.
  const line = work => `<li><a class="record-line" href="${href(work)}"><span class="record-title">${escapeHTML(work.title)}</span><span class="record-meta">${meta(work)}</span></a></li>`;
  let firstPlate = true;
  const group = (label, list) => {
    if (!list.length) return '';
    const pictured = list.filter(w => w.images[0]), unpictured = list.filter(w => !w.images[0]);
    const id = `g-${label.toLowerCase()}`;
    const plates = pictured.map(w => { const html = plate(w, firstPlate); firstPlate = false; return html; }).join('');
    return `
  <section class="plates-group" aria-labelledby="${id}">
    <h2 class="plates-label" id="${id}"><span>${label}</span><span>${pad(list.length)}</span></h2>
    ${plates ? `<ul class="plates">${plates}</ul>` : ''}
    ${unpictured.length ? `${pictured.length ? '<p class="record-note">Photographs pending</p>' : ''}<ul class="record">${unpictured.map(line).join('')}</ul>` : ''}
  </section>`;
  };
  const first = works.find(w => w.images[0]);
  const body = `<main class="section paintings-archive">
  <div class="paintings-lede">
    <h1 class="section-title">Paintings</h1>
    <p class="meta">${pad(works.length)} works${available.length ? ` · ${pad(available.length)} available` : ''}</p>
  </div>
  ${group('Available', available)}
  ${group('Archive', rest)}
</main>`;
  return page({
    title: 'Paintings — Cole Calfee',
    description: 'Paintings by Cole Calfee: available work and the complete archive.',
    canonical: `${origin}/paintings/`,
    image: first ? sized(first.images[0].src, 1200) : null,
    body
  });
}

export function renderWork({ works, currency }, handle, origin) {
  const index = works.findIndex(w => w.handle === handle);
  if (index < 0) return null;
  const work = works[index];
  const prev = works[(index - 1 + works.length) % works.length];
  const next = works[(index + 1) % works.length];
  const [lead, ...more] = work.images;
  const price = formatPrice(work.price, currency);
  const rows = [
    ['Size', work.size],
    ['Status', status(work, currency)]
  ].filter(([, value]) => value);
  const acquire = work.status === 'available' && work.checkout
    ? `<a class="acquire" href="${escapeHTML(work.checkout)}" rel="noopener"><span>Acquire${price ? ` · ${price}` : ''}</span><span aria-hidden="true">→</span></a>
       <p class="note">Checkout is handled by Shopify. Shipping and tax are calculated there.</p>`
    : '';
  const body = `<main class="section painting">
  <nav class="painting-bar" aria-label="Paintings"><a href="/paintings/">← Paintings</a><span class="meta">${pad(index + 1)} / ${pad(works.length)}</span></nav>
  <div class="painting-layout">
    <figure class="painting-stage">${lead ? img(work, lead, { sizes: '(min-width: 900px) 58vw, calc(100vw - 36px)', eager: true, transition: true }) : pending(work, true)}</figure>
    <div class="painting-text">
      <h1 class="painting-title">${escapeHTML(work.title)}</h1>
      ${rows.length ? `<dl class="painting-record">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
      ${work.description.length ? `<div class="painting-notes">${work.description.map(line => `<p>${escapeHTML(line)}</p>`).join('')}</div>` : ''}
      ${acquire}
      <p class="painting-ask"><a href="mailto:${CONTACT}?subject=${encodeURIComponent(work.title)}">Ask about this painting ↗</a></p>
    </div>
  </div>
  ${more.length ? `<div class="painting-more">${more.map(image => `<figure class="painting-detail">${img(work, image, { sizes: '(min-width: 900px) 44vw, calc(100vw - 36px)' })}</figure>`).join('')}</div>` : ''}
  <nav class="painting-pager" aria-label="More paintings">
    <a href="/paintings/${encodeURIComponent(prev.handle)}/" rel="prev"><small>← Previous</small>${escapeHTML(prev.title)}</a>
    <a href="/paintings/${encodeURIComponent(next.handle)}/" rel="next"><small>Next →</small>${escapeHTML(next.title)}</a>
  </nav>
</main>`;
  const summary = [work.size, work.status === 'available' ? 'Available' : work.status === 'sold' ? 'Sold' : null].filter(Boolean).join(' · ');
  return page({
    title: `${work.title} — Cole Calfee`,
    description: `${work.title}, a painting by Cole Calfee.${summary ? ` ${summary}.` : ''}`,
    canonical: `${origin}/paintings/${encodeURIComponent(work.handle)}/`,
    image: lead ? sized(lead.src, 1200) : null,
    body
  });
}

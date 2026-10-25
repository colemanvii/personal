// The painting catalogue: Shopify's public storefront data, merged with the
// permanent registry in data/paintings.json.
//
// Prices and availability come only from Shopify, at request time. The
// registry holds titles alone, so every recorded painting keeps its place in
// the archive even when Shopify is unreachable or a listing is removed.

import registry from '../../data/paintings.json';

const DEFAULT_STORE = 'https://241880-3.myshopify.com';
const PAGE_SIZE = 250;
const TIMEOUT_MS = 4000;
// Edge-cache Shopify's answers briefly; sold work shows within five minutes.
const CACHE_SECONDS = 300;
// After a failed answer, skip Shopify for a minute so pages stay fast.
const RETRY_AFTER_MS = 60000;
let failedAt = 0;

const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slug = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function getJSON(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true }
  });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  const type = response.headers.get('Content-Type') || '';
  // A password-protected store answers with its HTML password page.
  if (!type.includes('json')) throw new Error(`${url} did not answer with JSON`);
  return response.json();
}

async function fetchProducts(store, collection) {
  const base = collection ? `${store}/collections/${encodeURIComponent(collection)}/products.json` : `${store}/products.json`;
  const products = [];
  for (let page = 1; page <= 10; page++) {
    const data = await getJSON(`${base}?limit=${PAGE_SIZE}&page=${page}`);
    const batch = Array.isArray(data.products) ? data.products : [];
    products.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return products;
}

// "36 × 48 in.", "36x48\"", "24 x 30 inches" in a title, option or description.
const SIZE = /(\d+(?:\.\d+)?)\s*(?:in\.?|"|″)?\s*[x×X]\s*(\d+(?:\.\d+)?)\s*(?:in\b\.?|inches|"|″)/;

function plainText(html) {
  return String(html || '')
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\s*(br|\/p|\/div|\/li|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, '\'')
    .replace(/&ldquo;|&rdquo;/g, '"').replace(/&times;/g, '×').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function fromProduct(product, store) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const available = variants.some(v => v.available === true);
  const forSale = variants.find(v => v.available === true) || variants[0];
  const description = plainText(product.body_html);
  const sizeSource = [product.title, ...variants.map(v => v.title), ...description].join(' \n ');
  const size = sizeSource.match(SIZE);
  const images = (product.images || [])
    .filter(image => image && image.src)
    .map(image => ({
      src: image.src.startsWith('//') ? `https:${image.src}` : image.src,
      width: Number(image.width) || null,
      height: Number(image.height) || null,
      alt: image.alt || ''
    }));
  return {
    handle: product.handle,
    title: product.title,
    images,
    size: size ? `${size[1]} × ${size[2]} in.` : null,
    description,
    status: available ? 'available' : 'sold',
    price: available && forSale ? forSale.price : null,
    checkout: available && forSale ? `${store}/cart/${forSale.id}:1` : null,
    published: product.published_at || product.created_at || null,
    listed: true
  };
}

export async function loadCatalogue(env = {}) {
  const store = (env.SHOPIFY_STORE_ORIGIN || DEFAULT_STORE).replace(/\/$/, '');
  let products = null, currency = null, problem = null;
  if (Date.now() - failedAt < RETRY_AFTER_MS) {
    problem = 'Shopify did not answer recently; showing the registry.';
  } else try {
    [products, currency] = await Promise.all([
      fetchProducts(store, env.SHOPIFY_COLLECTION),
      getJSON(`${store}/meta.json`).then(meta => meta.currency || null).catch(() => null)
    ]);
  } catch (error) {
    failedAt = Date.now();
    problem = String(error && error.message || error);
  }

  const listed = (products || []).map(product => fromProduct(product, store));
  // Prices are shown only when Shopify states its currency.
  if (!currency) listed.forEach(work => { work.price = null; });

  const byHandle = new Map(listed.map(work => [work.handle, work]));
  const byTitle = new Map(listed.map(work => [norm(work.title), work]));
  const unlisted = [];
  for (const record of registry.paintings) {
    const match = (record.handle && byHandle.get(record.handle)) || byTitle.get(norm(record.title));
    if (match) continue;
    unlisted.push({
      handle: record.handle || slug(record.title),
      title: record.title, images: [], size: null, description: [], status: null,
      price: null, checkout: null, published: null, listed: false
    });
  }

  const newest = (a, b) => String(b.published || '').localeCompare(String(a.published || ''));
  const works = [
    ...listed.filter(w => w.status === 'available').sort(newest),
    ...listed.filter(w => w.status === 'sold').sort(newest),
    ...unlisted
  ];
  return { works, currency, source: products ? 'shopify' : 'registry', problem };
}

export function formatPrice(amount, currency) {
  if (amount == null || !currency) return null;
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: value % 1 ? 2 : 0
  }).format(value);
}

// Shopify's CDN resizes on request; other hosts are left untouched.
export function sized(src, width) {
  try {
    const url = new URL(src);
    if (!/(^|\.)shopify\.com$|shopifycdn|myshopify\.com$/.test(url.hostname)) return src;
    url.searchParams.set('width', String(width));
    return url.toString();
  } catch (_) {
    return src;
  }
}

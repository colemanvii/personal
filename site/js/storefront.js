/* Shopify Storefront API client.
 *
 * colecalfee.com is the storefront; Shopify is only the commerce backend.
 * This uses Shopify's tokenless Storefront API access, which answers product
 * and checkout operations without credentials. Never place an Admin API token or
 * any other secret in this file: it is served to every visitor.
 *
 * Shopify stays authoritative for price and availability. Nothing here
 * caches stock beyond a page view. */

export const SHOP_DOMAIN = "241880-3.myshopify.com";
export const API_VERSION = "2026-10";
const ENDPOINT = `https://${SHOP_DOMAIN}/api/${API_VERSION}/graphql.json`;

export class StorefrontError extends Error {}

export async function storefront(query, variables = {}, {timeout = 12000} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {"Content-Type": "application/json", Accept: "application/json"},
      body: JSON.stringify({query, variables}),
      signal: controller.signal
    });
  } catch (_) {
    throw new StorefrontError(controller.signal.aborted ? "The shop took too long to respond." : "The shop could not be reached.");
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new StorefrontError(`The shop answered ${response.status}.`);
  const payload = await response.json();
  if (payload.errors?.length) throw new StorefrontError(payload.errors[0].message);
  return payload.data;
}

/* ---------- Products ---------- */

const IMAGE = "url altText width height";
const MONEY = "amount currencyCode";
const PRODUCT_FIELDS = `
  id handle title availableForSale tags productType
  options { name optionValues { name } }
  images(first: 12) { nodes { ${IMAGE} } }
  selectedOrFirstAvailableVariant { id }
  variants(first: 100) { nodes {
    id title availableForSale
    price { ${MONEY} }
    selectedOptions { name value }
    image { ${IMAGE} }
  } }`;

/* One request for any number of works, aliased by position. */
export async function fetchProducts(handles) {
  if (!handles.length) return new Map();
  const params = handles.map((_, i) => `$h${i}: String!`).join(", ");
  const fields = handles.map((_, i) => `w${i}: product(handle: $h${i}) { ${PRODUCT_FIELDS} }`).join("\n");
  const variables = Object.fromEntries(handles.map((h, i) => [`h${i}`, h]));
  const data = await storefront(`query Works(${params}) { ${fields} }`, variables);
  return new Map(handles.map((h, i) => [h, data[`w${i}`] || null]));
}

export function formatMoney(money) {
  if (!money) return "";
  const amount = Number(money.amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: money.currencyCode,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2
  }).format(amount);
}

/* Shopify's placeholder option for single-variant products is not a choice. */
export function choiceOptions(product) {
  return product.options.filter(o => !(o.name === "Title" && o.optionValues.length === 1 && o.optionValues[0].name === "Default Title"));
}

export function findVariant(product, selection) {
  return product.variants.nodes.find(v => v.selectedOptions.every(o => selection[o.name] === o.value)) || null;
}

export function initialSelection(product) {
  const variants = product.variants.nodes;
  const id = product.selectedOrFirstAvailableVariant?.id;
  const variant = variants.find(v => v.id === id) || variants.find(v => v.availableForSale) || variants[0];
  return Object.fromEntries((variant?.selectedOptions || []).map(o => [o.name, o.value]));
}

/* Could this option value lead to a purchasable variant, given the other choices? */
export function valueAvailable(product, selection, name, value) {
  const next = {...selection, [name]: value};
  return product.variants.nodes.some(v => v.availableForSale && v.selectedOptions.every(o => o.name === name ? o.value === value : next[o.name] === o.value));
}

/* Editioned prints may be bought in quantity; originals are one per cart.
 * Shopify marks a print with the tag "edition" or "print", or a product type
 * containing "print" or "edition". Everything else is treated as an original. */
export function isEdition(product) {
  return (product.tags || []).some(t => /^(edition|print)s?$/i.test(t.trim())) || /print|edition/i.test(product.productType || "");
}

export function priceLabel(product) {
  const prices = product.variants.nodes.filter(v => v.availableForSale).map(v => v.price);
  if (!prices.length) return "";
  const lowest = prices.reduce((a, b) => Number(b.amount) < Number(a.amount) ? b : a);
  const varies = prices.some(p => p.amount !== lowest.amount);
  return (varies ? "From " : "") + formatMoney(lowest);
}

/* Shopify's image CDN resizes on request. */
export function sizedImage(url, width) {
  try {
    const u = new URL(url);
    u.searchParams.set("width", String(width));
    return u.href;
  } catch (_) {
    return url;
  }
}

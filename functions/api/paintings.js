// /api/paintings — the merged catalogue as JSON, for checking what Shopify
// returned. `source` is "shopify" when the live catalogue answered and
// "registry" when only the permanent titles could be shown.
import { loadCatalogue } from '../_lib/catalogue.js';

export async function onRequestGet({ env }) {
  const { works, currency, source, problem } = await loadCatalogue(env);
  return new Response(JSON.stringify({ source, currency, problem, works }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

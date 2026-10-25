// /paintings/<handle>/ — one painting, addressed by its Shopify handle.
import { loadCatalogue } from '../_lib/catalogue.js';
import { renderWork } from '../_lib/paintings-view.js';

const HANDLE = /^[a-z0-9][a-z0-9-]*$/;

export async function onRequestGet({ request, env, params, next }) {
  const handle = String(params.handle || '');
  // Anything that is not a handle (a file, say) is left to static assets.
  if (!HANDLE.test(handle)) return next();
  const url = new URL(request.url);
  if (!url.pathname.endsWith('/')) return Response.redirect(`${url.origin}/paintings/${handle}/`, 301);
  const catalogue = await loadCatalogue(env);
  const html = renderWork(catalogue, handle, url.origin);
  if (!html) return next();
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Paintings-Source': catalogue.source
    }
  });
}

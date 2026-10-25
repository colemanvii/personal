// /paintings/ — the archive: available work first, then every other painting.
import { loadCatalogue } from '../_lib/catalogue.js';
import { renderArchive } from '../_lib/paintings-view.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.pathname === '/paintings') return Response.redirect(`${url.origin}/paintings/`, 301);
  const catalogue = await loadCatalogue(env);
  return new Response(renderArchive(catalogue, url.origin), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Short browser cache; Shopify answers are cached at the edge separately.
      'Cache-Control': 'public, max-age=60',
      'X-Paintings-Source': catalogue.source
    }
  });
}

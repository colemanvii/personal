/* Retired files answer 404.
 *
 * site/_routes.json sends only paths the site no longer publishes here; every
 * other request (the four pages, artwork, scripts, Shopify) is served as a
 * static file and never runs this code.
 *
 * Why a Function: some Cloudflare locations keep a stored copy of a deleted
 * file and serve it before rewrite rules or file lookup. A Function runs before
 * Pages serves any file, so the stored copy is never reached. */
export async function onRequest({request, env}) {
  // A path that has never existed: Pages answers it with site/404.html.
  const page = await env.ASSETS.fetch(new URL("/__gone", request.url));
  return new Response(request.method === "HEAD" ? null : page.body, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

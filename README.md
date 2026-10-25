# Cole Calfee

Personal portfolio: art, design, and photography.

[colecalfee.com](https://colecalfee.com)

## Work here

`main` holds the current static site. There is no build step or package installation.

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173`.

## Hosting

colecalfee.com is served by Cloudflare Pages (project `personal`) from `main`.
Vercel and GitHub Pages also build `main` but do not serve the domain.

- `functions/api/contact.js` — contact handler on Cloudflare Pages; needs the
  encrypted variable `RESEND_API_KEY`. Until it is set, About shows only the
  Email link. Mail is sent only for colecalfee.com and www.colecalfee.com,
  where the zone's rate-limiting rule on `POST /api/contact` applies; set
  `CONTACT_ANY_HOST=true` only for local testing.
- `api/contact.js` — the same handler for the Vercel deployment, which never
  serves the custom domain and so never sends.
- `404.html` — served with a 404 status for unknown paths; keep its links
  root-relative.

## Paintings and Shopify

`/paintings/` and `/paintings/<handle>/` are rendered by Cloudflare Pages
Functions from the Shopify store's public storefront data
(`/products.json` and `/meta.json`), cached at the edge for five minutes.

- Prices, availability and checkout links come only from Shopify. Nothing
  in this repository states a price or whether a work is available.
- `data/paintings.json` lists every painting with a record, by title (and
  Shopify handle where known), so each keeps its place in the archive even
  when Shopify is unreachable or a listing is removed. Add a title there
  when a painting should stay on record permanently.
- Sold paintings stay visible as long as their Shopify product stays
  published with zero inventory; do not delete or unpublish them.
- Sizes are read from the product title, variant or description
  (`36 × 48 in.`, `24 x 30 inches`). The description is shown as written.
- Optional Pages variables: `SHOPIFY_STORE_ORIGIN` (defaults to
  `https://241880-3.myshopify.com`) and `SHOPIFY_COLLECTION` (a collection
  handle, to show only that collection).
- `GET /api/paintings` returns the merged catalogue as JSON, with
  `source: "shopify"` or `"registry"`.

Pages Functions need Wrangler locally, run from the repository root:

```sh
npx wrangler pages dev . --port 8788
```

## Source map

- `index.html` — home
- `index/` — Work Index
- `paintings/` — rendered by `functions/paintings/`
- `about/` — personal information and contact (`/info/` redirects here)
- `functions/` — Cloudflare Pages Functions (`_lib/` is shared code)
- `data/paintings.json` — permanent painting registry
- `_redirects` — retired routes and where they now point
- `assets/css/site.css` — shared visual system; `paintings.css` for Paintings
- `assets/js/site.js` — shared script
- `assets/` — published artwork; `assets/web/` holds web versions of the
  print-size originals
- `archive/` — preserved older work
- `CNAME` — custom domain; preserve when publishing
- `REVIEW.md` — design direction and review brief

Keep the presentation simple, personable, and static. Add real work before adding more interface. Check home, Work Index, Paintings and About on desktop and mobile before publishing.

This is the current portfolio repository. Older site experiments belong in `colemanvii/colemanvii`.

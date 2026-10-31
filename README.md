# Cole Calfee

Personal portfolio: art, design, and photography.

[colecalfee.com](https://colecalfee.com)

## The public site

The approved public site is four pages, and nothing else:

| Page | URL | Source |
|---|---|---|
| Home | `/` | `site/index.html` |
| Index | `/index/` | `site/index/` |
| Available | `/paintings/` | `site/paintings/` |
| About | `/info/` | `site/info/` |

`site/` is the only directory that is deployed. It holds the four pages, their
assets (`site/assets/`) and the platform files:

- `site/_redirects` — retired routes, each sent (301) to the page that now holds its work
- `site/_routes.json` + `functions/[[path]].js` — every removed file answers 404, even at Cloudflare locations that still hold an old copy; nothing live ever runs this code
- `site/_headers` — `noindex` on `*.pages.dev` preview deployments
- `site/404.html` — served with status 404 for every unknown path
- `site/robots.txt`, `site/sitemap.xml`
- `site/assets/images/share.jpg` — the social sharing preview (a crop of the About photograph)

Everything else in the repository (tests, notes, retired pages, tooling) stays
in Git and is never served. `retired/` preserves older pages and source
material; see `retired/README.md`.

## Work here

There is no build step or package installation.

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory site
```

Open `http://127.0.0.1:4173`. A plain file server does not apply `_redirects`
or `404.html`; for those, run Cloudflare's own Pages server:

```sh
npx wrangler@3.114.0 pages dev --port 8788    # reads wrangler.toml → site/
```

## Deployment

Production is Cloudflare Pages (project `personal`), built from `main` with no
build command. `wrangler.toml` sets `pages_build_output_dir = "site"`, so only
`site/` is published. Every pull request gets a preview deployment at
`<id>.personal-7jh.pages.dev`; previews answer `X-Robots-Tag: noindex`.

`vercel.json` points the separate Vercel project at `site/` as well, so it can
never publish the repository root. Production does not use Vercel.

`CNAME` names the custom domain; keep it.

## Purchasing

colecalfee.com is the whole storefront; Shopify (`241880-3.myshopify.com`) is only the commerce backend and secure checkout. Available reads live price, images and availability from Shopify's tokenless Storefront API. **Purchase** creates a fresh Shopify checkout for that one work and hands the visitor to it; there is no on-site cart. No credentials are used or needed — never add an Admin API token to the site.

- `site/assets/js/storefront.js` — Storefront API client
- `site/assets/css/commerce.css` — purchase styles
- `site/paintings/purchase.js` — live wall labels, the viewer's sale line and the checkout handoff

`site/paintings/index.html` alone decides where each work hangs, in what order, and its catalogue number (`data-number` on its caption); Shopify never moves a work. Shopify decides only each work's live state: Available or Sold, price, and whether it can be purchased. When a painting sells it shows SOLD in place, with no purchase action, until the page is deliberately republished. If Shopify cannot be reached, the composition is unchanged, each work keeps its INQUIRE email link, and nothing is offered for sale. Sold paintings are archived in the Index (Paintings).

Each work names its Shopify product with `data-handle`. Tag a product `edition` (or give it a product type containing "print") to sell it in quantity with variant options; anything else is treated as a one-of-a-kind original.

## Tests

All of these run in CI on every change to `site/`, `tests/` or the deployment configuration (`.github/workflows/release-qa.yml`).

```sh
# Source and deployment contract (no network)
node --test tests/site/deploy.test.mjs tests/site/arrows.test.mjs tests/commerce/unit.test.mjs

# Browser QA at desktop, 390 × 844 and 375 × 667 (needs the file server above and Playwright)
node tests/site/release.e2e.cjs
node tests/site/no-scroll.e2e.cjs
node tests/site/independent-audit.e2e.cjs
node tests/site/about.e2e.cjs
node tests/site/artwork.e2e.cjs     # opens every Index entry and gallery; every image loads, nothing hotlinked
node tests/commerce/e2e.cjs         # live Shopify product reads; checkout is mocked, so nothing is created on Shopify

# HTTP contract: public pages 200, retired routes 301, internal files and unknown URLs 404
BASE_URL=http://127.0.0.1:8788 node tests/site/routes.e2e.cjs     # against wrangler pages dev
BASE_URL=https://colecalfee.com node tests/site/routes.e2e.cjs     # against production
```

CI's last job waits for Cloudflare to deploy the commit, then runs the HTTP contract against the real pull-request preview, or against colecalfee.com after a merge.

The real checkout is a separate, manual smoke test. Recurring CI never runs it. It clicks Purchase, lets Shopify create one real checkout, and stops the browser before the checkout page loads, so no payment or order is possible. Each run leaves one empty, abandoned checkout in Shopify. Run it on purpose from GitHub Actions → **Live checkout smoke test** → Run workflow, or locally:

```sh
CONFIRM_LIVE_CHECKOUT=yes BASE_URL=https://colecalfee.com node tests/commerce/live-checkout.smoke.cjs
```

Site rules the tests hold: arrows such as ↗ and ↔ carry U+FE0E so iOS draws them as type, never emoji; email links are wrapped in `<!--email_off-->` so Cloudflare does not obfuscate them; the four pages and the 404 page never scroll.

Keep the presentation simple, personable, and static. Add real work before adding more interface. Check every page on desktop and iPhone before publishing.

This is the current portfolio repository. Older site experiments belong in `colemanvii/colemanvii`.

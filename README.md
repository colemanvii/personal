# Cole Calfee

Personal portfolio: art, design, and photography.

[colecalfee.com](https://colecalfee.com)

## Work here

`main` holds the current static site. There is no build step or package installation.

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173`.

## Source map

- `index.html` — home
- `art/`, `design/`, `photos/` — work by discipline
- `info/` — personal information and contact
- `index/`, `work/` — existing supporting routes
- `assets/css/site.css` — shared visual system
- `assets/js/site.js` — shared script
- `assets/` — published artwork
- `archive/` — preserved older work
- `CNAME` — custom domain; preserve when publishing
- `REVIEW.md` — design direction and review brief

## Purchasing

colecalfee.com is the whole storefront; Shopify (`241880-3.myshopify.com`) is only the commerce backend and secure checkout. The paintings page reads live price, images and availability from Shopify's tokenless Storefront API, and keeps the cart in Shopify. No credentials are used or needed — never add an Admin API token to the site.

- `assets/js/storefront.js` — Storefront API client and cart store
- `assets/js/cart.js` — cart drawer and navigation count
- `assets/css/commerce.css` — purchase panel and cart styles
- `paintings/purchase.js` — live captions and the purchase panel in the enlarged view

The paintings page has two sections: Available Works and the Selected Archive. Each work is published in the section Shopify last reported, so nothing moves while inventory loads; when Shopify answers, any work whose availability changed moves to the other section, in catalogue order. If Shopify cannot be reached the published arrangement stays and nothing is offered for sale. After inventory changes, move the work's `<article>` to its new section in `paintings/index.html` so the published page matches again. Each work keeps its catalogue number (`data-number` on its caption) wherever it appears.

Each gallery work names its Shopify product with `data-handle`. Shopify decides what is for sale. Tag a product `edition` (or give it a product type containing "print") to sell it in quantity with variant options; anything else is treated as a one-of-a-kind original.

```sh
node --test tests/commerce/unit.test.mjs
node tests/commerce/e2e.cjs   # needs the local server above and Playwright; creates and empties a real cart, never places an order
```

Keep the presentation simple, personable, and static. Add real work before adding more interface. Check home and all discipline routes on desktop and mobile before publishing.

This is the current portfolio repository. Older site experiments belong in `colemanvii/colemanvii`.

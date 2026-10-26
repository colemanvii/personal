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

The paintings page has two sections: Available Works and the Selected Archive. The exhibition is curated; the transaction is dynamic. `paintings/index.html` alone decides where each work hangs, in what order, and its catalogue number (`data-number` on its caption); Shopify never moves a work. Shopify decides only each work's live state: its wall label (Available or Sold), price, and whether it can be added to the cart. When a painting sells it shows SOLD in place, with no purchase action, until its `<article>` is deliberately moved into the archive section and the page republished. If Shopify cannot be reached, the composition is unchanged and nothing is offered for sale.

Each gallery work names its Shopify product with `data-handle`. Shopify decides what is for sale. Tag a product `edition` (or give it a product type containing "print") to sell it in quantity with variant options; anything else is treated as a one-of-a-kind original.

```sh
node --test tests/commerce/unit.test.mjs
node tests/commerce/e2e.cjs   # needs the local server above and Playwright; creates and empties a real cart, never places an order
```

## Contact form

The note form on About posts to `/api/contact`, a Cloudflare Pages Function (`functions/api/contact.js`) on the same domain. It sends each note to colecalfee@gmail.com through Resend, from `contact@colecalfee.com`, with the visitor's address as Reply-To. The Resend key lives only in Cloudflare: Pages project → Settings → Variables and Secrets → `RESEND_API_KEY` (encrypted), set for both Production and Preview. Without it the endpoint answers 503 and the page says the note could not be sent; it never reports success unless Resend accepted the note. Spam protection is server-side: a hidden honeypot field, a minimum time on the page, a same-site Origin check, and size limits.

```sh
node --test tests/site/contact.test.mjs   # the endpoint, with Resend stubbed
```

Site checks: arrows such as ↗ and ↔ always carry U+FE0E so iOS draws them as type, never emoji, and the About page keeps its email and Instagram links and a working note form.

```sh
node --test tests/site/arrows.test.mjs
node tests/site/about.e2e.cjs   # needs the local server above and Playwright; BASE_URL=https://colecalfee.com checks production
```

Keep the presentation simple, personable, and static. Add real work before adding more interface. Check home and all discipline routes on desktop and mobile before publishing.

This is the current portfolio repository. Older site experiments belong in `colemanvii/colemanvii`.

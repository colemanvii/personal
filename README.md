# Cole Calfee

Portfolio: creative direction, identity, web, film, editorial and music.
[colecalfee.com](https://colecalfee.com)

The site is static HTML built with [Eleventy](https://www.11ty.dev) from the
files in `src/`. Images are resized and converted to AVIF and WebP at build
time with [sharp](https://sharp.pixelplumbing.com). The built site is written
to `site/`, which is what Cloudflare Pages publishes.

## Pages

| URL | Source |
| --- | --- |
| `/` | `src/landing.njk`: the landing page, one stationary viewport (see Permanent requirements) |
| `/index/` | `src/index.njk`: the index of every work |
| `/work/<name>/` | `src/work/<name>/index.md`, one per work |
| `/available/` | `src/available/index.njk`: paintings for sale (live price and checkout from Shopify) |
| `/info/` | `src/info/index.njk`: Contact, one stationary viewport, styled inline like `/` |
| `/404.html`, `/sitemap.xml`, `/robots.txt` | `src/` |

Site-wide settings (email, Instagram, location, the discipline list,
analytics) are in `src/_data/site.js`. `/` and `/info/` carry their own CSS inline;
every other page uses `src/assets/site.css`, whose first block holds every colour,
size and space. The whole site is Geist Mono at one size (12px), in two colours
(`#171717` on `#f8f8f6`), with no rules, accents or animation.

## Permanent requirements

**The home page is a fixed, single-viewport composition.** This is foundational, not
a style preference, and holds for every future design of `/`. At normal zoom, in
Safari, Chrome and mobile browsers, the home page must:

- occupy exactly one visible viewport, with no vertical or horizontal document scrolling;
- stay stationary: it must not move, bounce or re-centre when it is swiped, scrolled,
  or when mobile browser toolbars show or hide;
- have no entrance animation and no layout shift, including when the web font loads late;
- stay accessible when zoomed: if enlarged text no longer fits, the page scrolls and
  nothing is cut off.

How the current page meets it (`src/landing.njk`):

- Size the page with `min-height: 100svh` (the small viewport: the visible area with
  toolbars shown, which toolbars do not change), with `100%` as the fallback. Never size
  it with `dvh`, which changes as toolbars move and so moves anything centred in it, or
  with `vh`/`lvh`, which are taller than the visible area on phones.
- Centre with `margin: auto`, not `place-items: center`: auto margins give way when the
  content is taller than the screen, so nothing is pushed out of reach.
- Set `overscroll-behavior: none` on `html` so the page cannot bounce.
- Use no animations or transitions on the home page.

`tests/landing.e2e.cjs` enforces this on every pull request and every push to `main`,
at 16 desktop, tablet, phone, landscape and zoomed sizes. A change that breaks it fails CI.

## Screens

Every page after the home page extends it: it is composed as screens, not as a
scrolling portfolio.

- **A centred column** (`/info/`, `/index/`, `/404.html`): a heading, the content, and a
  closing row of links, centred in the viewport. On a laptop or desktop the Index is one screen.
- **Text beside media** (`/work/<name>/`, `/available/`): on a large screen the text sits
  still in the left third while the media passes on the right, each item centred in a
  viewport of its own. On a phone the text comes first and the media follows.
- **Every image is seen whole**: none is ever taller or wider than the viewport.
- Nothing is hidden to avoid scrolling. When content is longer than a screen (the Index on
  a phone, a work with many images) or text is zoomed, the page scrolls.

`tests/screens.e2e.cjs` enforces this at 11 desktop, tablet, phone and zoomed sizes.

## Add a work

1. Make a folder in `src/work/`. Its name becomes the URL: `src/work/new-project/` → `/work/new-project/`.
2. Put the images in it.
3. Add `index.md`:

```yaml
---
title: "New Project"
year: "2026"                     # or "2024–25", "2026–", "Ongoing"
disciplines: ["Identity", "Web"] # from the list in src/_data/site.js
role: "Creative direction"
client: "Client name"            # optional
link:                            # optional, an outside link under the details
  label: "Live website"
  href: "https://example.com/"
featured: false
order: 24                        # position on the index
draft: true                      # true keeps it off the site
media:
  - type: image                  # one image; size: narrow for 3/4 width
    src: "cover.jpg"
    alt: "What the image shows"
    caption: "Identity / Cover / 2026"
  - type: pair                   # desktop screenshot; the mobile one shows on phones
    desktop: "home-desktop.png"
    mobile: "home-mobile.png"
    alt: "Homepage"
    caption: "Website / Homepage / 2026"
  - type: grid                   # two or three side by side (stacked on phones)
    items:
      - { src: "a.jpg", alt: "…", caption: "…" }
      - { src: "b.jpg", alt: "…", caption: "…" }
    caption: "Optional caption under the set"
  - type: mark                   # a logo, shown small; use SVG
    src: "logo.svg"
    alt: "The logo"
  - type: video                  # Vimeo (no sound until played) …
    vimeo: "123456789"
    poster: "still.jpg"
    alt: "Film title"
  - type: video                  # … or a file in the folder
    src: "film.mp4"
    poster: "still.jpg"
    alt: "Film title"
  - type: film                   # a still that links to the full film
    src: "still.jpg"
    href: "https://vimeo.com/…"
    label: "Watch film"
    alt: "Film title"
  - type: placeholder            # a marked empty slot
    label: "Placeholder / Signage"
    ratio: "4/5"
---
Optional description, one or two sentences.
```

A work without `media` but with a `link` is listed on the index and links straight out.

4. Run `npm run build`. Set `draft: false` when it's ready.

Use images at least 1,170px wide (2,400px is ideal) and SVG for logos.
`MEDIA-REPORT.md` is rewritten on every build and lists any image that is too
small or has no alt text.

## Work locally

```sh
npm install
npm run dev          # http://localhost:8080, rebuilds on save
DRAFTS=1 npm run dev # include drafts
npm run build        # writes site/
```

The first build encodes every image and takes a few minutes. Later builds only
encode new or changed images.

## Deploy

Cloudflare Pages (project `personal`) publishes `site/` from `main`
(`wrangler.toml`). Pages has no build command today, so **run `npm run build`
and commit `site/` with your change**. CI fails a pull request whose `site/`
does not match `src/`.

To let Cloudflare build instead, set the Pages build command to
`npm ci && npm run build`. After that, `site/` no longer needs to be committed.

Every branch and pull request gets a preview at `<branch>.personal-7jh.pages.dev`.
Previews answer `X-Robots-Tag: noindex` (`src/_headers`).

`src/_redirects` keeps old URLs working. Legacy portfolio paths (`/index`,
`/projects`, `/art`, `/design`, `/photos`, `/work`, with or without a trailing slash
and anything beneath them) lead to the index at `/index/`; `/paintings/` and `/shop/`
lead to `/available/`; the three old project pages lead to their works. Old
`/index/#name` links are forwarded to the work's page by a script on the index.
`tests/routes.e2e.cjs` holds the whole contract.

## Tests

```sh
npm run build
python3 -m http.server 4173 --bind 127.0.0.1 --directory site &
npm test             # every page at 375, 390, 430, 768 and 1440px, then the home page
                     # held to one stationary viewport at 16 sizes, then every other
                     # page held to its screens at 11 sizes
```

Routing runs under Cloudflare's own Pages server, which reads `_redirects`:

```sh
npx wrangler pages dev --port 8788 &
npm run test:routes
```

The headless Chromium these tests use cannot show or hide real mobile browser
toolbars or reproduce Safari's elastic scrolling, so the landing test also checks the
CSS that prevents both. Check the home page on a real iPhone after changing it.

Old pages, source material and earlier experiments are kept in `retired/` and are never served.

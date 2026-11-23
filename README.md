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
| `/` | `src/index.njk`: the index of every work |
| `/work/<name>/` | `src/work/<name>/index.md`, one per work |
| `/available/` | `src/available/index.njk`: paintings for sale (live price and checkout from Shopify) |
| `/info/` | `src/info/index.njk` |
| `/404.html`, `/sitemap.xml`, `/robots.txt` | `src/` |

Site-wide settings (email, Instagram, location, the discipline list,
analytics) are in `src/_data/site.js`. The whole design is in
`src/assets/site.css`; its first block holds every colour, size, space and rule.

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
link:                            # optional, shown in red under the details
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
  - type: mark                   # a logo on the grey ground; use SVG
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

`src/_redirects` keeps old URLs working: `/index/` → `/`, `/paintings/` →
`/available/`, and `/projects/*` → their works. Old `/index/#name` links are
forwarded to the work's page by a script on the index.

## Tests

```sh
npm run build
python3 -m http.server 4173 --bind 127.0.0.1 --directory site &
npm test             # every page at 375, 390, 430, 768 and 1440px
```

Old pages, source material and earlier experiments are kept in `retired/` and are never served.

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
  Email link.
- `api/contact.js` — the same handler for the Vercel deployment.
- `404.html` — served with a 404 status for unknown paths; keep its links
  root-relative.

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

Keep the presentation simple, personable, and static. Add real work before adding more interface. Check home and all discipline routes on desktop and mobile before publishing.

This is the current portfolio repository. Older site experiments belong in `colemanvii/colemanvii`.

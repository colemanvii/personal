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

Keep the presentation simple, personable, and static. Add real work before adding more interface. Check home and all discipline routes on desktop and mobile before publishing.

This is the current portfolio repository. Older site experiments belong in `colemanvii/colemanvii`.

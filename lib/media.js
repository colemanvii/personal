// Renders a work's `media` list (from its front matter) to HTML.
//
// Types:
//   image        one image                     { src, alt, caption, size: full|narrow }
//   pair         desktop / mobile screenshot   { desktop, mobile, alt, mobileAlt, caption, size }
//   grid         two or three side by side     { items: [{ src, alt, caption }], caption }
//   mark         a logo on the media ground    { src, alt, caption, ratio, size }
//   video        Vimeo or a self-hosted file   { vimeo | src, poster, alt, caption, ratio }
//   film         a still that links to a film  { src, alt, href, label, caption }
//   placeholder  a marked empty slot           { label, ratio }
import fs from "node:fs";
import path from "node:path";
import { processImage, srcset, note, CRISP_WIDTH } from "./images.js";

const SIZES = {
  full: "(min-width: 1024px) 62vw, (min-width: 700px) calc(100vw - 48px), calc(100vw - 32px)",
  narrow: "(min-width: 1024px) 47vw, (min-width: 700px) 75vw, calc(100vw - 32px)",
  grid2: "(min-width: 1024px) 31vw, (min-width: 700px) 48vw, calc(100vw - 32px)",
  grid3: "(min-width: 1024px) 20vw, (min-width: 700px) 31vw, calc(100vw - 32px)",
  mobile: "75vw",
};

export const esc = s => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ARROW = '<span class="arrow" aria-hidden="true">↗&#xFE0E;</span>';

function caption(text, tag = "figcaption") {
  return text ? `<${tag} class="cap">${esc(text)}</${tag}>` : "";
}

// ctx: { dir, slug, title, first: { done } }
export async function picture(ctx, src, alt, sizes, { mark = false } = {}) {
  const file = path.join(ctx.dir, src);
  const img = await processImage(file);
  if (alt == null || alt === "") note({ work: ctx.slug, file: src, issue: "missing alt text" });
  if (!img.svg) {
    if (mark) note({ work: ctx.slug, file: src, issue: `raster logo (${img.width}px); supply an SVG` });
    else if (img.width < CRISP_WIDTH) note({ work: ctx.slug, file: src, issue: `${img.width} × ${img.height}px; re-export at ${CRISP_WIDTH}px wide or more` });
  }
  const eager = !ctx.first.done;
  ctx.first.done = true;
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  // A low-resolution source is never stretched past its own pixel width.
  const cap = img.svg || mark ? "" : ` style="--w:${img.width}px"`;
  const imgTag = `<img class="fade" src="${img.fallback}"${img.webp ? ` srcset="${srcset(img.webp)}" sizes="${sizes}"` : ""} width="${img.width}" height="${img.height}" alt="${esc(alt)}" ${load} decoding="async"${cap}>`;
  if (img.svg) return imgTag;
  return `<picture><source type="image/avif" srcset="${srcset(img.avif)}" sizes="${sizes}">${imgTag}</picture>`;
}

function placeholder(label, ratio) {
  return `<div class="ph" style="aspect-ratio:${esc(ratio || "4/3")}"><span class="cap">${esc(label || "Placeholder")}</span></div>`;
}

async function cell(ctx, it, sizes, asMark) {
  if (it.placeholder) return `<figure class="fig">${placeholder(it.placeholder, it.ratio)}${caption(it.caption)}</figure>`;
  const inner = await picture(ctx, it.src, it.alt, sizes, { mark: asMark });
  return asMark
    ? `<figure class="fig mark"><div class="frame" style="aspect-ratio:${esc(it.ratio || "1")}">${inner}</div>${caption(it.caption)}</figure>`
    : `<figure class="fig">${inner}${caption(it.caption)}</figure>`;
}

export async function renderMedia(ctx, m) {
  switch (m.type) {
    case "image": {
      const size = m.size === "narrow" ? "narrow" : "full";
      return `<figure class="fig ${size}">${await picture(ctx, m.src, m.alt, SIZES[size])}${caption(m.caption)}</figure>`;
    }
    case "pair": {
      const size = m.size === "narrow" ? "narrow" : "full";
      const desk = await picture(ctx, m.desktop, m.alt, SIZES[size]);
      if (!m.mobile) return `<figure class="fig ${size}">${desk}${caption(m.caption)}</figure>`;
      const mob = await picture(ctx, m.mobile, m.mobileAlt || m.alt, SIZES.mobile);
      return `<figure class="fig pair"><div class="on-desktop">${desk}</div><div class="on-mobile">${mob}</div>${caption(m.caption)}</figure>`;
    }
    case "grid": {
      const n = Math.min(Math.max(m.items.length, 2), 3);
      const sizes = n === 3 ? SIZES.grid3 : SIZES.grid2;
      const cells = [];
      for (const it of m.items) cells.push(await cell(ctx, it, sizes, m.marks));
      return `<div class="set"><div class="grid-${n}">${cells.join("")}</div>${caption(m.caption, "p")}</div>`;
    }
    case "mark": {
      const size = m.size === "narrow" ? "narrow" : "full";
      const inner = await picture(ctx, m.src, m.alt, SIZES[size], { mark: true });
      return `<figure class="fig mark ${size}"><div class="frame" style="aspect-ratio:${esc(m.ratio || "3/2")}">${inner}</div>${caption(m.caption)}</figure>`;
    }
    case "film": {
      const inner = await picture(ctx, m.src, m.alt, SIZES.full);
      return `<figure class="fig full"><a class="film" href="${esc(m.href)}" rel="noopener">${inner}<span class="play cap">${esc(m.label || "Watch film")} ${ARROW}</span></a>${caption(m.caption)}</figure>`;
    }
    case "video": {
      const ratio = esc(m.ratio || "16/9");
      if (m.vimeo) {
        const poster = m.poster ? await picture(ctx, m.poster, m.alt, SIZES.full) : "";
        return `<figure class="fig full"><a class="video" href="https://vimeo.com/${esc(m.vimeo)}" data-vimeo="${esc(m.vimeo)}" style="aspect-ratio:${ratio}" rel="noopener">${poster}<span class="play cap">Play</span></a>${caption(m.caption)}</figure>`;
      }
      const file = path.join(ctx.dir, m.src);
      const name = `${path.basename(ctx.dir)}-${path.basename(m.src)}`;
      fs.mkdirSync("site/media", { recursive: true });
      fs.copyFileSync(file, path.join("site/media", name));
      let posterAttr = "";
      if (m.poster) {
        const p = await processImage(path.join(ctx.dir, m.poster));
        posterAttr = ` poster="${p.fallback}"`;
      }
      return `<figure class="fig full"><video controls playsinline preload="none"${posterAttr} style="aspect-ratio:${ratio}" aria-label="${esc(m.alt)}"><source src="/media/${esc(name)}"></video>${caption(m.caption)}</figure>`;
    }
    case "placeholder":
      return `<figure class="fig full">${placeholder(m.label, m.ratio)}${caption(m.caption)}</figure>`;
    default:
      throw new Error(`${ctx.slug}: unknown media type "${m.type}"`);
  }
}

// The image a work leads with, for its Open Graph card.
export function leadImage(media = []) {
  for (const m of media) {
    if (m.type === "pair") return m.desktop;
    if (["image", "mark", "film"].includes(m.type)) return m.src;
    if (m.type === "video" && m.poster) return m.poster;
    if (m.type === "grid") { const it = m.items.find(i => i.src); if (it) return it.src; }
  }
  return null;
}

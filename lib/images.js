// Build-time image pipeline.
//
// Every raster source becomes AVIF + WebP at a set of widths, named by a hash of
// the source file so unchanged images are never re-encoded. SVG is copied as is.
// Dimensions come from the file itself, so every <img> reserves its exact space.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const OUT_DIR = "site/img";
const URL_DIR = "/img";
const WIDTHS = [480, 800, 1200, 1600, 2000, 2400];
const MAX_WIDTH = 2400;
// Full width on a 390px phone at 3x. Anything narrower can look soft.
export const CRISP_WIDTH = 1170;

sharp.cache(false);

const memo = new Map();
export const used = new Set();   // output files referenced by this build
export const report = [];        // low-resolution sources, for MEDIA-REPORT.md
export const ogUsed = new Set();  // Open Graph cards written by this build

function hashFile(file) {
  return crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 10);
}

async function encode(file, hash, meta) {
  const isSvg = meta.format === "svg";
  if (isSvg) {
    const name = `${hash}.svg`;
    const dest = path.join(OUT_DIR, name);
    if (!fs.existsSync(dest)) fs.copyFileSync(file, dest);
    used.add(name);
    return { svg: `${URL_DIR}/${name}` };
  }
  const top = Math.min(meta.width, MAX_WIDTH);
  const widths = [...new Set([...WIDTHS.filter(w => w < top), top])];
  const out = { avif: [], webp: [] };
  for (const w of widths) {
    for (const fmt of ["avif", "webp"]) {
      const name = `${hash}-${w}.${fmt}`;
      const dest = path.join(OUT_DIR, name);
      if (!fs.existsSync(dest)) {
        let pipe = sharp(file, { limitInputPixels: false }).rotate().resize({ width: w, withoutEnlargement: true });
        pipe = fmt === "avif" ? pipe.avif({ quality: 58, effort: 4 }) : pipe.webp({ quality: 82, effort: 5 });
        await pipe.toFile(dest);
      }
      used.add(name);
      out[fmt].push([`${URL_DIR}/${name}`, w]);
    }
  }
  return out;
}

// Returns { width, height, svg? , avif?, webp?, fallback }
export async function processImage(file) {
  if (memo.has(file)) return memo.get(file);
  const job = (async () => {
    if (!fs.existsSync(file)) throw new Error(`Image not found: ${file}`);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const meta = await sharp(file, { limitInputPixels: false }).metadata();
    // EXIF orientation 5–8 swaps the axes.
    const swap = meta.orientation >= 5;
    const width = swap ? meta.height : meta.width;
    const height = swap ? meta.width : meta.height;
    const enc = await encode(file, hashFile(file), meta);
    const fallback = enc.svg || (enc.webp.find(([, w]) => w >= 1200) || enc.webp.at(-1))[0];
    return { width, height, ...enc, fallback, format: meta.format };
  })();
  memo.set(file, job);
  return job;
}

export function srcset(list) {
  return list.map(([url, w]) => `${url} ${w}w`).join(", ");
}

export function note(entry) {
  const key = `${entry.work}|${entry.file}`;
  if (!report.some(r => `${r.work}|${r.file}` === key)) report.push(entry);
}

// Open Graph card: the lead image, whole, on the media ground. 1200 × 630.
// Returns the card's path on the site.
export async function ogCard(file, slug) {
  const name = `${slug}-${hashFile(file)}.jpg`;
  const dest = path.join("site/og", name);
  ogUsed.add(name);
  if (fs.existsSync(dest)) return `/og/${name}`;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const W = 1200, H = 630, PAD = 56;
  const art = await sharp(file, { limitInputPixels: false, density: 300 })
    .rotate()
    .resize({ width: W - PAD * 2, height: H - PAD * 2, fit: "inside" })
    .png()
    .toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: "#f3f3f1" } })
    .composite([{ input: art, gravity: "center" }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(dest);
  return `/og/${name}`;
}

// Remove encoded files no page uses any more.
export function prune() {
  if (!fs.existsSync(OUT_DIR)) return;
  for (const name of fs.readdirSync(OUT_DIR)) {
    if (!used.has(name)) fs.rmSync(path.join(OUT_DIR, name));
  }
}

/* Side-by-side iPhone captures of the three gallery directions.
 *
 *   python3 -m http.server 4173 --bind 127.0.0.1 &
 *   node tests/studies/capture.cjs out-dir
 *
 * Uses the real artwork from Shopify's CDN and refuses to continue if any
 * painting fails to load: a comparison of placeholders is no comparison. */
const {chromium, devices} = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUT = process.argv[2] || "study-captures";
const STUDIES = [
  ["1", "Editorial exhibition"],
  ["2", "Two-column collection"],
  ["3", "Compact collection, selected presence"]
];
const DEVICE = devices["iPhone 15"];
const DEPTH = 2400; // CSS pixels of gallery to show, about three and a half screens

async function loadedArtwork(page) {
  await page.waitForFunction(() => !document.querySelector('.sale[data-live="pending"]'), null, {timeout: 20000});
  // Full-page captures can miss lazy or undecoded images; load and decode every plate first.
  await page.$$eval(".gallery img", imgs => imgs.forEach(img => { img.loading = "eager"; }));
  await page.evaluate(() => Promise.all([...document.querySelectorAll(".gallery img")].map(img => img.decode().catch(() => {}))));
  // Bring every plate into view once so lazy images load, then return to the top.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate(y => scrollTo(0, y), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForFunction(() => [...document.querySelectorAll(".gallery img")].every(img => img.complete), null, {timeout: 30000});
  const broken = await page.$$eval(".gallery img", imgs => imgs.filter(img => !img.naturalWidth).map(img => img.alt));
  if (broken.length) throw new Error(`Artwork did not load (${broken.length}): ${broken.join("; ")}. Is cdn.shopify.com reachable?`);
}

async function run() {
  fs.mkdirSync(OUT, {recursive: true});
  const browser = await chromium.launch(process.env.HTTPS_PROXY ? {proxy: {server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost"}} : {});
  const shots = [];
  for (const [id, name] of STUDIES) {
    const context = await browser.newContext(DEVICE);
    const page = await context.newPage();
    await page.goto(`${BASE}/paintings/?study=${id}`);
    await loadedArtwork(page);
    const width = DEVICE.viewport.width;
    const opening = path.join(OUT, `study-${id}-gallery.png`);
    await page.screenshot({path: opening, fullPage: true, clip: {x: 0, y: 0, width, height: DEPTH}});
    const later = path.join(OUT, `study-${id}-gallery-later.png`);
    const top = await page.locator('.piece[data-handle="purple-haze"]').evaluate(el => el.getBoundingClientRect().top + scrollY - 40);
    await page.screenshot({path: later, fullPage: true, clip: {x: 0, y: top, width, height: DEPTH}});
    await page.locator('.piece[data-handle="red-sea"] .image-button').click();
    await page.locator("#painting-detail[open]").waitFor();
    await page.waitForFunction(() => document.getElementById("detail-image").complete && document.getElementById("detail-image").naturalWidth > 0, null, {timeout: 20000});
    const viewer = path.join(OUT, `study-${id}-viewer.png`);
    await page.screenshot({path: viewer});
    shots.push({id, name, opening, later, viewer});
    await context.close();
  }

  // One sheet: the three directions side by side, three rows.
  const sheet = await (await browser.newContext({viewport: {width: 1500, height: 1000}, deviceScaleFactor: 1})).newPage();
  const img = file => `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
  const column = (label, file) => `<figure><img src="${img(file)}"><figcaption>${label}</figcaption></figure>`;
  const row = (title, key) => `<h2>${title}</h2><div class="row">${shots.map(s => column(`${s.id}. ${s.name}`, s[key])).join("")}</div>`;
  await sheet.setContent(`<!doctype html><style>
    body{margin:0;padding:40px;background:#e9e7e1;font:13px "Helvetica Neue",Helvetica,Arial,sans-serif;color:#292725}
    h2{font:11px Monaco,Menlo,monospace;text-transform:uppercase;letter-spacing:.04em;color:#77736e;margin:0 0 14px}
    .row{display:grid;grid-template-columns:repeat(3,393px);gap:48px;margin-bottom:56px}
    figure{margin:0} figure img{display:block;width:393px;box-shadow:0 0 0 1px #d1cec6}
    figcaption{margin-top:10px}
  </style>${row("Gallery — opening", "opening")}${row("Gallery — later in the sequence", "later")}${row("Red Sea opened", "viewer")}`);
  await sheet.waitForFunction(() => [...document.images].every(i => i.complete));
  await sheet.screenshot({path: path.join(OUT, "directions-side-by-side.png"), fullPage: true});
  await browser.close();
  console.log(`Saved to ${OUT}`);
}

run().catch(error => { console.error(error.message); process.exit(1); });

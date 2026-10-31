/* Artwork inventory: every Index entry is opened and every gallery, viewer and
 * painting is stepped through in Chromium, recording every request.
 *
 *  - every request the pages make succeeds;
 *  - images come only from the site itself or Shopify's CDN (no hotlinks);
 *  - every image deployed under site/assets is shown somewhere, so nothing is
 *    published that the site does not use, and nothing the site uses is missing.
 *
 *   python3 -m http.server 4173 --bind 127.0.0.1 --directory site &
 *   node tests/site/artwork.e2e.cjs
 * INVENTORY=file.json writes the full request list (used for before/after evidence). */
const {chromium} = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const BASE = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const ORIGIN = new URL(BASE).origin;
const SITE = path.resolve(__dirname, "../../site");
const STEPS = ["available", "cowboyer", "drawings", "joseph", "kashus", "pair", "photo", "sold"];
/* Deployed images that are referenced only by metadata, never drawn on a page. */
const METADATA_ONLY = new Set(["assets/images/share.jpg"]);

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport: {width: 1440, height: 900}});
  const requests = new Map();
  const key = url => { const u = new URL(url); return (u.origin === ORIGIN ? "" : u.origin) + decodeURIComponent(u.pathname); };
  context.on("response", r => { const k = key(r.url()); if (!requests.has(k) || r.status() >= 400) requests.set(k, r.status()); });
  context.on("requestfailed", r => { const k = key(r.url()); if (!requests.has(k)) requests.set(k, `failed: ${r.failure()?.errorText}`); });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  const eager = () => page.evaluate(() => document.querySelectorAll("img").forEach(i => { i.loading = "eager"; }));
  const stepThrough = async (scope, rounds = 40) => {
    const selector = STEPS.map(k => `${scope} [data-${k}-step="1"]:visible`).join(", ");
    for (let i = 0; i < rounds; i++) {
      const buttons = page.locator(selector);
      const n = await buttons.count();
      if (!n) break;
      for (let j = 0; j < n; j++) await buttons.nth(j).click({timeout: 2000}).catch(() => {});
      await page.waitForTimeout(120);
    }
  };

  for (const route of ["/", "/info/"]) { await page.goto(BASE + route, {waitUntil: "networkidle"}); await eager(); await page.waitForTimeout(300); }

  await page.goto(BASE + "/index/", {waitUntil: "networkidle"});
  const clients = await page.$$eval(".index-table [data-client]", els => els.map(e => e.dataset.client));
  assert.equal(clients.length, 15, `Index has ${clients.length} expandable entries`);
  for (const client of clients) {
    const button = page.locator(`.index-table [data-client="${client}"]`);
    for (const p of ["0", "1"]) if (!await button.isVisible()) await page.locator(`[data-index-page="${p}"]`).click().catch(() => {});
    if (await button.getAttribute("aria-expanded") !== "true") await button.click();
    await eager();
    await page.waitForTimeout(250);
    await stepThrough(".work-panel.is-open");
    await page.waitForLoadState("networkidle").catch(() => {});
    const close = page.locator(".work-panel .panel-content:not([hidden]) .panel-close");
    if (await close.isVisible()) await close.click();
  }

  await page.goto(BASE + "/paintings/", {waitUntil: "networkidle"});
  await eager();
  await page.locator('[data-open="0"]').click();
  for (let i = 0; i < 4; i++) { await page.locator("#detail-next").click({timeout: 2000}).catch(() => {}); await page.waitForTimeout(250); }
  await page.waitForLoadState("networkidle").catch(() => {});
  await browser.close();

  const list = [...requests].map(([p, status]) => ({path: p, status})).sort((a, b) => a.path.localeCompare(b.path));
  if (process.env.INVENTORY) fs.writeFileSync(process.env.INVENTORY, JSON.stringify({clients, requests: list}, null, 1));

  let failed = 0;
  const check = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${String(e.message).split("\n").slice(0, 12).join("\n     ")}`); } };
  check("every request succeeds", () => assert.deepEqual(list.filter(r => ![200, 204, 304].includes(r.status)), []));
  check("images come only from the site and Shopify", () => {
    const foreign = list.filter(r => /\.(jpe?g|png|webp|gif|svg)$/i.test(r.path) && r.path.startsWith("http") && !r.path.startsWith("https://cdn.shopify.com/"));
    assert.deepEqual(foreign, []);
  });
  check("every deployed image is shown somewhere", () => {
    const shown = new Set(list.filter(r => r.path.startsWith("/")).map(r => r.path.slice(1)));
    const deployed = [];
    const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).forEach(e => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(jpe?g|png|webp|gif)$/i.test(e.name)) deployed.push(path.relative(SITE, full).split(path.sep).join("/"));
    });
    walk(path.join(SITE, "assets"));
    assert.deepEqual(deployed.filter(f => !shown.has(f) && !METADATA_ONLY.has(f)).sort(), [], "deployed but never shown");
  });
  check("no uncaught page errors", () => assert.deepEqual(errors, []));
  const images = list.filter(r => /\.(jpe?g|png|webp|gif|svg)$/i.test(r.path));
  console.log(`\n${clients.length} Index entries, ${images.length} images, ${list.length} requests; ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();

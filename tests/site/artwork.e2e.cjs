/* Artwork inventory: every Index entry is opened and every gallery, viewer and
 * painting is stepped through in Chromium, recording every request.
 *
 *  - every request the pages make succeeds. A preload the page itself cancels
 *    (a gallery stepping on before a slow image arrives: net::ERR_ABORTED) is
 *    not a failure if that file loaded elsewhere in the run; otherwise it is
 *    fetched again directly and must answer 200 with an image. HTTP errors and
 *    any other network failure always fail;
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
  const requests = new Map();   // path → worst HTTP status seen (an error is never overwritten by a later success)
  const loaded = new Set();      // paths that answered successfully at least once
  const canceled = new Map();    // path → URL, for requests the page itself aborted
  const failures = new Map();    // path → reason, for every other network failure
  const key = url => { const u = new URL(url); return (u.origin === ORIGIN ? "" : u.origin) + decodeURIComponent(u.pathname); };
  context.on("response", r => {
    const k = key(r.url());
    if (!requests.has(k) || r.status() >= 400) requests.set(k, r.status());
    if ([200, 204, 304].includes(r.status())) loaded.add(k);
  });
  const inflight = new Set();     // image requests still on the wire (including off-screen preloads)
  context.on("request", r => { if (r.resourceType() === "image") inflight.add(r); });
  context.on("requestfinished", r => inflight.delete(r));
  context.on("requestfailed", r => inflight.delete(r));
  context.on("requestfailed", r => {
    const k = key(r.url()), reason = r.failure()?.errorText || "unknown";
    if (/ERR_ABORTED/.test(reason)) canceled.set(k, r.url());
    else failures.set(k, reason);
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  const eager = () => page.evaluate(() => document.querySelectorAll("img").forEach(i => { i.loading = "eager"; }));
  /* Step like a visitor: after each click, wait (bounded) until the gallery has
     settled (no image request in flight, nothing aria-busy, every visible image
     finished) so a slow link cannot outrun the gallery. Stop once the gallery shows a view it has shown
     before (it has wrapped). A stuck image is still caught by the checks below. */
  const quiet = async (limit = 15000) => {
    const end = Date.now() + limit;
    while (inflight.size && Date.now() < end) await page.waitForTimeout(100);
  };
  const settle = async scope => { await page.waitForTimeout(50); await quiet(); await domSettled(scope); };
  const domSettled = scope => page.waitForFunction(sel => {
    const root = document.querySelector(sel);
    if (!root) return true;
    if (root.querySelector('[aria-busy="true"]') || root.matches('[aria-busy="true"]')) return false;
    return [...root.querySelectorAll("img")].filter(i => i.getBoundingClientRect().width > 0).every(i => i.complete);
  }, scope, {timeout: 15000}).catch(() => {});
  // A view is what a visitor sees: the visible images and the panel's text (titles, "03 / 12" counters).
  const view = scope => page.evaluate(sel => {
    const root = document.querySelector(sel);
    if (!root) return "";
    const srcs = [...root.querySelectorAll("img")].filter(i => i.getBoundingClientRect().width > 0).map(i => i.currentSrc || i.src);
    return srcs.join("|") + "\n" + root.innerText;
  }, scope);
  const stepThrough = async (scope, rounds = 40) => {
    const selector = STEPS.map(k => `${scope} [data-${k}-step="1"]:visible`).join(", ");
    await settle(scope);
    const seen = new Set([await view(scope)]);
    for (let i = 0; i < rounds; i++) {
      const buttons = page.locator(selector);
      const n = await buttons.count();
      if (!n) break;
      for (let j = 0; j < n; j++) {
        await buttons.nth(j).click({timeout: 2000}).catch(() => {});
        // Some galleries load the next image off-screen and swap it in only when ready,
        // so settle() waits for image requests on the wire, not just the visible DOM.
        await settle(scope);
      }
      const now = await view(scope);
      if (seen.has(now)) break;
      seen.add(now);
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

  /* A canceled preload proves nothing either way: unless the same file loaded
     elsewhere in the run, fetch it again directly and require a real image. */
  const recheck = [];
  for (const [path, url] of canceled) {
    if (loaded.has(path)) continue;
    const response = await context.request.get(url, {timeout: 30000}).catch(e => ({status: () => `failed: ${e.message}`, headers: () => ({})}));
    const type = response.headers()["content-type"] || "";
    if (response.status() === 200 && (type.startsWith("image/") || !/\.(jpe?g|png|webp|gif|svg)$/i.test(path))) { loaded.add(path); if (!requests.has(path)) requests.set(path, 200); }
    else recheck.push({path, status: response.status(), type});
  }
  await browser.close();

  for (const [path, reason] of failures) if (!loaded.has(path)) requests.set(path, `failed: ${reason}`);
  for (const path of canceled.keys()) if (!requests.has(path)) requests.set(path, loaded.has(path) ? 200 : "canceled, never loaded");
  const list = [...requests].map(([p, status]) => ({path: p, status})).sort((a, b) => a.path.localeCompare(b.path));
  if (process.env.INVENTORY) fs.writeFileSync(process.env.INVENTORY, JSON.stringify({clients, requests: list}, null, 1));

  let failed = 0;
  const check = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${String(e.message).split("\n").slice(0, 12).join("\n     ")}`); } };
  check("every request succeeds", () => assert.deepEqual(list.filter(r => ![200, 204, 304].includes(r.status)), []));
  check("every canceled preload is a real, reachable image", () => assert.deepEqual(recheck, []));
  check("images come only from the site and Shopify", () => {
    const foreign = list.filter(r => /\.(jpe?g|png|webp|gif|svg)$/i.test(r.path) && r.path.startsWith("http") && !r.path.startsWith("https://cdn.shopify.com/"));
    assert.deepEqual(foreign, []);
  });
  check("every deployed image is shown somewhere", () => {
    const shown = new Set([...loaded].filter(p => p.startsWith("/")).map(p => p.slice(1)));
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
  const rechecked = [...canceled.keys()].filter(p => !recheck.some(r => r.path === p)).length;
  console.log(`\n${clients.length} Index entries, ${images.length} images, ${list.length} requests; ${canceled.size} canceled preloads (${rechecked} confirmed as real images); ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();

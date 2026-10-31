/* Browser tests for Available (/paintings/) and its direct Shopify checkout.
 *
 * Run from the repository root with the site served from site/:
 *   python3 -m http.server 4173 --bind 127.0.0.1 --directory site &
 *   node tests/commerce/e2e.cjs
 * BASE_URL=https://colecalfee.com checks a deployment the same way.
 *
 * "live" tests read the real Shopify Storefront API. The purchase test lets the
 * page create a real Shopify cart, then stops the browser at the handoff to
 * Shopify checkout: checkout never loads and no order is placed.
 * "mocked" tests alter Shopify's answers to produce states the live catalog
 * cannot (Shopify unreachable, a work sold, checkout refused). */
const {chromium} = require("playwright");
const assert = require("node:assert/strict");

const BASE = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const API = "**/api/*/graphql.json";
const SHOP = "https://241880-3.myshopify.com/api/2026-10/graphql.json";
const VIEWPORTS = {
  desktop: {viewport: {width: 1440, height: 900}},
  "iphone-390": {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 3},
  "iphone-375": {viewport: {width: 375, height: 667}, isMobile: true, hasTouch: true, deviceScaleFactor: 2},
};
const HANDLES = ["red-sea", "flowers-in-mccarty-vase"];

let browser, failed = 0, passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (error) { failed++; console.log(`FAIL ${name}\n     ${String(error.stack || error).split("\n").slice(0, 4).join("\n     ")}`); }
}
async function withPage(viewport, fn, setup) {
  const context = await browser.newContext(VIEWPORTS[viewport]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  try {
    if (setup) await setup(page);
    await page.goto(`${BASE}/paintings/`, {waitUntil: "domcontentloaded"});
    await fn(page);
    assert.deepEqual(errors, [], "uncaught page errors");
  } finally { await context.close(); }
}
const settled = page => page.waitForFunction(() => !document.querySelector('.sale[data-live="pending"]') && document.querySelectorAll(".sale[data-state]").length === 2, null, {timeout: 20000});

/* What Shopify itself says right now, independent of the page. */
async function shopifyTruth() {
  const fields = HANDLES.map((h, i) => `w${i}: product(handle: "${h}") { availableForSale }`).join(" ");
  const response = await fetch(SHOP, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({query: `{ ${fields} }`})});
  const {data} = await response.json();
  return Object.fromEntries(HANDLES.map((h, i) => [h, data[`w${i}`]?.availableForSale ? "available" : "sold"]));
}

/* Pass Shopify's real answer through, changed by `edit`. */
function alterShopify(edit) {
  return page => page.route(API, async route => {
    const body = JSON.parse(route.request().postData() || "{}");
    const response = await route.fetch();
    const json = await response.json();
    await route.fulfill({response, json: edit(json, body) || json});
  });
}

(async () => {
  browser = await chromium.launch();
  const truth = await shopifyTruth();
  console.log("Shopify state:", JSON.stringify(truth));

  for (const viewport of Object.keys(VIEWPORTS)) {
    await test(`live/${viewport}: wall labels follow Shopify, in the page's own order`, () => withPage(viewport, async page => {
      await settled(page);
      const labels = await page.$$eval(".gallery .piece[data-handle]", pieces => pieces.map(p => {
        const sale = p.querySelector(".sale");
        return {handle: p.dataset.handle, number: p.querySelector(".caption").dataset.number, state: sale.dataset.state, text: sale.textContent.trim(), button: !!sale.querySelector("button.sale-open")};
      }));
      assert.deepEqual(labels.map(l => [l.handle, l.number]), [["red-sea", "01"], ["flowers-in-mccarty-vase", "02"]]);
      for (const label of labels) {
        assert.equal(label.state, truth[label.handle], `${label.handle} label`);
        if (label.state === "available") { assert.equal(label.text, "Purchase ↗"); assert.ok(label.button); }
        else { assert.equal(label.text, "Sold"); assert.ok(!label.button, "a sold work offers a purchase"); }
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "page scrolls sideways");
    }));

    await test(`live/${viewport}: the viewer shows Shopify's state, price and action, and steps between works`, () => withPage(viewport, async page => {
      await settled(page);
      await page.locator('[data-open="0"]').click();
      await page.waitForFunction(() => document.getElementById("detail-name").textContent.trim() === "Red Sea");
      const read = () => page.evaluate(() => ({
        name: document.getElementById("detail-name").textContent.trim(),
        state: document.getElementById("detail-state").dataset.state,
        price: document.getElementById("detail-price").textContent.trim(),
        action: document.querySelector("#detail-action .buy-add")?.textContent.trim(),
        actionHidden: document.getElementById("detail-action").hidden,
      }));
      for (const [handle, name] of [["red-sea", "Red Sea"], ["flowers-in-mccarty-vase", "Flowers in McCarty Vase"]]) {
        if (handle !== "red-sea") {
          await page.locator("#detail-next").click();
          await page.waitForFunction(n => document.getElementById("detail-name").textContent.trim() === n, name);
        }
        await page.waitForFunction(() => document.getElementById("detail-state").dataset.state);
        const v = await read();
        assert.equal(v.state, truth[handle], `${name} viewer state`);
        if (truth[handle] === "available") {
          assert.match(v.price, /\$[\d,]+/, `${name} has no price`);
          assert.equal(v.action, "Purchase ↗");
          assert.equal(v.actionHidden, false);
        } else assert.equal(v.actionHidden, true, `${name} is sold but offers an action`);
      }
      await page.locator("#detail-close").click();
      assert.equal(await page.locator("#painting-detail").evaluate(d => d.open), false);
    }));
  }

  for (const viewport of ["desktop", "iphone-390"]) {
    await test(`live/${viewport}: Purchase creates a Shopify checkout and hands off to it (stopped before checkout loads)`, () => withPage(viewport, async page => {
      const forSale = HANDLES.find(h => truth[h] === "available");
      if (!forSale) { console.log("     (skipped: nothing is for sale on Shopify right now)"); return; }
      let handoff = null, mutation = false;
      await page.route("**/*", route => {
        const r = route.request();
        if (r.url().includes("/graphql.json") && /cartCreate/.test(r.postData() || "")) mutation = true;
        if (r.isNavigationRequest() && r.frame() === page.mainFrame() && !r.url().startsWith(BASE)) { handoff = r.url(); return route.abort(); }
        return route.continue();
      });
      await settled(page);
      await page.locator(`#${forSale} .sale-open`).click();
      for (let i = 0; i < 100 && !handoff; i++) await page.waitForTimeout(150);
      assert.ok(mutation, "no cartCreate request was sent to Shopify");
      assert.ok(handoff, "the page did not hand off to checkout");
      const url = new URL(handoff);
      assert.equal(url.protocol, "https:");
      assert.match(url.hostname, /(myshopify\.com|shopify\.com|colecalfee\.com)$/, `handoff went to ${url.hostname}`);
      assert.match(url.pathname, /\/(cart\/c|checkouts?)\//, `handoff path ${url.pathname}`);
    }));
  }

  await test("mocked/iphone-375: Shopify unreachable keeps the composition and offers nothing for sale", () => withPage("iphone-375", async page => {
    // Wait for the page to give up on Shopify before judging what it offers.
    await page.locator('[data-open="0"]').click();
    await page.waitForFunction(() => document.querySelector(".buy-status")?.textContent.includes("could not be loaded"), null, {timeout: 20000});
    assert.equal((await page.locator("#detail-action .buy-add").textContent()).trim(), "Try again");
    await page.locator("#detail-close").click();
    const labels = await page.$$eval(".sale", s => s.map(x => ({text: x.textContent.trim(), mail: x.querySelector("a")?.getAttribute("href") || ""})));
    for (const l of labels) { assert.equal(l.text, "INQUIRE"); assert.match(l.mail, /^mailto:colecalfee@gmail\.com/); }
    assert.equal(await page.locator(".sale-open").count(), 0);
  }, page => page.route(API, route => route.abort())));

  await test("mocked/desktop: a work Shopify reports sold shows Sold where it hangs, with no action", () => withPage("desktop", async page => {
    await settled(page);
    assert.equal((await page.locator("#red-sea .sale").textContent()).trim(), "Sold");
    assert.equal(await page.locator("#red-sea .sale-open").count(), 0);
    await page.locator('[data-open="0"]').click();
    await page.waitForFunction(() => document.getElementById("detail-state").dataset.state === "sold");
    assert.equal(await page.locator("#detail-action").evaluate(a => a.hidden), true);
    assert.deepEqual(await page.$$eval(".gallery .piece", p => p.map(x => x.id)), ["red-sea", "flowers-in-mccarty-vase"], "a sold work moved");
  }, alterShopify(json => {
    if (json?.data?.w0) { json.data.w0.availableForSale = false; json.data.w0.variants.nodes.forEach(v => { v.availableForSale = false; }); }
  })));

  await test("mocked/desktop: a refused checkout says so, stays on the page and can be retried", () => withPage("desktop", async page => {
    let left = false;
    page.on("framenavigated", f => { if (f === page.mainFrame() && !f.url().startsWith(BASE)) left = true; });
    await settled(page);
    const button = page.locator(".sale-open").first();
    await button.click();
    await page.waitForFunction(() => document.querySelector(".buy-status")?.textContent.includes("Please try again"));
    assert.equal(left, false, "the page left for checkout");
    assert.equal(await button.isEnabled(), true, "the button stays disabled");
    assert.equal((await button.textContent()).trim(), "Purchase ↗");
  }, async page => {
    await alterShopify(json => json)(page);
    await page.route(API, async route => {
      if (/cartCreate/.test(route.request().postData() || "")) return route.fulfill({json: {data: {cartCreate: {cart: null, userErrors: [{message: "This work is no longer available."}]}}}});
      return route.fallback();
    });
  }));

  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();

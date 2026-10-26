/* Browser tests for the paintings purchase portal.
 *
 * Run from the repository root:
 *   python3 -m http.server 4173 --bind 127.0.0.1 &
 *   node tests/commerce/e2e.cjs
 *
 * "live" tests use the real Shopify Storefront API: they read real products
 * and create, change and empty a real cart. They stop at the checkout handoff
 * and never load or submit Shopify checkout, so no order is placed.
 * "mocked" tests intercept Shopify responses to produce states the live
 * catalog cannot (errors, slow responses, variants, a work selling mid-visit).
 *
 * Needs the playwright package and its Chromium. SCREENSHOTS=dir saves images. */
const {chromium, devices} = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const SHOTS = process.env.SCREENSHOTS;
const API = "**/api/2026-10/graphql.json";
const VIEWPORTS = {desktop: {viewport: {width: 1440, height: 900}}, iphone: devices["iPhone 15"]};

let browser;
const results = [];

async function shot(page, name) {
  if (SHOTS) await page.screenshot({path: path.join(SHOTS, `${name}.png`)});
}

async function withPage(viewport, fn) {
  const context = await browser.newContext(VIEWPORTS[viewport]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  try {
    await fn(page, context);
    assert.deepEqual(errors, [], "page threw errors");
  } finally {
    await context.close();
  }
}

async function test(name, fn) {
  try {
    await fn();
    results.push(["ok", name]);
    console.log(`ok   ${name}`);
  } catch (error) {
    results.push(["FAIL", name]);
    console.log(`FAIL ${name}\n     ${String(error.stack || error).split("\n").slice(0, 4).join("\n     ")}`);
  }
}

const caption = (page, handle) => page.locator(`.piece[data-handle="${handle}"] .sale`);
async function ready(page) {
  await page.goto(`${BASE}/paintings/`);
  await page.waitForFunction(() => !document.querySelector('.sale[data-live="pending"]'), null, {timeout: 20000});
}
async function open(page, handle) {
  await page.locator(`.piece[data-handle="${handle}"] .image-button`).click();
  await page.locator("#painting-detail[open]").waitFor();
}
/* Ask Shopify directly, from the browser, what is for sale right now. */
async function shopifyTruth(page, handles) {
  return page.evaluate(async handles => {
    const {fetchProducts, priceLabel} = await import("/assets/js/storefront.js");
    const map = await fetchProducts(handles);
    return Object.fromEntries([...map].map(([h, p]) => [h, p && {available: p.availableForSale, price: priceLabel(p)}]));
  }, handles);
}
async function emptyCart(page) {
  await page.evaluate(async () => {
    const {loadCart, removeLine, cartStore} = await import("/assets/js/storefront.js");
    await loadCart();
    for (const line of cartStore.cart?.lines.nodes || []) await removeLine(line.id);
  });
}
async function noHorizontalScroll(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `page scrolls sideways by ${overflow}px`);
}
/* Fully on screen, not merely rendered: catches actions pushed below Safari's visible area. */
async function onScreen(page, locator, label) {
  const box = await locator.boundingBox();
  const height = await page.evaluate(() => window.innerHeight);
  assert.ok(box && box.y >= 0 && box.y + box.height <= height, `${label} is off screen (${box && Math.round(box.y + box.height)} > ${height})`);
}
async function minTarget(locator, label) {
  const box = await locator.boundingBox();
  assert.ok(box && box.height >= 44, `${label} is ${box && box.height}px tall; needs 44px`);
}

/* Replace Shopify's answer for one operation, pass everything else through. */
async function intercept(page, rewrite) {
  await page.route(API, async route => {
    const body = route.request().postDataJSON();
    const response = await route.fetch();
    const json = await response.json();
    const replaced = await rewrite(body, json);
    await route.fulfill({response, json: replaced || json});
  });
}

const printVariants = [
  ["p1", "8 × 10 in.", "Unframed", "125.0", false],
  ["p2", "8 × 10 in.", "Framed", "225.0", true],
  ["p3", "16 × 20 in.", "Unframed", "275.0", true],
  ["p4", "16 × 20 in.", "Framed", "395.0", true]
];
function asPrintEdition(product) {
  return {
    ...product, tags: ["edition"],
    options: [
      {name: "Size", optionValues: [{name: "8 × 10 in."}, {name: "16 × 20 in."}]},
      {name: "Framing", optionValues: [{name: "Unframed"}, {name: "Framed"}]}
    ],
    selectedOrFirstAvailableVariant: {id: "gid://shopify/ProductVariant/p2"},
    variants: {nodes: printVariants.map(([id, size, framing, amount, availableForSale]) => ({
      id: `gid://shopify/ProductVariant/${id}`, title: `${size} / ${framing}`, availableForSale,
      price: {amount, currencyCode: "USD"}, image: null,
      selectedOptions: [{name: "Size", value: size}, {name: "Framing", value: framing}]
    }))}
  };
}

async function run() {
  browser = await chromium.launch(process.env.HTTPS_PROXY ? {proxy: {server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost"}} : {});

  for (const viewport of ["desktop", "iphone"]) {
    await test(`live/${viewport}: gallery captions match Shopify exactly`, () => withPage(viewport, async page => {
      await ready(page);
      const handles = await page.$$eval(".piece[data-handle]", ps => ps.map(p => p.dataset.handle));
      assert.equal(handles.length, 14);
      const truth = await shopifyTruth(page, handles);
      for (const handle of handles) {
        assert.ok(truth[handle], `${handle} is missing from Shopify`);
        const text = (await caption(page, handle).innerText()).trim();
        assert.equal(text, truth[handle].available ? truth[handle].price : "SOLD", handle);
      }
      assert.equal(await page.locator('a[href*="myshopify.com/products"]').count(), 0, "links out to the Shopify storefront");
      await noHorizontalScroll(page);
      // Commerce stays out of sight until someone chooses a work.
      assert.equal(await page.locator(".cart-toggle").isHidden(), true, "empty cart shows in the navigation");
      await shot(page, `${viewport}-1-gallery`);
    }));

    await test(`live/${viewport}: sold work opens without a purchase panel`, () => withPage(viewport, async page => {
      await ready(page);
      await open(page, "harvest");
      assert.equal(await page.locator(".buy").isHidden(), true);
      assert.match(await page.locator("#detail-info").innerText(), /SOLD$/);
    }));

    await test(`live/${viewport}: add to cart, persist, review, hand off to checkout, empty`, () => withPage(viewport, async page => {
      await ready(page);
      await emptyCart(page);
      await open(page, "red-sea");
      const add = page.locator(".buy-add");
      await add.waitFor();
      assert.equal(await page.locator(".buy-title").textContent(), "Red Sea");
      assert.equal(await page.locator(".buy-price").innerText(), "$2,400");
      assert.equal(await add.innerText(), "Add to cart");
      if (viewport === "iphone") {
        await onScreen(page, add, "Add to cart");
        await minTarget(add, "Add to cart");
        await minTarget(page.locator("#detail-close"), "Close");
        await shot(page, `${viewport}-2-panel`);
      } else await shot(page, `${viewport}-2-panel`);

      await add.click();
      await page.locator(".buy-status", {hasText: "Added to your cart."}).waitFor();
      assert.equal(await add.innerText(), "In your cart — view cart");
      assert.equal(await page.locator(".cart-toggle").innerText(), "Cart 1");
      if (viewport === "iphone") await onScreen(page, page.locator(".buy-status"), "Added message");
      await shot(page, `${viewport}-3-added`);

      // The cart belongs to Shopify and survives a reload.
      await page.reload();
      await page.locator(".cart-toggle:not([hidden])").waitFor();
      await page.locator(".cart-toggle").click();
      const cart = page.locator("dialog.cart-panel[open]");
      await cart.waitFor();
      assert.equal(await cart.locator(".cart-title").innerText(), "Red Sea");
      assert.equal(await cart.locator("[data-subtotal]").innerText(), "$2,400");
      if (viewport === "iphone") {
        await minTarget(cart.locator(".cart-checkout"), "Checkout");
        await minTarget(cart.locator(".cart-remove"), "Remove");
        await minTarget(cart.locator(".cart-close"), "Close cart");
      }
      await shot(page, `${viewport}-4-cart`);

      // Checkout is the only step that leaves colecalfee.com. Capture the handoff, do not load it.
      let handoff;
      await page.route("https://241880-3.myshopify.com/cart/c/**", route => { handoff = route.request().url(); route.abort(); });
      await cart.locator(".cart-checkout").click();
      await page.waitForFunction(() => true, null, {timeout: 500}).catch(() => {});
      await new Promise(r => setTimeout(r, 2500));
      assert.match(handoff || "", /^https:\/\/241880-3\.myshopify\.com\/cart\/c\/[^?]+\?key=/, "checkout handoff not requested");
      await page.unroute("https://241880-3.myshopify.com/cart/c/**");

      await page.goto(`${BASE}/paintings/`);
      await page.locator(".cart-toggle:not([hidden])").waitFor();
      await page.locator(".cart-toggle").click();
      await page.locator(".cart-remove").click();
      await page.locator("dialog.cart-panel.is-empty").waitFor();
      assert.equal(await page.locator(".cart-toggle").isHidden(), true);
      await shot(page, `${viewport}-5-empty`);
    }));
  }

  await test("live/desktop: a stale cart id starts a fresh cart", () => withPage("desktop", async page => {
    await page.goto(`${BASE}/paintings/`);
    await page.evaluate(() => localStorage.setItem("cc-shopify-cart", "gid://shopify/Cart/doesnotexist000?key=abc"));
    await ready(page);
    await open(page, "flowers-in-mccarty-vase");
    await page.locator(".buy-add", {hasText: "Add to cart"}).click();
    await page.locator(".buy-status", {hasText: "Added to your cart."}).waitFor();
    assert.notEqual(await page.evaluate(() => localStorage.getItem("cc-shopify-cart")), "gid://shopify/Cart/doesnotexist000?key=abc");
    await emptyCart(page);
  }));

  await test("mocked/iphone: slow Shopify shows a loading state", () => withPage("iphone", async page => {
    await page.route(API, async route => { await new Promise(r => setTimeout(r, 2500)); await route.continue(); });
    await page.goto(`${BASE}/paintings/`);
    await page.locator('.sale[data-live="pending"]').first().waitFor();
    await open(page, "red-sea");
    assert.equal(await page.locator(".buy-add").innerText(), "Checking availability…");
    assert.equal(await page.locator(".buy-add").isDisabled(), true);
    await shot(page, "iphone-6-loading");
    await page.locator(".buy-add", {hasText: "Add to cart"}).waitFor({timeout: 20000});
  }));

  await test("mocked/iphone: Shopify unreachable falls back, then recovers", () => withPage("iphone", async page => {
    await page.route(API, route => route.abort());
    await page.goto(`${BASE}/paintings/`);
    await page.waitForFunction(() => !document.querySelector('.sale[data-live="pending"]'));
    assert.equal(await caption(page, "red-sea").innerText(), "INQUIRE");
    await open(page, "red-sea");
    await page.locator(".buy-status", {hasText: "Live prices could not be loaded."}).waitFor();
    await shot(page, "iphone-7-error");
    await page.unroute(API);
    await page.locator(".buy-add", {hasText: "Try again"}).click();
    await page.locator(".buy-add", {hasText: "Add to cart"}).waitFor({timeout: 20000});
    assert.equal(await page.locator(".buy-price").innerText(), "$2,400");
  }));

  await test("mocked/iphone: print edition variants choose price and availability", () => withPage("iphone", async page => {
    await intercept(page, (body, json) => {
      if (!body.query.startsWith("query Works")) return;
      for (const [alias, handle] of Object.entries(body.variables)) {
        const key = "w" + alias.slice(1);
        if (handle === "red-sea") json.data[key] = asPrintEdition(json.data[key]);
      }
    });
    await ready(page);
    assert.equal(await caption(page, "red-sea").innerText(), "From $225");
    await open(page, "red-sea");
    assert.deepEqual(await page.locator(".buy-options legend").allTextContents(), ["Size", "Framing"]);
    assert.equal(await page.locator(".buy-price").innerText(), "$225");
    assert.match(await page.locator(".buy-state").innerText(), /edition print/i);
    await minTarget(page.locator(".buy-options label").first(), "Option");
    // 8 × 10 Unframed is sold out and says so.
    assert.equal(await page.locator(".buy-options label.is-unavailable").count(), 1);
    await page.locator(".buy-options label", {hasText: "16 × 20 in."}).click();
    assert.equal(await page.locator(".buy-price").innerText(), "$395");
    await page.locator(".buy-options label", {hasText: "Unframed"}).click();
    assert.equal(await page.locator(".buy-price").innerText(), "$275");
    assert.equal(await page.locator(".buy-add").innerText(), "Add to cart");
    await page.locator(".buy-options label", {hasText: "8 × 10 in."}).click();
    assert.equal(await page.locator(".buy-add").innerText(), "Sold out");
    assert.equal(await page.locator(".buy-add").isDisabled(), true);
    await shot(page, "iphone-8-variants");
  }));

  await test("mocked/desktop: a work that sells mid-visit is reported, not added", () => withPage("desktop", async page => {
    let sold = false;
    await intercept(page, (body, json) => {
      if (body.query.startsWith("mutation Create") || body.query.startsWith("mutation Add")) {
        sold = true;
        const name = body.query.startsWith("mutation Create") ? "cartCreate" : "cartLinesAdd";
        return {data: {[name]: {cart: null, userErrors: [], warnings: [{code: "MERCHANDISE_OUT_OF_STOCK", message: "The product 'Red sea' is already sold out."}]}}};
      }
      if (sold && body.query.startsWith("query Works") && json.data.w0?.handle === "red-sea") {
        json.data.w0.availableForSale = false;
        json.data.w0.variants.nodes.forEach(v => { v.availableForSale = false; });
      }
    });
    await ready(page);
    await open(page, "red-sea");
    await page.locator(".buy-add", {hasText: "Add to cart"}).click();
    await page.locator(".buy-status", {hasText: "This work has just sold."}).waitFor();
    await page.locator(".buy-add", {hasText: "Sold"}).waitFor();
    assert.equal(await caption(page, "red-sea").innerText(), "SOLD");
  }));

  await test("mocked/desktop: checkout is held when a cart line is no longer available", () => withPage("desktop", async page => {
    await ready(page);
    await emptyCart(page);
    await open(page, "red-sea");
    await page.locator(".buy-add", {hasText: "Add to cart"}).click();
    await page.locator(".buy-status", {hasText: "Added to your cart."}).waitFor();
    await intercept(page, (body, json) => {
      if (body.query.startsWith("query Cart") && json.data.cart) json.data.cart.lines.nodes.forEach(l => { l.merchandise.availableForSale = false; });
    });
    await page.locator(".buy-add").click(); // "In your cart — view cart"
    await page.locator("dialog.cart-panel[open] .cart-checkout").click();
    await page.locator(".cart-status", {hasText: "is no longer available"}).waitFor();
    assert.equal(await page.locator(".cart-checkout").isDisabled(), true);
    assert.equal(await page.locator(".cart-alert").innerText(), "NO LONGER AVAILABLE");
    await page.unroute(API);
    await emptyCart(page);
  }));

  await browser.close();
  const failed = results.filter(([s]) => s === "FAIL").length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

run().catch(async error => {
  console.error(error);
  await browser?.close();
  process.exit(1);
});

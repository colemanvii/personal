/* Browser tests for the paintings gallery and its purchase portal.
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
 * Needs the playwright package and its Chromium. SCREENSHOTS=dir saves images;
 * ONLY=text runs the tests whose names contain it.
 * STAND_IN_IMAGES=1 draws plain 4:5 tiles in place of artwork photographs, for
 * environments that cannot reach cdn.shopify.com. Every Shopify photograph of
 * these works is 4:5, so composition is true; the paintings themselves are not. */
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
const TONES = ["#c9c3b7", "#b8b2a6", "#d3cdc2", "#a9a397"];
function standIn(url) {
  const tone = TONES[[...url].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="${tone}"/></svg>`;
}

async function withPage(viewport, fn) {
  const context = await browser.newContext(VIEWPORTS[viewport]);
  if (process.env.STAND_IN_IMAGES) {
    await context.route("https://cdn.shopify.com/**", route => route.fulfill({contentType: "image/svg+xml", body: standIn(route.request().url())}));
  }
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
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return;
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
async function ready(page, url = "/paintings/") {
  await page.goto(`${BASE}${url}`);
  await page.waitForFunction(() => !document.querySelector('.sale[data-live="pending"]'), null, {timeout: 20000});
}
async function open(page, handle) {
  await page.locator(`.piece[data-handle="${handle}"] .image-button`).click();
  await page.locator("#painting-detail[open]").waitFor();
}
/* Ask Shopify directly, from the browser, what is for sale right now. */
async function shopifyTruth(page, handles) {
  return page.evaluate(async handles => {
    const {fetchProducts} = await import("/assets/js/storefront.js");
    const map = await fetchProducts(handles);
    return Object.fromEntries([...map].map(([h, p]) => [h, p && {available: p.availableForSale}]));
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
const viewerName = page => page.locator("#detail-name").innerText();
async function swipe(page, dx) {
  await page.evaluate(dx => {
    const target = document.querySelector("#painting-detail .full-art");
    const at = x => [new Touch({identifier: 1, target, clientX: x, clientY: 300})];
    target.dispatchEvent(new TouchEvent("touchstart", {touches: at(200), changedTouches: at(200), bubbles: true}));
    target.dispatchEvent(new TouchEvent("touchend", {touches: [], changedTouches: at(200 + dx), bubbles: true}));
  }, dx);
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
    await test(`live/${viewport}: wall labels match Shopify, with no prices and no store chrome`, () => withPage(viewport, async page => {
      await ready(page);
      const handles = await page.$$eval(".piece[data-handle]", ps => ps.map(p => p.dataset.handle));
      assert.equal(handles.length, 14);
      const truth = await shopifyTruth(page, handles);
      for (const handle of handles) {
        assert.ok(truth[handle], `${handle} is missing from Shopify`);
        assert.equal((await caption(page, handle).innerText()).trim(), truth[handle].available ? "AVAILABLE" : "SOLD", handle);
      }
      assert.equal(await page.locator(".gallery .sale").filter({hasText: "$"}).count(), 0, "a wall label shows a price");
      assert.equal(await page.locator('a[href*="myshopify.com/products"]').count(), 0, "links out to the Shopify storefront");
      assert.equal(await page.locator(".cart-toggle").isHidden(), true, "empty cart shows in the navigation");
      await noHorizontalScroll(page);
      await shot(page, `${viewport}-1-gallery`);
      if (viewport === "iphone") {
        // A sequence of plates: each painting spans the text column, and the page scrolls.
        const width = (await page.locator(".piece .image-button").first().boundingBox()).width;
        assert.ok(width >= 393 - 36 - 1, `plate is only ${width}px wide`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight * 4), "gallery does not scroll");
        await minTarget(page.locator('.piece[data-handle="red-sea"] .sale-open'), "Available label");
        await page.locator('.piece[data-handle="red-sea"]').scrollIntoViewIfNeeded();
        await shot(page, `${viewport}-1b-gallery-available`);
      } else {
        const cursor = await page.locator(".piece .image-button").first().evaluate(el => getComputedStyle(el).cursor);
        assert.match(cursor, /^url\(/, `cursor over a painting is ${cursor}`);
      }
    }));

    await test(`live/${viewport}: a sold work opens as a plate with its label, no purchase section`, () => withPage(viewport, async page => {
      await ready(page);
      await open(page, "harvest");
      assert.equal(await viewerName(page), "Harvest 1");
      assert.equal(await page.locator("#detail-state").innerText(), "SOLD");
      assert.equal(await page.locator(".buy").isHidden(), true);
      assert.equal(await page.locator("#detail-number").innerText(), "01 / 14");
      // Harvest 1 has two photographs in Shopify; both can be examined.
      assert.equal(await page.locator(".buy-views button").count(), 2);
      await shot(page, `${viewport}-2-sold`);
    }));

    await test(`live/${viewport}: moving between works`, () => withPage(viewport, async page => {
      await ready(page);
      await open(page, "harvest");
      await page.locator("#detail-next").click();
      assert.equal(await viewerName(page), "Porter Study");
      await page.locator("#detail-prev").click();
      await page.locator("#detail-prev").click();
      assert.equal(await viewerName(page), "Flowers in McCarty Vase", "previous from the first work wraps to the last");
      assert.equal(new URL(page.url()).hash, "#flowers-in-mccarty-vase");
      if (viewport === "iphone") {
        await swipe(page, -120);
        assert.equal(await viewerName(page), "Harvest 1", "swipe left shows the next work");
        await swipe(page, 120);
        assert.equal(await viewerName(page), "Flowers in McCarty Vase", "swipe right shows the previous work");
        await swipe(page, -20);
        assert.equal(await viewerName(page), "Flowers in McCarty Vase", "a small drag does not move");
        await minTarget(page.locator("#detail-next"), "Next");
        await minTarget(page.locator("#detail-close"), "Close");
      } else {
        await page.keyboard.press("ArrowRight");
        assert.equal(await viewerName(page), "Harvest 1");
        await page.keyboard.press("ArrowLeft");
        assert.equal(await viewerName(page), "Flowers in McCarty Vase");
      }
      await page.locator("#detail-close").click();
      // The dialog's close event, which clears the link, arrives just after the click.
      await page.waitForFunction(() => !document.getElementById("painting-detail").open && !location.hash, null, {timeout: 2000});
    }));

    await test(`live/${viewport}: a shared link opens that work`, () => withPage(viewport, async page => {
      await ready(page, "/paintings/#red-sea");
      await page.locator("#painting-detail[open]").waitFor();
      assert.equal(await viewerName(page), "Red Sea");
      await page.locator(".buy-add", {hasText: "Add to cart"}).waitFor();
    }));

    await test(`live/${viewport}: add to cart, persist, review${viewport === "desktop" ? ", hand off to checkout" : ""}, empty`, () => withPage(viewport, async page => {
      await ready(page);
      await emptyCart(page);
      await open(page, "red-sea");
      const add = page.locator(".buy-add");
      await add.waitFor();
      assert.equal(await viewerName(page), "Red Sea");
      assert.equal(await page.locator("#detail-info").innerText(), "Oil on canvas · 36 × 48 in.");
      assert.equal(await page.locator("#detail-state").innerText(), "ORIGINAL · AVAILABLE");
      assert.equal(await page.locator(".buy-price").innerText(), "$2,400");
      assert.equal(await add.innerText(), "Add to cart");
      await shot(page, `${viewport}-3-available`);
      if (viewport === "iphone") {
        // The painting comes first; the label begins on the first screen.
        await onScreen(page, page.locator("#detail-name"), "Title");
        await add.scrollIntoViewIfNeeded();
        await onScreen(page, add, "Add to cart");
        await minTarget(add, "Add to cart");
        await shot(page, `${viewport}-3b-available-label`);
      }

      await add.click();
      await page.locator(".buy-status", {hasText: "Added to your cart."}).waitFor();
      assert.equal(await add.innerText(), "In your cart — view cart");
      assert.equal(await page.locator(".cart-toggle").innerText(), "Cart 1");
      if (viewport === "iphone") await onScreen(page, page.locator(".buy-status"), "Added message");
      await shot(page, `${viewport}-4-added`);

      // The cart belongs to Shopify and survives a reload.
      await page.reload();
      await page.locator("#painting-detail[open]").waitFor(); // the URL still names the work
      assert.equal(await viewerName(page), "Red Sea");
      await page.locator("#detail-close").click();
      await page.locator(".cart-toggle:not([hidden])").waitFor();
      await page.locator(".cart-toggle").click();
      const cart = page.locator("dialog.cart-panel[open]");
      await cart.waitFor();
      assert.equal(await cart.locator(".cart-title").innerText(), "Red Sea");
      assert.equal(await cart.locator(".cart-number").innerText(), "NO. 13");
      assert.deepEqual(await cart.locator(".cart-meta").allInnerTexts(), ["Oil on canvas · 36 × 48 in.", "Original"]);
      assert.equal(await cart.locator(".cart-price").innerText(), "$2,400");
      assert.equal(await cart.locator("[data-subtotal]").innerText(), "$2,400");
      if (viewport === "iphone") {
        await onScreen(page, cart.locator(".cart-checkout"), "Checkout");
        await minTarget(cart.locator(".cart-checkout"), "Checkout");
        await minTarget(cart.locator(".cart-remove"), "Remove");
        await minTarget(cart.locator(".cart-close"), "Close cart");
      }
      await shot(page, `${viewport}-5-cart`);

      // Checkout handoff runs on desktop only: in Chromium's iPhone emulation, cancelling the
      // held checkout navigation races Chromium's error page (see tests/commerce/HARNESS.md).
      // The real handoff has been verified by hand on an iPhone.
      if (viewport === "desktop") {
        // Checkout is the only step that leaves colecalfee.com. Capture the handoff, do not load it.
        // Hold the request so the handoff can be seen, then cancel it. What the visitor
        // sees as the browser leaves is recorded at beforeunload, since the page cannot
        // be queried while a navigation is pending.
        await page.evaluate(() => addEventListener("beforeunload", () => {
          const note = document.querySelector(".cart-handoff");
          localStorage.setItem("test-handoff", JSON.stringify({text: note.textContent.replace(/\s+/g, " ").trim(), visible: note.checkVisibility()}));
        }));
        let held;
        const requested = new Promise(resolve => page.route("https://241880-3.myshopify.com/cart/c/**", route => { held = route; resolve(route.request().url()); }));
        await cart.locator(".cart-checkout").click();
        const handoff = await requested;
        assert.match(handoff, /^https:\/\/241880-3\.myshopify\.com\/cart\/c\/[^?]+\?key=/, "checkout handoff not requested");
        await held.abort();
        await page.unroute("https://241880-3.myshopify.com/cart/c/**");
        // Cancelling the navigation makes Chromium show its error page; let it settle first.
        await page.waitForURL(/^chrome-error:/, {timeout: 5000}).catch(() => {});
        await page.goto(`${BASE}/paintings/`);
        const seen = JSON.parse(await page.evaluate(() => localStorage.getItem("test-handoff")));
        assert.equal(seen.visible, true, "handoff message hidden while leaving");
        assert.match(seen.text, /Secure checkout Red Sea — \$2,400 Continuing to Shopify/);

        await page.locator(".cart-toggle:not([hidden])").waitFor();
        await page.locator(".cart-toggle").click();
      }
      await page.locator(".cart-remove").click();
      await page.locator("dialog.cart-panel.is-empty").waitFor();
      assert.equal(await page.locator(".cart-toggle").isHidden(), true);
      await shot(page, `${viewport}-7-empty`);
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
    await page.locator(".buy-add", {hasText: "Add to cart"}).waitFor({timeout: 20000});
  }));

  await test("mocked/iphone: Shopify unreachable falls back, then recovers", () => withPage("iphone", async page => {
    await page.route(API, route => route.abort());
    await page.goto(`${BASE}/paintings/`);
    await page.waitForFunction(() => !document.querySelector('.sale[data-live="pending"]'));
    assert.equal(await caption(page, "red-sea").innerText(), "INQUIRE");
    assert.equal(await caption(page, "harvest").innerText(), "SOLD");
    await open(page, "red-sea");
    await page.locator(".buy-status", {hasText: "Availability could not be loaded."}).waitFor();
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
    assert.equal(await caption(page, "red-sea").innerText(), "AVAILABLE");
    await open(page, "red-sea");
    assert.deepEqual(await page.locator(".buy-options legend").allTextContents(), ["Size", "Framing"]);
    assert.equal(await page.locator(".buy-price").innerText(), "$225");
    assert.match(await page.locator("#detail-state").innerText(), /edition print/i);
    await minTarget(page.locator(".buy-options label").first(), "Option");
    assert.equal(await page.locator(".buy-options label.is-unavailable").count(), 1);
    await page.locator(".buy-options label", {hasText: "16 × 20 in."}).click();
    assert.equal(await page.locator(".buy-price").innerText(), "$395");
    await page.locator(".buy-options label", {hasText: "Unframed"}).click();
    assert.equal(await page.locator(".buy-price").innerText(), "$275");
    assert.equal(await page.locator(".buy-add").innerText(), "Add to cart");
    await page.locator(".buy-options label", {hasText: "8 × 10 in."}).click();
    assert.equal(await page.locator(".buy-add").innerText(), "Sold out");
    assert.equal(await page.locator(".buy-add").isDisabled(), true);
    await page.locator(".buy-options").scrollIntoViewIfNeeded();
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

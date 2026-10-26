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

/* Works that hang in the site's own photographs rather than Shopify's. */
const OWN_PHOTOS = ["harvest", "harvest-2", "flowers-in-a-jug", "target"];

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
/* Every id on the page is unique, and the viewer's one #detail-image is the
   photograph of the work on show, never one left behind by an earlier visit. */
async function noStaleViewer(page, title) {
  const state = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map(el => el.id);
    const images = [...document.querySelectorAll("#detail-image")];
    const shown = document.querySelector('.viewer-slide[aria-hidden="false"] img');
    return {duplicates: [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))], count: images.length, onShow: images[0] === shown, alt: images[0]?.alt || ""};
  });
  assert.deepEqual(state.duplicates, [], `duplicate ids: ${state.duplicates.join(", ")}`);
  if (!title) return assert.ok(state.count <= 1, `${state.count} #detail-image elements`);
  assert.equal(state.count, 1, `${state.count} #detail-image elements`);
  assert.ok(state.onShow, "#detail-image is not the work on show");
  assert.ok(state.alt.startsWith(title), `#detail-image shows "${state.alt}", expected ${title}`);
  assert.equal(await viewerName(page), title);
}
const closeViewer = async page => {
  await page.locator("#detail-close").click();
  await page.waitForFunction(() => !document.getElementById("painting-detail").open);
};
/* A real touch drag across the painting strip, through Chromium's input pipeline,
   so the strip's own scroll snapping decides where it lands. dx < 0 drags left. */
async function swipe(page, dx) {
  const before = await viewerName(page);
  const box = await page.locator(".viewer-track").boundingBox();
  const x = Math.round(box.x + box.width / 2 - dx / 2), y = Math.round(box.y + box.height / 2);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [{x, y}]});
  for (let step = 1; step <= 10; step++) {
    await cdp.send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: [{x: Math.round(x + dx * step / 10), y}]});
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
  await cdp.detach();
  await page.waitForFunction(b => document.getElementById("detail-name").textContent !== b, before, {timeout: 2000}).catch(() => {});
  await page.waitForTimeout(250);
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
        // Direction 02: the archive in two even columns of 4:5 plates.
        const boxes = await page.locator(".gallery-archive .piece .image-button").evaluateAll(els => els.slice(0, 2).map(el => el.getBoundingClientRect().toJSON()));
        assert.ok(Math.abs(boxes[0].width - (393 - 36 - 14) / 2) <= 1, `plate is ${boxes[0].width}px wide`);
        assert.ok(Math.abs(boxes[0].height / boxes[0].width - 1.25) < 0.01, "plates are not 4:5");
        assert.equal(Math.round(boxes[0].top), Math.round(boxes[1].top), "the first two works do not share a row");
        // Approved crops reach the thumbnails only; held works keep their original framing.
        await page.$$eval(".gallery img", imgs => imgs.forEach(img => { img.loading = "eager"; }));
        await page.waitForFunction(() => [...document.querySelectorAll(".gallery img")].every(img => img.complete && img.currentSrc), null, {timeout: 20000});
        const framing = await page.$$eval(".piece", ps => Object.fromEntries(ps.map(p => [p.dataset.handle, p.querySelector(".image-button img").currentSrc.includes("crop=region")])));
        for (const handle of ["peach-circuit", "red-sea", "flowers-in-mccarty-vase", ...OWN_PHOTOS]) assert.equal(framing[handle], false, `${handle} is cropped but held`);
        assert.equal(Object.values(framing).filter(Boolean).length, 7, "expected 7 cropped thumbnails");
        // The site's own photographs hang whole, at the original's proportions.
        for (const handle of OWN_PHOTOS) {
          const img = await page.locator(`.piece[data-handle="${handle}"] .image-button img`).evaluate(img => ({src: img.currentSrc, w: img.naturalWidth, h: img.naturalHeight}));
          assert.ok(img.src.includes("/assets/paintings/"), `${handle} thumbnail is ${img.src}`);
          assert.ok(Math.abs(img.h / img.w - 1.25) < 0.005, `${handle} thumbnail is ${img.w}×${img.h}`);
        }
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
      assert.equal(await page.locator("#detail-action").isHidden(), true, "a sold work offers an action");
      assert.equal(await page.locator("#detail-price").innerText(), "", "a sold work shows a price");
      if (viewport === "iphone") await onScreen(page, page.locator(".label-sale"), "Sold line");
      assert.equal(await page.locator("#detail-number").innerText(), "01 / 14");
      // Harvest 1 has two photographs in Shopify; both can be examined.
      assert.equal(await page.locator(".buy-views button").count(), 2);
      // The viewer shows the site's own photograph, even once Shopify has answered;
      // Shopify's second photograph is still a view away, and the first view returns.
      const viewed = () => page.locator("#detail-image").evaluate(img => img.currentSrc || img.src);
      await page.waitForFunction(() => document.getElementById("detail-image").complete);
      assert.ok((await viewed()).includes("/assets/paintings/"), `viewer shows ${await viewed()}`);
      await page.locator(".buy-views button").nth(1).click();
      assert.ok((await viewed()).includes("Left.jpg"), `second view shows ${await viewed()}`);
      await page.locator(".buy-views button").nth(0).click();
      assert.ok((await viewed()).includes("/assets/paintings/"), `first view shows ${await viewed()}`);
      if (viewport === "desktop") {
        const thumb = await page.locator('.piece[data-handle="porter-study"] .image-button img').evaluate(img => img.currentSrc);
        assert.ok(thumb.includes("crop=region"), "desktop thumbnail lacks its approved crop");
      }
      await shot(page, `${viewport}-2-sold`);
    }));

    await test(`live/${viewport}: moving between works`, () => withPage(viewport, async page => {
      await ready(page);
      await open(page, "harvest");
      await page.locator("#detail-next").click();
      assert.equal(await viewerName(page), "Peace of Wild Things");
      await page.locator("#detail-prev").click();
      assert.equal(await viewerName(page), "Harvest 1");
      assert.equal(new URL(page.url()).hash, "#harvest");
      // The neighbouring works are named, across sections.
      assert.equal(await page.locator("#detail-prev").innerText(), "← Flowers in McCarty Vase");
      assert.equal(await page.locator("#detail-next").innerText(), "Peace of Wild Things →");
      if (viewport === "iphone") {
        await swipe(page, -260);
        assert.equal(await viewerName(page), "Peace of Wild Things", "dragging left shows the next work");
        assert.equal(new URL(page.url()).hash, "#harvest-2");
        await swipe(page, 260);
        assert.equal(await viewerName(page), "Harvest 1", "dragging right shows the previous work");
        await minTarget(page.locator("#detail-next"), "Next");
        await minTarget(page.locator("#detail-close"), "Close");
      } else {
        await page.keyboard.press("ArrowRight");
        assert.equal(await viewerName(page), "Peace of Wild Things");
        await page.keyboard.press("ArrowLeft");
        assert.equal(await viewerName(page), "Harvest 1");
      }
      // The sequence follows the page: Available Works, then the archive, numbers kept.
      await page.evaluate(() => document.getElementById("detail-close").click());
      await open(page, "red-sea");
      assert.equal(await page.locator("#detail-prev").isHidden(), true, "the first work on the page has nothing before it");
      assert.equal(await page.locator("#detail-number").innerText(), "13 / 14");
      await page.locator("#detail-next").click();
      assert.equal(await viewerName(page), "Flowers in McCarty Vase");
      await page.locator("#detail-next").click();
      assert.equal(await viewerName(page), "Harvest 1", "the archive follows the available works");
      assert.equal(await page.locator("#detail-number").innerText(), "01 / 14");
      await page.evaluate(() => document.getElementById("detail-close").click());
      await open(page, "peach-circuit");
      assert.equal(await page.locator("#detail-next").isHidden(), true, "the last work has nothing after it");
      await page.locator("#detail-close").click();
      // The dialog's close event, which clears the link, arrives just after the click.
      await page.waitForFunction(() => !document.getElementById("painting-detail").open && !location.hash, null, {timeout: 2000});
    }));

    await test(`live/${viewport}: opening, closing and switching never leaves a stale element`, () => withPage(viewport, async page => {
      await ready(page);
      await noStaleViewer(page);
      // Open, step, close; then open other works, the same work again, and step across sections.
      await open(page, "harvest");
      await noStaleViewer(page, "Harvest 1");
      await page.locator("#detail-next").click();
      await noStaleViewer(page, "Peace of Wild Things");
      await closeViewer(page);
      await noStaleViewer(page);
      await open(page, "target");
      await noStaleViewer(page, "Target");
      await closeViewer(page);
      await open(page, "target");
      await noStaleViewer(page, "Target");
      await page.locator("#detail-prev").click();
      await noStaleViewer(page, "Scout");
      if (viewport === "iphone") {
        await swipe(page, -260);
        await noStaleViewer(page, "Target");
        await swipe(page, 260);
        await noStaleViewer(page, "Scout");
      } else {
        await page.keyboard.press("ArrowRight");
        await noStaleViewer(page, "Target");
        await page.keyboard.press("ArrowLeft");
        await noStaleViewer(page, "Scout");
        // Escape closes the dialog natively; the next opening starts clean.
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => !document.getElementById("painting-detail").open);
        await noStaleViewer(page);
        await open(page, "red-sea");
        await noStaleViewer(page, "Red Sea");
      }
      for (const handle of ["peach-circuit", "harvest", "peach-circuit"]) {
        if (await page.locator("#painting-detail[open]").count()) await closeViewer(page);
        await open(page, handle);
        await noStaleViewer(page, handle === "harvest" ? "Harvest 1" : "Peach Circuit");
      }
      // The photograph on show is still the work's own, and its sale line still loads.
      await closeViewer(page);
      await open(page, "harvest-2");
      await noStaleViewer(page, "Peace of Wild Things");
      assert.ok((await page.locator("#detail-image").evaluate(img => img.currentSrc || img.src)).includes("/assets/paintings/"));
      assert.equal(await page.locator("#detail-state").innerText(), "SOLD");
      await closeViewer(page);
      await open(page, "red-sea");
      await page.waitForFunction(() => document.querySelector(".buy-add")?.textContent === "Add to cart", null, {timeout: 20000});
      await noStaleViewer(page, "Red Sea");
      // A shared link, then leaving the page and coming back with the browser's Back.
      await page.goto(`${BASE}/paintings/#fj40`);
      await page.reload();
      await page.locator("#painting-detail[open]").waitFor();
      await noStaleViewer(page, "FJ40");
      await closeViewer(page);
      await open(page, "nine-ball");
      await noStaleViewer(page, "Nine Ball");
      await closeViewer(page);
      await page.goto(`${BASE}/info/`);
      await page.goBack();
      await page.locator(".gallery .piece").first().waitFor();
      await noStaleViewer(page);
      await open(page, "little-window");
      await noStaleViewer(page, "Little Window");
      await page.goForward();
      assert.equal(new URL(page.url()).pathname, "/info/");
      await page.goBack();
      await page.locator(".gallery .piece").first().waitFor();
      await noStaleViewer(page, await page.locator("#painting-detail[open]").count() ? "Little Window" : undefined);
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
      assert.equal(await page.locator("#detail-medium").innerText(), "Oil on canvas");
      assert.equal(await page.locator("#detail-size").innerText(), "36 × 48 in. / 91.4 × 121.9 cm");
      assert.equal(await page.locator("#detail-year").isHidden(), true, "a year shows without one being supplied");
      assert.equal(await page.locator("#detail-state").innerText(), "AVAILABLE");
      assert.equal(await page.locator(".buy-price").innerText(), "$2,400");
      assert.equal(await add.innerText(), "Add to cart");
      await shot(page, `${viewport}-3-available`);
      if (viewport === "iphone") {
        // The painting first, and its whole label with the action on the same screen.
        for (const [selector, name] of [["#detail-name", "Title"], ["#detail-medium", "Medium"], ["#detail-size", "Size"], [".label-sale", "Sale line"], ["#detail-price", "Price"], [".buy-add", "Add to cart"]]) {
          await onScreen(page, page.locator(selector), name);
        }
        // As much painting as the screen allows: wider than the gallery margins, never cropped.
        const slide = await page.locator("#detail-image").boundingBox();
        assert.ok(slide.width >= 360, `painting is only ${slide.width}px wide`);
        assert.ok(Math.abs(slide.height / slide.width - 1.25) < 0.01, "painting proportions changed");
        await minTarget(add, "Add to cart");
        await shot(page, `${viewport}-3b-available-label`);
      }

      await add.click();
      await page.locator(".buy-status", {hasText: "Added to your cart."}).waitFor();
      assert.equal(await add.innerText(), "In your cart");
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

  /* The exhibition is curated, the transaction dynamic: the published HTML
     decides where each work hangs; Shopify only changes its state. */
  const PUBLISHED = {
    available: [["red-sea", "13"], ["flowers-in-mccarty-vase", "14"]],
    // Harvest 1 and Peace of Wild Things hang as a pair; Porter Study follows. Numbers never change.
    archive: [["harvest", "01"], ["harvest-2", "03"], ["porter-study", "02"], ...["flowers-in-a-jug", "nine-ball", "little-window", "zen-bison", "fj40", "scout", "target", "purple-haze", "peach-circuit"].map((h, i) => [h, String(i + 4).padStart(2, "0")])]
  };
  const sections = async page => ({
    available: await page.$$eval(".gallery-available .piece", ps => ps.map(p => [p.dataset.handle, p.querySelector(".caption").dataset.number])),
    archive: await page.$$eval(".gallery-archive .piece", ps => ps.map(p => [p.dataset.handle, p.querySelector(".caption").dataset.number]))
  });
  const where = page => page.$$eval(".piece", ps => ps.map(p => { const r = p.getBoundingClientRect(); return [p.id, Math.round(r.top + scrollY), Math.round(r.left)]; }));
  /* Rewrite Shopify's answer: handles listed are reported available (true) or sold (false). */
  const inventory = states => (body, json) => {
    if (!body.query.startsWith("query Works")) return;
    for (const [alias, handle] of Object.entries(body.variables)) {
      const product = json.data["w" + alias.slice(1)];
      if (!product || !(handle in states)) continue;
      product.availableForSale = states[handle];
      product.variants.nodes.forEach(v => { v.availableForSale = states[handle]; });
    }
  };

  for (const viewport of ["desktop", "iphone"]) {
    await test(`live/${viewport}: the published HTML places every work; Shopify only labels it`, () => withPage(viewport, async page => {
      await ready(page);
      assert.deepEqual(await sections(page), PUBLISHED);
      assert.equal(await page.locator("#available-works .section-count").innerText(), "2 WORKS");
      assert.equal(await page.locator("#selected-archive .section-count").innerText(), "12 WORKS");
      // Labels follow live Shopify state wherever a work hangs.
      const handles = [...PUBLISHED.available, ...PUBLISHED.archive].map(([h]) => h);
      const truth = await shopifyTruth(page, handles);
      for (const handle of handles) assert.equal((await caption(page, handle).innerText()).trim(), truth[handle].available ? "AVAILABLE" : "SOLD", handle);
      if (viewport === "iphone") {
        const plate = await page.locator(".gallery-available .image-button").first().boundingBox();
        assert.ok(plate.width >= 393 - 36 - 1, "available works lack presence on iPhone");
      } else {
        // Desktop: the available works hang as one centred pair, 390 px plates 48 px apart,
        // top-aligned, captions as wide as their paintings; the archive fills its columns.
        const plates = await page.$$eval(".gallery-available .piece", ps => ps.map(p => {
          const img = p.querySelector(".image-button").getBoundingClientRect(), cap = p.querySelector(".caption").getBoundingClientRect();
          return {left: img.left, right: img.right, top: img.top, width: img.width, capLeft: cap.left, capWidth: cap.width};
        }));
        const head = await page.locator("#available-works .section-head").boundingBox();
        assert.equal(plates.length, 2);
        for (const p of plates) {
          assert.ok(Math.abs(p.width - 390) <= 2, `available plate is ${p.width}px wide`);
          assert.ok(Math.abs(p.capLeft - p.left) <= 1 && Math.abs(p.capWidth - p.width) <= 1, "a caption does not align with its painting");
        }
        assert.ok(Math.abs(plates[1].left - plates[0].right - 48) <= 2, `gap is ${plates[1].left - plates[0].right}px`);
        assert.equal(Math.round(plates[0].top), Math.round(plates[1].top), "the pair is not top-aligned");
        const leftSpace = plates[0].left - head.x, rightSpace = head.x + head.width - plates[1].right;
        assert.ok(Math.abs(leftSpace - rightSpace) <= 2, `pair is off-centre (${leftSpace}px vs ${rightSpace}px)`);
        const [archivePlate, archiveColumn] = await page.locator(".gallery-archive .piece").first().evaluate(el => [el.querySelector(".image-button").getBoundingClientRect().width, el.getBoundingClientRect().width]);
        assert.ok(Math.abs(archivePlate - archiveColumn) <= 1, "archive plates no longer fill their columns");
      }
    }));

    await test(`mocked/${viewport}: inventory changes update state in place and never move a work`, () => withPage(viewport, async page => {
      // Shopify reports Red Sea sold and Harvest 1 available; the page must not rearrange.
      await page.route(API, async route => {
        const body = route.request().postDataJSON();
        await new Promise(r => setTimeout(r, 1200));
        const response = await route.fetch();
        const json = await response.json();
        inventory({"red-sea": false, "harvest": true})(body, json);
        await route.fulfill({response, json});
      });
      await page.goto(`${BASE}/paintings/`);
      await page.locator('.sale[data-live="pending"]').first().waitFor();
      const before = await where(page);
      await page.waitForFunction(() => !document.querySelector('.sale[data-live="pending"]'), null, {timeout: 20000});
      assert.deepEqual(await where(page), before, "a work moved when inventory changed");
      assert.deepEqual(await sections(page), PUBLISHED);
      assert.equal(await page.locator("#available-works .section-count").innerText(), "2 WORKS");
      // Red Sea: SOLD where it hangs, no purchase.
      assert.equal(await caption(page, "red-sea").innerText(), "SOLD");
      await open(page, "red-sea");
      assert.equal(await page.locator("#detail-number").innerText(), "13 / 14");
      assert.equal(await page.locator("#detail-state").innerText(), "SOLD");
      assert.equal(await page.locator("#detail-action").isHidden(), true, "a sold work is offered for sale");
      assert.equal(await page.locator("#detail-price").innerText(), "");
      // The viewer's sequence is the published one.
      await page.locator("#detail-next").click();
      assert.equal(await viewerName(page), "Flowers in McCarty Vase");
      await page.locator("#detail-next").click();
      assert.equal(await viewerName(page), "Harvest 1");
      // Harvest 1: Shopify decides it can be bought, in its archive position.
      assert.equal(await caption(page, "harvest").innerText(), "AVAILABLE");
      assert.equal(await page.locator(".buy-add").innerText(), "Add to cart");
    }));
  }

  for (const viewport of ["desktop", "iphone"]) {
    await test(`live/${viewport}: Harvest 1 and Peace of Wild Things hang side by side`, () => withPage(viewport, async page => {
      await ready(page);
      const order = await page.$$eval(".gallery-archive .piece", ps => ps.map(p => p.id));
      assert.equal(order.indexOf("harvest-2"), order.indexOf("harvest") + 1, "the pair is not adjacent in the page");
      const box = id => page.locator(`#${id} .image-button`).boundingBox();
      const [a, b] = [await box("harvest"), await box("harvest-2")];
      assert.equal(Math.round(a.y), Math.round(b.y), "the pair does not share a row");
      assert.ok(b.x > a.x + a.width, "Peace of Wild Things is not beside Harvest 1");
      assert.equal(await page.locator("#harvest .caption").getAttribute("data-number"), "01");
      assert.equal(await page.locator("#harvest-2 .caption").getAttribute("data-number"), "03");
      if (viewport === "desktop") {
        const c = await box("porter-study");
        assert.equal(Math.round(c.y), Math.round(a.y), "Porter Study does not complete the first archive row");
        assert.ok(c.x > b.x + b.width, "Porter Study is not third in the row");
      }
    }));
  }

  await test("mocked/desktop: with nothing for sale, the composition stays and nothing can be bought", () => withPage("desktop", async page => {
    await intercept(page, inventory(Object.fromEntries([...PUBLISHED.available, ...PUBLISHED.archive].map(([h]) => [h, false]))));
    await ready(page);
    assert.equal(await page.locator("#available-works").isVisible(), true);
    assert.deepEqual(await sections(page), PUBLISHED);
    assert.equal(await page.locator(".gallery .sale", {hasText: "Available"}).count(), 0);
    await open(page, "flowers-in-mccarty-vase");
    assert.equal(await page.locator("#detail-state").innerText(), "SOLD");
    assert.equal(await page.locator("#detail-action").isHidden(), true);
  }));

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
    // The published arrangement stays; nothing can be bought until Shopify confirms it.
    assert.deepEqual(await sections(page), PUBLISHED, "the composition changed without Shopify");
    await open(page, "harvest");
    assert.equal(await page.locator(".buy-add", {hasText: "Add to cart"}).count(), 0, "a work is offered for sale without Shopify");
    await page.evaluate(() => document.getElementById("detail-close").click());
    await open(page, "red-sea");
    assert.equal(await page.locator(".buy-add", {hasText: "Add to cart"}).count(), 0, "a work is offered for sale without Shopify");
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
    // Sold where it hangs: no action, its explanation still in view.
    await page.locator("#detail-state", {hasText: "SOLD"}).waitFor();
    assert.equal(await page.locator("#detail-action").isHidden(), true);
    assert.equal(await page.locator(".buy-status").isVisible(), true, "the reason it sold vanished");
    assert.equal(await caption(page, "red-sea").innerText(), "SOLD");
    assert.ok(await page.locator('.gallery-available .piece[data-handle="red-sea"]').count(), "the sold work left its place");
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
    await page.locator(".buy-add").click(); // "In your cart"
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

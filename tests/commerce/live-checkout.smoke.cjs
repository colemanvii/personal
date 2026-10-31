/* Live checkout smoke test. MANUAL ONLY — never part of recurring CI.
 *
 * Clicks Purchase on a work Shopify reports available, lets the page create a
 * REAL Shopify checkout, and stops the browser at the handoff: the checkout
 * page never loads, nothing is entered and no payment or order can happen.
 * Each run leaves one empty, abandoned checkout in Shopify.
 *
 * Run on purpose, e.g. after a release or a Shopify change:
 *   CONFIRM_LIVE_CHECKOUT=yes BASE_URL=https://colecalfee.com node tests/commerce/live-checkout.smoke.cjs
 * or GitHub Actions → "Live checkout smoke test" → Run workflow. */
const {chromium} = require("playwright");
const assert = require("node:assert/strict");

if (process.env.CONFIRM_LIVE_CHECKOUT !== "yes") {
  console.error("Refusing to run: this creates a real Shopify checkout. Set CONFIRM_LIVE_CHECKOUT=yes to run it on purpose.");
  process.exit(2);
}
const BASE = (process.env.BASE_URL || "https://colecalfee.com").replace(/\/$/, "");
const VIEWPORTS = {desktop: {viewport: {width: 1440, height: 900}}, "iphone-390": {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 3}};
const which = (process.env.VIEWPORTS || "desktop").split(",");

(async () => {
  const browser = await chromium.launch();
  let failed = 0;
  for (const name of which) {
    const context = await browser.newContext(VIEWPORTS[name]);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    let handoff = null, created = null;
    await page.route("**/*", route => {
      const r = route.request();
      // Stop at the door: the checkout page itself is never requested.
      if (r.isNavigationRequest() && r.frame() === page.mainFrame() && !r.url().startsWith(BASE)) { handoff = r.url(); return route.abort(); }
      return route.continue();
    });
    page.on("response", async response => {
      if (response.url().includes("/graphql.json") && /cartCreate/.test(response.request().postData() || "")) {
        created = await response.json().catch(() => null);
      }
    });
    try {
      await page.goto(`${BASE}/paintings/`, {waitUntil: "domcontentloaded"});
      await page.waitForFunction(() => !document.querySelector('.sale[data-live="pending"]') && document.querySelectorAll(".sale[data-state]").length > 0, null, {timeout: 20000});
      const button = page.locator(".sale-open").first();
      if (!await button.count()) { console.log(`skip ${name}: nothing is for sale on Shopify right now`); await context.close(); continue; }
      const title = await button.evaluate(b => b.closest(".piece").querySelector("h3").textContent.trim());
      await button.click();
      for (let i = 0; i < 150 && !handoff; i++) await page.waitForTimeout(100);
      assert.ok(created?.data?.cartCreate?.cart?.checkoutUrl, `Shopify did not create a checkout: ${JSON.stringify(created)}`);
      assert.deepEqual(created.data.cartCreate.userErrors, []);
      assert.ok(handoff, "the page did not hand off to checkout");
      assert.equal(handoff, created.data.cartCreate.cart.checkoutUrl, "handed off somewhere other than Shopify's checkout");
      const url = new URL(handoff);
      assert.equal(url.protocol, "https:");
      assert.match(url.hostname, /(myshopify\.com|shopify\.com|colecalfee\.com)$/);
      assert.deepEqual(errors, []);
      console.log(`ok   ${name}: "${title}" → Shopify checkout ${url.hostname}${url.pathname.replace(/[^/]+$/, "…")} (stopped before it loaded; no payment possible)`);
    } catch (error) {
      failed++;
      console.log(`FAIL ${name}\n     ${String(error.stack || error).split("\n").slice(0, 4).join("\n     ")}`);
    }
    await context.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();

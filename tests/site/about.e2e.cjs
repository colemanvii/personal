/* Browser tests for About (/info/) on desktop, 390 × 844 and 375 × 667.
 *
 * Run from the repository root:
 *   python3 -m http.server 4173 --bind 127.0.0.1 --directory site &
 *   node tests/site/about.e2e.cjs
 * BASE_URL=https://colecalfee.com checks a deployment the same way; there the
 * email link must still be a plain mailto (Cloudflare email obfuscation is
 * switched off for it with <!--email_off-->). */
const {chromium} = require("playwright");
const assert = require("node:assert/strict");

const BASE = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const EMAIL = "colecalfee@gmail.com";
const INSTAGRAM = "https://www.instagram.com/colecalfee/";
const VIEWPORTS = {
  desktop: {viewport: {width: 1440, height: 900}},
  "iphone-390": {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 3},
  "iphone-375": {viewport: {width: 375, height: 667}, isMobile: true, hasTouch: true, deviceScaleFactor: 2},
};

let failed = 0, passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (error) { failed++; console.log(`FAIL ${name}\n     ${String(error.stack || error).split("\n").slice(0, 4).join("\n     ")}`); }
}

(async () => {
  const browser = await chromium.launch();
  for (const [name, options] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(`${BASE}/info/`, {waitUntil: "load"});

    await test(`${name}: identity, navigation and a single fixed screen`, async () => {
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal((await page.locator("h1").textContent()).trim(), "Cole Calfee");
      assert.equal((await page.locator(".location").textContent()).trim(), "Nashville, Tennessee / North Georgia");
      assert.deepEqual(await page.$$eval(".site-head a", as => as.map(a => [a.textContent.trim(), a.getAttribute("href")])),
        [["Cole Calfee", "/"], ["Index", "/index/"], ["Available", "/paintings/"], ["About", "/info/"]]);
      assert.equal((await page.locator('.nav a[aria-current="page"]').textContent()).trim(), "About");
      const plate = await page.locator(".image-plate img").evaluate(i => ({ok: i.complete && i.naturalWidth > 0, alt: i.alt}));
      assert.ok(plate.ok, "the studio photograph did not load");
      assert.ok(plate.alt.length > 10, "the studio photograph has no description");
      const fit = await page.evaluate(() => ({
        x: document.documentElement.scrollWidth - innerWidth,
        y: document.documentElement.scrollHeight - innerHeight,
        contact: document.querySelector(".contact").getBoundingClientRect().bottom <= innerHeight,
        footer: document.querySelector(".footer").getBoundingClientRect().bottom <= innerHeight + 1,
      }));
      assert.ok(fit.x <= 0, `page scrolls sideways by ${fit.x}px`);
      assert.ok(fit.y <= 0, `page scrolls by ${fit.y}px`);
      assert.ok(fit.contact && fit.footer, "contact or footer falls below the screen");
    });

    await test(`${name}: a plain, working email link and the Instagram link`, async () => {
      const mail = page.locator(`.contact a[href="mailto:${EMAIL}"]`);
      assert.equal(await mail.count(), 1, "the email link is missing or obfuscated");
      assert.equal((await mail.textContent()).trim(), EMAIL, "the full address is not written out");
      const prevented = await mail.evaluate(a => { let p = null; a.addEventListener("click", e => { p = e.defaultPrevented; e.preventDefault(); }, {once: true}); a.click(); return p; });
      assert.equal(prevented, false, "something cancels the email link");
      assert.equal(await page.locator('a[href*="/cdn-cgi/l/email-protection"]').count(), 0, "email is obfuscated");
      const instagram = page.locator(`a[href="${INSTAGRAM}"]`);
      assert.equal((await instagram.textContent()).trim(), "@colecalfee");
      assert.equal(await instagram.getAttribute("target"), "_blank");
      assert.match(await instagram.getAttribute("rel"), /noopener/);
      assert.deepEqual(errors, []);
    });
    await context.close();
  }
  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();

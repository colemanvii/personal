/* Browser tests for the About page, on desktop and iPhone.
 *
 * Run from the repository root:
 *   python3 -m http.server 4173 --bind 127.0.0.1 &
 *   node tests/site/about.e2e.cjs
 *
 * BASE_URL=https://colecalfee.com checks production instead. */
const {chromium, devices} = require("playwright");
const assert = require("node:assert/strict");

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const VIEWPORTS = {desktop: {viewport: {width: 1440, height: 900}}, iphone: devices["iPhone 15"]};
const EMAIL = "colecalfee@gmail.com";
const INSTAGRAM = "https://www.instagram.com/colecalfee/";

let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`ok   ${name}`); }
  catch (error) { failed++; console.log(`FAIL ${name}\n     ${String(error.stack || error).split("\n").slice(0, 4).join("\n     ")}`); }
}

(async () => {
  const browser = await chromium.launch();
  for (const viewport of ["desktop", "iphone"]) {
    await test(`${viewport}: the colophon, composed from the top`, async () => {
      const context = await browser.newContext(VIEWPORTS[viewport]);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(`${BASE}/info/`);
      assert.equal(await page.locator("h1").innerText(), "Cole Calfee");
      assert.equal(await page.locator(".colophon-head p").innerText(), "Somewhere between art and work.");
      const facts = await page.$$eval(".facts div", rows => rows.map(r => [r.querySelector("dt").textContent, r.querySelector("dd").textContent.replace(/\s+/g, " ").trim()]));
      assert.deepEqual(facts, [["Based", "Nashville, Tennessee / North Georgia"], ["Email", `${EMAIL} ↗︎`], ["Instagram", "@colecalfee ↗︎"]]);
      // The content begins just under the header, not halfway down the screen.
      const gap = await page.evaluate(() => document.querySelector("h1").getBoundingClientRect().top - document.querySelector(".site-head").getBoundingClientRect().bottom);
      assert.ok(gap > 0 && gap < (viewport === "iphone" ? 50 : 100), `content starts ${gap}px below the header`);
      // The contact form is gone; nothing posts anywhere.
      assert.equal(await page.locator("form, input, textarea, button[type=submit]").count(), 0, "a form remains");
      assert.equal(await page.evaluate(() => document.documentElement.innerHTML.includes("/api/contact")), false);
      // Navigation, as on every page.
      assert.deepEqual(await page.$$eval(".site-head a", as => as.map(a => [a.textContent, a.getAttribute("href")])), [["Cole Calfee", "/"], ["Index", "/index/"], ["Paintings", "/paintings/"], ["About", "/info/"]]);
      assert.equal(await page.locator('.nav a[aria-current="page"]').innerText(), "About");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "page scrolls sideways");
      assert.deepEqual(errors, []);
      await context.close();
    });

    await test(`${viewport}: email is visible, selectable and opens a message`, async () => {
      const context = await browser.newContext(VIEWPORTS[viewport]);
      const page = await context.newPage();
      await page.goto(`${BASE}/info/`);
      const link = page.locator(`a[href="mailto:${EMAIL}"]`);
      assert.equal(await link.count(), 1);
      assert.equal(await link.isVisible(), true);
      assert.equal(await link.innerText(), EMAIL, "the full address is written out");
      assert.notEqual(await link.evaluate(a => getComputedStyle(a).userSelect), "none");
      // Selecting the address yields exactly the address, ready to copy.
      const selected = await link.evaluate(a => { const r = document.createRange(); r.selectNodeContents(a); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return s.toString(); });
      assert.equal(selected, EMAIL);
      // A click is left to the browser, which hands mailto: to the visitor's mail app.
      const prevented = await link.evaluate(a => { let p = null; a.addEventListener("click", e => { p = e.defaultPrevented; e.preventDefault(); }, {once: true}); a.click(); return p; });
      assert.equal(prevented, false, "something cancels the email link");
      await context.close();
    });

    await test(`${viewport}: Instagram opens in a new tab, and arrows are type`, async () => {
      const context = await browser.newContext(VIEWPORTS[viewport]);
      const page = await context.newPage();
      await page.goto(`${BASE}/info/`);
      const instagram = page.locator(`a[href="${INSTAGRAM}"]`);
      assert.equal(await instagram.innerText(), "@colecalfee");
      assert.equal(await instagram.getAttribute("target"), "_blank");
      assert.match(await instagram.getAttribute("rel"), /noopener/);
      const popup = context.waitForEvent("page");
      await context.route("https://www.instagram.com/**", route => route.fulfill({contentType: "text/html", body: "instagram"}));
      await instagram.click();
      assert.equal((await popup).url(), INSTAGRAM);
      const arrows = await page.$$eval(".ext", spans => spans.map(s => ({text: s.textContent, variant: getComputedStyle(s).fontVariantEmoji, hidden: s.getAttribute("aria-hidden")})));
      assert.equal(arrows.length, 2);
      for (const a of arrows) {
        assert.equal(a.text, "↗︎");
        assert.equal(a.hidden, "true", "screen readers should not read the arrow");
        if (a.variant) assert.equal(a.variant, "text");
      }
      await context.close();
    });
  }
  await browser.close();
  console.log(failed ? `\n${failed} failed` : "\nall passed");
  process.exitCode = failed ? 1 : 0;
})();

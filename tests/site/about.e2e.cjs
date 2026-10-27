/* Browser tests for the About page, on desktop and iPhone.
 *
 * Run from the repository root:
 *   python3 -m http.server 4173 --bind 127.0.0.1 &
 *   node tests/site/about.e2e.cjs
 *
 * The note form is exercised end to end in the browser: the page's own
 * request is answered by the real endpoint (functions/api/contact.js), run
 * here in Node with only Resend stood in. Real delivery is checked against a
 * deployment instead (see README). BASE_URL=https://colecalfee.com checks a
 * deployment's page the same way. */
const {chromium, devices} = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const {pathToFileURL} = require("node:url");

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const VIEWPORTS = {desktop: {viewport: {width: 1440, height: 900}}, iphone: devices["iPhone 15"]};
const EMAIL = "colecalfee@gmail.com";
const INSTAGRAM = "https://www.instagram.com/colecalfee/";

let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`ok   ${name}`); }
  catch (error) { failed++; console.log(`FAIL ${name}\n     ${String(error.stack || error).split("\n").slice(0, 4).join("\n     ")}`); }
}

/* Answer the page's POST with the real endpoint; `provider` decides what Resend says. */
async function withEndpoint(page, provider, sent) {
  const {onRequestPost} = await import(pathToFileURL(path.resolve(__dirname, "../../functions/api/contact.js")));
  await page.route("**/api/contact", async route => {
    const r = route.request();
    const request = new Request(r.url(), {method: r.method(), headers: {"Content-Type": "application/json", Origin: r.headers().origin || ""}, body: r.postData()});
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => { sent.push(JSON.parse(init.body)); return provider(); };
    try {
      const response = await onRequestPost({request, env: {RESEND_API_KEY: "re_test_key"}});
      await route.fulfill({status: response.status, contentType: "application/json", body: await response.text()});
    } finally { globalThis.fetch = realFetch; }
  });
}
const accepted = () => new Response(JSON.stringify({id: "email_1"}), {status: 200});
const status = page => page.locator("#note-status");

(async () => {
  const browser = await chromium.launch();
  for (const viewport of ["desktop", "iphone"]) {
    const open = async () => {
      const context = await browser.newContext(VIEWPORTS[viewport]);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(`${BASE}/info/`);
      return {context, page, errors};
    };

    await test(`${viewport}: a letter, composed in the middle of the page`, async () => {
      const {context, page, errors} = await open();
      assert.equal(await page.locator("h1").innerText(), "Cole Calfee");
      assert.equal(await page.locator(".who p").innerText(), "Somewhere between art and work.");
      assert.equal(await page.locator(".return .label").innerText(), "NASHVILLE, TENNESSEE / NORTH GEORGIA");
      // One column, no wider than 600px, centred on the page.
      const width = await page.evaluate(() => document.documentElement.clientWidth);
      const column = await page.locator(".letter").boundingBox();
      assert.ok(column.width <= 601, `column is ${column.width}px wide`);
      assert.ok(Math.abs(column.x + column.width / 2 - width / 2) <= 1, "the column is not centred");
      // The letterhead: who on the left edge of the column, the return address flush right, side by side.
      const who = await page.locator(".who").boundingBox(), ret = await page.locator(".return").boundingBox();
      assert.ok(Math.abs(who.x - column.x) <= 1, "the name does not start at the column's left edge");
      assert.ok(Math.abs(ret.x + ret.width - (column.x + column.width)) <= 1, "the return address is not flush right");
      assert.ok(ret.x > who.x + who.width - 1 && ret.y < who.y + who.height, "the letterhead is not side by side");
      // Nothing is larger than the gallery's own titles.
      const sizes = await page.$$eval("main *", els => els.map(el => parseFloat(getComputedStyle(el).fontSize)));
      assert.ok(Math.max(...sizes) <= 22, `largest type is ${Math.max(...sizes)}px`);
      if (viewport === "iphone") {
        const gap = await page.evaluate(() => document.querySelector("h1").getBoundingClientRect().top - document.querySelector(".site-head").getBoundingClientRect().bottom);
        assert.ok(gap > 0 && gap < 50, `content starts ${gap}px below the header`);
      }
      assert.deepEqual(await page.$$eval(".site-head a", as => as.map(a => [a.textContent, a.getAttribute("href")])), [["Cole Calfee", "/"], ["Index", "/index/"], ["Paintings", "/paintings/"], ["About", "/info/"]]);
      assert.equal(await page.locator('.nav a[aria-current="page"]').innerText(), "About");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "page scrolls sideways");
      // Fields are ruled lines with square corners, type large enough that iOS does not zoom; the message box is faintly tinted.
      const style = sel => page.locator(sel).evaluate(el => { const c = getComputedStyle(el); return {bg: c.backgroundColor, left: c.borderLeftWidth, top: c.borderTopWidth, bottom: c.borderBottomWidth, radius: c.borderRadius, size: parseFloat(c.fontSize)}; });
      const email = await style("#note-email"), message = await style("#note-message");
      for (const s of [email, message]) {
        assert.deepEqual([s.left, s.top, s.bottom, s.radius], ["0px", "0px", "1px", "0px"]);
        assert.ok(s.size >= 16, `field type is ${s.size}px, iOS will zoom`);
      }
      assert.equal(email.bg, "rgba(0, 0, 0, 0)", "the email line is filled");
      const paper = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      assert.notEqual(message.bg, paper, "the message box is not tinted");
      assert.notEqual(message.bg, "rgba(0, 0, 0, 0)", "the message box is not tinted");
      // The message box starts at three lines and grows as the note is written.
      const before = (await page.locator("#note-message").boundingBox()).height;
      assert.ok(before < 110, `message box starts ${before}px tall`);
      await page.locator("#note-message").click();
      await page.keyboard.type("Hello,\n\n1\n2\n3\n4\n5\n6");
      const after = (await page.locator("#note-message").boundingBox()).height;
      assert.ok(after > before + 80, `message box grew from ${before}px to ${after}px`);
      assert.deepEqual(errors, []);
      await context.close();
    });

    await test(`${viewport}: email and Instagram links, arrows as type`, async () => {
      const {context, page} = await open();
      const link = page.locator(`.return a[href="mailto:${EMAIL}"]`);
      assert.equal(await link.innerText(), EMAIL, "the full address is written out");
      assert.notEqual(await link.evaluate(a => getComputedStyle(a).userSelect), "none");
      const prevented = await link.evaluate(a => { let p = null; a.addEventListener("click", e => { p = e.defaultPrevented; e.preventDefault(); }, {once: true}); a.click(); return p; });
      assert.equal(prevented, false, "something cancels the email link");
      const instagram = page.locator(`a[href="${INSTAGRAM}"]`);
      assert.equal(await instagram.innerText(), "@colecalfee");
      assert.equal(await instagram.getAttribute("target"), "_blank");
      assert.match(await instagram.getAttribute("rel"), /noopener/);
      const arrows = await page.$$eval(".ext", spans => spans.map(s => [s.textContent, s.getAttribute("aria-hidden")]));
      assert.deepEqual(arrows, [["↗︎", "true"], ["↗︎", "true"]]);
      await context.close();
    });

    await test(`${viewport}: a note is sent, and only then called sent`, async () => {
      const {context, page, errors} = await open();
      const sent = [];
      await withEndpoint(page, accepted, sent);
      // The hidden field is out of sight and out of the tab order.
      const honey = await page.locator("#note-website").boundingBox();
      assert.ok(honey.x + honey.width <= 0, "the hidden field is on the page");
      assert.equal(await page.locator("#note-website").getAttribute("tabindex"), "-1");
      // Nothing is sent until both fields are filled.
      await page.locator(".note-send button").click();
      assert.equal(await status(page).innerText(), "Please enter your email address.");
      await page.fill("#note-email", "jane@example.com");
      await page.locator(".note-send button").click();
      assert.equal(await status(page).innerText(), "Please write a few words first.");
      assert.equal(sent.length, 0);
      await page.fill("#note-message", "Dear Cole,\n\nA note from the browser test.");
      await page.waitForTimeout(3100); // a person takes a moment to write
      await page.locator(".note-send button").click();
      await page.waitForFunction(() => document.getElementById("note-status").dataset.state);
      assert.equal(await status(page).getAttribute("data-state"), "sent");
      assert.equal(await status(page).innerText(), "Sent. Thank you for writing.");
      assert.equal(sent.length, 1);
      assert.equal(sent[0].reply_to, "jane@example.com");
      assert.match(sent[0].text, /A note from the browser test\./);
      assert.equal(await page.inputValue("#note-message"), "", "the note is cleared once sent");
      assert.deepEqual(errors, []);
      await context.close();
    });

    await test(`${viewport}: failures say so, keep the note, and never claim success`, async () => {
      const {context, page} = await open();
      const sent = [];
      let provider = () => new Response("{}", {status: 500});
      await withEndpoint(page, () => provider(), sent);
      await page.fill("#note-email", "jane@example.com");
      await page.fill("#note-message", "Dear Cole, this one should fail.");
      // Too quick: refused by the server's timing check.
      await page.locator(".note-send button").click();
      await page.waitForFunction(() => document.getElementById("note-status").dataset.state);
      assert.equal(await status(page).getAttribute("data-state"), "error");
      assert.equal(await status(page).innerText(), "Please take a moment before sending.");
      await page.waitForTimeout(3100);
      // The provider fails.
      await page.locator(".note-send button").click();
      await page.waitForFunction(() => document.querySelector(".note-send button").textContent === "Try again" && !document.querySelector(".note-send button").disabled);
      assert.equal(await status(page).getAttribute("data-state"), "error");
      assert.match(await status(page).innerText(), /could not be sent.*colecalfee@gmail\.com/);
      assert.equal(await page.inputValue("#note-message"), "Dear Cole, this one should fail.", "the note is lost");
      // The network itself fails.
      await page.unroute("**/api/contact");
      await page.route("**/api/contact", route => route.abort());
      await page.locator(".note-send button").click();
      await page.waitForFunction(() => /connection/.test(document.getElementById("note-status").textContent));
      assert.equal(await status(page).getAttribute("data-state"), "error");
      // A success page with a non-ok body is still not success.
      await page.unroute("**/api/contact");
      await page.route("**/api/contact", route => route.fulfill({status: 200, contentType: "text/html", body: "<html>"}));
      await page.locator(".note-send button").click();
      await page.waitForFunction(() => document.querySelector(".note-send button").textContent === "Try again" && !document.querySelector(".note-send button").disabled);
      assert.equal(await status(page).getAttribute("data-state"), "error");
      assert.notEqual(await status(page).innerText(), "Sent. Thank you for writing.");
      await context.close();
    });
  }
  await browser.close();
  console.log(failed ? `\n${failed} failed` : "\nall passed");
  process.exitCode = failed ? 1 : 0;
})();

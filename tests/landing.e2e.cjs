// The home page is a fixed, single-viewport composition. This is a permanent
// requirement (see README, "Permanent requirements"); this test guards it.
//   npm run build && python3 -m http.server 4173 --bind 127.0.0.1 --directory site
//   BASE_URL=http://127.0.0.1:4173 node tests/landing.e2e.cjs
//
// At normal zoom, on every size below, the home page must:
//   - be exactly one viewport: no vertical or horizontal document scrolling
//   - stay still: wheel and touch gestures do not move it
//   - have no entrance animation and no layout shift, even when the web font is slow
// And it must be sized so browser toolbars cannot move it (checked in the CSS, because
// headless Chromium cannot show or hide real mobile toolbars), must not bounce, and
// must stay fully reachable when zoomed text no longer fits.
const { chromium, devices } = require("playwright");
const fs = require("node:fs");

const BASE = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);

const SIZES = [
  ["desktop 1024x768", { viewport: { width: 1024, height: 768 } }],
  ["desktop 1280x720", { viewport: { width: 1280, height: 720 } }],
  ["desktop 1440x900", { viewport: { width: 1440, height: 900 } }],
  ["desktop 1920x1080", { viewport: { width: 1920, height: 1080 } }],
  ["desktop 2560x1440", { viewport: { width: 2560, height: 1440 } }],
  ["tablet 768x1024", { viewport: { width: 768, height: 1024 }, hasTouch: true }],
  ["iPad Mini", devices["iPad Mini"]],
  ["iPhone SE", devices["iPhone SE"]],
  ["iPhone 15", devices["iPhone 15"]],
  ["iPhone 15 Pro Max", devices["iPhone 15 Pro Max"]],
  ["Pixel 7", devices["Pixel 7"]],
  ["phone 320x480", { viewport: { width: 320, height: 480 }, isMobile: true, hasTouch: true }],
  ["iPhone 15 landscape", devices["iPhone 15 landscape"]],
  ["Pixel 7 landscape", devices["Pixel 7 landscape"]],
  // Browser zoom shrinks the CSS viewport: 200% and 400% of a 1440x900 window.
  ["zoom 200%", { viewport: { width: 720, height: 450 } }],
  ["zoom 400%", { viewport: { width: 360, height: 225 } }],
];

// 1. The CSS: sized to the small viewport, never the dynamic or large one, and no bounce.
function checkCss() {
  const html = fs.readFileSync("site/index.html", "utf8");
  const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || "";
  const rule = sel => (css.match(new RegExp(`(?:^|\\})\\s*${sel}\\s*\\{([^}]*)\\}`, "m")) || [])[1] || "";
  const body = rule("body"), root = rule("html");
  if (!/min-height:\s*100svh/.test(body)) fail("CSS", "body must be sized with min-height:100svh (the small viewport, which toolbars do not change)");
  if (/\d(dvh|lvh|vh)\b/.test(body + root)) fail("CSS", "html/body must not be sized with dvh, lvh or vh: they change or exceed the visible area as mobile toolbars move");
  if (!/overscroll-behavior:\s*none/.test(root)) fail("CSS", "html must set overscroll-behavior:none so the page does not bounce");
  if (/@keyframes|animation\s*:|transition\s*:/.test(css)) fail("CSS", "the home page must have no animation or transition");
}

(async () => {
  checkCss();
  const browser = await chromium.launch();

  for (const [name, opts] of SIZES) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    // Hold the web font back, so a late swap would show up as a layout shift.
    await page.route(/\.woff2$/, async r => { await new Promise(x => setTimeout(x, 800)); await r.continue(); });
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver(l => { for (const e of l.getEntries()) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
      document.addEventListener("DOMContentLoaded", () => {
        const r = document.querySelector("header").getBoundingClientRect();
        window.__first = [r.x, r.y, r.width, r.height];
      });
    });
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    const m = await page.evaluate(() => {
      const d = document.documentElement, r = document.querySelector("header").getBoundingClientRect();
      return {
        iw: innerWidth, ih: innerHeight, sw: d.scrollWidth, sh: d.scrollHeight,
        bodyH: document.body.getBoundingClientRect().height,
        first: window.__first, now: [r.x, r.y, r.width, r.height], cls: window.__cls,
        animations: document.getAnimations().length,
        overscroll: getComputedStyle(d).overscrollBehaviorY,
      };
    });
    if (m.sw > m.iw) fail(name, `scrolls sideways: document ${m.sw}px wide, viewport ${m.iw}px`);
    if (m.sh > m.ih) fail(name, `scrolls vertically: document ${m.sh}px tall, viewport ${m.ih}px`);
    if (Math.abs(m.bodyH - m.ih) > 0.5) fail(name, `page is ${m.bodyH}px tall, not the ${m.ih}px viewport`);
    if (m.cls > 0) fail(name, `layout shift ${m.cls.toFixed(4)}`);
    if (m.animations) fail(name, `${m.animations} animation(s) running`);
    if (m.overscroll !== "none") fail(name, `overscroll-behavior is ${m.overscroll}`);
    if (!m.first || m.first.some((v, i) => Math.abs(v - m.now[i]) > 0.5)) fail(name, `composition moved after first paint: ${JSON.stringify(m.first)} → ${JSON.stringify(m.now)}`);

    // Try to move it: mouse wheel both ways, and a touch swipe where there is touch.
    await page.mouse.move(m.iw / 2, m.ih / 2);
    await page.mouse.wheel(0, 800); await page.mouse.wheel(600, 0);
    if (opts.hasTouch) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Input.synthesizeScrollGesture", { x: Math.round(m.iw / 2), y: Math.round(m.ih * 0.7), yDistance: -Math.round(m.ih / 2), speed: 1200 });
    }
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => { const r = document.querySelector("header").getBoundingClientRect(); return [scrollX, scrollY, r.x, r.y]; });
    if (after[0] || after[1] || Math.abs(after[2] - m.now[0]) > 0.5 || Math.abs(after[3] - m.now[1]) > 0.5)
      fail(name, `moved under a scroll gesture: scroll ${after[0]},${after[1]}, header at ${after[2].toFixed(1)},${after[3].toFixed(1)}`);
    await ctx.close();
  }

  // 2. Accessibility at extreme zoom: when the text no longer fits, the page scrolls
  //    and nothing is cut off above or beside it.
  {
    const page = await browser.newPage({ viewport: { width: 320, height: 70 } });
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const r = await page.evaluate(() => {
      const top = document.querySelector("h1").getBoundingClientRect().top + scrollY;
      const bottom = document.querySelector("nav").getBoundingClientRect().bottom + scrollY;
      return { top, bottom, sh: document.documentElement.scrollHeight, ih: innerHeight };
    });
    if (r.top < 0) fail("zoom 1000%+", `the name is cut off above the page (${r.top.toFixed(1)}px)`);
    if (r.bottom > r.sh) fail("zoom 1000%+", "the links are cut off below the page");
    if (r.sh <= r.ih) fail("zoom 1000%+", "content taller than the screen must scroll, not be clipped");
    await page.close();
  }

  await browser.close();
  if (failures.length) {
    console.error(failures.join("\n"));
    console.error(`\n${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log(`ok: home page is one stationary viewport at ${SIZES.length} sizes, and stays reachable at extreme zoom`);
})();

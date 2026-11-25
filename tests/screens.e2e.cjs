// Every page after the home page is composed as screens (see README, "Screens").
//   npm run build && python3 -m http.server 4173 --bind 127.0.0.1 --directory site
//   BASE_URL=http://127.0.0.1:4173 node tests/screens.e2e.cjs
//
// Checks, at desktop, tablet, phone, landscape and zoomed sizes:
//   - the Index, Available and 404 are one viewport on a desktop or laptop screen;
//   - no image anywhere is taller or wider than the viewport, so each one is seen whole;
//   - on a large screen each work's media item is centred in a screen of its own, and
//     the text beside it stays inside the viewport;
//   - zoomed until the text no longer fits, nothing is cut off: the page scrolls;
// and, in the stylesheet: the two colours of / and /info/, and no animation.
const { chromium, devices } = require("playwright");
const fs = require("node:fs");

const BASE = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);

const DESKTOP = [
  ["desktop 1280x720", { viewport: { width: 1280, height: 720 } }],
  ["desktop 1440x900", { viewport: { width: 1440, height: 900 } }],
  ["desktop 1920x1080", { viewport: { width: 1920, height: 1080 } }],
  ["desktop 1024x768", { viewport: { width: 1024, height: 768 } }],
];
const OTHER = [
  ["iPad Mini", devices["iPad Mini"]],
  ["iPhone SE", devices["iPhone SE"]],
  ["iPhone 15", devices["iPhone 15"]],
  ["Pixel 7", devices["Pixel 7"]],
  ["iPhone 15 landscape", devices["iPhone 15 landscape"]],
  ["zoom 200%", { viewport: { width: 720, height: 450 } }],
  ["zoom 400%", { viewport: { width: 360, height: 225 } }],
];
const ONE_SCREEN = ["/index/", "/available/", "/404.html"];

function pages() {
  const list = ["/index/", "/available/", "/404.html"];
  for (const slug of fs.readdirSync("site/work")) list.push(`/work/${slug}/`);
  return list;
}

function checkCss() {
  const css = fs.readFileSync("src/assets/site.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const colours = new Set((css.match(/#[0-9a-f]{3,8}\b/gi) || []).map(c => c.toLowerCase()));
  for (const c of colours) if (!["#f8f8f6", "#171717"].includes(c)) fail("site.css", `colour ${c}: the site uses only #f8f8f6 and #171717`);
  if (/@keyframes|animation\s*:|transition\s*:|view-transition/.test(css)) fail("site.css", "no animation, transition or view transition");
  for (const f of ["site/favicon.svg", "site/favicon.ico", "site/apple-touch-icon.png"]) if (!fs.existsSync(f)) fail(f, "missing");
}

(async () => {
  checkCss();
  const browser = await chromium.launch();
  for (const [name, opts] of [...DESKTOP, ...OTHER]) {
    const desktop = DESKTOP.some(([n]) => n === name);
    const ctx = await browser.newContext(opts);
    for (const url of pages()) {
      const where = `${url} @ ${name}`;
      const page = await ctx.newPage();
      await page.goto(BASE + url, { waitUntil: "networkidle" });
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); }
        scrollTo(0, 0);
      });
      await page.waitForTimeout(150);
      const r = await page.evaluate(() => {
        const vw = innerWidth, vh = innerHeight, de = document.documentElement;
        const imgs = [...document.querySelectorAll("main img")].filter(i => i.offsetParent).map(i => {
          const b = i.getBoundingClientRect();
          return { src: i.getAttribute("src"), w: b.width, h: b.height };
        });
        const screens = [...document.querySelectorAll(".screen")].map(s => {
          const b = s.getBoundingClientRect(), c = s.firstElementChild.getBoundingClientRect();
          return { h: b.height, top: c.top - b.top, bottom: b.bottom - c.bottom };
        });
        const about = document.querySelector(".about > div");
        const ab = about && about.getBoundingClientRect();
        const theme = document.querySelector('meta[name="theme-color"]')?.content;
        return { vw, vh, sh: de.scrollHeight, sw: de.scrollWidth, imgs, screens, about: ab && { top: ab.top, bottom: ab.bottom }, sticky: about && getComputedStyle(about.parentElement).position, theme };
      });
      if (r.sw > r.vw) fail(where, `scrolls sideways by ${r.sw - r.vw}px`);
      if (r.theme !== "#f8f8f6") fail(where, `theme-color ${r.theme}`);
      if (desktop && ONE_SCREEN.includes(url) && r.sh > r.vh) fail(where, `is ${r.sh}px tall in a ${r.vh}px viewport: it must be one screen`);
      for (const i of r.imgs) {
        if (i.h > r.vh + 0.5) fail(where, `${i.src} is ${Math.round(i.h)}px tall in a ${r.vh}px viewport`);
        if (i.w > r.vw + 0.5) fail(where, `${i.src} is wider than the viewport`);
      }
      if (desktop) {
        for (const [n, s] of r.screens.entries()) {
          if (Math.abs(s.h - r.vh) > 1) fail(where, `screen ${n + 1} is ${s.h}px, not one ${r.vh}px viewport`);
          if (Math.abs(s.top - s.bottom) > 2) fail(where, `screen ${n + 1} is not centred (${s.top} above, ${s.bottom} below)`);
        }
        if (r.about && (r.about.top < 0 || r.about.bottom > r.vh)) fail(where, "the text beside the media does not fit the viewport");
        if (r.about && r.sticky !== "sticky") fail(where, "the text beside the media should stay still");
      }
      // Zoomed: whatever is sticky must fit, or it must scroll with the page.
      if (r.about && r.sticky === "sticky" && (r.about.top < 0 || r.about.bottom > r.vh)) fail(where, "sticky text is cut off");
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  if (failures.length) {
    console.error(failures.join("\n"));
    console.error(`\n${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log(`ok: ${pages().length} pages composed as screens at ${DESKTOP.length + OTHER.length} sizes`);
})();

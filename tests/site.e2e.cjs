// Browser QA for the built site.
//   npm run build && python3 -m http.server 4173 --bind 127.0.0.1 --directory site
//   BASE_URL=http://127.0.0.1:4173 node tests/site.e2e.cjs
// Checks every page at 375, 390, 430, 768 and 1440 px: it loads, nothing scrolls
// sideways, every image loads and has alt text, nothing is hotlinked, tap targets
// on phones are at least 44px tall, and the page has its Open Graph tags.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const SHOTS = process.env.SCREENSHOTS;
const WIDTHS = [[375, 667], [390, 844], [430, 932], [768, 1024], [1440, 900]];

function pages() {
  const list = ["/", "/index/", "/available/", "/info/", "/404.html"];
  for (const slug of fs.readdirSync("site/work")) list.push(`/work/${slug}/`);
  return list;
}

(async () => {
  const browser = await chromium.launch();
  const failures = [];
  const fail = (where, msg) => failures.push(`${where}: ${msg}`);
  for (const url of pages()) {
    for (const [w, h] of WIDTHS) {
      const where = `${url} @${w}`;
      const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: w < 1024 });
      const errors = [];
      page.on("pageerror", e => errors.push(String(e)));
      // Shopify is the one allowed third party (live price on Available).
      page.on("requestfailed", r => { if (!r.url().includes("myshopify.com")) errors.push(`failed ${r.url()}`); });
      const res = await page.goto(BASE + url, { waitUntil: "networkidle" });
      if (url !== "/404.html" && (!res || res.status() !== 200)) fail(where, `status ${res && res.status()}`);
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
        scrollTo(0, 0);
      });
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth - innerWidth;
        const imgs = [...document.images].map(i => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, alt: i.getAttribute("alt") }));
        const offsite = imgs.filter(i => !i.src.startsWith(location.origin)).map(i => i.src);
        const small = [...document.querySelectorAll("a, button")].filter(el => {
          const b = el.getBoundingClientRect(), s = getComputedStyle(el);
          return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && !el.closest(".skip") && b.height < 44;
        }).map(el => el.textContent.trim().slice(0, 30));
        const og = ["og:title", "og:description", "og:image", "og:url"].filter(p => !document.querySelector(`meta[property="${p}"]`));
        return { overflow, broken: imgs.filter(i => !i.ok).map(i => i.src), noAlt: imgs.filter(i => i.alt === null).map(i => i.src), offsite, small, og, h1: document.querySelectorAll("h1").length };
      });
      if (r.overflow > 0) fail(where, `scrolls sideways by ${r.overflow}px`);
      if (r.broken.length) fail(where, `broken images ${r.broken.join(", ")}`);
      if (r.noAlt.length) fail(where, `images without alt ${r.noAlt.join(", ")}`);
      if (r.offsite.length) fail(where, `hotlinked images ${r.offsite.join(", ")}`);
      if (w < 1024 && r.small.length) fail(where, `tap targets under 44px: ${r.small.join(" | ")}`);
      if (r.og.length) fail(where, `missing ${r.og.join(", ")}`);
      if (r.h1 !== 1) fail(where, `${r.h1} h1 elements`);
      if (errors.length) fail(where, errors.join("; "));
      if (SHOTS) {
        fs.mkdirSync(SHOTS, { recursive: true });
        await page.screenshot({ path: path.join(SHOTS, `${url.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "index"}-${w}.png`) });
      }
      await page.close();
    }
  }
  await browser.close();
  if (failures.length) {
    console.error(failures.join("\n"));
    console.error(`\n${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log(`ok: ${pages().length} pages × ${WIDTHS.length} widths`);
})();

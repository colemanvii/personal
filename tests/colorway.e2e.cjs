// The alternate colourway (src/_data/site.js, src/_includes/colorway-*.njk).
//   npm run build && python3 -m http.server 4173 --bind 127.0.0.1 --directory site
//   BASE_URL=http://127.0.0.1:4173 node tests/colorway.e2e.cjs
//
// On every page, at desktop and phone sizes:
//   - the default colourway is unchanged, and the switch is one word in the page's row of
//     links: DARK, or LIGHT once the page is brown;
//   - choosing the other colourway recolours the page and changes nothing else: every
//     element keeps its exact position and size, and the page its exact scroll size;
//   - the choice is remembered (localStorage) on the next page and after a reload,
//     and is applied before the first paint, so the page never flashes the default;
//   - both colourways keep text at WCAG AA contrast (4.5:1 or more).
const { chromium, devices } = require("playwright");
const fs = require("node:fs");

const BASE = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);

const SIZES = [
  ["desktop 1440x900", { viewport: { width: 1440, height: 900 } }],
  ["iPhone 15", devices["iPhone 15"]],
];

function pages() {
  const list = ["/", "/info/", "/index/", "/available/", "/404.html"];
  for (const slug of fs.readdirSync("site/work")) list.push(`/work/${slug}/`);
  return list;
}

async function colorways() {
  const src = fs.readFileSync("src/_data/site.js", "utf8");
  const pick = name => {
    const m = src.match(new RegExp(`${name}:\\s*\\{[^}]*bg:\\s*"(#[0-9a-f]{6})",\\s*fg:\\s*"(#[0-9a-f]{6})"`, "i"));
    return { bg: m[1].toLowerCase(), fg: m[2].toLowerCase() };
  };
  return { paper: pick("paper"), earth: pick("earth") };
}

function contrast(a, b) {
  const lum = h => {
    const [r, g, bl] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const rgb = h => `rgb(${[1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(", ")})`;

// Every element's box, and the page's scroll size.
const layout = () => ({
  sw: document.documentElement.scrollWidth,
  sh: document.documentElement.scrollHeight,
  // The switch's two words trade places inside it; everything else, the switch included, must not move.
  boxes: [...document.body.querySelectorAll("*")].filter(e => !e.matches(".cwt span") && e.getClientRects().length).map(e => { const b = e.getBoundingClientRect(); return [e.tagName, b.x + scrollX, b.y + scrollY, b.width, b.height].join(); }),
});

(async () => {
  const cw = await colorways();
  for (const [name, c] of Object.entries(cw)) {
    const ratio = contrast(c.bg, c.fg);
    if (ratio < 4.5) fail(`colourway ${name}`, `contrast ${ratio.toFixed(2)}:1 is under 4.5:1`);
  }
  const browser = await chromium.launch();
  for (const [size, opts] of SIZES) {
    for (const url of pages()) {
      const where = `${url} @ ${size}`;
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      await page.goto(BASE + url, { waitUntil: "networkidle" });
      const read = () => page.evaluate(() => ({
        bg: getComputedStyle(document.body).backgroundColor,
        fg: getComputedStyle(document.body).color,
        theme: document.querySelector('meta[name="theme-color"]')?.content,
        attr: document.documentElement.dataset.colorway || "paper",
        word: [...document.querySelectorAll(".cwt")].filter(b => b.offsetParent).map(b => b.innerText.trim()).join(),
      }));
      const toggle = page.locator(".cwt").filter({ visible: true }).first();
      // default
      let s = await read();
      if (s.bg !== rgb(cw.paper.bg) || s.fg !== rgb(cw.paper.fg)) fail(where, `default colourway is ${s.fg} on ${s.bg}`);
      if (!/^DARK(,DARK)*$/.test(s.word)) fail(where, `the switch reads "${s.word}", not DARK`);
      const sw = await page.locator(".cwt").evaluateAll(bs => bs.filter(b => b.offsetParent).map(b => {
        const r = b.getBoundingClientRect(), row = b.parentElement;
        return { h: r.height, inRow: row.tagName === "NAV" && row === b.closest("nav"), last: row.lastElementChild === b };
      }));
      if (!sw.length || !sw.every(b => b.inRow && b.last)) fail(where, "the switch should be the last word of the page's link row");
      if (opts.isMobile && sw.some(b => b.h < 44)) fail(where, "switch tap target under 44px");
      const before = await page.evaluate(layout);
      // switch
      await toggle.click();
      s = await read();
      if (s.bg !== rgb(cw.earth.bg) || s.fg !== rgb(cw.earth.fg)) fail(where, `alternate colourway is ${s.fg} on ${s.bg}`);
      if (s.theme !== cw.earth.bg) fail(where, `theme-color ${s.theme} after switching`);
      if (!/^LIGHT(,LIGHT)*$/.test(s.word)) fail(where, `the switch reads "${s.word}" on brown, not LIGHT`);
      const after = await page.evaluate(layout);
      if (before.sw !== after.sw || before.sh !== after.sh) fail(where, "switching colourway changed the page size");
      const moved = before.boxes.filter((b, i) => b !== after.boxes[i]);
      if (moved.length) fail(where, `switching colourway moved ${moved.length} element(s): ${moved[0]}`);
      // remembered, and applied before first paint
      await page.reload({ waitUntil: "networkidle" });
      s = await read();
      if (s.attr !== "earth" || s.bg !== rgb(cw.earth.bg)) fail(where, "choice not remembered after reload");
      // back to the default
      await toggle.click();
      s = await read();
      if (s.attr !== "paper" || s.bg !== rgb(cw.paper.bg) || s.theme !== cw.paper.bg) fail(where, "could not return to the default");
      const back = await page.evaluate(layout);
      if (back.boxes.some((b, i) => b !== before.boxes[i])) fail(where, "switching back moved an element");
      await ctx.close();
    }
  }
  // Remembered across pages, and never a flash of the default: the first frame is already brown.
  const ctx = await browser.newContext(SIZES[0][1]);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.locator(".cwt").first().click();
  await page.route("**/fonts/**", r => setTimeout(() => r.continue(), 1500));
  await page.goto(BASE + "/index/", { waitUntil: "commit" });
  await page.waitForSelector("body");
  const first = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (first !== rgb(cw.earth.bg)) fail("/ → /index/", `first paint is ${first}, not the chosen colourway`);
  await ctx.close();
  await browser.close();
  if (failures.length) {
    console.error(failures.join("\n"));
    console.error(`\n${failures.length} failure(s)`);
    process.exit(1);
  }
  const r = Object.entries(cw).map(([n, c]) => `${n} ${contrast(c.bg, c.fg).toFixed(1)}:1`).join(", ");
  console.log(`ok: both colourways on ${pages().length} pages at ${SIZES.length} sizes (${r})`);
})();

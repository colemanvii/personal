/* HTTP contract: what every public, retired, internal and unknown URL answers.
 *
 * Needs a server that behaves like Cloudflare Pages (_redirects, _headers,
 * 404.html), not a plain file server:
 *   npx wrangler@3.114.0 pages dev site --port 8788 &
 *   BASE_URL=http://127.0.0.1:8788 node tests/site/routes.e2e.cjs
 * BASE_URL=https://colecalfee.com (or a *.pages.dev preview) checks a deployment.
 * Redirects are not followed: the exact status and Location are asserted. */
const assert = require("node:assert/strict");

const BASE = (process.env.BASE_URL || "http://127.0.0.1:8788").replace(/\/$/, "");
const PREVIEW = /\.pages\.dev$/.test(new URL(BASE).hostname);

const PAGES = {"/": "Cole Calfee", "/index/": "Index — Cole Calfee", "/paintings/": "Available — Cole Calfee", "/info/": "About — Cole Calfee"};
const REDIRECTS = {
  "/art": "/index/", "/art/": "/index/", "/art/index.html": "/index/",
  "/design": "/index/", "/design/": "/index/",
  "/photos": "/index/", "/photos/": "/index/", "/photos/photos.js": "/index/",
  "/work": "/index/", "/work/": "/index/",
  "/shop": "/paintings/", "/shop/": "/paintings/", "/shop/shop.js": "/paintings/",
  "/projects": "/index/", "/projects/": "/index/",
  "/projects/the-cowboyer": "/index/#cowboyer", "/projects/the-cowboyer/": "/index/#cowboyer",
  "/projects/kashus-culpepper/": "/index/#kashus", "/projects/scout-motors/": "/index/#scout",
};
const NOT_FOUND = [
  // Removed entirely.
  "/gabe", "/gabe/", "/gabe/index.html",
  // Internal source, tooling and retired material: in Git, never deployed.
  "/README.md", "/REVIEW.md", "/CNAME", "/wrangler.toml", "/vercel.json",
  "/tests/commerce/HARNESS.md", "/tests/site/release.e2e.cjs", "/.github/workflows/release-qa.yml",
  "/functions/api/contact.js", "/api/contact",
  "/studies/", "/studies/painting-crops/apply.py", "/studies/painting-crops/approved.json",
  "/archive/", "/archive/333-westover/", "/archive/333-westover/README.md",
  "/retired/", "/retired/art/index.html",
  // Removed code.
  "/assets/js/cart.js", "/paintings/archive.js",
  // Unknown URLs.
  "/this-does-not-exist", "/index/zzz", "/paintings/zzz/", "/assets/nope.png",
];

let failed = 0, passed = 0;
async function check(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (error) { failed++; console.log(`FAIL ${name}\n     ${String(error.message || error).split("\n").slice(0, 6).join("\n     ")}`); }
}
const get = path => fetch(BASE + path, {redirect: "manual", headers: {"User-Agent": "colecalfee-route-check"}});
const results = [];

(async () => {
  for (const [path, title] of Object.entries(PAGES)) {
    await check(`200 ${path}`, async () => {
      const r = await get(path);
      const body = await r.text();
      results.push([path, r.status, ""]);
      assert.equal(r.status, 200);
      assert.match(r.headers.get("content-type") || "", /text\/html/);
      assert.equal(body.match(/<title>([^<]*)<\/title>/)?.[1], title);
      const robots = r.headers.get("x-robots-tag") || "";
      if (PREVIEW) assert.match(robots, /noindex/, "a preview deployment is indexable");
      else assert.doesNotMatch(robots, /noindex/, "the production page is marked noindex");
    });
  }

  await check("200 /robots.txt as text naming the sitemap", async () => {
    const r = await get("/robots.txt"); const body = await r.text();
    results.push(["/robots.txt", r.status, ""]);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type") || "", /text\/plain/);
    assert.match(body, /^Sitemap: https:\/\/colecalfee\.com\/sitemap\.xml$/m);
  });
  await check("200 /sitemap.xml as XML listing the four pages", async () => {
    const r = await get("/sitemap.xml"); const body = await r.text();
    results.push(["/sitemap.xml", r.status, ""]);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type") || "", /xml/);
    assert.equal((body.match(/<loc>/g) || []).length, 4);
  });
  await check("200 /assets/images/share.jpg (sharing preview)", async () => {
    const r = await get("/assets/images/share.jpg"); await r.arrayBuffer();
    results.push(["/assets/images/share.jpg", r.status, ""]);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type") || "", /image\/jpeg/);
  });

  for (const [path, target] of Object.entries(REDIRECTS)) {
    await check(`301 ${path} → ${target}`, async () => {
      const r = await get(path); await r.text();
      const location = r.headers.get("location") || "";
      const landed = location ? new URL(location, BASE) : null;
      results.push([path, r.status, location]);
      assert.equal(r.status, 301, `status ${r.status}`);
      assert.ok(landed, "no Location header");
      assert.equal(landed.pathname + landed.hash, target);
      assert.ok(landed.origin === new URL(BASE).origin, `redirects off-site to ${landed.origin}`);
    });
  }

  for (const path of NOT_FOUND) {
    await check(`404 ${path}`, async () => {
      const r = await get(path); const body = await r.text();
      results.push([path, r.status, r.headers.get("location") || ""]);
      assert.equal(r.status, 404, `status ${r.status}${r.headers.get("location") ? " → " + r.headers.get("location") : ""}`);
      assert.match(body, /<title>Not found — Cole Calfee<\/title>/, "not the site's 404 page");
      assert.match(body, /<meta name="robots" content="noindex">/);
      assert.doesNotMatch(body, /Copy Prompt|Build a marketing strategy/i, "gabe content leaked");
    });
  }

  if (process.env.ROUTES_TABLE) {
    console.log("\n| URL | Status | Location |\n|---|---|---|");
    for (const [path, status, location] of results) console.log(`| \`${path}\` | ${status} | ${location ? "`" + location + "`" : ""} |`);
  }
  console.log(`\n${passed} passed, ${failed} failed against ${BASE}`);
  process.exit(failed ? 1 : 0);
})();

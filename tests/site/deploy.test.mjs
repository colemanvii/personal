/* The deployment contract, checked from the source with no network.
 *
 * Only site/ is published (wrangler.toml: pages_build_output_dir). The public
 * site is Home, Index, Available and About; everything else in the repository
 * stays in Git and is never served.
 *
 *   node --test tests/site/deploy.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync, readdirSync, statSync} from "node:fs";
import {join, relative, extname, dirname, normalize} from "node:path";

const SITE = "site";
const ORIGIN = "https://colecalfee.com";
const PAGES = {"/": "index.html", "/index/": "index/index.html", "/paintings/": "paintings/index.html", "/info/": "info/index.html"};
const PLATFORM = ["_redirects", "_headers", "404.html", "robots.txt", "sitemap.xml", "favicon.svg"];
const PUBLIC_TYPES = new Set([".html", ".css", ".js", ".svg", ".jpg", ".jpeg", ".png", ".webp", ".txt", ".xml", ""]);

const walk = dir => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [relative(SITE, path)];
});
const files = walk(SITE);
const read = f => readFileSync(join(SITE, f), "utf8");

test("Cloudflare Pages and Vercel publish site/ and nothing else", () => {
  assert.match(readFileSync("wrangler.toml", "utf8"), /^pages_build_output_dir\s*=\s*"site"\s*$/m);
  assert.equal(JSON.parse(readFileSync("vercel.json", "utf8")).outputDirectory, "site");
  assert.equal(existsSync("functions"), false, "a functions/ directory would deploy code beside the site");
  assert.equal(existsSync("index.html"), false, "a page at the repository root would mean the root is being published");
});

test("site/ holds only the four pages, their assets and the platform files", () => {
  const html = files.filter(f => f.endsWith(".html")).sort();
  assert.deepEqual(html, ["404.html", ...Object.values(PAGES)].sort());
  for (const f of PLATFORM) assert.ok(files.includes(f), `${f} is missing`);
  const stray = files.filter(f => !PUBLIC_TYPES.has(extname(f).toLowerCase()) && !/\.JPG$/.test(f));
  assert.deepEqual(stray, [], "non-web files in site/");
  const internal = files.filter(f => /(^|\/)(README|REVIEW|HARNESS)|\.(md|py|json|cjs|mjs|toml|yml|yaml)$|^(tests|retired|studies|archive|gabe|functions|\.github)\//i.test(f));
  assert.deepEqual(internal, [], "internal files in site/");
  assert.ok(!files.some(f => /gabe/i.test(f)), "gabe is deployed");
});

test("every local reference in the deployed pages, styles and scripts resolves inside site/", () => {
  const missing = [];
  const pattern = /(?:src|href|srcset|content)\s*=\s*"([^"]+)"|url\(\s*["']?([^"')]+)["']?\s*\)|from\s+"([^"]+)"|["'`]((?:\.\.\/|\/)assets\/[^"'`?#]+)/g;
  for (const file of files.filter(f => /\.(html|css|js)$/.test(f))) {
    const source = read(file);
    for (const m of source.matchAll(pattern)) {
      for (let raw of (m[1] || m[2] || m[3] || m[4] || "").split(",")) {
        raw = raw.trim().split(/\s+/)[0].split(/[?#]/)[0];
        if (!raw || /^(https?:|mailto:|data:|tel:|\/\/|javascript:|\$\{)/.test(raw) || raw.includes("${")) continue;
        if (!/^(\/|\.\.?\/)|\.(css|js|svg|png|jpe?g|webp)$/i.test(raw)) continue;
        const target = decodeURIComponent(raw.startsWith("/") ? raw.slice(1) : normalize(join(dirname(file), raw)));
        const path = target === "" || target.endsWith("/") ? join(target, "index.html") : target;
        if (!existsSync(join(SITE, path)) && !existsSync(join(SITE, path, "index.html"))) missing.push(`${file}: ${raw}`);
      }
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

test("the pages load nothing from third-party image hosts", () => {
  const hosts = new Set();
  for (const file of files.filter(f => /\.(html|css|js)$/.test(f))) {
    for (const m of read(file).matchAll(/["'(]https:\/\/([^/"')]+)\/[^"')]*\.(?:jpe?g|png|webp|gif|svg)/gi)) hosts.add(m[1]);
  }
  assert.deepEqual([...hosts].filter(h => !["cdn.shopify.com", "colecalfee.com"].includes(h)), [], "images hotlinked from other sites");
});

test("each page carries canonical, description and a social sharing preview", () => {
  for (const [path, file] of Object.entries(PAGES)) {
    const s = read(file), url = ORIGIN + path;
    const meta = (attr, key) => s.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];
    assert.equal(s.match(/<link rel="canonical" href="([^"]+)"/)?.[1], url, `${file} canonical`);
    assert.equal((s.match(/rel="canonical"/g) || []).length, 1, `${file} has more than one canonical`);
    assert.ok(meta("name", "description"), `${file} description`);
    assert.equal(meta("property", "og:url"), url, `${file} og:url`);
    assert.ok(meta("property", "og:title"), `${file} og:title`);
    assert.ok(meta("property", "og:description"), `${file} og:description`);
    assert.equal(meta("property", "og:image"), `${ORIGIN}/assets/images/share.jpg`, `${file} og:image`);
    assert.equal(meta("name", "twitter:card"), "summary_large_image", `${file} twitter:card`);
    assert.equal((s.match(/<h1[\s>]/g) || []).length, 1, `${file} should have exactly one h1`);
  }
  assert.ok(files.includes("assets/images/share.jpg"));
});

test("robots.txt allows the site and names the sitemap; the sitemap lists exactly the four pages", () => {
  const robots = read("robots.txt");
  assert.match(robots, /^User-agent: \*$/m);
  assert.doesNotMatch(robots, /^Disallow: \/\s*$/m);
  assert.match(robots, new RegExp(`^Sitemap: ${ORIGIN}/sitemap.xml$`, "m"));
  const locs = [...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.deepEqual(locs, Object.keys(PAGES).map(p => ORIGIN + p));
});

test("the 404 page is not indexable and links back into the site", () => {
  const s = read("404.html");
  assert.match(s, /<meta name="robots" content="noindex">/);
  assert.match(s, /href="\/index\/"/);
  assert.doesNotMatch(s, /(src|href)="(?!\/|https?:|mailto:)[^"#]/, "404.html must use absolute paths; it is served at any depth");
});

/* Parse _redirects the way Cloudflare Pages reads it. */
export function redirects() {
  return read("_redirects").split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#")).map(l => {
    const [from, to, status] = l.split(/\s+/);
    return {from, to, status: Number(status || 302)};
  });
}

test("_redirects: every retired route is permanent and lands on a surviving page", () => {
  const rules = redirects();
  assert.ok(rules.length > 0);
  for (const r of rules) {
    assert.equal(r.status, 301, `${r.from} is not permanent`);
    const target = r.to.split("#")[0];
    assert.ok(Object.keys(PAGES).includes(target), `${r.from} goes to ${r.to}, not an approved page`);
  }
  for (const route of ["/art", "/design", "/photos", "/work", "/shop", "/projects"]) {
    assert.ok(rules.some(r => r.from === route), `${route} has no redirect`);
    assert.ok(rules.some(r => r.from === `${route}/*`), `${route}/* has no redirect`);
  }
  for (const gone of ["/gabe", "/studies", "/archive"]) {
    assert.ok(!rules.some(r => r.from.startsWith(gone)), `${gone} must 404, not redirect`);
  }
});

test("Index deep links used by redirects exist", () => {
  const index = read("index/index.html");
  for (const r of redirects().filter(r => r.to.startsWith("/index/#"))) {
    const id = r.to.split("#")[1];
    assert.match(index, new RegExp(`data-client="${id}"`), `${r.to} does not open an Index entry`);
  }
});

test("recurring CI never creates a live Shopify checkout; the live smoke test is manual only", () => {
  const ci = readFileSync(".github/workflows/release-qa.yml", "utf8");
  assert.doesNotMatch(ci, /live-checkout|CONFIRM_LIVE_CHECKOUT/, "release-qa.yml runs the live checkout");
  const smoke = readFileSync(".github/workflows/live-checkout-smoke.yml", "utf8");
  const on = smoke.match(/^on:\n((?:[ \t]+.*\n)+)/m)?.[1] || "";
  assert.match(on, /^\s+workflow_dispatch:/m);
  assert.doesNotMatch(on, /^\s+(push|pull_request|schedule|workflow_run|release):/m, "live smoke test runs automatically");
  const e2e = readFileSync("tests/commerce/e2e.cjs", "utf8");
  assert.match(e2e, /context\.route\(API/, "the regression suite lost its checkout guard");
  assert.match(readFileSync("tests/commerce/live-checkout.smoke.cjs", "utf8"), /CONFIRM_LIVE_CHECKOUT !== "yes"/);
});

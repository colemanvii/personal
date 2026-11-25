// HTTP contract, run against `wrangler pages dev` or a real deployment:
// public pages answer 200, old URLs answer 301 to their new home, anything else 404.
//   BASE_URL=http://127.0.0.1:8788 node tests/routes.e2e.cjs
const fs = require("node:fs");
const BASE = (process.env.BASE_URL || "http://127.0.0.1:8788").replace(/\/$/, "");
const ATTEMPTS = Number(process.env.ROUTES_ATTEMPTS || 1);
const RETRY_MS = Number(process.env.ROUTES_RETRY_MS || 0);

const ok = ["/", "/index/", "/available/", "/info/", "/sitemap.xml", "/robots.txt", "/favicon.svg"];
for (const slug of fs.readdirSync("site/work")) ok.push(`/work/${slug}/`);
const moved = {
  "/paintings/": "/available/", "/shop/": "/available/",
  "/projects/kashus-culpepper/": "/work/kashus-culpepper/", "/projects/scout-motors/": "/work/scout-motors/",
  "/projects/the-cowboyer/": "/work/the-cowboyer/", "/art/": "/", "/design/": "/", "/photos/": "/", "/work/": "/index/",
};
const gone = ["/no-such-page/", "/work/no-such-work/", "/README.md", "/assets/s1.jpeg", "/gabe/"];

async function check(url, want, location) {
  let last;
  for (let i = 0; i < ATTEMPTS; i++) {
    const res = await fetch(BASE + url, { redirect: "manual" });
    const loc = res.headers.get("location");
    const got = res.status;
    const locOk = !location || (loc && new URL(loc, BASE).pathname === location);
    if (got === want && locOk) return null;
    last = `${url}: wanted ${want}${location ? ` → ${location}` : ""}, got ${got}${loc ? ` → ${loc}` : ""}`;
    if (i < ATTEMPTS - 1) await new Promise(r => setTimeout(r, RETRY_MS));
  }
  return last;
}

(async () => {
  const fails = [];
  for (const u of ok) fails.push(await check(u, 200));
  for (const [u, to] of Object.entries(moved)) fails.push(await check(u, 301, to));
  for (const u of gone) fails.push(await check(u, 404));
  const bad = fails.filter(Boolean);
  if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
  console.log(`ok: ${ok.length} pages, ${Object.keys(moved).length} redirects, ${gone.length} not found`);
})();

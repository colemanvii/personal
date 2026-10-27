/* The contact endpoint (functions/api/contact.js), run as Cloudflare runs it:
 * a Request in, a Response out. Resend is stood in for by a stub of fetch.
 *
 *   node --test tests/site/contact.test.mjs */
import {test, beforeEach} from "node:test";
import assert from "node:assert/strict";
import {onRequestPost, onRequest} from "../../functions/api/contact.js";

const SITE = "https://colecalfee.com";
const env = {RESEND_API_KEY: "re_test_key"};
let sent;
let provider;
beforeEach(() => {
  sent = [];
  provider = () => new Response(JSON.stringify({id: "email_1"}), {status: 200});
  globalThis.fetch = async (url, init) => { sent.push({url, init}); return provider(); };
});

function post(body, {origin = SITE, raw} = {}) {
  const headers = {"Content-Type": "application/json"};
  if (origin) headers.Origin = origin;
  return new Request(`${SITE}/api/contact`, {method: "POST", headers, body: raw ?? JSON.stringify(body)});
}
const note = (extra = {}) => ({email: "jane@example.com", message: "Dear Cole, a note.", website: "", elapsed: 9000, ...extra});
async function call(request, e = env) {
  const response = await onRequestPost({request, env: e});
  return {status: response.status, body: await response.json()};
}

test("a real note is sent to Cole, with the visitor as Reply-To", async () => {
  const {status, body} = await call(post(note()));
  assert.equal(status, 200);
  assert.deepEqual(body, {ok: true});
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, "https://api.resend.com/emails");
  assert.equal(sent[0].init.headers.Authorization, "Bearer re_test_key");
  const email = JSON.parse(sent[0].init.body);
  assert.deepEqual(email.to, ["colecalfee@gmail.com"]);
  assert.equal(email.reply_to, "jane@example.com");
  assert.equal(email.from, "Cole Calfee Website <contact@colecalfee.com>");
  assert.match(email.text, /Dear Cole, a note\./);
});

test("a provider failure is never reported as sent", async () => {
  provider = () => new Response("{\"message\":\"secret detail\"}", {status: 500});
  const {status, body} = await call(post(note()));
  assert.equal(status, 502);
  assert.equal(body.ok, undefined);
  assert.doesNotMatch(JSON.stringify(body), /secret detail|re_test_key/);
});

test("a provider that cannot be reached is never reported as sent", async () => {
  provider = () => { throw new TypeError("network down"); };
  const {status, body} = await call(post(note()));
  assert.equal(status, 502);
  assert.equal(body.ok, undefined);
});

test("without its secret the endpoint refuses rather than pretending", async () => {
  const {status, body} = await call(post(note()), {});
  assert.equal(status, 503);
  assert.equal(sent.length, 0);
  assert.equal(body.ok, undefined);
});

test("spam protection: honeypot, haste, other sites, junk", async () => {
  // The hidden field filled: accepted quietly, nothing sent.
  assert.deepEqual(await call(post(note({website: "http://spam.example"}))), {status: 200, body: {ok: true}});
  assert.equal(sent.length, 0);
  // Sent the instant the page opened.
  assert.equal((await call(post(note({elapsed: 400})))).status, 400);
  assert.equal((await call(post(note({elapsed: undefined})))).status, 400);
  // Posted from another site, or with no Origin at all.
  assert.equal((await call(post(note(), {origin: "https://evil.example"}))).status, 403);
  assert.equal((await call(post(note(), {origin: null}))).status, 403);
  // Malformed, oversized, or missing fields.
  assert.equal((await call(post(null, {raw: "not json"}))).status, 400);
  assert.equal((await call(post(null, {raw: "[1,2]"}))).status, 400);
  assert.equal((await call(post(note({message: "x".repeat(12000)})))).status, 413);
  assert.equal((await call(post(note({email: "not-an-address"})))).status, 400);
  assert.equal((await call(post(note({email: "a@b.co\nBcc: x@y.z"})))).status, 400);
  assert.equal((await call(post(note({message: "  "})))).status, 400);
  assert.equal(sent.length, 0, "nothing reaches Resend");
});

test("a preview deployment posting to itself is allowed", async () => {
  const request = new Request("https://abc123.personal-7jh.pages.dev/api/contact", {
    method: "POST", headers: {"Content-Type": "application/json", Origin: "https://abc123.personal-7jh.pages.dev"}, body: JSON.stringify(note())
  });
  assert.equal((await call(request)).status, 200);
});

test("any other method is refused", () => {
  const response = onRequest({request: new Request(`${SITE}/api/contact`)});
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "POST");
});

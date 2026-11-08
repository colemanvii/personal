/* TABLET end-to-end: the two real test captures, edit, refresh, browser
 * restart, duplicate detection, export, archive, delete, inbox, bookmarklet.
 *
 *   node tablet/tests/workflow.e2e.cjs
 *
 * Starts its own serve.py on port 4181 with a throwaway data folder, so the
 * real board in tablet/data/ is never touched. SHOTS=<dir> saves screenshots.
 */
const {chromium} = require("playwright");
const {spawn} = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");

const PORT = 4181;
const BASE = `http://127.0.0.1:${PORT}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tablet-e2e-"));
const DATA = path.join(tmp, "data");
const PROFILE = path.join(tmp, "profile");
const SHOTS = process.env.SHOTS || "";
const SEAN = "Add Sean Metcalf to the Freeman business-development hit list. We need to build some clubhouses with him.";
const COLIN = "Add Colin Post as a potential client for my personal photography. This is outside Freeman.";

const sleep = ms => new Promise(r => setTimeout(r, ms));
const step = s => console.log("  ✓ " + s);

async function shot(page, name) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, {recursive: true});
  await page.screenshot({path: path.join(SHOTS, name + ".png")});
}

async function field(page, name) {
  return page.locator(`#slabBody [name="${name}"]`).inputValue();
}

async function capture(page, text, link = "") {
  await page.click("#captureBtn");
  await page.fill("#pasteText", text);
  if (link) await page.fill("#pasteLink", link);
  await page.click("#readBtn");
  await page.waitForSelector("#approve");
}

(async () => {
  const server = spawn("python3", [path.join(__dirname, "..", "serve.py")], {env: {...process.env, TABLET_PORT: String(PORT), TABLET_DATA: DATA, TABLET_QUIET: "1"}, stdio: "inherit"});
  try {
    for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + "/api/health")).ok) break; } catch {} await sleep(100); }
    let ctx = await chromium.launchPersistentContext(PROFILE, {viewport: {width: 1440, height: 900}, deviceScaleFactor: SHOTS ? 2 : 1, acceptDownloads: true});
    let page = ctx.pages()[0] || await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(BASE + "/");
    await page.waitForSelector('.lane[data-project="tangerine"]');
    assert.deepEqual(await page.locator(".lane-head b").allTextContents(), ["Freeman", "Built for Generations", "Art", "Personal", "Tangerine"]);
    await shot(page, "01-empty-wall");
    step("five project lanes on one screen");

    // 1. Sean Metcalf
    await capture(page, SEAN, "https://chatgpt.com/c/freeman-bd-example");
    assert.equal(await field(page, "project"), "freeman");
    assert.equal(await field(page, "category"), "Business Development");
    assert.equal(await field(page, "person"), "Sean Metcalf");
    assert.equal(await field(page, "opportunity"), "Golf clubhouse construction");
    assert.equal(await field(page, "status"), "Prospect");
    assert.equal(await field(page, "nextAction"), "Explore relevant projects and potential construction partnership");
    assert.equal(await page.textContent("#originalText"), SEAN);
    assert.equal(await page.locator('[data-basis-for="nextAction"]').textContent(), "suggested");
    await shot(page, "02-sean-proposal");
    await page.click("#approve");
    await page.waitForSelector('.lane[data-project="freeman"] .card');
    step("Sean Metcalf proposed exactly as specified, approved onto Freeman");

    // 2. Colin Post
    await capture(page, COLIN);
    assert.equal(await field(page, "project"), "personal");
    assert.equal(await field(page, "person"), "Colin Post");
    assert.equal(await field(page, "nextAction"), "", "no next action invented");
    await shot(page, "03-colin-proposal");
    await page.click("#approve");
    await page.waitForSelector('.lane[data-project="personal"] .card');
    assert.equal(await page.locator('.lane[data-project="freeman"] .card').count(), 1, "Colin is not on Freeman");
    step("Colin Post placed on Personal, outside Freeman");
    await sleep(400);
    await shot(page, "04-wall-two-entries");

    // 3. edit
    await page.click('.lane[data-project="freeman"] .card');
    await page.fill('#slabBody [name="nextAction"]', "Call Sean about the two clubhouse bids");
    await page.click("#save");
    await page.waitForSelector("text=Call Sean about the two clubhouse bids");
    step("edit saved");

    // 4. refresh
    await page.reload();
    await page.waitForSelector("text=Call Sean about the two clubhouse bids");
    assert.equal(await page.locator(".card").count(), 2);
    step("survives refresh");

    // 5. duplicate
    await capture(page, SEAN);
    assert.match(await page.textContent("#dupes"), /Possible duplicate.*Sean Metcalf.*same person.*same original text/s);
    assert.equal(await page.textContent("#approve"), "Place anyway");
    await shot(page, "05-duplicate-warning");
    await page.click("#discard");
    assert.equal(await page.locator(".card").count(), 2);
    step("re-pasting Sean is flagged as a duplicate and can be discarded");

    // 6. export
    await page.click("#moreBtn");
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-cmd="export-json"]')]);
    const backup = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
    assert.deepEqual(backup.entries.map(e => e.person).sort(), ["Colin Post", "Sean Metcalf"]);
    assert.equal(backup.entries.find(e => e.person === "Sean Metcalf").original, SEAN);
    await page.click("#moreBtn");
    const [md] = await Promise.all([page.waitForEvent("download"), page.click('[data-cmd="export-md"]')]);
    assert.match(fs.readFileSync(await md.path(), "utf8"), /## Freeman[\s\S]*Sean Metcalf[\s\S]*> Add Sean Metcalf/);
    step(`exported ${dl.suggestedFilename()} and ${md.suggestedFilename()}`);

    // 7. archive and restore, delete with confirmation
    await capture(page, "Remember to look into a mural for Tangerine.");
    await page.click("#approve");
    await page.click('.lane[data-project="tangerine"] .card');
    await page.click("#arch");
    assert.equal(await page.locator('.lane[data-project="tangerine"] .card').count(), 0);
    await page.click("#archiveBtn");
    await page.click('.lane[data-project="tangerine"] .card');
    await page.click("#arch");
    await page.click("#archiveBtn");
    await page.click('.lane[data-project="tangerine"] .card');
    await page.click("#del");
    await page.waitForSelector("text=Delete permanently?");
    await shot(page, "06-delete-confirm");
    await page.click("#delNo");
    assert.equal(await page.locator("#delYes").count(), 0);
    await page.click("#del");
    await page.click("#delYes");
    assert.equal(await page.locator('.lane[data-project="tangerine"] .card').count(), 0);
    step("archive, restore, delete (with confirmation)");

    // 8. browser restart, then a browser with no memory at all
    await sleep(600);
    await ctx.close();
    ctx = await chromium.launchPersistentContext(PROFILE, {viewport: {width: 1440, height: 900}});
    page = ctx.pages()[0] || await ctx.newPage();
    await page.goto(BASE + "/");
    await page.waitForSelector("text=Sean Metcalf");
    assert.equal(await page.locator(".card").count(), 2);
    step("survives closing and reopening the browser");
    await ctx.close();
    const disk = JSON.parse(fs.readFileSync(path.join(DATA, "board.json"), "utf8"));
    assert.equal(disk.entries.length, 2);
    const browser = await chromium.launch();
    page = await browser.newPage();
    await page.goto(BASE + "/");
    await page.waitForSelector("text=Colin Post");
    step("a fresh browser (no local storage) recovers the board from tablet data/board.json");

    // 9. inbox: authenticated push, held for approval
    const token = fs.readFileSync(path.join(DATA, "inbox-token"), "utf8").trim();
    const denied = await fetch(BASE + "/api/inbox", {method: "POST", body: "{}"});
    assert.equal(denied.status, 401);
    const ok = await fetch(BASE + "/api/inbox", {method: "POST", headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
      body: JSON.stringify({text: "Idea for Built for Generations: a field guide series.", source: {kind: "inbox", title: "test client"}})});
    assert.equal(ok.status, 201);
    await page.reload();
    await page.click("#inboxBtn");
    await page.click("[data-rev]");
    assert.equal(await field(page, "project"), "bfg");
    await page.click("#discard");
    assert.equal(await page.locator('.lane[data-project="bfg"] .card').count(), 0, "inbox items never land without approval");
    step("inbox rejects unauthenticated posts and holds authenticated ones for approval");

    // 10. bookmarklet hand-off
    const hash = encodeURIComponent(JSON.stringify({text: "Tangerine: try the orange label set", url: "https://chatgpt.com/g/g-p-1a2b-tangerine/c/99", title: "Labels"}));
    await page.goto(BASE + "/#capture=" + hash);
    await page.waitForSelector("#approve");
    assert.equal(await field(page, "project"), "tangerine");
    assert.match(await page.textContent("#slabBody .prov"), /Selected on ChatGPT · “Labels”/);
    await page.click("#discard");
    step("bookmarklet selection arrives with its conversation link");

    // 11. phone
    const phone = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: SHOTS ? 2 : 1});
    await phone.goto(BASE + "/");
    await phone.waitForSelector("text=Sean Metcalf");
    const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight);
    assert.equal(overflow, false, "no page scroll on a phone");
    await shot(phone, "07-phone");
    step("phone width: one screen, no page scroll");

    await browser.close();
    assert.deepEqual(errors, []);
    console.log("TABLET workflow: all checks passed");
  } finally {
    server.kill();
    fs.rmSync(tmp, {recursive: true, force: true});
  }
})().catch(e => { console.error(e); process.exit(1); });

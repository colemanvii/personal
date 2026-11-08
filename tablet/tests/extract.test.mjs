// node --test tablet/tests/
import test from "node:test";
import assert from "node:assert/strict";
import {propose, findDuplicates, DEFAULT_PROJECTS, findPeople} from "../src/extract.js";
import {merge, emptyBoard} from "../src/store.js";
import {parseExport, readCaptureHash, bookmarklet} from "../src/sources.js";

const SEAN = "Add Sean Metcalf to the Freeman business-development hit list. We need to build some clubhouses with him.";
const COLIN = "Add Colin Post as a potential client for my personal photography. This is outside Freeman.";
const v = p => Object.fromEntries(Object.entries(p.fields).map(([k, f]) => [k, f.value]));

test("Sean Metcalf → Freeman business development prospect", () => {
  const p = propose(SEAN, {now: new Date(2026, 10, 8)});
  assert.equal(p.original, SEAN, "original kept verbatim");
  assert.deepEqual({...v(p), summary: undefined, date: undefined, sourceUrl: undefined}, {
    project: "freeman", category: "Business Development", person: "Sean Metcalf",
    opportunity: "Golf clubhouse construction", status: "Prospect",
    nextAction: "Explore relevant projects and potential construction partnership",
    summary: undefined, date: undefined, sourceUrl: undefined,
  });
  assert.equal(p.fields.project.basis, "verbatim");
  assert.equal(p.fields.person.basis, "verbatim");
  assert.equal(p.fields.opportunity.basis, "inferred", "golf is TABLET's reading, so it is marked");
  assert.equal(p.fields.nextAction.basis, "suggested", "rephrased next action needs confirming");
  assert.equal(p.fields.sourceUrl.value, "", "no link was supplied, none invented");
  assert.equal(p.fields.date.value, "2026-11-08");
});

test("Colin Post → Personal photography prospect, not Freeman", () => {
  const p = propose(COLIN);
  const f = v(p);
  assert.equal(f.project, "personal");
  assert.equal(f.person, "Colin Post");
  assert.equal(f.category, "Photography Client");
  assert.equal(f.status, "Prospect");
  assert.equal(f.nextAction, "", "no next action stated, none invented");
});

test("never invents people, actions or completion", () => {
  const p = propose("I called him yesterday and we finished the deck. Good meeting.");
  assert.equal(p.fields.person.value, "");
  assert.equal(p.fields.project.value, "", "no project named → person chooses");
  assert.notEqual(p.fields.status.value, "Done");
  assert.deepEqual(findPeople("Monday We met at Freeman with The Board"), []);
});

test("ChatGPT links and pasted transcripts", () => {
  const p = propose("You said:\nNext: email Sean Metcalf about Tangerine https://chatgpt.com/c/abc-123.\nChatGPT said:\nSure, Jane Doe could help.");
  assert.equal(p.fields.sourceUrl.value, "https://chatgpt.com/c/abc-123");
  assert.equal(p.fields.person.value, "Sean Metcalf", "people come from your words, not ChatGPT's");
  assert.equal(p.fields.project.value, "tangerine");
  assert.match(p.fields.nextAction.value, /^Email Sean Metcalf/);
  const q = propose("Worth keeping", {source: {url: "https://chatgpt.com/g/g-p-6789abcd-tangerine/c/xyz"}});
  assert.equal(q.fields.project.value, "tangerine");
  assert.equal(q.fields.project.basis, "source");
});

test("duplicate detection", () => {
  const entries = [{id: "1", person: "Sean Metcalf", original: SEAN}];
  assert.deepEqual(findDuplicates({person: "sean metcalf", original: "something else"}, entries)[0].reasons, ["same person"]);
  assert.ok(findDuplicates({person: "", original: SEAN}, entries)[0].reasons.includes("same original text"));
  assert.equal(findDuplicates({person: "Colin Post", original: COLIN}, entries).length, 0);
});

test("merge keeps newest edit and honours deletions", () => {
  const a = {...emptyBoard(), entries: [{id: "x", summary: "old", updatedAt: "1"}, {id: "y", updatedAt: "1"}]};
  const b = {...emptyBoard(), entries: [{id: "x", summary: "new", updatedAt: "2"}], deleted: ["y"], projects: [...emptyBoard().projects, {id: "haven", name: "Haven"}]};
  const m = merge(a, b);
  assert.deepEqual(m.entries.map(e => e.summary), ["new"]);
  assert.ok(m.projects.some(p => p.id === "haven"));
  assert.equal(DEFAULT_PROJECTS.length, 5);
});

test("sources: export file, bookmarklet hash", () => {
  const convs = parseExport([{title: "Freeman BD", conversation_id: "c1", update_time: 1, current_node: "b",
    gizmo_id: "g-p-123", mapping: {a: {id: "a", parent: null, message: {id: "a", author: {role: "user"}, content: {parts: ["Hi"]}}},
      b: {id: "b", parent: "a", message: {id: "b", author: {role: "assistant"}, content: {parts: ["Hello"]}}}}}]);
  assert.equal(convs[0].url, "https://chatgpt.com/c/c1");
  assert.equal(convs[0].projectId, "g-p-123");
  assert.deepEqual(convs[0].messages().map(m => m.text), ["Hi", "Hello"]);
  assert.throws(() => parseExport({nope: 1}));
  const cap = readCaptureHash("#capture=" + encodeURIComponent(JSON.stringify({text: "x", url: "https://chatgpt.com/c/1"})));
  assert.equal(cap.source.kind, "chatgpt-selection");
  assert.equal(readCaptureHash("#capture=%7Bbad"), null);
  assert.match(bookmarklet(), /^javascript:/);
});

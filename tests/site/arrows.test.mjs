/* Arrows are type, never emoji.
 *
 * iOS draws some arrows (↗, ↔ and their kin) as blue emoji unless the text
 * presentation selector U+FE0E follows them. Every page on the active site
 * must carry it; archive/ holds preserved older work and is left as it was.
 *
 *   node --test tests/site/arrows.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {execSync} from "node:child_process";
import {readFileSync} from "node:fs";

const EMOJI_ARROWS = /[↔-↙↩↪➡⤴⤵⬅-⬇]|&#x(?:219[4-9]|21A[9A]|27A1|293[45]|2B0[5-7]);/gi;
const TEXT = /^(?:︎|&#xFE0E;)/i;
const pages = execSync("git ls-files '*.html'", {encoding: "utf8"}).split("\n").filter(f => f && !f.startsWith("archive/") && !f.startsWith("tests/"));

test("every emoji-capable arrow on the active site asks for text presentation", () => {
  const bare = [];
  for (const file of pages) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(EMOJI_ARROWS)) {
      if (!TEXT.test(source.slice(match.index + match[0].length))) {
        bare.push(`${file}:${source.slice(0, match.index).split("\n").length} ${match[0]}`);
      }
    }
  }
  assert.deepEqual(bare, [], "arrows without U+FE0E");
});

test("the shared stylesheet asks for text presentation", () => {
  assert.match(readFileSync("assets/css/site.css", "utf8"), /html\{[^}]*font-variant-emoji:text/);
});

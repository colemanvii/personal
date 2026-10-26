const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { check } = require('@shopify/theme-check-node');
(async () => {
  // Supply only the scaffolding that a full installed theme normally provides.
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cole-theme-check-'));
  try {
    for (const dir of ['assets', 'layout', 'sections', 'snippets', 'templates']) fs.cpSync(path.resolve(__dirname, '..', dir), path.join(temp, dir), { recursive: true });
    fs.mkdirSync(path.join(temp, 'locales'));
    fs.writeFileSync(path.join(temp, 'locales/en.default.json'), '{}');
    const offenses = await check(temp);
    for (const offense of offenses) console.log(JSON.stringify(offense));
    if (offenses.length) process.exitCode = 1;
    else console.log('Theme Check: 0 offenses (isolated package with locale scaffold).');
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
})().catch((e) => { console.error(e); process.exitCode = 1; });

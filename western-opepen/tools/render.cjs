// Render SVG studies to PNG with the pre-installed Chromium.
// usage: node tools/render.cjs <dir-with-svgs> [px=1600]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const dir = process.argv[2];
  const px = parseInt(process.argv[3] || '1600', 10);
  const only = process.argv[4];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg') && (!only || f.includes(only)));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
  for (const f of files) {
    const svg = fs.readFileSync(path.join(dir, f), 'utf8');
    await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg style="width:${px}px;height:${px}px;display:block" `)}</body></html>`);
    await page.screenshot({ path: path.join(dir, f.replace(/\.svg$/, '.png')), clip: { x: 0, y: 0, width: px, height: px } });
  }
  await browser.close();
  console.log(`rendered ${files.length} file(s) at ${px}px`);
})();

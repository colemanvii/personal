// Builds out/motion-language-002.html: the gallery as one self-contained file
// (styles, scripts and the vendored stamp.pbm inlined), for review without a
// server. Nothing is fetched from the network.  node tools/bundle.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
let html = read('index.html');
html = html.replace('<link rel="stylesheet" href="gallery.css">', () => `<style>\n${read('gallery.css')}</style>`);
const stamp = 'reference/freeman-v5/eagle/stamp.pbm';
html = html.replace('<script src="engine/grammar.js"></script>', () => `<script>window.MotionAssets = ${JSON.stringify({ [stamp]: read(stamp) })};</script>\n<script src="engine/grammar.js"></script>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>/* ${src} */\n${read(src).replace(/<\/script/gi, '<\\/script')}</script>`);
// links to study.html cannot work from a single file; keep the cards, drop the navigation
html = html.replace('</body>', `<script>document.addEventListener('click', (e) => { const a = e.target.closest('a[href^="study.html"]'); if (a) e.preventDefault(); });</script>\n</body>`);
mkdirSync(join(root, 'out'), { recursive: true });
writeFileSync(join(root, 'out', 'motion-language-002.html'), html);
console.log('out/motion-language-002.html', (html.length / 1024).toFixed(0), 'KB');

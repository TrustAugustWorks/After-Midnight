// Renders the static share image (FR-09) to src/assets/og.png. Run again if the launch date changes:
//   npm run og
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launchInstant, formatDanishDateTime } from '../src/js/time.js';

const config = JSON.parse(await readFile(join('src', 'config.json'), 'utf8'));
const font = async (name) => (await readFile(join('src', 'fonts', name))).toString('base64');
const display = await font('big-shoulders-display-latin-900-normal.woff2');
const body = await font('space-grotesk-latin-500-normal.woff2');
const launchText = formatDanishDateTime(launchInstant(config), config.timeZone);

const html = `<!doctype html><html lang="da"><head><meta charset="utf-8"><style>
@font-face { font-family: D; src: url(data:font/woff2;base64,${display}) format('woff2'); font-weight: 900; }
@font-face { font-family: B; src: url(data:font/woff2;base64,${body}) format('woff2'); font-weight: 500; }
html, body { margin: 0; width: 1200px; height: 630px; background: #120A1F; color: #F4ECFF; overflow: hidden; }
.sun { position: absolute; right: -60px; top: 70px; width: 560px; height: 560px; border-radius: 50%;
  background: linear-gradient(#FFB547, #FF8A5C 30%, #FF3D8B 58%, #B0279A 82%, #6B1C8C);
  -webkit-mask-image: linear-gradient(#000 0 42%, transparent 42%), repeating-linear-gradient(#000 0 22px, transparent 22px 32px); }
.copy { position: absolute; left: 72px; top: 72px; width: 640px; font-family: B; }
.brand { font: 900 40px/1 D; color: #FF3D8B; letter-spacing: 1px; text-transform: uppercase; }
h1 { margin: 36px 0 0; font: 900 132px/0.9 D; text-transform: uppercase; }
p { margin: 28px 0 0; font-size: 34px; line-height: 1.3; color: #CDB8EA; }
p strong { color: #FFB547; font-weight: 500; }
.foot { position: absolute; left: 72px; bottom: 48px; font: 500 20px B; color: #CDB8EA; }
</style></head><body>
<div class="sun"></div>
<div class="copy">
  <div class="brand">${config.siteName}</div>
  <h1>Nedtælling<br>til GTA VI</h1>
  <p>Lanceres <strong>${launchText}</strong><br>dansk tid</p>
</div>
<div class="foot">Uofficielt fanprojekt</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join('src', 'assets', 'og.png') });
await browser.close();
console.log('Saved src/assets/og.png');

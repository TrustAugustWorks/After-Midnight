// Part of TC-N1: the core page's JavaScript must stay under 50 KB gzipped.
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const BUDGET = 50 * 1024;
const files = ['dist/app.js', 'dist/styles.css', 'dist/index.html'];

let failed = false;
for (const file of files) {
  const size = gzipSync(await readFile(file)).length;
  const isJs = file.endsWith('.js');
  const over = isJs && size > BUDGET;
  failed ||= over;
  console.log(`${over ? 'FAIL' : 'ok  '} ${file}: ${(size / 1024).toFixed(1)} KB gzipped${isJs ? ` (budget ${BUDGET / 1024} KB)` : ''}`);
}
process.exit(failed ? 1 : 0);

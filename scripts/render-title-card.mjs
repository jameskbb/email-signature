import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const imageDirectory = new URL('../docs/images/', import.meta.url);
const output = new URL('readme-title-email-signature.png', imageDirectory);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 440 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // All inputs are committed locally. Rendering never needs a network request.
  await page.route(/^https?:/, route => route.abort());
  await page.goto(new URL('../docs/src/title-card.html', import.meta.url).href);
  await page.waitForFunction(() => document.querySelector('#signature img')?.naturalWidth > 0);
  await page.evaluate(() => document.fonts.ready);
  assert.deepEqual(errors, [], 'The title card must render without script errors');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth === 1200 && document.documentElement.scrollHeight === 440), 'The title card must fit its canvas');
  await mkdir(imageDirectory, { recursive: true });
  await page.screenshot({ path: fileURLToPath(output) });
  const png = await readFile(output);
  assert.equal(png.readUInt32BE(16), 2400);
  assert.equal(png.readUInt32BE(20), 880);
  console.log('Rendered docs/images/readme-title-email-signature.png (1200 x 440 at 2x).');
} finally {
  await browser.close();
}

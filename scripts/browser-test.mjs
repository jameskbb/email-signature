import assert from 'node:assert/strict';
import { mkdir, readFile, copyFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const base = process.env.BASE_URL || 'http://127.0.0.1:8000';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
// Tests never contact a third-party image server.
await context.route('https://images.example.test/**', route => route.fulfill({
  contentType: 'image/png',
  body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
}));
await context.route('https://broken.example.test/**', route => route.abort());
const preview = page.locator('#preview');
const text = async () => (await preview.innerText()).trim();
const check = (condition, message) => assert.ok(condition, message);
const waitFor = async fn => { await page.waitForFunction(fn); };
try {
  await page.goto(base);
  await page.waitForFunction(() => document.querySelector('#name').value.length > 0);
  const sampleName = await page.locator('#name').inputValue();
  check((await text()).includes(sampleName), 'Sample is rendered');
  await page.locator('#name').fill('Jamie Example');
  check((await text()).includes('Jamie Example'), 'Name updates live');
  for (const id of ['position', 'company', 'phone', 'email']) await page.locator(`#${id}`).fill('');
  check(!(await text()).includes('mailto:'), 'Empty contacts omitted');
  check(await preview.locator('a[href^="mailto:"]').count() === 0, 'Empty email link omitted');
  await page.locator('#name').fill('<img src=x onerror="window.injected=true"> & "Example"');
  check((await text()).includes('<img src=x'), 'Hostile text rendered literally');
  check(await preview.locator('img[src="x"]').count() === 0, 'Hostile text creates no DOM');
  check(!await page.evaluate(() => window.injected), 'Hostile text does not execute');
  await page.locator('#name').fill('Jamie Example');
  await page.locator('#email').fill('not-an-email');
  check(await page.locator('#copy').isDisabled(), 'Invalid email blocks copying');
  check(await page.locator('#download').isDisabled(), 'Invalid email blocks downloading');
  await page.locator('#email').fill('jamie@example.com');
  await page.locator('#imageUrl').fill('javascript:alert(1)');
  check(await page.locator('#download').isDisabled(), 'Unsafe image URL blocks export');
  check(await preview.locator('img').count() === 0, 'Unsafe image URL not loaded');
  await page.locator('#imageUrl').fill('https://images.example.test/photo.png');
  await waitFor(() => { const img = document.querySelector('#preview img'); return img?.complete && img.naturalWidth > 0; });
  await page.locator('#imageAlt').fill('Example portrait');
  check(await preview.locator('img').getAttribute('alt') === 'Example portrait', 'Image alt is live');
  await page.locator('#imageUrl').fill('https://broken.example.test/photo.png');
  await page.waitForFunction(() => document.querySelector('#image-status').textContent.includes('could not load'));
  await page.locator('#imageUrl').fill('');
  const initialLinks = await page.locator('.link-row').count();
  await page.locator('#add-link').click();
  check(await page.locator('.link-row').count() === initialLinks + 1, 'Add link works');
  const row = page.locator('.link-row').last();
  await row.locator('input').nth(0).fill('Portfolio');
  await row.locator('input').nth(1).fill('javascript:alert(1)');
  check(await page.locator('#copy').isDisabled(), 'Unsafe link blocks export');
  await row.locator('input').nth(1).fill('portfolio.example.com');
  await preview.locator('a[href="https://portfolio.example.com/"]').waitFor();
  await row.locator('button').click();
  check(await page.locator('.link-row').count() === initialLinks, 'Remove link works');
  await page.reload();
  check(await page.locator('#name').inputValue() === 'Jamie Example', 'Draft survives reload');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download').click();
  const download = await downloadPromise;
  const html = await readFile(await download.path(), 'utf8');
  check(html.includes('Jamie Example') && html.includes('<table'), 'Download contains rendered table');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('#copy').click();
  await page.waitForFunction(() => document.querySelector('#action-status').textContent.includes('copied'));
  const copied = await page.evaluate(async () => (await navigator.clipboard.read()).map(item => item.types));
  check(copied.some(types => types.includes('text/html')), 'Clipboard includes rich HTML');
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, 'write', { configurable: true, value: async () => { throw new Error('Denied'); } });
    document.execCommand = () => false;
  });
  await page.locator('#copy').click();
  await page.locator('#manual-copy').waitFor({ state: 'visible' });
  await page.locator('#select-signature').click();
  check((await page.evaluate(() => window.getSelection().toString())).includes('Jamie Example'), 'Manual copy selects signature');
  await page.locator('#clear').click();
  check(await page.locator('#name').inputValue() === '', 'Clear resets identity');
  check(await page.locator('#empty-note').isVisible(), 'Clear exposes empty state');
  await page.locator('#restore').click();
  check(await page.locator('#name').inputValue() === 'Jamie Example', 'Undo restores cleared draft');
  // Regenerate documentation images with the honest labeled initial example.
  await page.locator('#name').fill('Alex Morgan');
  await page.locator('#position').fill('Product Designer');
  await page.locator('#company').fill('North & Co.');
  await page.locator('#email').fill('alex@example.com');
  await context.route('https://images.example.test/logo.svg', route => route.fulfill({ contentType: 'image/svg+xml', path: path.join(root, 'docs/images/example-logo.svg') }));
  await page.locator('#imageUrl').fill('https://images.example.test/logo.svg');
  await page.locator('#imageAlt').fill('Example company logo');
  await page.waitForFunction(() => document.querySelector('#preview img')?.naturalWidth > 0);
  await page.evaluate(() => { document.querySelector('#sample-note').textContent = 'Sample details to get you started. Replace them with your own.'; });
  await page.evaluate(() => { document.activeElement.blur(); scrollTo(0, 0); });
  await page.evaluate(() => document.fonts.ready);
  await mkdir(path.join(root, 'docs/images'), { recursive: true });
  await mkdir(path.join(root, '.impeccable/review'), { recursive: true });
  await page.screenshot({ path: path.join(root, 'docs/images/editor-desktop.png'), fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px has no page overflow`);
    if (width === 390) await page.screenshot({ path: path.join(root, 'docs/images/editor-mobile.png'), fullPage: true });
  }
  await page.locator('#name').fill('A'.repeat(160));
  await page.locator('#email').fill('long.address.for.mobile@example.com');
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '320px long content stays within preview');
  await copyFile(path.join(root, 'docs/images/editor-desktop.png'), path.join(root, '.impeccable/review/desktop.png'));
  await copyFile(path.join(root, 'docs/images/editor-mobile.png'), path.join(root, '.impeccable/review/mobile.png'));
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
  await page.waitForFunction(() => document.querySelector('#preview table'));
  check(await page.locator('#name').inputValue(), 'file:// loads app without a build');
  // Serve the same resources beneath a repository path to exercise Pages-relative assets.
  await page.route('http://subpath.example.test/email-signature/**', async route => {
    const filename = new URL(route.request().url()).pathname.split('/').pop() || 'index.html';
    const types = { html: 'text/html', js: 'text/javascript', css: 'text/css' };
    await route.fulfill({ body: await readFile(path.join(root, filename)), contentType: types[filename.split('.').pop()] });
  });
  await page.goto('http://subpath.example.test/email-signature/');
  await page.waitForFunction(() => document.querySelector('#preview table'));
  check(await page.locator('#name').inputValue(), 'Project subpath loads app');
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  console.log('Browser checks passed: editing, escaping, validation, image stubs, links, persistence, export, clipboard fallback, reset, responsive layout, file loading and subpath hosting.');
} finally {
  await browser.close();
}

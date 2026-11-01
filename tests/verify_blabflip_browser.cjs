#!/usr/bin/env node
/* Local-only browser checks. Public redirect targets are fulfilled from this checkout. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require(process.env.KRO_PLAYWRIGHT || '/Users/rkrochak/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const pages = ['blabflip.html', 'blabflip-privacy.html', 'blabflip-support.html'];
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp'};
function localFile(url) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
  assert(file.startsWith(root + path.sep), 'Request must stay inside the checkout');
  return file;
}
const server = http.createServer((request, response) => {
  try {
    const file = localFile('http://localhost' + request.url);
    const body = fs.readFileSync(file);
    response.writeHead(200, {'content-type': mime[path.extname(file)] || 'application/octet-stream'});
    response.end(body);
  } catch {
    response.writeHead(404); response.end('Not found');
  }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  let checked = 0;
  try {
    browser = await chromium.launch({headless: true, executablePath: process.env.KRO_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
    for (const viewport of [{width: 320, height: 640}, {width: 390, height: 844}, {width: 768, height: 1024}, {width: 1440, height: 900}]) {
      const context = await browser.newContext({viewport, reducedMotion: 'reduce'});
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort('blockedbyclient'));
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      for (const name of pages) {
        await page.goto(base + '/' + name, {waitUntil: 'networkidle'});
        assert.match(await page.title(), /BlabFlip/);
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://krostudios.com/' + name);
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal(await page.locator('main').count(), 1);
        const text = await page.locator('body').innerText();
        assert(!/Echo\s*Dare|Echo\s*Match|Solo\s*Echo\s*Quest/i.test(text), 'No superseded visible branding');
        assert((await page.locator('body').textContent()).includes('18'), 'Adult audience information remains present, including expandable help');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + ' has no horizontal viewport overflow');
        const clipped = await page.locator('h1, h2, h3, .card, details, .button').evaluateAll(elements => elements.filter(element => {
          const box = element.getBoundingClientRect();
          return box.width > 0 && (box.left < -1 || box.right > innerWidth + 1);
        }).map(element => element.tagName + ': ' + element.textContent.trim().slice(0, 70)));
        assert.deepEqual(clipped, [], name + ' primary UI remains in the viewport');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.classList.contains('skip')), true, 'Skip navigation is the first keyboard stop');
        if (name === 'blabflip-support.html') {
          const question = page.locator('details').first();
          await question.locator('summary').click();
          assert.equal(await question.getAttribute('open'), '', 'FAQ can be expanded');
        }
        checked++;
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    for (const viewport of [{width: 390, height: 844}, {width: 1440, height: 900}]) {
      const localized = await browser.newContext({viewport, reducedMotion: 'reduce'});
      await localized.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort('blockedbyclient'));
      const page = await localized.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      for (const language of ['en', 'he', 'ru']) {
        await page.goto(base + '/?app=echo&lang=' + language, {waitUntil: 'networkidle'});
        await page.waitForFunction(() => window.KROHomeI18n && window.KROPrototype && window.KROCatalog);
        assert.equal(await page.locator('html').getAttribute('lang'), language);
        const node = page.locator('.app-node[data-world="echo"]');
        assert.equal(await node.locator('.app-title').textContent(), 'BlabFlip');
        assert.match(await node.getAttribute('aria-label'), /BlabFlip/);
        assert.equal(await page.locator('.orbit-site-link[data-destination="echo"]').getAttribute('href'), 'https://krostudios.com/blabflip.html');
        assert.equal(await page.evaluate(() => window.KROCatalog.apps.echo.title), 'BlabFlip');
        assert.equal(await page.evaluate(() => window.KROCatalog.apps.echo.status), 'Coming soon · 18+');
        assert(await page.evaluate(() => window.KROCatalog.apps.echo.shots.every(source => source.includes('blabflip'))));
        assert(!/Echo\s*Dare/i.test(await page.locator('body').innerText()));
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Localized homepage has no horizontal overflow');
        checked++;
      }
      assert.deepEqual(errors, []);
      await localized.close();
    }
    for (const viewport of [{width: 390, height: 844}, {width: 1440, height: 900}]) {
      const fallbackContext = await browser.newContext({viewport, reducedMotion: 'reduce'});
      await fallbackContext.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort('blockedbyclient'));
      await fallbackContext.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, ...arguments_) {
          return /webgl/i.test(type) ? null : original.call(this, type, ...arguments_);
        };
      });
      const page = await fallbackContext.newPage();
      await page.goto(base + '/?app=echo&lang=en', {waitUntil: 'networkidle'});
      await page.waitForFunction(() => window.KROPrototype?.getState().renderer === 'fallback');
      const phone = page.locator('.phone-render-fallback');
      assert.match(await phone.getAttribute('src'), /bridge-phone-blabflip-0\.webp$/);
      assert(await phone.evaluate(image => image.complete && image.naturalWidth > 0));
      checked++;
      await fallbackContext.close();
    }
    const context = await browser.newContext({javaScriptEnabled: false});
    await context.route('https://krostudios.com/**', route => route.fulfill({path: localFile(route.request().url()), contentType: 'text/html; charset=utf-8'}));
    const page = await context.newPage();
    for (const name of pages) {
      const legacy = name.replace('blabflip', 'echodare');
      await page.goto(base + '/' + legacy);
      await page.waitForURL('https://krostudios.com/' + name);
      assert.match(await page.title(), /BlabFlip/);
      checked++;
    }
    await page.goto(base + '/', {waitUntil: 'networkidle'});
    const fallback = page.locator('.no-script-node[data-world="echo"]');
    assert.equal(await fallback.locator('.app-title').textContent(), 'BlabFlip');
    assert.equal(await fallback.getAttribute('href'), 'blabflip.html');
    assert.match(await page.locator('.phone-render-fallback').getAttribute('alt'), /BlabFlip/);
    assert(await page.locator('.phone-render-fallback').evaluate(image => image.complete && image.naturalWidth > 0));
    checked++;
    await context.close();
    console.log('BlabFlip browser verification passed: ' + checked + ' page/viewport or no-JavaScript redirect cases.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error); process.exitCode = 1;});

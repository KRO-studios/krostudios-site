#!/usr/bin/env node
'use strict';

// Run against a local preview or the deployed page. Evidence stays outside the site.
// SITE_URL=http://127.0.0.1:8778/tanakh-quiz/ node tests/verify_tanakh_qr_browser.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const site = process.env.SITE_URL || 'http://127.0.0.1:8778/tanakh-quiz/';
const output = process.env.REPORT_DIR || path.join(os.tmpdir(), 'tanakh-qr-browser-qa');
const destination = 'https://krostudios.com/tanakh-quiz/#download';
const stores = [
  'https://apps.apple.com/app/id6797598421',
  'https://play.google.com/store/apps/details?id=com.krostudios.tanakh_quiz',
];
const report = {site, destination, checkedAt: new Date().toISOString(), viewports: [], phoneDestinations: []};
fs.mkdirSync(output, {recursive: true});

async function assertNoOverflow(page) {
  const layout = await page.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
  }));
  assert(layout.document <= layout.viewport + 1 && layout.body <= layout.viewport + 1,
    `horizontal overflow: ${JSON.stringify(layout)}`);
  return layout;
}

(async () => {
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  try {
    for (const spec of [
      {name: 'desktop', width: 1440, height: 1000},
      {name: 'laptop', width: 1280, height: 800},
      {name: 'desktop-boundary', width: 1001, height: 900},
      {name: 'tablet-boundary', width: 1000, height: 900},
      {name: 'tablet', width: 768, height: 1024},
      {name: 'phone-large', width: 430, height: 932},
      {name: 'phone', width: 390, height: 844},
      {name: 'phone-compact', width: 320, height: 568},
    ]) {
      const context = await browser.newContext({viewport: {width: spec.width, height: spec.height}, deviceScaleFactor: 1});
      const page = await context.newPage();
      const failures = [];
      const externalRequests = [];
      page.on('pageerror', error => failures.push(error.message));
      page.on('requestfailed', request => failures.push(`${request.url()}: ${request.failure()?.errorText}`));
      page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()}: ${response.url()}`); });
      page.on('request', request => {
        if (new URL(request.url()).origin !== new URL(site).origin) externalRequests.push(request.url());
      });
      const response = await page.goto(site, {waitUntil: 'networkidle'});
      assert(response?.ok(), `page returned ${response?.status()}`);
      assert.equal(await page.locator('html').getAttribute('lang'), 'he');
      assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
      const card = page.locator('.desktop-qr');
      assert.equal(await card.count(), 1);
      const visible = spec.width > 1000;
      assert.equal(await card.isVisible(), visible);
      assert.equal(await page.locator('.desktop-qr-link').getAttribute('href'), destination);
      assert.deepEqual(await page.locator('.hero-copy .store-row a').evaluateAll(items => items.map(a => a.href)), stores);
      const layout = await assertNoOverflow(page);
      const entry = {...spec, qrVisible: visible, layout};
      if (visible) {
        const image = card.locator('img');
        await image.evaluate(element => element.decode());
        const qrBox = await image.boundingBox();
        const storeBox = await page.locator('.hero-copy .store-row').boundingBox();
        assert.equal(qrBox.width, 164);
        assert.equal(qrBox.height, 164);
        assert(storeBox.y + storeBox.height < qrBox.y, 'QR must follow the main store buttons');
        const appearance = await image.evaluate(element => ({
          transform: getComputedStyle(element).transform,
          direction: getComputedStyle(element.parentElement).direction,
          cardDirection: getComputedStyle(element.closest('.desktop-qr')).direction,
        }));
        assert.equal(appearance.transform, 'none', 'QR must not be transformed/mirrored');
        assert.equal(appearance.direction, 'ltr');
        assert.equal(appearance.cardDirection, 'rtl');
        await page.locator('.hero').screenshot({path: path.join(output, `${spec.name}-hero.png`)});
        await image.screenshot({path: path.join(output, `${spec.name}-qr.png`)});
        await page.locator('.desktop-qr-link').focus();
        assert.equal(await page.locator(':focus').getAttribute('class'), 'desktop-qr-link');
        Object.assign(entry, {qrBox, appearance, keyboardAccessible: true});
      } else {
        await page.screenshot({path: path.join(output, `${spec.name}-opening.png`)});
      }
      assert.deepEqual(externalRequests, [], 'page/QR must have no third-party runtime requests');
      assert.deepEqual(failures, [], 'page must load without errors');
      report.viewports.push(entry);
      console.log(`PASS ${spec.name}: QR ${visible ? 'shown' : 'hidden'}, own store links, RTL and layout`);
      await context.close();
    }

    for (const width of [320, 390, 430]) {
      for (const javaScriptEnabled of [true, false]) {
        const height = width === 320 ? 568 : 844;
        const context = await browser.newContext({
          viewport: {width, height}, deviceScaleFactor: 1, isMobile: true, hasTouch: true, javaScriptEnabled,
        });
        const page = await context.newPage();
        const response = await page.goto(new URL('#download', site).href, {waitUntil: 'networkidle'});
        assert(response?.ok());
        assert.equal(new URL(page.url()).hash, '#download');
        const choices = await page.locator('#download .store-row a').evaluateAll(items => items.map(a => {
          const rect = a.getBoundingClientRect();
          return {href: a.href, top: rect.top, bottom: rect.bottom, width: rect.width};
        }));
        assert.deepEqual(choices.map(choice => choice.href), stores);
        assert(choices.every(choice => choice.top >= 0 && choice.bottom <= height && choice.width > 0),
          `both stores must be immediately in view: ${JSON.stringify(choices)}`);
        assert(await page.locator('.desktop-qr').isHidden());
        await assertNoOverflow(page);
        await page.screenshot({path: path.join(output, `phone-${width}-destination-${javaScriptEnabled ? 'js' : 'no-js'}.png`)});
        report.phoneDestinations.push({width, height, javaScriptEnabled, choices, passed: true});
        console.log(`PASS ${width}px phone QR destination (${javaScriptEnabled ? 'JS' : 'no JS'}): both stores in view`);
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  report.passed = true;
  fs.writeFileSync(path.join(output, 'BROWSER_QR.json'), `${JSON.stringify(report, null, 2)}\n`);
})().catch(error => { console.error(error); process.exitCode = 1; });

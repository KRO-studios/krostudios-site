#!/usr/bin/env node
// Exercise the store links on a local preview or public deployment.
// SITE_URL=http://127.0.0.1:8000 node tests/verify_store_release.cjs
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const defaultPlaywright = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {chromium} = require(process.env.KRO_PLAYWRIGHT || (fs.existsSync(defaultPlaywright) ? defaultPlaywright : 'playwright'));
const origin = new URL(process.env.SITE_URL || 'http://127.0.0.1:8000/').origin;
const evidence = process.env.KRO_REPORT_DIR;
const apps = {
  kino: {google: 'com.krostudios.sovietkino', apple: '6812753192', site: '/sovietkino/'},
  echo: {google: 'com.krostudios.blabflip', site: '/blabflip.html'},
  tanakh: {google: 'com.krostudios.tanakh_quiz', apple: '6797598421', site: '/tanakh-quiz/'},
  'half-life': {google: 'com.halflife.halflifequizvalvetrivia'},
  dune: {google: 'com.dunetanks.dunetanks'},
  rap: {google: 'com.hiphoprap.guessrapperhiphop'},
  beer: {google: 'com.beer.beergameguessthebeer'},
  feed: {google: 'com.krostudios.feedkirusha'}
};

async function capture(page, name) {
  if (evidence) await page.screenshot({path: path.join(evidence, name + '.png')});
}

async function checkDestination(link, platform, id) {
  const url = new URL(await link.getAttribute('href'));
  if (platform === 'apple') {
    assert.equal(url.hostname, 'apps.apple.com');
    assert.ok(url.pathname.endsWith('/id' + id), 'The Apple badge opens its own app listing');
  } else {
    assert.equal(url.hostname, 'play.google.com');
    assert.equal(url.pathname, '/store/apps/details');
    assert.equal(url.searchParams.get('id'), id);
  }
}

async function checkBadge(link, basename) {
  const image = link.locator('img');
  await image.evaluate(el => el.decode());
  const badge = await image.evaluate(el => ({
    file: new URL(el.currentSrc).pathname.split('/').pop(),
    width: el.getBoundingClientRect().width,
    height: el.getBoundingClientRect().height
  }));
  assert.equal(badge.file, basename, 'Show the official localized badge asset');
  assert.ok(badge.height >= 40 && badge.width > badge.height, 'Badge is legible and keeps its horizontal aspect ratio');
  return badge.height;
}

async function checkDock(page, key, language) {
  const app = apps[key];
  const dock = page.locator('.store-dock');
  const play = dock.locator('.store-play');
  const apple = dock.locator('.store-ios');
  const site = dock.locator('.store-web');
  await checkDestination(play, 'google', app.google);
  const h = await checkBadge(play, 'play-' + language + '.webp');
  assert.equal(await apple.isVisible(), !!app.apple);
  if (app.apple) {
    await checkDestination(apple, 'apple', app.apple);
    assert.equal(await checkBadge(apple, 'apple-' + language + '.svg'), h);
    assert.ok(await apple.evaluate(el => Boolean(el.compareDocumentPosition(el.parentElement.querySelector('.store-play')) & Node.DOCUMENT_POSITION_FOLLOWING)), 'App Store comes first');
  }
  assert.equal(await site.isVisible(), !!app.site);
  if (app.site) {
    const url = new URL(await site.getAttribute('href'), 'https://krostudios.com/');
    assert.equal(url.origin, 'https://krostudios.com');
    assert.equal(url.pathname, app.site);
  }
  const size = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert.ok(size[0] <= size[1] + 1, 'All selected app links fit the viewport');
}

async function checkStudio(page, width) {
  const response = await page.goto(new URL('/?lang=en', origin).href, {waitUntil: 'networkidle'});
  assert.equal(response.status(), 200);
  const choose = page.locator('.choose'), picker = page.locator('#app-picker');
  await choose.waitFor();
  await page.waitForFunction(() => ['webgl', 'fallback'].includes(window.KROPrototype?.getState().renderer));
  assert.equal(await page.evaluate(() => window.KROPrototype.getState().key), 'kino');
  await checkDock(page, 'kino', 'en');
  const chooseBox = await choose.boundingBox();
  assert.ok(chooseBox.y >= 0 && chooseBox.y + chooseBox.height < page.viewportSize().height, 'Chooser is visible on first screen');
  await capture(page, 'studio-' + width);

  await choose.click();
  assert.equal(await picker.locator('.pick-option').count(), Object.keys(apps).length);
  const links = await picker.locator('.publisher-sites a').evaluateAll(items => items.map(el => el.href));
  assert.equal(links.length, 2);
  assert.ok(links.some(href => new URL(href).hostname === 'apps.apple.com' && new URL(href).pathname.endsWith('/id6797598423')));
  assert.ok(links.some(href => new URL(href).hostname === 'play.google.com' && new URL(href).searchParams.get('id') === '5253822086520008985'));
  assert.ok(await page.locator('.store-dock').evaluate(el => !!el.closest('[inert]')), 'Background download controls are inactive while choosing');
  await capture(page, 'chooser-' + width);
  await page.keyboard.press('Escape');
  assert.equal(await picker.isVisible(), false);
  assert.ok(await choose.evaluate(el => el === document.activeElement));

  for (const key of Object.keys(apps)) {
    await choose.click();
    await picker.locator('.pick-option[data-app="' + key + '"]').click();
    await page.waitForFunction(key => window.KROPrototype.getState().key === key, key);
    assert.equal(await picker.isVisible(), false);
    await checkDock(page, key, 'en');
  }
  await choose.click();
  await picker.locator('.pick-option[data-app="tanakh"]').click();
  await page.waitForFunction(() => window.KROPrototype.getState().key === 'tanakh');
  for (const language of ['he','ru','en']) {
    await page.locator('.lang-toggle').click();
    await page.locator('.studio-language-switch button[data-language="' + language + '"]').click();
    assert.equal(await page.locator('html').getAttribute('lang'), language);
    assert.equal(await page.locator('html').getAttribute('dir'), language === 'he' ? 'rtl' : 'ltr');
    await checkDock(page, 'tanakh', language);
  }

  const phone = page.locator('.signal-device-rotator');
  await phone.scrollIntoViewIfNeeded();
  const point = await page.evaluate(() => {
    const points = window.KROPrototype.phone.getScreenPolygon();
    return {x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length};
  });
  if (width <= 690) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  await page.waitForFunction(() => window.KROPrototype.getState().shot === 1);
  assert.equal(await page.locator('.gesture-tip').isVisible(), false, 'First screen gesture retires its prompt');
}

async function checkKino(page, width) {
  const response = await page.goto(new URL('/sovietkino/', origin).href, {waitUntil: 'networkidle'});
  assert.equal(response.status(), 200);
  const stores = page.locator('#download');
  const apple = stores.locator('a[href*="apps.apple.com"]').first();
  const play = stores.locator('a[href*="play.google.com"]').first();
  await checkDestination(apple, 'apple', apps.kino.apple);
  await checkDestination(play, 'google', apps.kino.google);
  for (const link of [apple, play]) {
    const badge = link.locator('img');
    await badge.evaluate(el => el.decode());
    assert.ok(await badge.evaluate(el => el.getBoundingClientRect().height >= 40));
  }
  const title = page.locator('#hero-film'), first = await title.textContent();
  assert.match(first, /Бриллиантовая рука/);
  await capture(page, 'sovietkino-' + width);
  await page.locator('#next-illustration').click();
  await page.waitForFunction(name => document.querySelector('#hero-film').textContent !== name, first);
  await page.locator('#previous-illustration').click();
  assert.equal(await title.textContent(), first);
}

async function run(browser, width) {
  const context = await browser.newContext({viewport: {width, height: width > 690 ? 900 : 844}, hasTouch: width <= 690, reducedMotion: 'reduce'});
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(9000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (new URL(response.url()).origin === origin && response.status() >= 400) errors.push(response.status() + ' ' + response.url());
    });
    await checkStudio(page, width);
    await checkKino(page, width);
    assert.deepEqual(errors, [], 'Release pages should load without missing assets or script errors');
    console.log('PASS', width, 'px — homepage, eight store mappings, three languages, SovietKino');
  } finally {
    await context.close();
  }
}

(async () => {
  if (evidence) fs.mkdirSync(evidence, {recursive: true});
  const executablePath = process.env.KRO_CHROME || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
  const browser = await chromium.launch({headless: true, executablePath});
  try {
    const widths = (process.env.KRO_WIDTHS || '320,390,736,1440').split(',').map(Number);
    for (const width of widths) await run(browser, width);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode = 1;});

#!/usr/bin/env node
/* Mechanically capture the existing real handset models with genuine new app screenshots. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require(process.env.KRO_PLAYWRIGHT || '/Users/rkrochak/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp'};
const server = http.createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    assert(file.startsWith(root + path.sep));
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
  try {
    browser = await chromium.launch({headless: true, executablePath: process.env.KRO_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-webgl', '--ignore-gpu-blocklist']});
    const context = await browser.newContext({viewport: {width: 1440, height: 1100}, deviceScaleFactor: 1.5, reducedMotion: 'reduce'});
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort('blockedbyclient'));
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    for (const design of ['homepage', 'concepts']) {
      await page.goto(base + (design === 'homepage' ? '/?app=echo&lang=en' : '/concepts/?app=echo&design=signal'), {waitUntil: 'networkidle'});
      await page.waitForFunction(() => document.querySelector('.signal-device-rotator')?.kroPhone3D && document.querySelector('.phone-webgl')?.dataset.screenSrc);
      await page.evaluate(() => document.fonts.ready);
      for (let shot = 0; shot < 2; shot++) {
        const screenshot = 'assets/' + (design === 'homepage' ? 'bridge-' : '') + 'blabflip-' + (shot === 0 ? 'home' : 'listen') + '.jpg';
        await page.evaluate(({design, shot, screenshot}) => {
          if (design === 'homepage') window.KROPrototype.select('echo', shot, false, false);
          else document.querySelector('.signal-device-rotator').kroPhone3D.setScreen(screenshot, 'echo');
        }, {design, shot, screenshot});
        await page.waitForFunction(screenshot => document.querySelector('.phone-webgl').dataset.screenSrc.endsWith('/' + screenshot), screenshot);
        const captured = await page.evaluate(design => {
          const rotor = document.querySelector('.signal-device-rotator');
          const source = rotor.querySelector('.phone-webgl');
          rotor.kroPhone3D.setPose(design === 'homepage' ? window.KROPhone.defaultPose : {yaw: -14, pitch: 2, roll: 0});
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 800 / source.width, 1500 / source.height);
          canvas.width = Math.round(source.width * scale); canvas.height = Math.round(source.height * scale);
          const drawing = canvas.getContext('2d'); drawing.drawImage(source, 0, 0, canvas.width, canvas.height);
          const pixels = drawing.getImageData(0, 0, canvas.width, canvas.height).data;
          let opaque = 0, transparent = 0;
          for (let index = 3; index < pixels.length; index += 4) {
            if (pixels[index] > 100) opaque++;
            if (pixels[index] === 0) transparent++;
          }
          return {data: canvas.toDataURL('image/webp', .94), width: canvas.width, height: canvas.height, opaque, transparent};
        }, design);
        assert(captured.opaque > captured.width * captured.height * .3, 'The handset was rendered');
        assert(captured.transparent > captured.width * captured.height * .05, 'The render retains its transparent background');
        const bytes = Buffer.from(captured.data.split(',')[1], 'base64');
        assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
        const targets = design === 'homepage' ? ['studio/assets/bridge-phone-blabflip-' + shot + '.webp'] : ['concepts/assets/phone-blabflip-' + shot + '.webp', 'studio/assets/phone-blabflip-' + shot + '.webp'];
        for (const target of targets) fs.writeFileSync(path.join(root, target), bytes);
        console.log('Rendered ' + design + ' screenshot ' + (shot + 1) + ': ' + captured.width + 'x' + captured.height + ', ' + bytes.length + ' bytes');
      }
    }
    await page.setViewportSize({width: 1440, height: 900});
    await page.goto(base + '/blabflip.html', {waitUntil: 'networkidle'});
    await page.screenshot({path: path.join(root, 'studio/assets/site-preview-blabflip.png')});
    assert.deepEqual(errors, []);
    await context.close();
    console.log('BlabFlip artwork refreshed: six genuine same-model handset fallbacks plus the current website preview.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error); process.exitCode = 1;});

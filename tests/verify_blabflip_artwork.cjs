#!/usr/bin/env node
/* Genuine rebranded capture provenance and complete local asset contract. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const app = JSON.parse(fs.readFileSync(path.join(root, 'studio/store-gallery.json'), 'utf8')).apps.echo;
assert.equal(app.title, 'BlabFlip');
assert.equal(app.status, 'Coming soon · 18+');
assert.equal(app.images.length, 2);
for (const [index, image] of app.images.entries()) {
  const file = path.join(root, 'studio', image.path);
  const bytes = fs.readFileSync(file);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  assert(image.path.includes('blabflip'));
  assert.equal(image.bytes, bytes.length);
  assert.equal(image.sourceBytes, bytes.length);
  assert.equal(image.sha256, digest);
  assert.equal(image.sourceSha256, digest);
  assert.deepEqual(image.sourceDimensions, {width: 1080, height: 1920});
  assert.equal(image.width, 1080); assert.equal(image.height, 1920);
  assert.equal(image.sourceListing, 'https://krostudios.com/blabflip.html');
  const name = index === 0 ? 'home' : 'listen';
  assert.equal(bytes.compare(fs.readFileSync(path.join(root, 'studio/assets/blabflip-' + name + '.jpg'))), 0);
  assert.equal(bytes.compare(fs.readFileSync(path.join(root, 'concepts/assets/blabflip-' + name + '.jpg'))), 0);
  for (const prefix of ['studio/assets/bridge-phone-', 'studio/assets/phone-', 'concepts/assets/phone-']) {
    const rendered = fs.readFileSync(path.join(root, prefix + 'blabflip-' + index + '.webp'));
    assert.equal(rendered.subarray(0, 4).toString(), 'RIFF');
    assert.equal(rendered.subarray(8, 12).toString(), 'WEBP');
    assert(rendered.length > 20000);
  }
}
for (const folder of ['studio/assets', 'concepts/assets']) {
  assert.deepEqual(fs.readdirSync(path.join(root, folder)).filter(name => /echo/i.test(name)), [], 'No obsolete public app image filenames remain');
  const icon = fs.readFileSync(path.join(root, folder, 'blabflip-icon.png'));
  assert.equal(icon.readUInt32BE(16), 256); assert.equal(icon.readUInt32BE(20), 256);
}
assert(fs.statSync(path.join(root, 'studio/assets/site-preview-blabflip.png')).size > 20000);
console.log('BlabFlip artwork verified: matching genuine 1080x1920 captures, provenance hashes, six local handset fallbacks, 256px icons and renamed preview.');

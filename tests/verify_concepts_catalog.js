/* Run with Node.js. Uses only built-in modules; no browser or npm install. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const concepts = path.join(root,'concepts');
const sandbox = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(concepts,'catalog.js'),'utf8'),sandbox);
const {order,apps,featuredOrder} = sandbox.window.KROCatalog;
assert.equal(new Set(order).size,order.length,'Catalog keys must be unique');
assert.equal(order.length,8,'The verified studio catalog contains eight apps');
const html = fs.readFileSync(path.join(concepts,'index.html'),'utf8');
const nodes = Array.from(html.matchAll(/class="world-node[^\"]*"\s+data-world="([\w-]+)"/g),match=>match[1]);
assert.deepEqual(nodes,Array.from(order),'Every catalog app must have exactly one visible world node');
for (const key of order) {
  const app=apps[key];
  assert(app&&app.title&&app.icon&&app.url&&app.form,'App metadata incomplete: '+key);
  assert(/^https:\/\//.test(app.url),'App links must use HTTPS: '+key);
  assert(app.shots.length>0&&app.shots.length===app.fallbacks.length,'Screenshot/fallback mismatch: '+key);
  for(const asset of [app.icon,...app.shots,...app.fallbacks]) {
    assert(asset.startsWith('assets/')&&!asset.includes('..'),'Assets must be local: '+asset);
    const file=path.join(concepts,asset);
    assert(fs.existsSync(file)&&fs.statSync(file).size>0,'Missing app asset: '+asset);
    if(asset.endsWith('.webp')) {
      const header=fs.readFileSync(file).subarray(0,12);
      assert(header.subarray(0,4).toString()==='RIFF'&&header.subarray(8,12).toString()==='WEBP','Invalid WebP: '+asset);
    }
  }
}
assert.equal(apps.echo.status,'Coming soon · 18+','Echo Dare is not advertised as released');
assert(featuredOrder.every(key=>apps[key]),'Legacy views reference only registered apps');
for(const removed of ['class="site-header"','class="app-inspector"','class="studio-section"','class="signal-device-tools"']) {
  assert(!html.includes(removed),'Previously removed UI must stay absent: '+removed);
}
assert(html.includes('aria-keyshortcuts="P Home ArrowLeft ArrowRight ArrowUp ArrowDown"'),'Phone keyboard controls remain available');
console.log('Signal Field catalog verified: eight apps, real local artwork, complete phone fallbacks.');

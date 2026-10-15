/* Local-only static homepage contract. Run with Node.js; no npm or browser needed. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const studio = path.join(root, 'studio');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const expectedOrder = ['kino', 'echo', 'tanakh', 'half-life', 'dune', 'rap', 'beer', 'feed'];
const expectedURLs = {
  kino: 'https://krostudios.com/sovietkino/',
  echo: 'https://krostudios.com/echodare.html',
  tanakh: 'https://krostudios.com/tanakh-quiz/',
  'half-life': 'https://play.google.com/store/apps/details?id=com.halflife.halflifequizvalvetrivia',
  dune: 'https://play.google.com/store/apps/details?id=com.dunetanks.dunetanks',
  rap: 'https://play.google.com/store/apps/details?id=com.hiphoprap.guessrapperhiphop',
  beer: 'https://play.google.com/store/apps/details?id=com.beer.beergameguessthebeer',
  feed: 'https://play.google.com/store/apps/details?id=com.krostudios.feedkirusha'
};
const expectedScripts = [
  'studio/catalog.js', 'studio/bridge-catalog.js', 'studio/home-catalog.js',
  'studio/home-i18n.js', 'studio/bridge-phone.js', 'studio/bridge-field.js',
  'studio/common.js', 'studio/site-access.js'
];
const expectedStyles = [
  'studio/common.css', 'studio/constellation-bridge.css',
  'studio/bridge-orbit.css', 'studio/homepage.css'
];
const attribute = (tag, name) => {
  const match = tag.match(new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(["\\\'])([\\s\\S]*?)\\1', 'i'));
  return match ? match[2].replace(/&amp;/g, '&') : null;
};
const tags = name => Array.from(source.matchAll(new RegExp('<' + name + '\\b[^>]*>', 'gi')), match => match[0]);
const hasClass = (tag, name) => (attribute(tag, 'class') || '').split(/\s+/).includes(name);
const textContent = markup => markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const elements = (markup, name, matches) => Array.from(markup.matchAll(new RegExp('<(' + name + ')\\b[^>]*>', 'gi')))
  .filter(match => matches(match[0]))
  .map(match => {
    const start = match.index + match[0].length;
    const closing = new RegExp('</' + match[1] + '\\s*>', 'i').exec(markup.slice(start));
    assert(closing, 'Homepage element must have a closing tag: ' + match[0]);
    return {tag: match[0], content: markup.slice(start, start + closing.index), index: match.index};
  });
const stripVersion = value => value.split(/[?#]/, 1)[0];
const localFile = value => {
  assert(value && !/^(?:https?:|data:|\/\/)/i.test(value), 'Runtime file must be local: ' + value);
  const relative = stripVersion(value).replace(/^\//, '');
  assert(!relative.split('/').includes('..'), 'Runtime path must not escape the site: ' + value);
  const absolute = path.join(root, relative);
  assert(fs.existsSync(absolute) && fs.statSync(absolute).isFile() && fs.statSync(absolute).size > 0,
    'Missing or empty homepage runtime file: ' + value);
  return absolute;
};

assert(/^\s*<!doctype html>/i.test(source), 'Homepage must be HTML5');
const htmlTag = tags('html')[0];
assert.equal(attribute(htmlTag, 'lang'), 'en', 'Homepage document language must remain English');
const body = tags('body')[0];
assert.equal(attribute(body, 'data-design'), 'bridge', 'Homepage uses the selected Bridge scene');
assert.equal(attribute(body, 'data-site-access'), 'orbit', 'Homepage uses selected option 1: Orbit Links');
assert.equal(attribute(body, 'data-asset-base'), 'studio/', 'Homepage assets must use the isolated studio bundle');
assert.equal(tags('main').length, 1, 'Homepage must contain exactly one main landmark');

const title = source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim();
assert(title && /KRO\s*Studios/i.test(title), 'Production title must identify KRO Studios');
const meta = tags('meta');
assert(meta.some(tag => attribute(tag, 'name') === 'description' && attribute(tag, 'content')?.trim()),
  'Production homepage must have a nonempty meta description');
assert(meta.some(tag => attribute(tag, 'name') === 'viewport' && attribute(tag, 'content')?.includes('width=device-width')),
  'Production homepage must retain a responsive viewport');
assert(!meta.some(tag => /^(?:robots|googlebot)$/i.test(attribute(tag, 'name') || '') &&
  /\bnoindex\b/i.test(attribute(tag, 'content') || '')), 'Production homepage must not inherit preview noindex');
const links = tags('link');
const canonical = links.find(tag => (attribute(tag, 'rel') || '').split(/\s+/).includes('canonical'));
assert.equal(attribute(canonical || '', 'href'), 'https://krostudios.com/', 'Homepage canonical must be the production root');

const scriptSources = tags('script').map(tag => attribute(tag, 'src')).filter(Boolean).map(stripVersion);
assert.deepEqual(scriptSources, expectedScripts, 'Homepage scripts must load in the catalog / Bridge / controller order');
const styleSources = links.filter(tag => (attribute(tag, 'rel') || '').split(/\s+/).includes('stylesheet'))
  .map(tag => stripVersion(attribute(tag, 'href')));
assert.deepEqual(styleSources, expectedStyles, 'Homepage must use only the selected Bridge and Orbit styles');
for (const file of [...expectedScripts, ...expectedStyles]) localFile(file);

const removedClasses = ['atlas-label', 'signal-count', 'selected-world', 'preview-navigation', 'site-header', 'app-inspector', 'studio-section', 'signal-device-tools', 'selected-strip', 'design-tabs', 'oldselectedstrip', 'designtabs', 'studio-header-name'];
for (const tag of tags('[a-z][a-z0-9-]*')) {
  const classes = (attribute(tag, 'class') || '').split(/\s+/);
  for (const removed of removedClasses) assert(!classes.includes(removed), 'Previously removed chrome must stay absent: ' + removed);
}
assert.equal(tags('header').length, 1, 'Homepage must contain exactly one studio header');
assert.equal(tags('footer').length, 0, 'Studio brand and contact belong at the top; no footer may remain');
assert(hasClass(tags('header')[0], 'studio-header'), 'The only header must be the requested studio header');
const headerMatch = source.match(/<header\b[^>]*>[\s\S]*?<\/header\s*>/i);
assert(headerMatch, 'Studio header must be a complete header landmark');
const header = headerMatch[0];
assert(headerMatch.index + header.length < source.search(/<main\b/i), 'Studio header must precede the main scene');
assert(!/<(?:form|input|textarea)\b/i.test(header), 'Studio header must not add an unrequested contact form');
const brand = elements(header, '[a-z][a-z0-9-]*', tag => hasClass(tag, 'studio-header-brand'));
assert.equal(brand.length, 1, 'Studio header must contain exactly one real-logo brand container');
const headerLogo = Array.from(header.matchAll(/<img\b[^>]*>/gi), match => match[0])
  .filter(tag => hasClass(tag, 'studio-header-logo'));
assert.equal(headerLogo.length, 1, 'Studio header reuses one real studio logo');
assert.equal(attribute(headerLogo[0], 'src'), 'logo.png', 'Studio header must reuse the existing logo asset');
assert.equal(attribute(headerLogo[0], 'width'), '1254', 'Logo retains its intrinsic width');
assert.equal(attribute(headerLogo[0], 'height'), '1254', 'Logo retains its intrinsic height');
assert.equal(attribute(headerLogo[0], 'alt'), 'KRO Studios', 'The actual logo provides the studio identity accessibly without a separate wordmark');
const logoBytes = fs.readFileSync(localFile(attribute(headerLogo[0], 'src')));
assert(logoBytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'Existing studio logo is a genuine PNG');
assert.equal(logoBytes.readUInt32BE(16), 1254, 'Existing PNG logo has the expected intrinsic width');
assert.equal(logoBytes.readUInt32BE(20), 1254, 'Existing PNG logo has the expected intrinsic height');
const homepageCSS = fs.readFileSync(path.join(studio, 'homepage.css'), 'utf8');
const logoRule = homepageCSS.match(/\.studio-header-logo\s*\{([^}]+)\}/)?.[1] || '';
assert(/\bwidth\s*:\s*112px\b/.test(logoRule) && /\bheight\s*:\s*112px\b/.test(logoRule),
  'Desktop header must enlarge the real logo to 112px so its built-in wordmark remains readable');
const mobileRules = homepageCSS.match(/@media\s*\(\s*max-width\s*:\s*680px\s*\)\s*\{([\s\S]*)/)?.[1] || '';
const mobileLogoRule = mobileRules.match(/\.studio-header-logo\s*\{([^}]+)\}/)?.[1] || '';
assert(/\bwidth\s*:\s*88px\b/.test(mobileLogoRule) && /\bheight\s*:\s*88px\b/.test(mobileLogoRule),
  'Mobile header must enlarge the real logo to 88px');
const headerRule = homepageCSS.match(/\.studio-header\s*\{([^}]+)\}/)?.[1] || '';
assert(/\bmin-height\s*:\s*128px\b/.test(headerRule), 'Desktop header must accommodate the larger logo in 128px');
assert(/100svh\s*-\s*128px/.test(homepageCSS), 'Main scene must reserve the actual 128px desktop header height');
const contact = elements(header, 'a', tag => hasClass(tag, 'studio-header-contact'));
assert.equal(contact.length, 1, 'Studio header has exactly one contact link');
assert.equal(attribute(contact[0].tag, 'href'), 'mailto:hello@krostudios.com', 'Studio header uses the approved native email destination');
const contactSlots = elements(contact[0].content, '[a-z][a-z0-9-]*', tag => attribute(tag, 'data-i18n') === 'contact');
assert.equal(contactSlots.length, 1, 'Contact link must contain one localized contact label');
assert.equal(textContent(contactSlots[0].content), 'Talk with us', 'Contact label retains the requested English fallback');

const languageGroups = elements(header, '[a-z][a-z0-9-]*', tag => hasClass(tag, 'studio-language-switch'));
assert.equal(languageGroups.length, 1, 'Studio header must contain one language switch');
assert.equal(attribute(languageGroups[0].tag, 'role'), 'group', 'Language switch must expose a grouped control');
const languageButtons = elements(languageGroups[0].content, 'button', () => true);
assert.equal(languageButtons.length, 3, 'Language switch must use exactly three native buttons');
assert.deepEqual(languageButtons.map(button => attribute(button.tag, 'data-language')), ['en', 'he', 'ru'],
  'Language buttons must retain English, Hebrew and Russian order');
assert.deepEqual(languageButtons.map(button => textContent(button.content)), ['ENG', 'HEB', 'RUS'],
  'Language buttons must retain their visible language labels');
for (const button of languageButtons) {
  assert.equal(attribute(button.tag, 'type'), 'button', 'Language controls must be native non-submit buttons');
  assert(/(?:^|\s)disabled(?:\s|=|\/?>)/i.test(button.tag), 'Language buttons must start disabled for an honest no-JavaScript fallback');
}
for (const slot of ['heroLead', 'heroAccent']) {
  const heroSlots = elements(source, '[a-z][a-z0-9-]*', tag => attribute(tag, 'data-i18n') === slot);
  assert.equal(heroSlots.length, 1, 'Hero must expose exactly one translation slot: ' + slot);
  assert(textContent(heroSlots[0].content), 'Hero translation slot must retain visible English fallback text: ' + slot);
}
assert(!/THE WORLD ATLAS|08 SIGNALS/.test(source), 'Previously removed hero labels must stay absent');
assert(tags('nav').some(tag => (attribute(tag, 'class') || '').split(/\s+/).includes('world-index')),
  'Interactive eight-app world index must exist');

const sandbox = {window: {}, document: {body: {dataset: {assetBase: 'studio/'}}}};
function evaluate(file) {
  vm.runInNewContext(fs.readFileSync(path.join(studio, file), 'utf8'), sandbox, {filename: file});
  assert(sandbox.window.KROCatalog, file + ' must preserve the catalog');
}
evaluate('catalog.js');
evaluate('bridge-catalog.js');
const bridgeCatalog = sandbox.window.KROCatalog;
const before = JSON.parse(JSON.stringify(bridgeCatalog));
evaluate('home-catalog.js');
const catalog = sandbox.window.KROCatalog;
assert.notEqual(catalog, bridgeCatalog, 'Homepage asset prefixing must clone, not mutate, the Bridge registry');
assert.deepEqual(JSON.parse(JSON.stringify(bridgeCatalog)), before, 'Homepage integration must not mutate the original Bridge catalog');
assert.deepEqual(Array.from(catalog.order), expectedOrder, 'Homepage must retain all eight verified apps in order');
assert.deepEqual(Object.keys(catalog.apps).sort(), expectedOrder.slice().sort(), 'Homepage must not add or omit catalog apps');
assert(Object.isFrozen(catalog) && Object.isFrozen(catalog.order) && Object.isFrozen(catalog.apps),
  'Homepage registry and app order must remain immutable');
const artwork = new Set();
for (const key of catalog.order) {
  const app = catalog.apps[key], original = before.apps[key];
  assert(Object.isFrozen(app) && Object.isFrozen(app.shots) && Object.isFrozen(app.fallbacks),
    'Homepage app metadata and artwork arrays must remain immutable: ' + key);
  assert.equal(app.url, expectedURLs[key], 'Incorrect verified app destination: ' + key);
  assert(app.title && app.category && app.status && app.short && app.form, 'Incomplete verified app metadata: ' + key);
  for (const [field, value] of Object.entries(original)) {
    if (!['icon', 'shots', 'fallbacks'].includes(field)) {
      assert.deepEqual(JSON.parse(JSON.stringify(app[field])), value, 'Homepage must preserve app metadata: ' + key + '.' + field);
    }
  }
  assert.equal(app.icon, 'studio/' + original.icon, 'Homepage app icon must be correctly prefixed: ' + key);
  assert.deepEqual(Array.from(app.shots), original.shots.map(file => 'studio/' + file), 'Homepage screenshots must be correctly prefixed: ' + key);
  assert.deepEqual(Array.from(app.fallbacks), original.fallbacks.map(file => 'studio/' + file), 'Homepage phone fallbacks must be correctly prefixed: ' + key);
  assert.equal(app.shots.length, 2, 'Verified apps retain two genuine screenshots: ' + key);
  assert.equal(app.fallbacks.length, app.shots.length, 'Screenshot / phone fallback count mismatch: ' + key);
  for (const file of [app.icon, ...app.shots, ...app.fallbacks]) {
    assert(file.startsWith('studio/assets/'), 'Artwork must be inside the isolated homepage bundle: ' + file);
    artwork.add(file);
    const absolute = localFile(file);
    if (/\.webp$/i.test(file)) {
      const bytes = fs.readFileSync(absolute).subarray(0, 12);
      assert(bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP',
        'Invalid homepage WebP artwork: ' + file);
    }
  }
}
assert.equal(catalog.apps.echo.status, 'Coming soon · 18+', 'Echo Dare must not be advertised as released');
assert.equal(catalog.apps.kino.status, 'Android + iOS', 'SovietKino platform status must remain truthful');
assert.equal(catalog.apps.tanakh.status, 'Android + iOS', 'Tanakh Quiz platform status must remain truthful');
for (const key of expectedOrder.slice(3)) assert.equal(catalog.apps[key].status, 'Android', 'Other app platform status must remain truthful: ' + key);
assert.deepEqual(Array.from(catalog.featuredOrder), ['kino', 'echo', 'tanakh'], 'Owned website catalog must remain the three verified app sites');

const noScript = Array.from(source.matchAll(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gi), match => match[1])
  .find(block => /class=["'][^"']*\bno-script-apps\b/.test(block));
assert(noScript, 'Homepage must provide a no-JavaScript app navigation fallback');
assert(/<nav\b[^>]*class=["'][^"']*\bno-script-apps\b/i.test(noScript), 'No-JavaScript app links must use a navigation landmark');
const fallbackAnchors = Array.from(noScript.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi), match => match[0]);
assert.equal(fallbackAnchors.length, 8, 'No-JavaScript navigation must contain exactly eight actual app destinations');
const fallbackURLs = fallbackAnchors.map(tag => {
  const href = attribute(tag.match(/^<a\b[^>]*>/i)[0], 'href');
  assert(href && /\S/.test(tag.replace(/<[^>]+>/g, '')), 'No-JavaScript app links need a real href and accessible text');
  return new URL(href, 'https://krostudios.com/').href;
});
assert.equal(new Set(fallbackURLs).size, 8, 'No-JavaScript destinations must not be duplicated');
assert.deepEqual(fallbackURLs.slice().sort(), Object.values(expectedURLs).sort(), 'No-JavaScript app links must use the eight verified destinations');
for (const href of ['/sovietkino/', 'echodare.html', '/tanakh-quiz/']) {
  assert(tags('a').some(tag => attribute(tag, 'href') === href), 'App pages must remain discoverable in raw homepage HTML: ' + href);
}

const phoneFallback = tags('img').find(tag => (attribute(tag, 'class') || '').split(/\s+/).includes('phone-render-fallback'));
assert(phoneFallback, 'Homepage must render a phone fallback before JavaScript initializes');
assert.equal(attribute(phoneFallback, 'src'), 'studio/assets/bridge-phone-echo-0.webp', 'Initial phone must use the genuine Echo Dare handset render');
localFile(attribute(phoneFallback, 'src'));
for (const file of ['studio/vendor/three.module.min.js', 'studio/vendor/three.core.min.js',
  'studio/assets/space-grotesk-400.ttf', 'studio/assets/space-grotesk-500.ttf', 'studio/assets/ibm-plex-mono-400.ttf']) localFile(file);
assert(fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim() === 'krostudios.com', 'Production domain configuration must remain intact');
assert(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').includes('<loc>https://krostudios.com/</loc>'), 'Production sitemap must retain the homepage');

console.log(`Studio homepage verified: Orbit Links, eight truthful app destinations, ${artwork.size} local artwork files, immutable catalog, SEO, no-JavaScript fallbacks and the real-logo studio header with ENG / HEB / RUS controls.`);

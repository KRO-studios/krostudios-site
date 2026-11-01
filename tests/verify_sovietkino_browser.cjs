#!/usr/bin/env node
'use strict';

// Exercises the page as a visitor. Run against a local or deployed site:
// SITE_URL=http://127.0.0.1:8774/sovietkino/ node tests/verify_sovietkino_browser.cjs
// A private app question export is optional and is never copied to the website.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const SITE_URL = process.env.SITE_URL || 'http://127.0.0.1:8774/sovietkino/';
const REPORT_DIR = process.env.REPORT_DIR || path.join(os.tmpdir(), 'sovietkino-browser-qa');
const APP_QUESTIONS = process.env.APP_QUESTIONS;
assert(!APP_QUESTIONS || fs.existsSync(APP_QUESTIONS), 'APP_QUESTIONS must point to an existing optional source export');
const sourceQuestions = APP_QUESTIONS ? JSON.parse(fs.readFileSync(APP_QUESTIONS, 'utf8')) : null;
const expectedCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../sovietkino/catalog.json'), 'utf8'));
const report = {site: SITE_URL, generatedAt: new Date().toISOString(), checks: [], viewports: []};
fs.mkdirSync(REPORT_DIR, {recursive: true});

async function check(name, action) {
  try {
    const evidence = await action();
    report.checks.push({name, passed: true, ...(evidence ? {evidence} : {})});
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({name, passed: false, error: error.message});
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

function isStoreLink(value) {
  const url = new URL(value);
  if (url.hostname === 'apps.apple.com') return /(?:\/|^)id6812753192(?:$|\/)/.test(url.pathname);
  return url.hostname === 'play.google.com' && url.pathname === '/store/apps/details'
    && url.searchParams.get('id') === 'com.krostudios.sovietkino';
}

async function getQuestions(page) {
  return JSON.parse(await page.locator('#quiz-data').textContent());
}

async function assertNoOverflow(page) {
  const sizes = await page.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
  }));
  assert(sizes.document <= sizes.viewport + 1 && sizes.body <= sizes.viewport + 1,
    `page exceeds viewport: ${JSON.stringify(sizes)}`);
  return sizes;
}

async function visitWithMetrics(browser, viewport, options = {}) {
  const context = await browser.newContext({viewport, deviceScaleFactor: 1, ...options});
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const failures = [];
  const imageBytes = new Map();
  const imageResponses = [];
  page.on('pageerror', error => failures.push(`JS: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') failures.push(`Console: ${message.text()}`);
  });
  page.on('requestfailed', request => failures.push(`Request: ${request.url()} ${request.failure()?.errorText}`));
  page.on('response', response => {
    if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`);
    if (response.request().resourceType() === 'image') {
      imageResponses.push(response.body().then(buffer => imageBytes.set(response.url(), buffer.byteLength))
        .catch(error => failures.push(`Image body: ${response.url()} ${error.message}`)));
    }
  });
  const response = await page.goto(SITE_URL, {waitUntil: 'networkidle'});
  assert(response && response.ok(), `page HTTP ${response?.status()}`);
  return {context, page, failures, imageBytes, imageResponses};
}

async function testViewport(browser, spec) {
  const {context, page, failures, imageBytes, imageResponses} = await visitWithMetrics(browser, spec.viewport);
  const evidence = {name: spec.name, viewport: spec.viewport};
  report.viewports.push(evidence);
  try {
    await check(`${spec.name}: responsive first screen and store routes`, async () => {
      const sizes = await assertNoOverflow(page);
      const firstScreen = await page.evaluate(() => {
        const visible = element => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight
            && style.visibility !== 'hidden' && style.display !== 'none';
        };
        return {
          identity: document.body.innerText.includes('Советское кино') && document.body.innerText.includes('Угадай слово'),
          actions: [...document.querySelectorAll('a[href]')].filter(visible)
            .map(a => ({href: a.href, text: a.innerText, label: a.getAttribute('aria-label')})),
          quizTop: document.querySelector('#quiz-form')?.getBoundingClientRect().top,
        };
      });
      evidence.initialQuizTop = Math.round(firstScreen.quizTop);
      await page.screenshot({path: path.join(REPORT_DIR, `${spec.name}-opening.png`)});
      assert(firstScreen.identity, 'exact app name must be visible in the page copy');
      const storeOptions = await page.locator('a.store-option').evaluateAll(items => items.map(a => a.href));
      assert.equal(storeOptions.length, 4, 'two official store choices in both download sections');
      assert(storeOptions.every(isStoreLink), 'every store card must open this exact app');
      const initiallyVisible = firstScreen.actions.map(a => a.href);
      const directStores = initiallyVisible.filter(url => /^https:\/\/(?:apps\.apple\.com|play\.google\.com)\//.test(url));
      const downloadAnchors = initiallyVisible.filter(url => /#(?:download|install|stores|скачать)/i.test(url));
      assert(directStores.length >= 2 || downloadAnchors.length,
        'first screen needs both stores or a visible download-section action');
      assert(Number.isFinite(firstScreen.quizTop) && firstScreen.quizTop <= spec.viewport.height * 3,
        `playable sample should be within three screens of the opening; form is at ${Math.round(firstScreen.quizTop)}px (${(firstScreen.quizTop / spec.viewport.height).toFixed(2)} screens)`);
      if (spec.viewport.width <= 700) {
        const stickyLinks = await page.locator('.mobile-download a').evaluateAll(items =>
          items.filter(a => a.getBoundingClientRect().width > 0).map(a => a.href));
        assert.equal(stickyLinks.length, 2, 'mobile download bar has both stores');
        assert(stickyLinks.every(isStoreLink), 'mobile links must open this exact app');
      }
      return {...sizes, initialStoreActions: directStores.length, initialDownloadActions: downloadAnchors.length,
        quizTop: Math.round(firstScreen.quizTop)};
    });

    await check(`${spec.name}: real question data matches the app`, async () => {
      const questions = await getQuestions(page);
      assert.equal(questions.length, 6, 'six playable questions');
      assert.equal(new Set(questions.map(q => q.film)).size, 6, 'feature six different films');
      const catalogTitles = new Set(expectedCatalog.films.map(film => film.title));
      for (const question of questions) {
        assert(catalogTitles.has(question.film), `${question.film} must exist in the real film catalog`);
        if (sourceQuestions) {
          const original = sourceQuestions.find(item => item.id === question.id);
          assert(original, `question ${question.id} must be enabled in the app`);
          for (const key of ['clue', 'answer', 'acceptedAnswers', 'film', 'year', 'funFact']) {
            assert.deepEqual(question[key], original[key], `${question.id}: changed ${key}`);
          }
        }
      }
      return {questionIds: questions.map(q => q.id), appSourceCompared: Boolean(sourceQuestions)};
    });

    await check(`${spec.name}: wrong guess, keyboard win, next and honest reveal`, async () => {
      const questions = await getQuestions(page);
      const input = page.locator('#quiz-answer');
      const status = page.locator('#quiz-status');
      const payoff = page.locator('#quiz-payoff');
      assert(await input.evaluate(el => el.labels && el.labels.length > 0), 'answer input has a real accessible label');
      assert.equal(await status.getAttribute('aria-live'), 'polite', 'quiz feedback is announced without interrupting');
      await input.scrollIntoViewIfNeeded();
      await input.focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.locator(':focus').getAttribute('id'), 'quiz-submit', 'Tab reaches submit from answer');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.locator(':focus').getAttribute('id'), 'quiz-answer', 'Shift-Tab returns to answer');
      assert(await payoff.isHidden(), 'answers start concealed');
      const wrong = 'Я'.repeat(questions[0].answer.length);
      assert(wrong !== questions[0].answer, 'test needs a wrong answer');
      await input.fill(wrong);
      await input.press('Enter');
      assert.equal(await status.getAttribute('data-state'), 'retry', 'wrong answer must allow retry');
      assert(await payoff.isHidden(), 'wrong answer must not reveal or claim a win');
      assert(await input.isEnabled(), 'input remains usable after wrong answer');
      await input.fill(questions[0].answer.toLocaleLowerCase('ru').replace(/ё/g, 'е'));
      await input.press('Enter');
      assert.equal(await status.getAttribute('data-state'), 'correct');
      assert(await payoff.isVisible());
      assert((await page.locator('#quiz-film').textContent()).includes(questions[0].film));
      assert.equal(await page.locator('#quiz-fact').textContent(), questions[0].funFact);
      assert((await page.locator('#quiz-letters [data-state]').evaluateAll(items => items.map(x => x.dataset.state)))
        .every(state => state === 'correct'), 'successful answer letters all marked correct');
      await page.screenshot({path: path.join(REPORT_DIR, `${spec.name}-quiz-success.png`)});
      await page.locator('#quiz-next').click();
      assert.equal(await input.inputValue(), '');
      assert(await payoff.isHidden(), 'next question conceals previous payoff');
      assert.equal(await page.locator('#quiz-clue').textContent(), questions[1].clue);
      assert.equal(await status.getAttribute('data-state'), '');
      await page.locator('#quiz-reveal').click();
      assert.equal(await status.getAttribute('data-state'), 'revealed', 'revealed answer is distinct from a solved answer');
      assert(!(await status.textContent()).includes('Верно!'), 'reveal must not claim a correct guess');
      assert((await page.locator('#quiz-film').textContent()).includes(questions[1].film));
      for (let index = 2; index < questions.length; index += 1) {
        await page.locator('#quiz-next').click();
        assert.equal(await page.locator('#quiz-clue').textContent(), questions[index].clue);
        await input.fill(questions[index].answer);
        await input.press('Enter');
        assert.equal(await status.getAttribute('data-state'), 'correct', `question ${questions[index].id} accepts its real answer`);
      }
      return {wrongGuessRetried: true, allSixQuestionsPlayable: true, revealedNotScoredAsCorrect: true};
    });

    await check(`${spec.name}: complete film catalog, search and empty-state recovery`, async () => {
      const catalog = page.locator('#film-catalog');
      const summary = catalog.locator('summary');
      await summary.scrollIntoViewIfNeeded();
      if (!(await catalog.getAttribute('open')) && !(await catalog.evaluate(el => el.open))) {
        await summary.focus();
        await page.keyboard.press('Enter');
      }
      assert(await catalog.evaluate(el => el.open), 'keyboard opens film catalog');
      const entries = page.locator('#film-list li.film-entry');
      const allText = await entries.allTextContents();
      assert.equal(await page.locator('#film-count').getAttribute('aria-live'), 'polite');
      assert.equal(allText.length, expectedCatalog.film_count);
      for (const film of expectedCatalog.films) {
        assert(allText.some(text => text.includes(film.title)), `catalog is missing ${film.title}`);
      }
      const search = page.locator('#film-search');
      assert(await search.evaluate(el => el.labels && el.labels.length > 0), 'search has a real accessible label');
      const visibleCount = () => entries.evaluateAll(items => items.filter(item => !item.hidden).length);
      await search.fill('ДЖЕНТЛЬМЕНЫ');
      assert.equal(await visibleCount(), 1, 'case-insensitive search finds the film');
      assert((await page.locator('#film-list li.film-entry:visible').allTextContents())
        .some(text => text.includes('Джентльмены удачи')));
      await search.fill('несуществующийфильмххх');
      assert.equal(await visibleCount(), 0);
      assert(await page.locator('#film-empty').isVisible(), 'no matches explains how to recover');
      assert((await page.locator('#film-count').textContent()).includes('0'));
      await search.fill('');
      assert.equal(await visibleCount(), expectedCatalog.film_count, 'clear restores every film');
      const yoFilm = expectedCatalog.films.find(film => /ё/i.test(film.title));
      if (yoFilm) {
        await search.fill(yoFilm.title.replace(/ё/g, 'е').replace(/Ё/g, 'Е'));
        assert(await visibleCount() >= 1, 'Е accepts catalog titles spelled with Ё');
      }
      await search.fill('кин дза');
      assert.equal(await visibleCount(), 1, 'spaces accept hyphenated film names');
      assert((await page.locator('#film-list li.film-entry:visible').textContent()).includes('Кин-дза-дза'));
      await search.fill('');
      const shortcut = page.locator('.film-shortcut[data-film]').first();
      if (await shortcut.count()) {
        await shortcut.click();
        assert((await search.inputValue()).trim(), 'film shortcut applies a useful filter');
        assert(await visibleCount() > 0, 'film shortcut must not lead to zero films');
      }
      await search.fill('');
      await page.screenshot({path: path.join(REPORT_DIR, `${spec.name}-catalog.png`)});
      return {filmCount: allText.length, allCatalogTitlesVerified: true, yoVariantTested: Boolean(yoFilm)};
    });

    await check(`${spec.name}: images, gallery, footer clearance and network`, async () => {
      const images = page.locator('img');
      for (let index = 0; index < await images.count(); index += 1) {
        const image = images.nth(index);
        if (!(await image.isVisible())) continue;
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(async el => {
          if (!el.complete) await new Promise((resolve, reject) => {
            el.addEventListener('load', resolve, {once: true});
            el.addEventListener('error', reject, {once: true});
          });
          await el.decode();
          if (!(el.naturalWidth > 0)) throw new Error('zero-size image');
        });
      }
      await assertNoOverflow(page);
      const footerLink = page.locator('footer a').last();
      if (await footerLink.count()) {
        await footerLink.scrollIntoViewIfNeeded();
        const position = await footerLink.evaluate(el => {
          const link = el.getBoundingClientRect();
          const sticky = document.querySelector('.mobile-download');
          const bar = sticky?.getBoundingClientRect();
          return {linkBottom: link.bottom, stickyTop: bar && bar.height > 0 ? bar.top : innerHeight};
        });
        assert(position.linkBottom <= position.stickyTop + 1, `download bar covers footer: ${JSON.stringify(position)}`);
      }
      await page.screenshot({path: path.join(REPORT_DIR, `${spec.name}-footer.png`)});
      await Promise.all(imageResponses);
      assert.deepEqual(failures, [], 'page must not have script, image, HTTP or request errors');
      const bytes = [...imageBytes.values()].reduce((sum, size) => sum + size, 0);
      evidence.imageBytes = bytes;
      evidence.imageRequestCount = imageBytes.size;
      return {imageBytes: bytes, decimalMB: Number((bytes / 1000000).toFixed(2)), previousBaselineMB: 10.5,
        imageRequestCount: imageBytes.size, baselineReductionPercent: Number((100 * (1 - bytes / 10500000)).toFixed(1))};
    });
  } finally {
    await context.close();
  }
}

async function testFallbackAndMotion(browser) {
  const {context, page, failures} = await visitWithMetrics(browser, {width: 390, height: 844}, {javaScriptEnabled: false});
  try {
    await check('No JavaScript: honest answers, full catalog and working store links', async () => {
      const text = await page.locator('body').innerText();
      assert(/JavaScript|без\s+скрипт|без\s+JavaScript|не\s+поддержива/i.test(text), 'fallback explains interactive sample availability');
      assert(await page.locator('noscript').count(), 'quiz has an explicit no-script fallback');
      const noscript = await page.locator('noscript').allTextContents();
      assert(/ответ/i.test(noscript.join(' ')), 'fallback supplies an honest question answer');
      const fallbackAnswer = page.locator('noscript details').first();
      await fallbackAnswer.locator('summary').click();
      assert(await fallbackAnswer.evaluate(el => el.open), 'fallback answer opens natively without scripts');
      assert(await fallbackAnswer.locator('strong').isVisible(), 'fallback answer is readable after revealing');
      assert(await page.locator('#quiz-answer').isDisabled(), 'no-script input must not pretend to submit answers');
      assert(await page.locator('#quiz-submit').isDisabled());
      await page.locator('#film-catalog summary').click();
      assert(await page.locator('#film-catalog').evaluate(el => el.open), 'native catalog remains usable without scripts');
      assert.equal(await page.locator('#film-list li.film-entry').count(), expectedCatalog.film_count);
      const links = await page.locator('a.store-option').evaluateAll(items => items.map(a => a.href));
      assert.equal(links.length, 4);
      assert(links.every(isStoreLink));
      await assertNoOverflow(page);
      assert.deepEqual(failures, []);
      await page.screenshot({path: path.join(REPORT_DIR, 'mobile-no-javascript.png'), fullPage: true});
    });
  } finally {
    await context.close();
  }
  const reduced = await visitWithMetrics(browser, {width: 390, height: 844}, {reducedMotion: 'reduce'});
  try {
    await check('Reduced motion: no autoplay or sustained decorative animation', async () => {
      const state = await reduced.page.evaluate(() => ({
        matched: matchMedia('(prefers-reduced-motion: reduce)').matches,
        autoplay: [...document.querySelectorAll('video[autoplay], audio[autoplay]')].length,
        runningAnimations: document.getAnimations().filter(animation => {
          const timing = animation.effect?.getComputedTiming();
          return animation.playState === 'running' && timing &&
            (timing.iterations === Infinity || Number(timing.duration) > 100);
        }).length,
      }));
      assert(state.matched);
      assert.equal(state.autoplay, 0);
      assert.equal(state.runningAnimations, 0);
      assert.deepEqual(reduced.failures, []);
      return state;
    });
  } finally {
    await reduced.context.close();
  }
  const intermediate = await visitWithMetrics(browser, {width: 650, height: 950});
  try {
    await check('Intermediate 650px: quiz artwork retains the complete original panorama', async () => {
      const art = intermediate.page.locator('#quiz-art');
      await art.scrollIntoViewIfNeeded();
      await art.evaluate(el => el.decode());
      const dimensions = await art.evaluate(el => {
        const box = el.getBoundingClientRect();
        return {width: box.width, height: box.height, naturalWidth: el.naturalWidth,
          naturalHeight: el.naturalHeight, fit: getComputedStyle(el).objectFit};
      });
      assert.equal(dimensions.fit, 'contain', 'quiz artwork must not crop at the widest mobile breakpoint');
      assert(Math.abs(dimensions.width / dimensions.height - dimensions.naturalWidth / dimensions.naturalHeight) < .02,
        `image box preserves its source aspect ratio: ${JSON.stringify(dimensions)}`);
      await assertNoOverflow(intermediate.page);
      assert.deepEqual(intermediate.failures, []);
      await intermediate.page.screenshot({path: path.join(REPORT_DIR, 'intermediate-650-quiz-art.png')});
      return dimensions;
    });
  } finally {
    await intermediate.context.close();
  }
}

(async () => {
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  try {
    for (const spec of [
      {name: 'desktop', viewport: {width: 1440, height: 1000}},
      {name: 'mobile', viewport: {width: 390, height: 844}},
      {name: 'small-mobile', viewport: {width: 320, height: 568}},
      {name: 'tablet', viewport: {width: 768, height: 1024}},
    ]) await testViewport(browser, spec);
    await testFallbackAndMotion(browser);
  } finally {
    await browser.close();
    report.passed = report.checks.length > 0 && report.checks.every(item => item.passed);
    fs.writeFileSync(path.join(REPORT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  }
  assert(report.passed, `browser checks failed; inspect ${path.join(REPORT_DIR, 'report.json')}`);
  console.log(`All ${report.checks.length} browser checks passed. Report: ${REPORT_DIR}`);
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

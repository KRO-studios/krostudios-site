#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SITE = process.env.SITE_URL || 'http://127.0.0.1:8792/sovietkino/';
const OUT = process.env.REPORT_DIR || path.join(os.tmpdir(), 'sovietkino-funnel-qa');
fs.mkdirSync(OUT, {recursive:true});
const report = {site:SITE, checks:[]};
async function check(name, action) {
  try { const evidence=await action(); report.checks.push({name,passed:true,evidence}); console.log('PASS '+name); }
  catch(error) { report.checks.push({name,passed:false,error:error.message}); console.error('FAIL '+name+': '+error.message); }
}
async function open(browser, query='', options={}) {
  const context=await browser.newContext({viewport:{width:390,height:844}, ...options});
  await context.addInitScript(() => {
    window.funnelEvents=[];
    document.addEventListener('funnel_event', event => window.funnelEvents.push(event.detail));
  });
  const page=await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(SITE+query,{waitUntil:'networkidle'});
  return {context,page};
}
async function noOverflow(page) {
  const sizes=await page.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  assert(sizes.doc<=sizes.width+1 && sizes.body<=sizes.width+1,JSON.stringify(sizes));
  return sizes;
}
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    await check('Initial render is not a demo start; input events contain no raw answers',async()=>{
      const {context,page}=await open(browser);
      try {
        let events=await page.evaluate(()=>window.funnelEvents);
        assert.equal(events.filter(e=>e.event==='page_view').length,1);
        assert.equal(events.filter(e=>e.event==='demo_start').length,0);
        await page.locator('#quiz-answer').fill('Ш');
        await page.locator('#quiz-answer').fill('ШУ');
        events=await page.evaluate(()=>window.funnelEvents);
        assert.equal(events.filter(e=>e.event==='demo_start').length,1);
        assert(events.every(e=>!('answer' in e)&&!('url' in e)&&!('query' in e)));
        return {startOnce:true,noRawAnswers:true};
      } finally { await context.close(); }
    });
    await check('Vasily campaign matches scene and question; previews preserve active answer',async()=>{
      const {context,page}=await open(browser,'?challenge=vasily-city&utm_source=youtube');
      try {
        assert((await page.locator('#hero-film').textContent()).includes('Джентльмены'));
        assert((await page.locator('#quiz-clue').textContent()).includes('Василий'));
        await page.locator('#quiz-answer').fill('ДЖА');
        await page.locator('.scene-thumb[data-preview-film="diamond"]').click();
        assert.equal(await page.locator('#quiz-answer').inputValue(),'ДЖА');
        assert((await page.locator('#quiz-clue').textContent()).includes('Василий'));
        assert((await page.locator('#hero-film').textContent()).includes('Бриллиантовая'));
        await page.locator('#hero-preview-action').click();
        assert.equal(await page.locator('#quiz-answer').inputValue(),'');
        assert((await page.locator('#quiz-clue').textContent()).includes('экономиста'));
        await page.screenshot({path:path.join(OUT,'campaign-phone.png')});
        return {cityMatched:true,previewDoesNotReset:true,explicitStartSelectsFilm:true};
      } finally { await context.close(); }
    });
    await check('Invalid campaign cannot select an external source or inject copy',async()=>{
      const {context,page}=await open(browser,'?film=https%3A%2F%2Fevil.invalid%2Fimage.jpg&challenge=%3Csvg%20onload%3Dalert(1)%3E');
      try {
        assert((await page.locator('#hero-film').textContent()).includes('Знакомые истории'));
        assert((await page.locator('#quiz-clue').textContent()).includes('Находчивый студент'));
        const sources=await page.locator('img,video,source').evaluateAll(els=>els.map(el=>el.getAttribute('src')||''));
        assert(sources.every(src=>!src.includes('evil.invalid')));
        return {safeFallback:true};
      } finally { await context.close(); }
    });
    await check('Office preview is honest and keyboard focus follows it',async()=>{
      const {context,page}=await open(browser);
      try {
        const card=page.locator('.film-card[data-preview-film="office"]');
        await card.focus(); await page.keyboard.press('Enter');
        assert.equal(await page.locator(':focus').getAttribute('id'),'hero-film');
        assert.equal(await page.locator('#hero-preview-action').getAttribute('href'),'#films');
        await page.locator('#hero-preview-action').click();
        assert.equal(await page.locator('#film-search').inputValue(),'Служебный роман');
        assert.equal(await page.locator('#film-list .film-entry:visible').count(),1);
        return {noInventedSample:true,focusRepositioned:true};
      } finally { await context.close(); }
    });
    await check('Reduced motion and data saving do not download hero loops',async()=>{
      for (const mode of ['reduced','saveData']) {
        const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
        if(mode==='saveData') await context.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true}}));
        const page=await context.newPage(); const requests=[];
        page.on('request',r=>requests.push(r.url()));
        await page.goto(SITE+'?challenge=vasily-city',{waitUntil:'networkidle'});
        assert.equal(await page.locator('#hero-motion').getAttribute('src'),null);
        assert(await page.locator('#hero-motion').evaluate(el=>el.paused));
        assert(!requests.some(url=>/hero-(?:cinema|vasily)-loop\.mp4/.test(url)));
        assert(!requests.some(url=>url.includes('clear-download-22s.mp4')),'full promo must not preload');
        await context.close();
      }
      return {reducedMotion:true,dataSaver:true,noPromoPreload:true};
    });
    await check('Silent hero plays on screen, pauses off screen, and honors explicit pause',async()=>{
      const {context,page}=await open(browser,'',{viewport:{width:1440,height:1000}});
      try {
        await page.waitForFunction(()=>!document.getElementById('hero-motion').paused);
        const media=await page.locator('#hero-motion').evaluate(el=>({muted:el.muted,src:el.getAttribute('src')}));
        assert(media.muted && media.src==='media/hero-cinema-loop.mp4');
        await page.locator('#motion-toggle').click();
        assert(await page.locator('#hero-motion').evaluate(el=>el.paused));
        await page.locator('#quiz-answer').scrollIntoViewIfNeeded();
        await page.locator('#hero-scene').scrollIntoViewIfNeeded();
        assert(await page.locator('#hero-motion').evaluate(el=>el.paused),'manual pause remains paused');
        await page.locator('#motion-toggle').click();
        await page.waitForFunction(()=>!document.getElementById('hero-motion').paused);
        await page.locator('footer').scrollIntoViewIfNeeded();
        await page.waitForFunction(()=>document.getElementById('hero-motion').paused);
        return {muted:true,manualPauseRetained:true,offscreenPaused:true};
      } finally {await context.close();}
    });
    await check('Store event uses exact target, position and selected film without navigation delay',async()=>{
      const {context,page}=await open(browser,'?film=diamond');
      try {
        await page.evaluate(()=>document.addEventListener('click',e=>{if(e.target.closest('a.store-option'))e.preventDefault();}));
        await page.locator('#download a.store-option').first().click();
        const event=await page.evaluate(()=>window.funnelEvents.find(e=>e.event==='store_click'));
        assert.deepEqual(event,{app:'sovietkino',event:'store_click',film:'diamond',placement:'hero',store:'app_store'});
        return event;
      } finally {await context.close();}
    });
    await check('200 percent text reflows on a compact phone',async()=>{
      const {context,page}=await open(browser,'',{viewport:{width:320,height:568},reducedMotion:'reduce'});
      try {
        await page.evaluate(()=>{
          const sizes=[...document.querySelectorAll('body, h1,h2,h3,p,button,input,label,summary,strong,small,span,a')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);
          for(const [el,size] of sizes) el.style.fontSize=(size*2)+'px';
        });
        const dimensions=await noOverflow(page);
        await page.locator('#quiz-answer').scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(OUT,'compact-large-text.png')});
        assert(await page.locator('#quiz-answer').isVisible());
        return dimensions;
      } finally {await context.close();}
    });
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(OUT,'funnel-report.json'),JSON.stringify(report,null,2)+'\n');
  }
  assert(report.checks.length && report.checks.every(x=>x.passed),'Funnel checks failed; inspect '+OUT);
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});

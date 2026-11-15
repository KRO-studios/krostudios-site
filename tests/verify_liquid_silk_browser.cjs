#!/usr/bin/env node
/** Browser contracts for the production Liquid Silk field and retained phone/gallery UI. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.KRO_PLAYWRIGHT||path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'..');
const evidence=path.resolve(root,'../prototypes/current-upgrades/production-qa');
const counts={kino:10,echo:2,tanakh:19,'half-life':6,dune:5,rap:5,beer:6,feed:8};
const urls={kino:'https://krostudios.com/sovietkino/',echo:'https://play.google.com/store/apps/details?id=com.krostudios.blabflip',tanakh:'https://krostudios.com/tanakh-quiz/','half-life':'https://play.google.com/store/apps/details?id=com.halflife.halflifequizvalvetrivia',dune:'https://play.google.com/store/apps/details?id=com.dunetanks.dunetanks',rap:'https://play.google.com/store/apps/details?id=com.hiphoprap.guessrapperhiphop',beer:'https://play.google.com/store/apps/details?id=com.beer.beergameguessthebeer',feed:'https://play.google.com/store/apps/details?id=com.krostudios.feedkirusha'};
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ttf':'font/ttf','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes);});
});
const state=page=>page.evaluate(()=>window.KROPrototype.getState());
const effect=page=>page.evaluate(()=>window.KROPrototype.field.getState());
const hash=page=>page.evaluate(()=>{
  const canvas=document.querySelector('.signal-field');
  const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let value=2166136261;for(let i=0;i<pixels.length;i+=43)value=Math.imul(value^pixels[i],16777619);
  return value>>>0;
});
const fieldSnapshot=page=>page.evaluate(()=>{
  const canvas=document.querySelector('.signal-field'),data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let value=2166136261;for(let i=0;i<data.length;i+=43)value=Math.imul(value^data[i],16777619);
  const old=window.__silkReadback;let different=0,maxDelta=0;
  if(old?.length===data.length)for(let i=0;i<data.length;i++){const delta=Math.abs(data[i]-old[i]);if(delta){different++;maxDelta=Math.max(maxDelta,delta);}}
  window.__silkReadback=data;
  return{frame:window.KROPrototype.field.getState().frame,hash:value>>>0,width:canvas.width,height:canvas.height,different,maxDelta};
});

async function screenReady(page,fallback){
  await page.waitForFunction(fallback=>{
    const s=window.KROPrototype.getState(),app=window.KROCatalog.apps[s.key];
    const image=document.querySelector(fallback?'.phone-render-fallback':'.signal-device-screen');
    if(!image.complete||image.naturalWidth===0||image.src!==new URL((fallback?app.fallbacks:app.shots)[s.shot],location.href).href)return false;
    return fallback||document.querySelector('.phone-webgl')?.dataset.screenSrc===image.src;
  },fallback);
}
async function screenPoint(page){
  await page.locator('.signal-device-rotator').scrollIntoViewIfNeeded();
  const point=await page.evaluate(()=>{
    const points=window.KROPrototype.phone.getScreenPolygon();
    if(!points?.length)return null;
    const x=points.reduce((sum,p)=>sum+p.x,0)/points.length,y=points.reduce((sum,p)=>sum+p.y,0)/points.length;
    return{x,y,hit:Boolean(document.elementFromPoint(x,y)?.closest('.signal-device-rotator'))};
  });
  assert.ok(point?.hit,'The real display is unobstructed');return point;
}
async function tap(page,touch){const p=await screenPoint(page);if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
async function select(page,key,shot=0,fallback=false){
  await page.evaluate(({key,shot})=>window.KROPrototype.select(key,shot,false,true),{key,shot});await screenReady(page,fallback);
}
async function fit(page){
  const data=await page.evaluate(()=>{
    const canvas=document.querySelector('.phone-webgl'),image=document.querySelector('.signal-device-screen');
    return{mode:canvas.dataset.screenFit,crop:JSON.parse(canvas.dataset.screenCrop),draw:JSON.parse(canvas.dataset.screenDrawRect),source:JSON.parse(canvas.dataset.screenSourceSize),texture:JSON.parse(canvas.dataset.screenTextureSize),natural:{width:image.naturalWidth,height:image.naturalHeight},objectFit:getComputedStyle(image).objectFit};
  });
  assert.equal(data.mode,'contain');assert.equal(data.objectFit,'contain');assert.deepEqual(data.source,data.natural);
  const{source,crop,draw,texture}=data;
  assert.deepEqual(crop,{x:0,y:0,width:source.width,height:source.height},'All screenshot pixels remain visible');
  assert.ok(draw.width>0&&draw.height>0&&draw.x>=-.01&&draw.y>=-.01&&draw.x+draw.width<=texture.width+.01&&draw.y+draw.height<=texture.height+.01);
  assert.ok(Math.abs(draw.width/draw.height-source.width/source.height)<.00001,'The actual screenshot keeps its aspect ratio');
}
async function languages(page,width){
  for(const[language,lead]of[['he','תנו לסקרנות'],['ru','Доверьтесь'],['en','Follow your']]){
    const before=await state(page),pose=await page.evaluate(()=>window.KROPrototype.phone.getRotation());
    await page.locator(`button[data-language="${language}"]`).click();
    assert.equal(await page.locator('html').getAttribute('lang'),language);assert.equal(await page.locator('html').getAttribute('dir'),language==='he'?'rtl':'ltr');
    assert.equal(await page.locator('[data-i18n="heroLead"]').textContent(),lead);assert.deepEqual(await state(page),before,'Language switches preserve app, shot, pause and phone renderer');
    const after=await page.evaluate(()=>window.KROPrototype.phone.getRotation());assert.equal(after.yaw,pose.yaw);assert.equal(after.pitch,pose.pitch);
    assert.equal(await page.locator('.studio-header-contact').getAttribute('href'),'mailto:hello@krostudios.com');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No locale creates horizontal overflow');
    const header=await page.locator('.studio-header').evaluate(el=>[...el.querySelectorAll('button,a')].map(control=>{const r=control.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,height:r.height};}));
    assert.ok(header.every(r=>r.left>=-1&&r.right<=width+1&&r.width>=43.5&&r.height>=43.5),'Header controls fit and stay touch sized');
    assert.ok(await page.locator('.signal-device-rotator').evaluate(el=>{
      for(let node=el;node;node=node.parentElement){const style=getComputedStyle(node),matrix=new DOMMatrixReadOnly(style.transform==='none'?undefined:style.transform);if(matrix.a<0||style.scale.startsWith('-'))return false;}return true;
    }),'RTL never mirrors the handset or screenshot');
  }
}
async function neighboringTargets(page){
  const collisions=await page.evaluate(()=>{
    const keys=window.KROCatalog.order,box=element=>{const r=element.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
    const items=keys.map(key=>({key,icon:box(document.querySelector(`.app-node[data-world="${key}"] .app-icon`)),label:box(document.querySelector(`.app-node[data-world="${key}"] .app-title`)),link:box(document.querySelector(`.orbit-site-link[data-destination="${key}"]`))}));
    const overlaps=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+.5&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+.5;
    return items.flatMap(item=>items.filter(other=>other.key!==item.key).flatMap(other=>['label','link'].filter(part=>overlaps(item[part],other.icon)).map(part=>`${item.key} ${part} overlaps ${other.key} icon`)));
  });
  assert.deepEqual(collisions,[],'Every app name and destination stays clear of its neighboring icons');
}
async function gestures(page,{fallback,touch,reduced}){
  await select(page,'kino',0,fallback);const before=await state(page),beforeEffect=await effect(page);
  await tap(page,touch);await screenReady(page,fallback);
  assert.equal((await state(page)).shot,1,'One real display tap advances once');assert.equal((await effect(page)).pulseCount,beforeEffect.pulseCount+1,'One real display tap emits one wave');
  const point=await screenPoint(page),count=(await effect(page)).pulseCount;
  if(touch){
    const session=await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:1}]});await page.waitForTimeout(450);
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:2}]});
    for(let i=1;i<=4;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+i*8,y:point.y+i,id:2}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  }else{
    await page.mouse.move(point.x,point.y);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();
    await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+32,point.y+4,{steps:4});await page.mouse.up();
  }
  assert.equal((await state(page)).shot,1,'Hold and drag never advance');assert.equal((await effect(page)).pulseCount,count,'Hold and drag never send screenshot waves');
  assert.ok(Math.abs((await page.evaluate(()=>window.KROPrototype.phone.getRotation())).yaw)>.1,'Drag still rotates the real handset');
  const rotor=page.locator('.signal-device-rotator');await rotor.focus();await page.keyboard.press('Home');
  await page.waitForFunction(()=>Math.abs(window.KROPrototype.phone.getRotation().yaw)<.1);
  await page.keyboard.press('Enter');assert.equal((await state(page)).shot,2,'Keyboard activation advances once');
  assert.equal((await effect(page)).pulseCount,count+1,'Keyboard screen change emits one wave');
  if(reduced){const staticEffect=await effect(page);assert.equal(staticEffect.effectAnimated,false);assert.equal(staticEffect.effectActive,false);}
  assert.equal((await state(page)).key,before.key);
}
async function motion(page){
  await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(100);
  let initial=await effect(page),first=await hash(page);await page.waitForTimeout(160);let next=await effect(page);
  assert.notEqual(next.frame,initial.frame,'The Silk animation advances');assert.notEqual(await hash(page),first,'The canvas paints changing Silk frames');
  await page.keyboard.press('p');await page.waitForTimeout(100);initial=await effect(page);first=await hash(page);await page.waitForTimeout(160);
  assert.equal((await effect(page)).frame,initial.frame);assert.equal(await hash(page),first,'Pause freezes actual pixels');
  await page.keyboard.press('p');await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);
  initial=await effect(page);first=await hash(page);await page.waitForTimeout(160);assert.equal(initial.reducedMotion,true);assert.equal((await effect(page)).frame,initial.frame);assert.equal(await hash(page),first,'Reduced motion freezes actual pixels');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(70);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  initial=await effect(page);await page.waitForTimeout(160);assert.equal((await effect(page)).frame,initial.frame,'Hidden document stops field frames');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(160);assert.notEqual((await effect(page)).frame,initial.frame,'Visible document resumes');
  await page.setViewportSize({width:1200,height:850});await page.waitForTimeout(100);
  const dimensions=await page.locator('.signal-field').evaluate(canvas=>{const r=canvas.getBoundingClientRect();return{css:r.width,pixels:canvas.width};});assert.equal(Math.round(dimensions.css),1200);assert.ok(dimensions.pixels>=1200&&dimensions.pixels<=2160,'Resize retains the bounded DPR');
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));initial=await effect(page);await page.waitForTimeout(130);assert.equal((await effect(page)).frame,initial.frame,'BFCache pagehide freezes the field');
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await page.waitForTimeout(130);assert.notEqual((await effect(page)).frame,initial.frame,'BFCache pageshow resumes the field');
}

(async()=>{
  fs.mkdirSync(evidence,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  const executablePath=process.env.KRO_CHROME||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
  const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})}),failures=[];let checked=0,fitCount=0;
  try{
    for(const profile of[{width:1440},{width:1024},{width:736},{width:375},{width:320},{width:375,fallback:true},{width:1440,reduced:true}]){
      const{width,fallback=false,reduced=false}=profile,label=width+(fallback?'-fallback':'')+(reduced?'-reduced':'');
      if(process.env.KRO_QA_PROFILES&&!process.env.KRO_QA_PROFILES.split(',').includes(label))continue;
      const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<=600,reducedMotion:reduced?'reduce':'no-preference'}),errors=[],external=[];
      if(fallback)await context.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:get.call(this,kind,...args);};});
      await context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push(route.request().url());return route.abort();});
      const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
      try{
        await page.goto(origin+'/?app=echo&shot=0&lang=en',{waitUntil:'networkidle'});
        await page.waitForFunction(()=>window.KROPrototype?.field?.getState&&window.KROHomeI18n&&['webgl','fallback'].includes(window.KROPrototype.getState().renderer));await page.evaluate(()=>document.fonts.ready);await screenReady(page,fallback);
        assert.equal((await state(page)).renderer,fallback?'fallback':'webgl','The genuine phone renderer survives the field upgrade');
        const field=await effect(page);assert.equal(field.renderer,'canvas2d');assert.equal(field.layers,3);assert.equal(field.particleBudget,150,'The ambient particle pool remains bounded');
        assert.deepEqual(await page.evaluate(()=>Object.fromEntries(window.KROCatalog.order.map(key=>[key,window.KROCatalog.apps[key].shots.length]))),counts,'All 61 genuine screenshots remain in their original app galleries');
        assert.equal(await page.locator('.app-node').count(),8);assert.equal(await page.locator('.orbit-site-link').count(),8);assert.equal(await page.locator('.app-node[data-world="echo"] .app-title').textContent(),'BlabFlip');
        for(const[key,url]of Object.entries(urls)){
          const button=page.locator(`.app-node[data-world="${key}"]`),link=page.locator(`.orbit-site-link[data-destination="${key}"]`);
          await button.locator('.app-icon').click();assert.equal((await state(page)).key,key);assert.equal(await link.getAttribute('href'),url);
          const r=await button.boundingBox();assert.ok(r.width>=44&&r.height>=44,'App previews retain touch targets');
        }
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'The layout never overflows horizontally');
        await gestures(page,{fallback,touch:width<=600,reduced});
        if(!reduced)await page.keyboard.press('p');await page.waitForTimeout(100);
        await languages(page,width);
        await neighboringTargets(page);
        if(!reduced)await page.keyboard.press('p');await page.waitForTimeout(100);
        if(width===1440&&!reduced){
          if(!process.env.KRO_QA_SKIP_GALLERIES)for(const[key,count]of Object.entries(counts))for(let shot=0;shot<count;shot++){await select(page,key,shot);await fit(page);fitCount++;}
          await motion(page);await page.setViewportSize({width,height:900});
        }
        if(reduced){
          await page.waitForTimeout(150);
          // Initial Chrome GPU/CPU canvas readback can round individual channels by one.
          // Warm that readback path before comparing an otherwise immutable canvas.
          await fieldSnapshot(page);await fieldSnapshot(page);
          const first=await fieldSnapshot(page);await page.waitForTimeout(160);const second=await fieldSnapshot(page);
          assert.equal(second.frame,first.frame,'Reduced motion performs no frame work');assert.equal(second.hash,first.hash,'A reduced-motion canvas stays exactly frozen');
        }
        await select(page,'echo',0,fallback);await page.locator('.signal-device-rotator').focus();await page.keyboard.press('Home');
        await page.waitForFunction(()=>Math.abs(window.KROPrototype.phone.getRotation().yaw)<.1);
        await page.evaluate(()=>{document.activeElement.blur();window.scrollTo(0,0);});await page.waitForTimeout(80);
        assert.deepEqual(errors,[],'The site has no script or asset errors');assert.deepEqual(external,[],'No off-site runtime requests were introduced');
        await page.screenshot({path:path.join(evidence,'liquid-silk-'+label+'.png'),fullPage:true});
        const previous=await effect(page);await page.evaluate(()=>window.KROPrototype.field.destroy());await page.waitForTimeout(150);assert.equal((await effect(page)).frame,previous.frame,'Destroy cancels all field frame work');
        checked++;console.log('PASS',label,'apps, links, galleries, phone gestures, locales, lifecycle');
      }catch(error){failures.push(label+': '+error.message);console.error('FAIL',failures.at(-1),error.stack?.split('\n').filter(line=>line.trim().startsWith('at ')).slice(0,2).join('\n'));await page.screenshot({path:path.join(evidence,'failure-'+label+'.png'),fullPage:true});}
      finally{await context.close();}
    }
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
  const report={checked,fitCount,failures};fs.writeFileSync(path.join(evidence,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));assert.deepEqual(failures,[]);
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});

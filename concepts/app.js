(() => {
  'use strict';
  const root = document.getElementById('kro-hyper-site');
  if (!root) return;
  const catalog = window.KROCatalog;
  if (!catalog) return;
  const {order,apps,featuredOrder:archiveOrder} = catalog;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const inline = root.dataset.inline === 'true';
  const focused = root.dataset.focus === 'signal';
  function normalize(raw) {
    const value = raw && typeof raw === 'object' ? {...raw,...raw.modelContent,...raw.privateContent} : {};
    const app = order.includes(value.app) ? value.app : 'kino';
    return {concept:focused?'signal':['engine','signal','archive'].includes(value.concept)?value.concept:'engine',app,shot:Number.isInteger(value.shot)&&value.shot>=0&&value.shot<apps[app].shots.length?value.shot:0,paused:typeof value.paused==='boolean'?value.paused:reduced.matches};
  }
  let saved = null;
  if (inline) saved = window.openai && window.openai.widgetState;
  else {try {saved=JSON.parse(localStorage.getItem('kro-concepts')||'null');} catch (_) {}}
  let state=normalize(saved);
  if(!inline){const query=new URLSearchParams(location.search);if(['engine','signal','archive'].includes(query.get('design')))state.concept=query.get('design');if(order.includes(query.get('app')))state.app=query.get('app');}
  let signalMounted=false,signalScene=null,phoneScene=null;
  const shotElements=root.querySelectorAll('[data-hero-shot]');
  function renderApp(animate=false) {
    const app=apps[state.app];
    if(state.shot>=app.shots.length)state.shot=0;
    root.dataset.app=state.app;
    root.querySelectorAll('[data-selected]').forEach(element=>{
      const field=element.dataset.selected;
      if(field!=='link'&&field!=='index'&&!Object.prototype.hasOwnProperty.call(app,field))return;
      if(field==='link')element.href=app.url;
      else if(field==='index')element.textContent=String(archiveOrder.indexOf(state.app)+1).padStart(2,'0')+' / '+String(archiveOrder.length).padStart(2,'0');
      else element.textContent=app[field]||'';
    });
    shotElements.forEach(image=>{
      image.src=app.shots[state.shot];image.alt=app.title+' actual app screen '+(state.shot+1);
      if(animate&&!state.paused&&!reduced.matches){image.classList.remove('screen-changing');void image.offsetWidth;image.classList.add('screen-changing');}
    });
    const fallback=root.querySelector('.phone-render-fallback');
    if(fallback)fallback.src=app.fallbacks[state.shot];
    root.querySelectorAll('[data-world]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.world===state.app)));
    const selectedIndex=Math.max(0,archiveOrder.indexOf(state.app));
    root.querySelectorAll('[data-exhibit]').forEach(exhibit=>{
      const delta=(archiveOrder.indexOf(exhibit.dataset.exhibit)-selectedIndex+archiveOrder.length)%archiveOrder.length;
      exhibit.dataset.position=delta===0?'center':delta===1?'right':'left';
      exhibit.setAttribute('aria-pressed',String(delta===0));
      const image=exhibit.querySelector('img');
      image.src=apps[exhibit.dataset.exhibit].shots[delta===0?state.shot:0];
      image.alt=apps[exhibit.dataset.exhibit].title+' actual app screen '+(delta===0?state.shot+1:1);
    });
    root.querySelectorAll('[data-screen-counter]').forEach(element=>{element.textContent='App screen '+(state.shot+1)+' / '+app.shots.length;});
    renderWorldSelector(app);
    if(window.KROSignal)window.KROSignal.setApp(app.form);
    const rotor=root.querySelector('.signal-device-rotator');
    if(rotor)rotor.setAttribute('aria-label','Rotate '+app.title+' on the orange iPhone 17 Pro Max preview. Drag, or use arrow keys to tilt.');
    if(phoneScene){phoneScene.setScreen(app.shots[state.shot],state.app);phoneScene.align();}
  }
  function renderWorldSelector(app) {
    const selector=root.querySelector('.world-selector');
    if(!selector)return;
    selector.style.setProperty('--world-accent',app.color);
    selector.dataset.activeWorld=state.app;
    const icon=selector.querySelector('[data-world-preview-icon]');
    if(icon)icon.src=app.icon;
    const title=selector.querySelector('[data-world-preview-title]');
    if(title){title.textContent=app.title;title.lang=state.app==='feed'?'ru':'en';}
    const launch=selector.querySelector('.world-launch');
    if(launch){launch.href=app.url;launch.setAttribute('aria-label','Open '+(app.englishTitle||app.title)+(state.app==='echo'?' coming-soon website':' app page'));}
    const selected=selector.querySelector('[data-world="'+state.app+'"]');
    const connection=selector.querySelector('[data-world-connection]');
    if(selected&&connection){
      const x=parseFloat(selected.style.getPropertyValue('--node-x'))*4;
      const y=parseFloat(selected.style.getPropertyValue('--node-y'))*4;
      connection.setAttribute('d','M200 200L'+x+' '+y);connection.setAttribute('stroke',app.color);
    }
    const announcement=selector.querySelector('[data-world-announcement]');
    if(announcement)announcement.textContent=(app.englishTitle||app.title)+' selected. '+app.category+'. '+app.status+'. The phone preview has changed.';
    const label=selector.querySelector('.world-launch-label');
    if(label)label.textContent=state.app==='echo'?'COMING SOON ↗':'OPEN WORLD ↗';
  }
  function renderConcept() {
    if(state.concept==='archive'&&!archiveOrder.includes(state.app)){state.app=archiveOrder[0];state.shot=0;renderApp();}
    root.dataset.concept=state.concept;
    const switcher=root.querySelector('.concept-switch');
    if(switcher)switcher.hidden=focused&&state.concept==='signal';
    root.querySelectorAll('[data-view]').forEach(view=>{view.hidden=view.dataset.view!==state.concept;});
    root.querySelectorAll('[data-design]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.design===state.concept)));
    if(state.concept==='signal'&&window.KROSignal&&!signalMounted){
      signalScene=window.KROSignal.mount(root.querySelector('.signal-canvas'));signalMounted=true;
      if(window.KROPhone)phoneScene=window.KROPhone.mount(root.querySelector('.signal-device'),{getAnchor:()=>signalScene&&signalScene.getAnchor?signalScene.getAnchor():null,onRotate:value=>{if(window.KROSignal.setRotation)window.KROSignal.setRotation(value);},onLayoutChange:()=>{if(signalScene)signalScene.render();}});
    }
    if(phoneScene)phoneScene.setActive(state.concept==='signal');
    if(window.KROSignal)window.KROSignal.setPaused(state.paused||state.concept!=='signal');
    if(phoneScene)phoneScene.setPaused(state.paused);
  }
  function renderMotion() {
    root.dataset.paused=String(state.paused);
    if(state.paused||reduced.matches)root.querySelectorAll('.screen-changing').forEach(image=>image.classList.remove('screen-changing'));
    root.querySelectorAll('.motion-control').forEach(button=>{
      const stopped=state.paused||reduced.matches;
      const label=reduced.matches?'Reduced motion enabled in system settings':state.paused?'Enable motion':'Pause motion';
      button.disabled=reduced.matches;button.setAttribute('aria-pressed',String(stopped));button.setAttribute('aria-label',label);button.title=label;
      const text=button.querySelector('[data-motion-label]');if(text)text.textContent=label;
      button.querySelectorAll('[data-motion-icon]').forEach(icon=>icon.toggleAttribute('hidden',icon.dataset.motionIcon===(stopped?'pause':'play')));
    });
    if(window.KROSignal)window.KROSignal.setPaused(state.paused||state.concept!=='signal');
    if(phoneScene)phoneScene.setPaused(state.paused);
  }
  function persist() {
    if(inline){if(window.openai&&typeof window.openai.setWidgetState==='function')window.openai.setWidgetState({modelContent:{concept:state.concept,app:state.app},privateContent:{shot:state.shot,paused:state.paused}}).catch(()=>{});}
    else {try {localStorage.setItem('kro-concepts',JSON.stringify(state));const url=new URL(location.href);url.searchParams.set('design',state.concept);url.searchParams.set('app',state.app);history.replaceState(null,'',url);}catch(_){}}
  }
  function chooseApp(key){if(!order.includes(key))return;state.app=key;state.shot=0;renderApp(true);persist();}
  root.querySelectorAll('[data-world]').forEach(button=>button.addEventListener('click',()=>chooseApp(button.dataset.world)));
  root.querySelectorAll('[data-exhibit]').forEach(button=>button.addEventListener('click',()=>chooseApp(button.dataset.exhibit)));
  root.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>chooseApp(archiveOrder[(archiveOrder.indexOf(state.app)+Number(button.dataset.step)+archiveOrder.length)%archiveOrder.length])));
  root.querySelectorAll('[data-design]').forEach(button=>button.addEventListener('click',()=>{state.concept=button.dataset.design;renderConcept();renderMotion();persist();}));
  root.querySelectorAll('.screenshot-control').forEach(button=>button.addEventListener('click',()=>{state.shot=(state.shot+1)%apps[state.app].shots.length;renderApp(true);persist();}));
  root.querySelectorAll('.motion-control').forEach(button=>button.addEventListener('click',()=>{state.paused=!state.paused;renderMotion();persist();}));
  root.querySelector('.signal-device-rotator')?.addEventListener('keydown',event=>{
    if(event.key.toLowerCase()!=='p'||event.repeat||event.altKey||event.ctrlKey||event.metaKey||reduced.matches)return;
    event.preventDefault();state.paused=!state.paused;renderMotion();persist();
  });
  root.querySelector('.archive-hero').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key)||!event.target.closest('button'))return;event.preventDefault();chooseApp(archiveOrder[(archiveOrder.indexOf(state.app)+(event.key==='ArrowRight'?1:archiveOrder.length-1))%archiveOrder.length]);});
  const nodes=root.querySelector('.world-nodes');
  nodes?.addEventListener('keydown',event=>{
    const buttons=Array.from(nodes.querySelectorAll('.world-node'));
    const current=buttons.indexOf(event.target.closest('.world-node'));
    if(current<0||!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+buttons.length)%buttons.length;
    buttons[next].focus();
  });
  const map=root.querySelector('.world-map');
  map?.addEventListener('pointermove',event=>{
    if(state.paused||reduced.matches||event.pointerType==='touch')return;
    const rect=map.getBoundingClientRect();
    map.style.setProperty('--spot-x',((event.clientX-rect.left)/rect.width*100).toFixed(1)+'%');
    map.style.setProperty('--spot-y',((event.clientY-rect.top)/rect.height*100).toFixed(1)+'%');
  },{passive:true});
  map?.addEventListener('pointerleave',()=>{map.style.removeProperty('--spot-x');map.style.removeProperty('--spot-y');});
  const art=root.querySelector('.engine-art');
  art.addEventListener('pointermove',event=>{if(state.paused||reduced.matches)return;const rect=art.getBoundingClientRect();art.style.setProperty('--px',(event.clientX-rect.left)/rect.width*2-1);art.style.setProperty('--py',(event.clientY-rect.top)/rect.height*2-1);});
  art.addEventListener('pointerleave',()=>{art.style.setProperty('--px',0);art.style.setProperty('--py',0);});
  reduced.addEventListener('change',()=>{if(reduced.matches)state.paused=true;renderMotion();});
  window.addEventListener('openai:set_globals',event=>{if(!inline)return;const globals=event.detail&&(event.detail.globals||event.detail);if(globals&&Object.prototype.hasOwnProperty.call(globals,'widgetState')){state=normalize(globals.widgetState);renderApp();renderConcept();renderMotion();}});
  renderApp();renderConcept();renderMotion();
  if(inline&&globalThis.Tweak){const design={gold:'#e0bd76',pink:'#ef9fc0'};const apply=()=>{root.style.setProperty('--gold',design.gold);root.style.setProperty('--pink',design.pink);};const tweak=new Tweak({container:root,onChange:apply});tweak.addColorPicker(design,'gold',{label:'Champagne gold',reference:'--gold'});tweak.addColorPicker(design,'pink',{label:'Studio pink',reference:'--pink'});}
})();

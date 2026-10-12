(() => {
  'use strict';
  const root = document.getElementById('kro-hyper-site');
  if (!root) return;
  const order = ['kino', 'echo', 'tanakh'];
  const apps = {
    kino: {title:'SovietKino',category:'Russian cinema & word puzzles',short:'Classic cinema. One word at a time.',description:'Remember the film. Find the word. Explore characters, actors and quotes through clues, letter feedback and a daily challenge.',meta:'Russian · Android & iOS',url:'https://krostudios.com/sovietkino/',shots:['assets/kinoHome.jpg','assets/kinoFeedback.jpg']},
    echo: {title:'Echo Dare',category:'Reverse-voice party game',short:'One phone. Impossible sounds. Instant laughter.',description:'Record a phrase, imitate the backwards sound, then flip it and hear the chaos. Play solo or pass one phone around 2–12 friends.',meta:'Coming soon · Solo & party · Adults 18+',url:'https://krostudios.com/echodare.html',shots:['assets/echoHome.jpg','assets/echoListen.jpg']},
    tanakh: {title:'Tanakh Quiz',category:'Hebrew words & discovery',short:'Stories rediscovered, letter by letter.',description:'Complete verses, identify people and places, and uncover who said it. A familiar world, rediscovered one letter at a time.',meta:'Hebrew · Android & iOS',url:'https://krostudios.com/tanakh-quiz/',shots:['assets/tanakhHome.jpg','assets/tanakhRank.jpg']}
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const inline = root.dataset.inline === 'true';
  const focused = root.dataset.focus === 'signal';
  function normalize(raw) {
    const value = raw && typeof raw === 'object' ? {...raw,...raw.modelContent,...raw.privateContent} : {};
    return {concept:focused?'signal':['engine','signal','archive'].includes(value.concept)?value.concept:'engine',app:order.includes(value.app)?value.app:'kino',shot:value.shot===1?1:0,paused:typeof value.paused==='boolean'?value.paused:reduced.matches};
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
    root.dataset.app=state.app;
    root.querySelectorAll('[data-selected]').forEach(element=>{
      const field=element.dataset.selected;
      if(field==='link')element.href=app.url;
      else if(field==='index')element.textContent='0'+(order.indexOf(state.app)+1)+' / 03';
      else element.textContent=app[field]||'';
    });
    shotElements.forEach(image=>{
      image.src=app.shots[state.shot];image.alt=app.title+' actual app screen '+(state.shot+1);
      if(animate&&!state.paused&&!reduced.matches){image.classList.remove('screen-changing');void image.offsetWidth;image.classList.add('screen-changing');}
    });
    const fallback=root.querySelector('.phone-render-fallback');
    if(fallback)fallback.src='assets/phone-'+state.app+'-'+state.shot+'.webp';
    root.querySelectorAll('[data-world]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.world===state.app)));
    const selectedIndex=order.indexOf(state.app);
    root.querySelectorAll('[data-exhibit]').forEach(exhibit=>{
      const delta=(order.indexOf(exhibit.dataset.exhibit)-selectedIndex+3)%3;
      exhibit.dataset.position=delta===0?'center':delta===1?'right':'left';
      exhibit.setAttribute('aria-pressed',String(delta===0));
      const image=exhibit.querySelector('img');
      image.src=apps[exhibit.dataset.exhibit].shots[delta===0?state.shot:0];
      image.alt=apps[exhibit.dataset.exhibit].title+' actual app screen '+(delta===0?state.shot+1:1);
    });
    root.querySelectorAll('[data-screen-counter]').forEach(element=>{element.textContent='App screen '+(state.shot+1)+' / 2';});
    if(window.KROSignal)window.KROSignal.setApp(state.app);
    const rotor=root.querySelector('.signal-device-rotator');
    if(rotor)rotor.setAttribute('aria-label','Rotate '+app.title+' on the orange iPhone 17 Pro Max preview. Drag, or use arrow keys to tilt.');
    if(phoneScene){phoneScene.setScreen(app.shots[state.shot],state.app);phoneScene.align();}
  }
  function renderConcept() {
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
    root.querySelectorAll('.motion-control').forEach(button=>{button.disabled=reduced.matches;button.setAttribute('aria-pressed',String(state.paused||reduced.matches));button.querySelector('[data-motion-label]').textContent=reduced.matches?'Reduced motion':state.paused?'Enable motion':'Pause motion';});
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
  root.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>chooseApp(order[(order.indexOf(state.app)+Number(button.dataset.step)+3)%3])));
  root.querySelectorAll('[data-design]').forEach(button=>button.addEventListener('click',()=>{state.concept=button.dataset.design;renderConcept();renderMotion();persist();}));
  root.querySelectorAll('.screenshot-control').forEach(button=>button.addEventListener('click',()=>{state.shot=1-state.shot;renderApp(true);persist();}));
  root.querySelectorAll('.motion-control').forEach(button=>button.addEventListener('click',()=>{state.paused=!state.paused;renderMotion();persist();}));
  root.querySelector('.archive-hero').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key)||!event.target.closest('button'))return;event.preventDefault();chooseApp(order[(order.indexOf(state.app)+(event.key==='ArrowRight'?1:2))%3]);});
  const art=root.querySelector('.engine-art');
  art.addEventListener('pointermove',event=>{if(state.paused||reduced.matches)return;const rect=art.getBoundingClientRect();art.style.setProperty('--px',(event.clientX-rect.left)/rect.width*2-1);art.style.setProperty('--py',(event.clientY-rect.top)/rect.height*2-1);});
  art.addEventListener('pointerleave',()=>{art.style.setProperty('--px',0);art.style.setProperty('--py',0);});
  reduced.addEventListener('change',()=>{if(reduced.matches)state.paused=true;renderMotion();});
  window.addEventListener('openai:set_globals',event=>{if(!inline)return;const globals=event.detail&&(event.detail.globals||event.detail);if(globals&&Object.prototype.hasOwnProperty.call(globals,'widgetState')){state=normalize(globals.widgetState);renderApp();renderConcept();renderMotion();}});
  renderApp();renderConcept();renderMotion();
  if(inline&&globalThis.Tweak){const design={gold:'#e0bd76',pink:'#ef9fc0'};const apply=()=>{root.style.setProperty('--gold',design.gold);root.style.setProperty('--pink',design.pink);};const tweak=new Tweak({container:root,onChange:apply});tweak.addColorPicker(design,'gold',{label:'Champagne gold',reference:'--gold'});tweak.addColorPicker(design,'pink',{label:'Studio pink',reference:'--pink'});}
})();

/* Standalone prototypes. All app artwork and destinations come from the real catalog. */
(() => {
  'use strict';
  const catalog=window.KROCatalog,stage=document.querySelector('.prototype');
  if(!catalog||!stage)return;
  const {order,apps}=catalog,query=new URLSearchParams(location.search);
  let key=order.includes(query.get('app'))?query.get('app'):'echo';
  const normalizeShot=(value,appKey)=>{const index=Number(value);return Number.isSafeInteger(index)&&index>=0&&index<apps[appKey].shots.length?index:0;};
  let shot=normalizeShot(query.get('shot'),key);
  const nodeRoot=document.querySelector('.world-index'),phoneHost=document.querySelector('.phone-host');
  const selected=document.querySelector('.selected-world'),announcement=document.querySelector('.selection-announcement');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let paused=false;
  let screenshotFeedback=null;
  const cancelScreenshotFeedback=()=>{screenshotFeedback?.cancel();screenshotFeedback=null;};
  nodeRoot.innerHTML=order.map((id,index)=>`<button type="button" class="app-node" data-world="${id}" aria-pressed="false" aria-label="Preview ${apps[id].title}"><span class="app-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><span class="app-icon"><img src="${apps[id].icon}" alt="" width="76" height="76" draggable="false"></span><span class="app-title">${apps[id].title}</span><span class="app-status">${id==='echo'?'COMING SOON':''}</span></button>`).join('');
  phoneHost.innerHTML=`<div class="signal-device"><div class="signal-device-float"><div class="signal-device-rotator" tabindex="0" role="img" aria-label="Orange 3D phone displaying an app screenshot. Click the screen or press Enter to see the next screenshot. Drag or use arrow keys to rotate; Home resets; P pauses animation." aria-describedby="phone-accessible-hint"><img class="phone-render-fallback" src="${apps[key].fallbacks[shot]}" alt="" draggable="false"><span class="device-glass"><img class="signal-device-screen" src="${apps[key].shots[shot]}" alt="" draggable="false"></span></div></div><span class="sr-only" data-renderer-status></span><span class="phone-hint" aria-hidden="true">TAP SCREEN TO EXPLORE · DRAG TO ROTATE</span><span class="sr-only" id="phone-accessible-hint">Click or tap the screen to see the next screenshot. Select an app to change the gallery. Drag the phone horizontally to rotate it; vertical movement scrolls on touch screens. Arrow keys rotate. Enter or Space shows the next screenshot. Home resets. P pauses motion.</span></div>`;
  if(selected)selected.innerHTML='<div class="selected-identity"><strong class="selected-title"></strong><span class="selected-status"></span></div><a class="explore-link" target="_blank" rel="noopener noreferrer">Explore app ↗</a><button class="screen-next" type="button">Screen 1 / 2 →</button>';
  const designs=[['prism','prism-runway.html','Prism Runway'],['lab','signal-lab.html','Signal Lab'],['bridge','constellation-bridge.html','Constellation Bridge']];
  const footer=document.querySelector('.preview-navigation');
  const params=()=>{
    const next=new URLSearchParams(location.search);
    next.set('app',key);next.set('shot',String(shot));
    if(window.KROHomeI18n)next.set('lang',window.KROHomeI18n.getLanguage());
    return '?'+next.toString();
  };
  function updateNavigation(){
    if(footer)footer.innerHTML='<a class="back-to-designs" href="index.html">← All designs</a>'+designs.map(([id,file,title])=>`<a href="${file}${params()}" ${document.body.dataset.design===id?'aria-current="page"':''}>${title}</a>`).join('');
  }
  const field=window.KROBridgeField?.mount(document.querySelector('.signal-field'),stage,phoneHost,nodeRoot,reduced)||mountField(document.querySelector('.signal-field'),stage,phoneHost,nodeRoot,reduced);
  const device=phoneHost.querySelector('.signal-device');
  stage.dataset.app=key;
  const phone=window.KROPhone?.mount(device,{onRotate:rotation=>field?.setRotation(rotation),onScreenTap:()=>nextScreenshot()});
  function select(next,nextShot=0,announce=true,writeURL=true){
    if(!order.includes(next))return;
    key=next;shot=normalizeShot(nextShot,key);stage.dataset.app=key;
    for(const node of nodeRoot.querySelectorAll('.app-node'))node.setAttribute('aria-pressed',String(node.dataset.world===key));
    const app=apps[key];
    device.querySelector('.signal-device-screen').src=app.shots[shot];
    device.querySelector('.phone-render-fallback').src=app.fallbacks[shot];
    device.querySelector('.signal-device-rotator').setAttribute('aria-label',`${app.title}, screenshot ${shot+1} of ${app.shots.length}, on an orange 3D phone. Click the screen or press Enter for the next screenshot. Drag or use arrow keys to rotate. Home resets; P pauses motion.`);
    if(selected){
      selected.querySelector('.selected-title').textContent=app.title;
      selected.querySelector('.selected-status').textContent=app.status;
      selected.querySelector('.explore-link').href=app.url;
      selected.querySelector('.explore-link').setAttribute('aria-label','Explore '+app.title+(key==='echo'?' coming-soon page':''));
      selected.querySelector('.screen-next').textContent=`Screen ${shot+1} / ${app.shots.length} →`;
      selected.querySelector('.screen-next').setAttribute('aria-label',`Show screenshot ${(shot+1)%app.shots.length+1} of ${app.title}`);
    }
    phone?.setScreen(app.shots[shot],key);field?.setWorld(order.indexOf(key));updateNavigation();
    stage.dispatchEvent(new CustomEvent('kro:appchange',{bubbles:true,detail:{key,shot,app}}));
    if(announce&&announcement)announcement.textContent=window.KROHomeI18n?.selectionAnnouncement(key,shot,app)||`${app.title}. ${app.status}. Screenshot ${shot+1} of ${app.shots.length}.`;
    if(writeURL&&location.protocol!=='file:'){try{history.replaceState(null,'',location.pathname+params()+location.hash);}catch(_){}}
  }
  function nextScreenshot(){
    select(key,(shot+1)%apps[key].shots.length);
    field?.pulse?.({key,source:'screen'});
    cancelScreenshotFeedback();
    if(!paused&&!reduced.matches&&!document.hidden){
      const rotor=device.querySelector('.signal-device-rotator');
      screenshotFeedback=rotor.animate?.([
        {filter:'drop-shadow(0 0 0px rgba(244,204,127,0)) drop-shadow(0 0 0px rgba(239,159,192,0))'},
        {filter:'drop-shadow(0 0 12px rgba(244,204,127,.48)) drop-shadow(0 0 27px rgba(239,159,192,.26))',offset:.22},
        {filter:'drop-shadow(0 0 0px rgba(244,204,127,0)) drop-shadow(0 0 0px rgba(239,159,192,0))'}
      ],{duration:680,easing:'cubic-bezier(.16,1,.3,1)'});
    }
  }
  nodeRoot.addEventListener('click',event=>{const button=event.target.closest('.app-node[data-world]');if(button)select(button.dataset.world);});
  nodeRoot.addEventListener('keydown',event=>{
    const node=event.target.closest('.app-node[data-world]');if(!node)return;
    const index=order.indexOf(node.dataset.world),offset={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[event.key];
    let next=index;
    if(offset)next=(index+offset+order.length)%order.length;
    else if(event.key==='Home')next=0;else if(event.key==='End')next=order.length-1;else return;
    event.preventDefault();nodeRoot.querySelector(`[data-world="${order[next]}"]`).focus();
  });
  selected?.querySelector('.screen-next').addEventListener('click',nextScreenshot);
  document.addEventListener('keydown',event=>{if(event.key.toLowerCase()==='p'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)){paused=!paused;document.body.dataset.motion=paused?'paused':'running';if(paused)cancelScreenshotFeedback();phone?.setPaused(paused);field?.setPaused(paused);if(announcement)announcement.textContent=window.KROHomeI18n?.motionAnnouncement(paused)||(paused?'Motion paused. Press P to resume.':'Motion resumed.');}});
  window.addEventListener('popstate',()=>{const q=new URLSearchParams(location.search);select(order.includes(q.get('app'))?q.get('app'):'echo',q.get('shot'),true,false);});
  select(key,shot,false,false);
  // The small fallback is fully interactive if WebGL is disabled or the folder is opened directly.
  // Its rotation is intentionally constrained because it is a single render, not a second fake shell.
  window.KROPrototype={select,nextScreenshot,getState:()=>({key,shot,paused,renderer:device.dataset.rendererState}),phone,field};
  reduced.addEventListener('change',()=>{if(reduced.matches)cancelScreenshotFeedback();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelScreenshotFeedback();});

  function mountField(canvas,container,host,nodes,motionPreference){
    if(!canvas)return null;
    const ctx=canvas.getContext('2d');if(!ctx)return null;
    const tau=Math.PI*2,mode=document.body.dataset.design;
    let width=1,height=1,dpr=1,frame=0,previous=0,time=0,world=1,targetWorld=1,visible=true,stopped=false;
    let pointer={x:0,y:0},eased={x:0,y:0},rotation={x:0,y:0},anchor={x:.5,y:.5,w:300},links=[];
    let seed=914728;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const stars=Array.from({length:85},()=>({x:random(),y:random(),r:random()*.8+.3,phase:random()*tau}));
    const mix=(a,b,t)=>a+(b-a)*t;
    const color=(t,light=1,alpha=1)=>{const gold=[244,204,127],rose=[236,154,188];return `rgba(${gold.map((v,i)=>Math.round(mix(v,rose[i],t)*light)).join(',')},${alpha})`;};
    const point=(t,u)=>{
      const phase=world*.12,drift=time*.18,compact=width<850;
      let x,y,z,twist,breadth;
      if(mode==='lab'){
        const a=t*tau+phase;
        const rx=Math.min(width*.31,460),ry=Math.min(height*.45,440);
        x=anchor.x+Math.sin(a)*rx;y=anchor.y+Math.cos(a)*ry;
        z=Math.sin(a*2+drift);twist=a*1.5+Math.sin(a*3-drift)*.2;
        breadth=Math.min(width*.075,85)*(1+Math.sin(a*2+drift)*.2);
      }else{
        const a=t*tau;
        x=width*(-.09+t*1.18);
        y=compact?anchor.y+Math.sin(a+drift+phase)*170:height*(mode==='prism'?.62:.59)+Math.sin(a*(mode==='prism'?1.1:1.35)+drift+phase)*height*.16;
        z=Math.sin(a*1.7+drift);twist=a*1.2+drift*.7;
        breadth=Math.min(height*.11,width*.14)*(1+Math.sin(a*1.5-drift)*.2);
      }
      const bend=Math.sin(t*tau*3-time*.5+u)*6;
      return{x:x+Math.sin(twist)*u*breadth*.36+eased.x*20+rotation.x*6,y:y+Math.cos(twist)*u*breadth+bend+eased.y*12,z:z+u*Math.sin(twist)*.3,t};
    };
    function layout(){
      const bounds=container.getBoundingClientRect(),p=host.getBoundingClientRect();
      width=bounds.width;height=bounds.height;dpr=Math.min(window.devicePixelRatio||1,1.7);
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      anchor={x:p.left-bounds.left+p.width/2,y:p.top-bounds.top+p.height/2,w:p.width};
      links=Array.from(nodes.querySelectorAll('.app-node')).map(node=>{const r=node.querySelector('.app-icon').getBoundingClientRect();return{node,x:r.left-bounds.left+r.width/2,y:r.top-bounds.top+r.height/2};});
      draw();
    }
    function background(){
      ctx.clearRect(0,0,width,height);
      const glow=ctx.createRadialGradient(anchor.x,anchor.y,20,anchor.x,anchor.y,Math.max(width*.6,height*.6));
      glow.addColorStop(0,'rgba(117,65,43,.16)');glow.addColorStop(.45,'rgba(100,43,67,.065)');glow.addColorStop(1,'rgba(8,9,13,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
      for(const star of stars){ctx.fillStyle=color(star.x,.95,.18+Math.sin(time*.5+star.phase)*.12);ctx.beginPath();ctx.arc(star.x*width,star.y*height,star.r,0,tau);ctx.fill();}
    }
    function ribbon(){
      const segments=140,strips=12,grid=[];
      for(let i=0;i<=segments;i++){const row=[];for(let j=0;j<=strips;j++)row.push(point(i/segments,(j/strips-.5)*2));grid.push(row);}
      const polygons=[];
      for(let i=0;i<segments;i++)for(let j=0;j<strips;j++){const p=[grid[i][j],grid[i+1][j],grid[i+1][j+1],grid[i][j+1]];polygons.push({p,z:p.reduce((sum,v)=>sum+v.z,0)/4,i,j});}
      polygons.sort((a,b)=>a.z-b.z);
      for(const {p,i,j,z} of polygons){
        const reflect=.66+.48*Math.pow(Math.abs(Math.sin(i/segments*tau*1.1+time*.22+j/strips*1.7)),8)+Math.max(0,z)*.18;
        const tone=(Math.sin(i/segments*Math.PI-Math.PI/2+world*.06)+1)/2;
        ctx.fillStyle=color(tone,reflect,.76);ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let k=1;k<4;k++)ctx.lineTo(p[k].x,p[k].y);ctx.closePath();ctx.fill();
      }
      ctx.lineWidth=.45;
      for(let j=0;j<=strips;j++){ctx.beginPath();for(let i=0;i<=segments;i++){const p=grid[i][j];if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.strokeStyle=color(j/strips,1,.17);ctx.stroke();}
      for(let i=0;i<=segments;i+=3){ctx.beginPath();for(let j=0;j<=strips;j++){const p=grid[i][j];if(j===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.strokeStyle=color(i/segments,1,.12);ctx.stroke();}
      for(const u of [-1,1]){ctx.beginPath();for(let i=0;i<=segments;i++){const p=grid[i][u===-1?0:strips];if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.lineWidth=1;ctx.strokeStyle=color(u===-1?.18:.78,1,.55);ctx.shadowColor='#eabb73';ctx.shadowBlur=7;ctx.stroke();ctx.shadowBlur=0;}
    }
    function connections(){
      if(width<850)return;
      links.forEach((link,index)=>{
        const active=link.node.getAttribute('aria-pressed')==='true',sign=link.x<anchor.x?-1:1;
        const x0=anchor.x+sign*anchor.w*.24,y0=anchor.y;
        const c1={x:x0+sign*75,y:y0},c2={x:link.x-sign*80,y:link.y};
        ctx.beginPath();ctx.moveTo(x0,y0);ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,link.x,link.y);
        ctx.strokeStyle=active?'rgba(239,159,192,.78)':'rgba(224,189,118,.19)';ctx.lineWidth=active?1.25:.55;ctx.stroke();
        const t=(time*(active?.17:.07)+index*.13)%1,inv=1-t;
        const x=inv**3*x0+3*inv**2*t*c1.x+3*inv*t*t*c2.x+t**3*link.x;
        const y=inv**3*y0+3*inv**2*t*c1.y+3*inv*t*t*c2.y+t**3*link.y;
        ctx.fillStyle=active?'#ffd3e8':'#e5bd7c';ctx.shadowColor=active?'#ef9fc0':'#e0bd76';ctx.shadowBlur=active?14:5;ctx.beginPath();ctx.arc(x,y,active?2.7:1.25,0,tau);ctx.fill();ctx.shadowBlur=0;
      });
    }
    function draw(){background();ribbon();connections();canvas.dataset.world=String(targetWorld);canvas.dataset.frame=String(Math.round(time*30));}
    function canAnimate(){return !stopped&&!motionPreference.matches&&visible&&!document.hidden;}
    function tick(timestamp){frame=0;if(!canAnimate())return;const delta=previous?Math.min((timestamp-previous)/1000,.08):.034;if(previous&&delta<1/32){frame=requestAnimationFrame(tick);return;}previous=timestamp;time+=delta;world+=(targetWorld-world)*Math.min(1,delta*2);eased.x+=(pointer.x-eased.x)*.06;eased.y+=(pointer.y-eased.y)*.06;draw();frame=requestAnimationFrame(tick);}
    function sync(){cancelAnimationFrame(frame);frame=0;previous=0;if(canAnimate())frame=requestAnimationFrame(tick);else draw();}
    const observer=new ResizeObserver(layout);observer.observe(container);observer.observe(host);observer.observe(nodes);
    const intersection=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync();});intersection.observe(container);
    container.addEventListener('pointermove',event=>{const r=container.getBoundingClientRect();pointer={x:(event.clientX-r.left)/width-.5,y:(event.clientY-r.top)/height-.5};});container.addEventListener('pointerleave',()=>{pointer={x:0,y:0};});
    document.addEventListener('visibilitychange',sync);motionPreference.addEventListener('change',sync);document.fonts.ready.then(layout);
    layout();sync();
    return{setWorld(value){targetWorld=value;if(!canAnimate()){world=value;layout();}},setRotation(value){rotation=value;},setPaused(value){stopped=value;sync();},refresh:layout};
  }
})();

/* Liquid Silk: the selected metallic cloth field behind the genuine 3D phone and app links. */
(() => {
  'use strict';
  const mounted=new WeakMap();
  const EFFECT_DURATION=1.35;
  const APPROACH_MS=420;
  const TAU=Math.PI*2;
  const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
  const mix=(a,b,t)=>a+(b-a)*t;
  const GOLD=[240,195,115],ROSE=[232,142,188];
  const light=[-.30,-.55,.78];
  const rgb=(tone,energy=1,alpha=1)=>{
    const color=GOLD.map((value,index)=>Math.round(clamp(mix(value,ROSE[index],clamp(tone))*energy,0,255)));
    return `rgba(${color[0]},${color[1]},${color[2]},${clamp(alpha)})`;
  };
  // The approved drawing model stays private to the production field.
  function createLiquidSilk(){
    const columns=88,rows=10;
    const materials=[
      {phase:-.54,frequency:1.17,breadth:1,tone:.08,depth:.22,opacity:.82},
      {phase:2.43,frequency:1.28,breadth:.80,tone:.78,depth:-.13,opacity:.68},
      {phase:4.15,frequency:.98,breadth:.38,tone:.32,depth:-.45,opacity:.50}
    ];
    const sheets=materials.map(material=>({material,grid:Array.from({length:columns+1},()=>Array.from({length:rows+1},()=>({x:0,y:0,z:0}))),faces:[]}));
    const faces=[];
    for(const sheet of sheets)for(let column=0;column<columns;column++)for(let row=0;row<rows;row++){
      const face={sheet,column,row,points:[sheet.grid[column][row],sheet.grid[column+1][row],sheet.grid[column+1][row+1],sheet.grid[column][row+1]],z:0};
      sheet.faces.push(face);faces.push(face);
    }
    let seed=61249,clock=0,world=0,bendX=0,bendY=0;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const dust=Array.from({length:82},()=>({t:random(),u:random()*2-1,sheet:Math.floor(random()*3),speed:.007+random()*.009,phase:random()*TAU,size:.45+random()*1.15}));
    const stars=Array.from({length:68},()=>({x:random(),y:random(),size:.4+random()*.8,phase:random()*TAU}));
    const scratch={x:0,y:0,z:0};
    function draw(ctx,scene){
      const w=scene.w,h=scene.h;
      if(!ctx||w<=0||h<=0)return;
      const phone=scene.phone||{x:w*.51,y:h*.55,width:w*.27,height:h*.72};
      const nodes=scene.nodes||[];
      const intensity=clamp(Number(scene.intensity)||1,.35,1.7);
      const animate=scene.motion!==false&&!scene.reduced;
      if(animate)clock=Number(scene.time)||0;
      const target=Math.max(0,nodes.findIndex(node=>node.key===scene.selectedKey))*.10;
      world=animate?mix(world,target,1-Math.exp(-Math.min(.08,Number(scene.dt)||.033)*2.3)):target;
      const mouse=scene.mouse||{x:0,y:0};
      if(animate){bendX=clamp(Number(mouse.x)||0,-1,1);bendY=clamp(Number(mouse.y)||0,-1,1);}
      const mx=bendX,my=bendY;
      const amplitude=Math.min(phone.height*.205,w<600?114:152);
      const breadth=Math.min(phone.height*.15,w*.175,112);
      const centreY=phone.y+phone.height*.025;
      const pulseAge=Number(scene.pulseAge),pulse=Number.isFinite(pulseAge)&&pulseAge>=0&&pulseAge<1.35;
      const progress=pulse?clamp(pulseAge/1.35):1;
      const pulsePower=pulse?Math.sin(progress*Math.PI)*Math.pow(1-progress,.3):0;
      const selected=nodes.find(node=>node.key===scene.selectedKey&&node.r>0);
      const sourceT=clamp(phone.x/w),direction=selected&&selected.x<phone.x?-1:1;
      function point(t,u,material,out){
        const a=t*TAU,flow=clock*.29;
        const twist=a*.86+material.phase+Math.sin(a*1.22-flow)*.50+clock*.12+mx*.27;
        const width=breadth*material.breadth*(.92+.12*Math.sin(a*1.7-flow));
        const y=centreY+Math.sin(a*material.frequency+material.phase+flow+world)*amplitude;
        out.x=w*(-.13+t*1.26)+Math.cos(twist)*u*width*.42+mx*14;
        out.y=y+Math.sin(twist)*u*width+Math.sin(a*2.1-flow*.8+material.phase)*amplitude*.12+my*16;
        out.z=Math.sin(a*1.58+material.phase-flow)*55+Math.cos(twist)*u*width*.75+material.depth*110;
        // The convex cross-section makes the highlight roll across silk rather than a flat banner.
        out.z+=Math.sin((u+1)*Math.PI*.5)*width*.28+Math.sin(a*2.6+u*2.2-flow)*3;
        out.y+=Math.sin(a*3.1-flow+u*4.0)*u*2.0;
        return out;
      }
      ctx.save();
      const ambient=ctx.createRadialGradient(phone.x,centreY,8,phone.x,centreY,Math.max(phone.height*.7,w*.48));
      ambient.addColorStop(0,`rgba(162,85,101,${.075*intensity})`);ambient.addColorStop(.48,`rgba(124,80,48,${.035*intensity})`);ambient.addColorStop(1,'rgba(8,9,13,0)');
      ctx.fillStyle=ambient;ctx.fillRect(0,0,w,h);
      for(const star of stars){
        const shine=(.12+.10*Math.sin(clock*.4+star.phase))*intensity;
        ctx.fillStyle=rgb(star.x,1.12,shine);ctx.beginPath();ctx.arc(star.x*w,star.y*h,star.size,0,TAU);ctx.fill();
      }
      // Real adjacent surface derivatives determine metallic light and depth order.
      for(const sheet of sheets){
        for(let column=0;column<=columns;column++)for(let row=0;row<=rows;row++)point(column/columns,row/rows*2-1,sheet.material,sheet.grid[column][row]);
        for(const face of sheet.faces)face.z=face.points.reduce((sum,p)=>sum+p.z,0)*.25;
      }
      faces.sort((a,b)=>a.z-b.z);
      for(const face of faces){
        const p=face.points,material=face.sheet.material,t=(face.column+.5)/columns,u=(face.row+.5)/rows*2-1;
        const ax=p[1].x-p[0].x,ay=p[1].y-p[0].y,az=p[1].z-p[0].z;
        const bx=p[3].x-p[0].x,by=p[3].y-p[0].y,bz=p[3].z-p[0].z;
        let nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
        const normal=Math.hypot(nx,ny,nz)||1;nx/=normal;ny/=normal;nz/=normal;
        const lighting=Math.abs(nx*light[0]+ny*light[1]+nz*light[2]);
        const core=Math.pow(Math.max(0,1-u*u),1.4),sheen=Math.pow(lighting,17);
        const tone=clamp(material.tone+(t-.5)*.40+Math.sin(t*TAU-world)*.055);
        const travelling=Math.pow(.5+.5*Math.cos(t*28-clock*1.45+material.phase+u*1.8),14);
        const tapCentre=sourceT+direction*progress*.70;
        const signal=pulsePower*Math.exp(-Math.pow((t-tapCentre)*14,2));
        const energy=(.35+lighting*.52+core*.14+sheen*.73+travelling*.085+signal*.46)*intensity;
        const alpha=material.opacity*(.68+core*.22+sheen*.1);
        const base=GOLD.map((value,index)=>mix(value,ROSE[index],tone));
        const pearl=[255,mix(239,203,tone),mix(186,225,tone)];
        const color=base.map((value,index)=>Math.round(clamp(value*(.35+energy*.50)+pearl[index]*(sheen*.45+core*.095+signal*.28),0,255)));
        ctx.fillStyle=`rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
        ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);ctx.lineTo(p[1].x,p[1].y);ctx.lineTo(p[2].x,p[2].y);ctx.lineTo(p[3].x,p[3].y);ctx.closePath();ctx.fill();
      }
      // Subpixel fibres and caustic seams give the cloth its fine woven finish.
      ctx.globalCompositeOperation='lighter';
      for(const sheet of sheets){
        const material=sheet.material;
        const thread=ctx.createLinearGradient(0,0,w,h*.1);
        thread.addColorStop(0,rgb(material.tone,.98,.075*intensity));thread.addColorStop(.34,rgb(material.tone,1.2,.30*intensity));thread.addColorStop(.70,rgb(Math.min(1,material.tone+.2),1.12,.18*intensity));thread.addColorStop(1,rgb(material.tone,1.05,.08*intensity));
        ctx.strokeStyle=thread;ctx.lineWidth=.48;
        for(let row=0;row<=22;row++){
          const u=row/22*2-1;ctx.beginPath();
          for(let column=0;column<=columns;column++){const p=point(column/columns,u,material,scratch);if(!column)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
          ctx.stroke();
        }
        for(const u of[-.92,.20,.93]){
          ctx.beginPath();for(let column=0;column<=columns;column++){const p=point(column/columns,u,material,scratch);if(!column)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
          ctx.strokeStyle=rgb(material.tone,1.2,(u===.20?.18:.33)*intensity);ctx.lineWidth=u===.20?1.1:.8;ctx.shadowColor=rgb(material.tone,1.2,.8);ctx.shadowBlur=u===.20?13:5;ctx.stroke();
        }
        ctx.shadowBlur=0;
      }
      for(const mote of dust){
        const t=(mote.t+clock*mote.speed)%1,p=point(t,mote.u,materials[mote.sheet],scratch);
        const shine=(.22+.14*Math.sin(clock*.7+mote.phase))*intensity;
        ctx.fillStyle=rgb(t,1.25,shine);ctx.beginPath();ctx.arc(p.x,p.y,mote.size,0,TAU);ctx.fill();
      }
      // A small constellation trail links the lightfront to the selected real app.
      if(selected){
        const sign=selected.x<phone.x?-1:1,x0=phone.x+sign*phone.width*.30,y0=phone.y+phone.height*.06;
        const c1={x:x0+sign*Math.max(50,Math.abs(selected.x-x0)*.34),y:y0-45};
        const c2={x:selected.x-sign*45,y:selected.y+35};
        ctx.beginPath();ctx.moveTo(x0,y0);ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,selected.x,selected.y);
        ctx.strokeStyle=rgb(.72,1.1,.18*intensity);ctx.lineWidth=.65;ctx.stroke();
        const travel=pulse?clamp(progress*1.1):(clock*.15)%1,v=1-travel;
        const x=v**3*x0+3*v*v*travel*c1.x+3*v*travel*travel*c2.x+travel**3*selected.x;
        const y=v**3*y0+3*v*v*travel*c1.y+3*v*travel*travel*c2.y+travel**3*selected.y;
        ctx.fillStyle=rgb(.75,1.2,pulse?.88:.40);ctx.shadowColor='#ffc0de';ctx.shadowBlur=pulse?16:8;ctx.beginPath();ctx.arc(x,y,pulse?3.4:1.9,0,TAU);ctx.fill();ctx.shadowBlur=0;
      }
      if(pulse){
        const envelope=Math.sin(progress*Math.PI)*Math.pow(1-progress,.3),radius=mix(phone.width*.36,Math.min(w*.62,phone.height*1.2),1-Math.pow(1-progress,2));
        for(let echo=0;echo<2;echo++){
          ctx.strokeStyle=rgb(.35+echo*.4,1.2,envelope*(echo?.20:.40)*intensity);ctx.lineWidth=echo?.7:1.2;ctx.shadowColor='#f1b3d1';ctx.shadowBlur=echo?3:12;
          ctx.beginPath();ctx.ellipse(phone.x,phone.y,radius-echo*15,(radius-echo*15)*.58,-.12,0,TAU);ctx.stroke();
        }
      }
      ctx.restore();
    }
    return{name:'Liquid Silk',draw,particleBudget:dust.length+stars.length};
  }

  function mount(canvas,stage,host,nodes,reduced){
    if(!canvas||!stage||!host||!nodes)return null;
    if(mounted.has(canvas))return mounted.get(canvas);
    const ctx=canvas.getContext('2d');if(!ctx)return null;
    const silk=createLiquidSilk();
    canvas.style.zIndex='1';canvas.dataset.renderer='canvas2d';
    canvas.dataset.quality='liquid-silk';canvas.dataset.layers='3';
    let width=1,height=1,dpr=1,frame=0,renderCount=0,previous=0,time=0,delta=.033,targetWorld=null;
    let stopped=false,visible=true,pageActive=true,destroyed=false;
    let anchor={x:0,y:0,width:300,height:630},links=[];
    let pointer={x:0,y:0},eased={x:0,y:0},rotation={x:0,y:0};
    let effectAge=EFFECT_DURATION,effectAnimated=false,pulseCount=0,selectionPulseCount=0,effectKey='',effectSource='';
    let incoming=null;
    const canAnimate=()=>!destroyed&&!stopped&&!reduced.matches&&visible&&pageActive&&!document.hidden;

    function cancelApproach(){
      if(!incoming)return;
      clearTimeout(incoming.timer);
      incoming=null;
    }
    function finishApproach(){
      if(!incoming)return;
      const {onArrive}=incoming;
      cancelApproach();
      onArrive();
    }
    function approach(origin,onArrive){
      cancelApproach();
      if(typeof onArrive!=='function'||destroyed)return;
      if(!canAnimate()||!Number.isFinite(origin?.clientX)||!Number.isFinite(origin?.clientY)){
        onArrive();return;
      }
      const bounds=stage.getBoundingClientRect();
      const from={x:origin.clientX-bounds.left,y:origin.clientY-bounds.top};
      const side=from.x<anchor.x?-1:1;
      const above=from.y<anchor.y-anchor.height*.44&&Math.abs(from.x-anchor.x)<anchor.width*.64;
      const to=above
        ?{x:anchor.x-anchor.width*.14,y:anchor.y-anchor.height*.50-3}
        :{x:anchor.x+side*(anchor.width*.50+3),y:anchor.y+clamp((from.y-anchor.y)*.45,-anchor.height*.24,anchor.height*.22)};
      incoming={from,to,onArrive,start:performance.now(),timer:setTimeout(finishApproach,APPROACH_MS)};
      draw();
    }
    function drawApproach(){
      if(!incoming)return;
      const {from,to,start}=incoming;
      const progress=clamp((performance.now()-start)/APPROACH_MS);
      const t=progress*progress*(3-2*progress);
      const dx=to.x-from.x,dy=to.y-from.y,distance=Math.max(1,Math.hypot(dx,dy));
      const bend=clamp(distance*.23,18,95)*(dx<0?-1:1);
      const cx=(from.x+to.x)/2+dy/distance*bend,cy=(from.y+to.y)/2-dx/distance*bend;
      // Split the curve at the moving bead for a continuous illuminated thread.
      const qx=mix(from.x,cx,t),qy=mix(from.y,cy,t);
      const x=mix(qx,mix(cx,to.x,t),t),y=mix(qy,mix(cy,to.y,t),t);
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.quadraticCurveTo(cx,cy,to.x,to.y);
      ctx.strokeStyle='rgba(231,170,159,.26)';ctx.lineWidth=.8;ctx.stroke();
      const gradient=ctx.createLinearGradient(from.x,from.y,to.x+.01,to.y);
      gradient.addColorStop(0,'#e8be78');gradient.addColorStop(1,'#f6a5ca');
      ctx.strokeStyle=gradient;ctx.lineWidth=1.7;ctx.shadowBlur=6;ctx.shadowColor='#efa8c1';
      ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.quadraticCurveTo(qx,qy,x,y);ctx.stroke();
      ctx.fillStyle='#fff2d4';ctx.shadowBlur=13;ctx.beginPath();ctx.arc(x,y,3,0,TAU);ctx.fill();
      ctx.restore();
    }

    function layout(){
      if(destroyed)return;
      const s=stage.getBoundingClientRect(),p=host.getBoundingClientRect();
      if(!s.width||!s.height)return;
      width=s.width;height=s.height;dpr=Math.min(window.devicePixelRatio||1,width<600?1.5:1.8);
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      anchor={x:p.left-s.left+p.width/2,y:p.top-s.top+p.height/2,width:p.width,height:p.height};
      links=Array.from(nodes.querySelectorAll('.app-node')).map(node=>{
        const icon=node.querySelector('.app-icon'),r=(icon||node).getBoundingClientRect();
        return{node,key:node.dataset.world,x:r.left-s.left+r.width/2,y:r.top-s.top+r.height/2,r:r.width/2};
      });
      draw();
    }
    function selectedKey(){
      return links[targetWorld]?.key||links.find(link=>link.node.getAttribute('aria-pressed')==='true')?.key||stage.dataset.app||'';
    }
    function draw(){
      if(destroyed||!visible||!pageActive||document.hidden)return;
      const key=selectedKey();
      ctx.clearRect(0,0,width,height);
      silk.draw(ctx,{
        w:width,h:height,time,dt:delta,
        mouse:{x:eased.x+rotation.x*.25,y:eased.y+rotation.y*.15},
        phone:anchor,nodes:links.map(link=>({x:link.x,y:link.y,r:link.r,key:link.key,active:link.key===key})),
        selectedKey:key,pulseAge:effectSource==='selection'?EFFECT_DURATION:effectAge,reduced:reduced.matches,motion:canAnimate(),intensity:1
      });
      drawApproach();
      canvas.dataset.world=String(targetWorld??0);canvas.dataset.frame=String(++renderCount);
    }
    function tick(timestamp){
      frame=0;if(!canAnimate())return;
      const elapsed=previous?timestamp-previous:34;
      if(previous&&elapsed<1000/30){frame=requestAnimationFrame(tick);return;}
      delta=Math.min(elapsed/1000,.08);previous=timestamp;time+=delta;
      if(effectAnimated){effectAge=Math.min(EFFECT_DURATION,effectAge+delta);if(effectAge>=EFFECT_DURATION)effectAnimated=false;}
      eased.x+=(pointer.x-eased.x)*.08;eased.y+=(pointer.y-eased.y)*.08;
      draw();frame=requestAnimationFrame(tick);
    }
    function sync(){
      if(destroyed)return;
      cancelAnimationFrame(frame);frame=0;previous=0;
      if(!canAnimate())finishApproach();
      // Pausing or leaving the page cancels the burst; resuming never replays it.
      if(effectAnimated&&!canAnimate()){effectAnimated=false;effectAge=EFFECT_DURATION;}
      else if(!effectAnimated&&canAnimate())effectAge=EFFECT_DURATION;
      draw();if(canAnimate())frame=requestAnimationFrame(tick);
    }
    function onPointer(event){
      const r=stage.getBoundingClientRect();
      pointer={x:clamp((event.clientX-r.left)/width*2-1,-1,1),y:clamp((event.clientY-r.top)/height*2-1,-1,1)};
    }
    const onLeave=()=>{pointer={x:0,y:0};};
    const onPageHide=event=>{if(event.persisted){pageActive=false;sync();}else api.destroy();};
    const onPageShow=event=>{if(event.persisted){pageActive=true;layout();sync();}};
    const observer=new ResizeObserver(layout);observer.observe(stage);observer.observe(host);observer.observe(nodes);
    const intersection=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);sync();});intersection.observe(stage);
    stage.addEventListener('pointermove',onPointer);stage.addEventListener('pointerleave',onLeave);
    document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
    const api={
      setWorld(value){
        if(destroyed||!Number.isInteger(value)||value<0||value>=links.length)return;
        const changed=targetWorld!==null&&targetWorld!==value;
        targetWorld=value;
        if(changed){selectionPulseCount++;api.pulse({key:selectedKey(),source:'selection'});}
        else if(!canAnimate())draw();
      },
      setRotation(value){
        if(destroyed)return;
        rotation={x:Number(value?.x)||0,y:Number(value?.y)||0};
        if(!canAnimate())draw();
      },
      setPaused(value){if(destroyed)return;stopped=Boolean(value);sync();},refresh:layout,approach,cancelApproach,
      pulse(options={}){
        if(destroyed)return;
        pulseCount++;effectKey=options?.key||selectedKey();effectSource=options?.source||'screen';
        effectAnimated=canAnimate();effectAge=effectAnimated?0:.32;
        draw();if(effectAnimated&&!frame){previous=0;frame=requestAnimationFrame(tick);}
      },
      getState(){
        return{renderer:'canvas2d',quality:'liquid-silk',frame:canvas.dataset.frame,layers:3,paused:stopped,reducedMotion:reduced.matches,
          pulseCount,selectionPulseCount,effectAge,effectDuration:EFFECT_DURATION,effectActive:effectAnimated&&effectAge<EFFECT_DURATION,effectAnimated,
          // Feedback uses two lightfronts and a travelling bead, not an expanding particle pool.
          particleBudget:silk.particleBudget,effectParticles:0,activeParticles:0,effectWaves:2,activeWaves:effectSource==='screen'&&effectAge<EFFECT_DURATION?2:0,approaching:incoming!==null,
          effectSource,effectKey,selectedKey:selectedKey(),visible:visible&&pageActive&&!document.hidden,destroyed};
      },
      destroy(){
        if(destroyed)return;
        cancelApproach();destroyed=true;cancelAnimationFrame(frame);frame=0;
        observer.disconnect();intersection.disconnect();
        stage.removeEventListener('pointermove',onPointer);stage.removeEventListener('pointerleave',onLeave);
        document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);
        window.removeEventListener('pagehide',onPageHide);window.removeEventListener('pageshow',onPageShow);mounted.delete(canvas);
      }
    };
    mounted.set(canvas,api);window.addEventListener('pagehide',onPageHide);window.addEventListener('pageshow',onPageShow);
    layout();sync();document.fonts.ready.then(()=>{if(!destroyed)layout();});
    return api;
  }
  window.KROBridgeField={mount};
})();

/* Constellation Bridge: original live metallic silk, orbital light and signal dust.
 * No raster backdrop, remote asset, or shadow cast across the phone display.
 * The separate 2D layer remains available if WebGL cannot initialize or is lost. */
(() => {
  'use strict';
  const mounted=new WeakMap();
  const moduleURL=new URL('vendor/three.module.min.js',document.currentScript.src).href;
  const TAU=Math.PI*2;
  const EFFECT_DURATION=1.18;
  const RIBBON_SCALE=1.22;
  const mix=(a,b,t)=>a+(b-a)*t;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function mount(canvas,stage,host,nodes,reduced){
    if(!canvas||!stage||!host||!nodes)return null;
    if(mounted.has(canvas))return mounted.get(canvas);
    const ctx=canvas.getContext('2d');if(!ctx)return null;
    canvas.style.zIndex='1';canvas.dataset.renderer='canvas2d';
    canvas.dataset.quality='luminous-braided-silk';canvas.dataset.layers='3';
    let width=1,height=1,dpr=1,frame=0,previous=0,time=0,world=1,targetWorld=1;
    let stopped=false,visible=true,destroyed=false,gpu=null,contextLost=false;
    let anchor={x:0,y:0,w:300,h:630},links=[];
    let pointer={x:0,y:0},eased={x:0,y:0},rotation={x:0,y:0},selectionAge=10;
    let effectAge=EFFECT_DURATION,effectAnimated=false,pulseCount=0,effectKey='',effectSource='';
    let seed=47019;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const stars=Array.from({length:125},()=>({x:random(),y:random(),size:.35+random()*1.3,phase:random()*TAU}));
    const dust=Array.from({length:150},()=>({t:random(),u:random()*2-1,layer:Math.floor(random()*3),size:.3+random()*1.05,phase:random()*TAU}));
    // Reuse one small pool. Repeated taps restart the same wave instead of stacking particles.
    const sparks=Array.from({length:32},()=>({angle:random()*TAU,speed:.68+random()*.32,lag:random()*.12,size:.7+random()*1.05,tone:random()}));
    const tint=(t,alpha=1,light=1)=>`rgba(${[244,203,127].map((n,i)=>Math.round(Math.min(255,mix(n,[239,159,195][i],clamp(t,0,1))*light))).join(',')},${alpha})`;

    function sample(t,u,layer=0){
      const a=t*TAU,phase=world*.075,flow=time*.36;
      const amplitude=Math.min(anchor.h*.18,width<=1000?135:180);
      const twist=a*.72+layer*1.23+Math.sin(a*1.15-time*.5)*.45+time*.10+(eased.x+rotation.x*.25)*.35;
      const breadth=Math.min(anchor.h*.095,width*.135)*RIBBON_SCALE*(layer===2?.60:layer===1?.83:1);
      const frequency=layer===1?1.60:layer===2?1.40:1.25;
      const phaseOffset=layer===1?.20:layer===2?.5:-.8;
      const bend=Math.sin(a*2.05-time*.62+layer)*amplitude*.12;
      return{x:width*(-.08+t*1.16)+Math.cos(twist)*u*breadth*.4+height*.015*(eased.x+rotation.x*.25),
        y:anchor.y+28+Math.sin(a*frequency+phaseOffset+flow+phase)*amplitude+bend+Math.sin(twist)*u*breadth+Math.sin(u*Math.PI*2+a*3-flow)*u*3+height*.0125*(eased.y+rotation.y*.15),
        z:Math.sin(a*1.65+layer*.8-flow)*.38+u*Math.cos(twist)*.1};
    }

    function layout(){
      if(destroyed)return;
      const s=stage.getBoundingClientRect(),p=host.getBoundingClientRect();
      width=s.width;height=s.height;dpr=Math.min(window.devicePixelRatio||1,width<600?1.5:1.8);
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      anchor={x:p.left-s.left+p.width/2,y:p.top-s.top+p.height/2,w:p.width,h:p.height};
      links=Array.from(nodes.querySelectorAll('.app-node')).map((node,index)=>{const r=node.querySelector('.app-icon').getBoundingClientRect();return{node,index,x:r.left-s.left+r.width/2,y:r.top-s.top+r.height/2,r:r.width/2};});
      if(gpu)gpu.resize();draw();
    }

    function ambient(){
      const glow=ctx.createRadialGradient(anchor.x,anchor.y,12,anchor.x,anchor.y,Math.max(anchor.h*.78,width*.47));
      glow.addColorStop(0,'rgba(182,104,65,.075)');glow.addColorStop(.45,'rgba(135,60,89,.045)');glow.addColorStop(1,'rgba(8,9,13,0)');
      ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
      for(const star of stars){
        const x=star.x*width,y=star.y*height;
        const shine=.22+Math.sin(time*.45+star.phase)*.13;
        ctx.fillStyle=tint(star.x,shine);ctx.beginPath();ctx.arc(x,y,star.size,0,TAU);ctx.fill();
        if(star.size>1.5){ctx.strokeStyle=tint(star.x,shine*.65);ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.stroke();}
      }
    }

    function filamentFallback(){
      const segments=100,rows=width<600?24:38;
      for(const layer of [2,0,1]){
        const gradient=ctx.createLinearGradient(0,0,width,height*.2);
        gradient.addColorStop(0,tint(.02,.12));gradient.addColorStop(.35,tint(.18,.23));gradient.addColorStop(.7,tint(layer===0?.40:.75,.19));gradient.addColorStop(1,tint(.85,.14));
        ctx.beginPath();
        for(let i=0;i<=segments;i++){const p=sample(i/segments,-1,layer);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
        for(let i=segments;i>=0;i--){const p=sample(i/segments,1,layer);ctx.lineTo(p.x,p.y);}
        ctx.closePath();ctx.fillStyle=gradient;ctx.fill();
        for(let row=0;row<=rows;row++){
          const u=row/rows*2-1;
          ctx.beginPath();for(let i=0;i<=segments;i++){const p=sample(i/segments,u,layer);if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
          const glint=.29+.34*Math.sin(row/rows*Math.PI)**6;
          const thread=ctx.createLinearGradient(0,0,width,0);thread.addColorStop(0,tint(.04,glint));thread.addColorStop(.43,tint(.3,glint*1.5));thread.addColorStop(.7,tint(.75,glint*1.2));thread.addColorStop(1,tint(1,glint));
          ctx.lineWidth=row===0||row===rows?1:.55;ctx.strokeStyle=thread;ctx.stroke();
        }
        for(const u of [-.85,.65]){
          ctx.beginPath();for(let i=0;i<=segments;i++){const p=sample(i/segments,u,layer);if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
          ctx.strokeStyle=tint(layer/2,.25);ctx.lineWidth=1.2;ctx.shadowColor=tint(layer/2,1);ctx.shadowBlur=9;ctx.stroke();ctx.shadowBlur=0;
        }
      }
    }

    function luminousThreads(){
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(const layer of [0,1,2])for(const [strand,index] of [[-.55,0],[.08,1],[.62,2]]){
        ctx.beginPath();for(let i=0;i<=125;i++){const p=sample(i/125,strand,layer);if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
        const tone=layer===1?.85:layer===2?.3:.12;
        const gradient=ctx.createLinearGradient(0,0,width,0);
        gradient.addColorStop(0,tint(tone,.04));gradient.addColorStop(.3,tint(tone,.235));gradient.addColorStop(.5,tint(tone,.14));gradient.addColorStop(.78,tint(Math.min(1,tone+.18),.235));gradient.addColorStop(1,tint(tone+.1,.04));
        ctx.strokeStyle=gradient;ctx.lineWidth=index===1?2.1:1;ctx.shadowColor=tint(tone,.9);ctx.shadowBlur=index===1?18:10;ctx.stroke();
      }
      ctx.restore();
    }

    function orbits(){
      if(width<=1000)return;
      for(const side of [-1,1]){
        ctx.save();ctx.translate(anchor.x+side*width*.29,anchor.y+12);ctx.rotate(side*.22);
        ctx.strokeStyle='rgba(227,185,118,.13)';ctx.lineWidth=.55;ctx.setLineDash([1,4]);
        ctx.beginPath();ctx.ellipse(0,0,width*.19,Math.min(anchor.h*.44,310),0,0,TAU);ctx.stroke();ctx.restore();
      }
    }

    function connections(){
      const compact=width<=1000;
      // Side constellations follow adjacent apps, leaving quiet space around the central device.
      if(!compact){
        const byKey=Object.fromEntries(links.map(link=>[link.node.dataset.world,link]));
        for(const chain of [['kino','echo','feed','beer'],['tanakh','half-life','dune','rap']]){
          for(let i=0;i<chain.length-1;i++){
            const start=byKey[chain[i]],end=byKey[chain[i+1]],sign=start.x<anchor.x?-1:1;
            const bend=Math.min(105,Math.abs(start.y-end.y)*.62),c1={x:start.x+sign*bend,y:start.y+(end.y-start.y)*.28},c2={x:end.x+sign*bend,y:end.y-(end.y-start.y)*.28};
            const active=start.node.getAttribute('aria-pressed')==='true'||end.node.getAttribute('aria-pressed')==='true';
            ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,end.x,end.y);ctx.strokeStyle=active?'rgba(237,170,172,.45)':'rgba(232,183,111,.35)';ctx.lineWidth=.65;ctx.stroke();
            const t=(time*.105+i*.29)%1,v=1-t,x=v**3*start.x+3*v*v*t*c1.x+3*v*t*t*c2.x+t**3*end.x,y=v**3*start.y+3*v*v*t*c1.y+3*v*t*t*c2.y+t**3*end.y;
            ctx.fillStyle=active?'#ffcedf':'#f7d5a0';ctx.shadowColor=active?'#ef9fc0':'#e0bd76';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(x,y,active?2.4:1.7,0,TAU);ctx.fill();ctx.shadowBlur=0;
          }
        }
      }
      links.forEach(link=>{
        const active=link.node.getAttribute('aria-pressed')==='true',compact=width<=1000;
        if(!active)return;
        const sign=link.x<anchor.x?-1:1;
        const x0=anchor.x+sign*anchor.w*.38,y0=compact?anchor.y+anchor.h*.43:anchor.y+Math.sin(link.index*.8)*anchor.h*.12;
        const bow=compact?45:Math.max(90,Math.abs(link.x-x0)*.4);
        const c1={x:x0+sign*bow,y:y0-(compact?0:55)},c2={x:link.x-sign*bow*.6,y:link.y+(compact?-40:45)};
        ctx.beginPath();ctx.moveTo(x0,y0);ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,link.x,link.y);
        ctx.strokeStyle='rgba(255,178,213,.80)';ctx.lineWidth=1.15;
        ctx.shadowColor='#ef9fc0';ctx.shadowBlur=active?5:0;ctx.stroke();ctx.shadowBlur=0;
        const count=active?3:1;
        for(let bead=0;bead<count;bead++){
          const t=(time*(active?.16:.06)+link.index*.13+bead/count)%1,v=1-t;
          const x=v*v*v*x0+3*v*v*t*c1.x+3*v*t*t*c2.x+t*t*t*link.x;
          const y=v*v*v*y0+3*v*v*t*c1.y+3*v*t*t*c2.y+t*t*t*link.y;
          ctx.fillStyle=active?'#ffd5e9':'#efcc94';ctx.shadowColor=active?'#ef9fc0':'#e0bd76';ctx.shadowBlur=active?12:5;ctx.beginPath();ctx.arc(x,y,active?2:1.2,0,TAU);ctx.fill();ctx.shadowBlur=0;
        }
        if(active){
          const radius=link.r+18+Math.sin(time*.8)*3;
          ctx.beginPath();ctx.arc(link.x,link.y,radius,0,TAU);ctx.strokeStyle='rgba(239,159,192,.11)';ctx.lineWidth=.7;ctx.stroke();
          if(selectionAge<1.5){ctx.beginPath();ctx.arc(link.x,link.y,link.r+20+selectionAge*52,0,TAU);ctx.strokeStyle=tint(.8,.28*(1-selectionAge/1.5));ctx.stroke();}
        }
      });
    }

    function signalDust(){
      for(const mote of dust){
        const t=(mote.t+time*.009)%1,p=sample(t,mote.u,mote.layer);
        ctx.fillStyle=tint(t,.22+Math.sin(time*.6+mote.phase)*.12,1.1);ctx.beginPath();ctx.arc(p.x,p.y,mote.size,0,TAU);ctx.fill();
      }
    }

    function screenPulse(){
      if(effectAge>=EFFECT_DURATION)return;
      const progress=effectAge/EFFECT_DURATION;
      const travel=1-Math.pow(1-progress,2.05),envelope=Math.sin(progress*Math.PI)*Math.pow(1-progress,.35);
      const radius=mix(anchor.w*.40,Math.max(width*.49,anchor.h*.79),travel);
      const vertical=width<=1000?.64:.53;
      ctx.save();ctx.globalCompositeOperation='lighter';
      // The headline is transparent; the signal flows behind it without a cutout.
      for(let echo=0;echo<3;echo++){
        const r=radius-echo*15;if(r<=0)continue;
        const gradient=ctx.createLinearGradient(anchor.x-r,anchor.y,anchor.x+r,anchor.y);
        gradient.addColorStop(0,tint(.08,envelope*(echo? .17:.51)));
        gradient.addColorStop(.45,tint(.35,envelope*(echo? .10:.30)));
        gradient.addColorStop(1,tint(.95,envelope*(echo? .19:.56)));
        ctx.beginPath();ctx.ellipse(anchor.x,anchor.y+10,r,r*vertical,-.12,0,TAU);
        ctx.strokeStyle=gradient;ctx.lineWidth=echo? .7:1.35;ctx.shadowColor=tint(.6,envelope);ctx.shadowBlur=echo?5:15;ctx.stroke();
      }
      ctx.shadowBlur=0;
      for(const spark of sparks){
        const p=clamp((progress-spark.lag)/(1-spark.lag),0,1);if(!p)continue;
        const distance=mix(anchor.w*.44,Math.max(width*.52,anchor.h*.85)*spark.speed,1-Math.pow(1-p,1.8));
        const angle=spark.angle+Math.sin(p*Math.PI)*.10,x=anchor.x+Math.cos(angle)*distance,y=anchor.y+10+Math.sin(angle)*distance*vertical;
        const alpha=Math.sin(p*Math.PI)*Math.pow(1-p,.45)*.85;
        ctx.strokeStyle=tint(spark.tone,alpha*.52);ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x-Math.cos(angle)*(5+11*p),y-Math.sin(angle)*(5+11*p)*vertical);ctx.lineTo(x,y);ctx.stroke();
        ctx.fillStyle=tint(spark.tone,alpha);ctx.shadowColor=tint(spark.tone,alpha);ctx.shadowBlur=8;ctx.beginPath();ctx.arc(x,y,spark.size*(1-p*.38),0,TAU);ctx.fill();ctx.shadowBlur=0;
      }
      // A directed signal joins the selected app, rather than firing an unrelated decoration.
      const selected=links.find(link=>link.node.dataset.world===effectKey)||links.find(link=>link.node.getAttribute('aria-pressed')==='true');
      if(selected){
        const sign=selected.x<anchor.x?-1:1,x0=anchor.x+sign*anchor.w*.39,y0=anchor.y+12;
        const c1={x:x0+sign*Math.max(65,Math.abs(selected.x-x0)*.42),y:y0-45};
        const c2={x:selected.x-sign*55,y:selected.y+45};
        for(let bead=0;bead<5;bead++){
          const t=clamp(progress*1.2-bead*.045,0,1),v=1-t;
          const x=v*v*v*x0+3*v*v*t*c1.x+3*v*t*t*c2.x+t*t*t*selected.x;
          const y=v*v*v*y0+3*v*v*t*c1.y+3*v*t*t*c2.y+t*t*t*selected.y;
          ctx.fillStyle=tint(.75,envelope*(1-bead*.14));ctx.shadowColor='#eea4c7';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(x,y,bead?1.8:3.1,0,TAU);ctx.fill();
        }
        ctx.shadowBlur=0;
        if(progress>.62){const arrival=(progress-.62)/.38;ctx.strokeStyle=tint(.82,Math.sin(arrival*Math.PI)*.55);ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(selected.x,selected.y,selected.r+9+arrival*24,0,TAU);ctx.stroke();}
      }
      ctx.restore();
    }

    function draw(){
      if(destroyed)return;
      ctx.clearRect(0,0,width,height);ambient();
      if(gpu){try{gpu.render();}catch(_){dropGPU('render_failed');filamentFallback();}}
      else filamentFallback();
      luminousThreads();orbits();connections();signalDust();screenPulse();
      canvas.dataset.world=String(targetWorld);canvas.dataset.frame=String(Math.round(time*30));
    }
    const canAnimate=()=>!destroyed&&!stopped&&!reduced.matches&&visible&&!document.hidden;
    function tick(timestamp){
      frame=0;if(!canAnimate())return;
      const elapsed=previous?timestamp-previous:34;
      if(previous&&elapsed<1000/30){frame=requestAnimationFrame(tick);return;}
      const delta=Math.min(elapsed/1000,.08);previous=timestamp;time+=delta;selectionAge+=delta;
      if(effectAnimated){effectAge=Math.min(EFFECT_DURATION,effectAge+delta);if(effectAge>=EFFECT_DURATION)effectAnimated=false;}
      world+=(targetWorld-world)*Math.min(1,delta*2.4);eased.x+=(pointer.x-eased.x)*.08;eased.y+=(pointer.y-eased.y)*.08;
      draw();frame=requestAnimationFrame(tick);
    }
    function sync(){
      cancelAnimationFrame(frame);frame=0;previous=0;
      // A hidden/paused field never schedules an effect-only loop or replays an old burst later.
      if(effectAnimated&&!canAnimate()){effectAnimated=false;effectAge=EFFECT_DURATION;}
      else if(!effectAnimated&&canAnimate())effectAge=EFFECT_DURATION;
      draw();if(canAnimate())frame=requestAnimationFrame(tick);
    }
    function onPointer(event){const r=stage.getBoundingClientRect();pointer={x:(event.clientX-r.left)/width-.5,y:(event.clientY-r.top)/height-.5};}
    const onLeave=()=>{pointer={x:0,y:0};};
    const onPageHide=event=>{if(event.persisted){visible=false;sync();}else api.destroy();};
    const onPageShow=event=>{if(event.persisted){visible=true;layout();sync();}};
    const observer=new ResizeObserver(layout);observer.observe(stage);observer.observe(host);observer.observe(nodes);
    const intersection=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);sync();});intersection.observe(stage);
    stage.addEventListener('pointermove',onPointer);stage.addEventListener('pointerleave',onLeave);
    document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
    function dropGPU(reason){
      if(gpu){const old=gpu;gpu=null;old.destroy();}
      canvas.dataset.renderer='canvas2d';canvas.dataset.rendererReason=reason;
    }
    const api={
      setWorld(value){targetWorld=value;selectionAge=0;if(!canAnimate()){world=value;draw();}},
      setRotation(value){rotation=value;if(!canAnimate())draw();},
      setPaused(value){stopped=Boolean(value);sync();},refresh:layout,
      pulse(options={}){
        if(destroyed)return;
        pulseCount++;effectKey=options?.key||'';effectSource=options?.source||'screen';effectAnimated=canAnimate();effectAge=effectAnimated?0:.32;
        draw();if(effectAnimated&&!frame){previous=0;frame=requestAnimationFrame(tick);}
      },
      getState(){return{renderer:canvas.dataset.renderer,frame:canvas.dataset.frame,layers:3,paused:stopped,reducedMotion:reduced.matches,pulseCount,effectAge,effectActive:effectAnimated&&effectAge<EFFECT_DURATION,effectAnimated,effectParticles:sparks.length,activeParticles:effectAge<EFFECT_DURATION?sparks.length:0,effectSource};},
      destroy(){if(destroyed)return;destroyed=true;cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();stage.removeEventListener('pointermove',onPointer);stage.removeEventListener('pointerleave',onLeave);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);window.removeEventListener('pagehide',onPageHide);window.removeEventListener('pageshow',onPageShow);dropGPU('destroyed');mounted.delete(canvas);}
    };
    mounted.set(canvas,api);window.addEventListener('pagehide',onPageHide);window.addEventListener('pageshow',onPageShow);
    layout();sync();document.fonts.ready.then(()=>{if(!destroyed)layout();});
    import(moduleURL).then(THREE=>{if(!destroyed)initializeGPU(THREE);}).catch(()=>{canvas.dataset.rendererReason='module_unavailable';});
    return api;

    function initializeGPU(THREE){
      let renderer,meshCanvas,geometries=[],materials=[],lostListener;
      function clean(){
        if(meshCanvas&&lostListener)meshCanvas.removeEventListener('webglcontextlost',lostListener);
        geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer?.dispose();meshCanvas?.remove();
      }
      try{
        meshCanvas=document.createElement('canvas');meshCanvas.className='bridge-field-gpu';meshCanvas.setAttribute('aria-hidden','true');
        Object.assign(meshCanvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'0',pointerEvents:'none'});
        const context=meshCanvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});
        if(!context){canvas.dataset.rendererReason='webgl_unavailable';return;}
        renderer=new THREE.WebGLRenderer({canvas:meshCanvas,context,alpha:true,antialias:true,powerPreference:'low-power'});
        renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
        let shaderFailed=false;renderer.debug.onShaderError=()=>{shaderFailed=true;};
        const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,30);camera.position.z=8;
        const uniforms={uTime:{value:0},uWorld:{value:1},uPulse:{value:10},uTapAge:{value:EFFECT_DURATION},uTapAnchor:{value:new THREE.Vector2()},uSourceSide:{value:0},uAspect:{value:width/height},uAnchorY:{value:1-anchor.y/height*2},uBaseline:{value:56/height},uRuffle:{value:6/height},uBreadth:{value:Math.min(anchor.h*.095,width*.135)*RIBBON_SCALE/height*2},uAmplitude:{value:Math.min(anchor.h*.18,180)/height*2},uPointer:{value:new THREE.Vector2()},uGold:{value:new THREE.Color('#ffd083')},uRose:{value:new THREE.Color('#f3a1c5')}};
        const vertexShader=`
          uniform float uTime, uWorld, uAspect, uAnchorY, uBaseline, uRuffle, uBreadth, uAmplitude, uLayer;
          uniform vec2 uPointer;
          varying vec2 vUV;
          varying vec3 vPosition;
          void main(){
            float t=position.x, strand=position.y;
            float a=t*6.2831853, flow=uTime*.36;
            float twist=a*.72+uLayer*1.23+sin(a*1.15-uTime*.5)*.45+uTime*.10+uPointer.x*.35;
            float breadth=uBreadth*(uLayer>1.5?.60:uLayer>.5?.83:1.0);
            float frequency=uLayer>.5&&uLayer<1.5?1.60:uLayer>1.5?1.40:1.25;
            float phaseOffset=uLayer>.5&&uLayer<1.5?.20:uLayer>1.5?.5:-.8;
            float x=mix(-uAspect*1.16,uAspect*1.16,t)+cos(twist)*strand*breadth*.4;
            float y=uAnchorY-uBaseline-sin(a*frequency+phaseOffset+flow+uWorld*.075)*uAmplitude;
            y-=sin(a*2.05-uTime*.62+uLayer)*uAmplitude*.12+sin(twist)*strand*breadth;
            y-=sin(strand*6.2831853+a*3.0-flow)*strand*uRuffle;
            float z=sin(a*1.65+uLayer*.8-flow)*.38+strand*cos(twist)*.10;
            z+=sin(strand*3.14159265)*breadth*.12+sin(a*2.0+strand*3.0-flow)*.04;
            x+=uPointer.x*.03;y+=uPointer.y*.025;
            vUV=vec2(t,(strand+1.0)*.5);vPosition=vec3(x,y,z);
            gl_Position=projectionMatrix*modelViewMatrix*vec4(vPosition,1.0);
          }`;
        const fragmentShader=`
          uniform float uTime, uAspect, uLayer, uPulse, uSourceSide, uTapAge;
          uniform vec2 uTapAnchor;
          uniform vec3 uGold,uRose;
          varying vec2 vUV;
          varying vec3 vPosition;
          void main(){
            vec3 n=normalize(cross(dFdx(vPosition),dFdy(vPosition)));
            float light=abs(dot(n,normalize(vec3(-.3,.65,1.0))));
            float sheen=pow(light,13.0);
            float edge=pow(1.0-abs(n.z),2.0);
            float tone=uLayer>.5&&uLayer<1.5?.25+.65*smoothstep(.18,.83,vUV.x):uLayer>1.5?.1+.20*sin(vUV.x*3.14):smoothstep(.50,1.15,vUV.x);
            vec3 metal=mix(uGold,uRose,tone);
            // Analytic pixel filtering keeps fine fibres from turning into moire contours.
            float fibre=vUV.y*58.0+sin(vUV.x*15.0-uTime*.8)*.025;
            float fibreAA=fwidth(fibre);
            float threads=1.0-smoothstep(.055,.055+fibreAA,abs(fract(fibre)-.5));
            threads=mix(threads,.12,smoothstep(.45,.95,fibreAA));
            float warp=vUV.x*180.0, warpAA=fwidth(warp);
            float crossweave=1.0-smoothstep(.025,.025+warpAA,abs(fract(warp)-.5));
            crossweave=mix(crossweave,.06,smoothstep(.5,1.0,warpAA));
            float core=pow(max(0.0,sin(vUV.y*3.14159265)),2.5);
            float traveling=pow(.5+.5*cos(vUV.x*26.0-uTime*1.8+vUV.y*2.7+uLayer),12.0);
            vec3 pearl=mix(vec3(1.0,.76,.39),vec3(1.0,.43,.68),tone);
            float pulseCentre=mix(clamp(uPulse*.44,0.0,1.0),1.0-clamp(uPulse*.44,0.0,1.0),uSourceSide);
            float pulse=exp(-pow((vUV.x-pulseCentre)*7.0,2.0))*exp(-uPulse*1.1);
            vec3 color=metal*(.21+light*.39+edge*.26)+pearl*core*(.55+sheen*2.05);
            color+=pearl*threads*(.115+sheen*.29+traveling*.34);
            color+=pearl*crossweave*sheen*.025;
            color+=pearl*core*pulse*.35;
            float rim=pow(abs(vUV.y*2.0-1.0),26.0);
            color+=pearl*rim*.45;
            vec2 screen=vec2((vPosition.x/uAspect+1.0)*.5,(1.0-vPosition.y)*.5);
            // Screen taps send a single elliptical lightfront from the physical phone into silk.
            float tapProgress=clamp(uTapAge/1.18,0.0,1.0);
            float tapEnvelope=sin(tapProgress*3.14159265)*pow(1.0-tapProgress,.35);
            vec2 tapOffset=screen-uTapAnchor;tapOffset.y/=uAspect*.55;
            float tapRadius=mix(.07,.53,1.0-pow(1.0-tapProgress,2.05));
            float tapWave=exp(-pow((length(tapOffset)-tapRadius)*31.0,2.0))*tapEnvelope;
            color+=pearl*tapWave*(.36+core*.45+threads*.30);
            float taper=smoothstep(0.0,.024,vUV.y)*smoothstep(0.0,.024,1.0-vUV.y);
            float alpha=(.25+threads*.11+core*.25+sheen*.26+rim*.10+pulse*.08+tapWave*.10)*taper*(uLayer>1.5?.60:1.0);
            gl_FragColor=vec4(color,alpha);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`;
        for(const layer of [2,0,1]){
          const columns=240,rows=36,positions=[],indices=[];
          for(let x=0;x<=columns;x++)for(let y=0;y<=rows;y++)positions.push(x/columns,y/rows*2-1,0);
          for(let x=0;x<columns;x++)for(let y=0;y<rows;y++){const a=x*(rows+1)+y,b=a+rows+1;indices.push(a,b,a+1,b,b+1,a+1);}
          const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometries.push(geometry);
          const material=new THREE.ShaderMaterial({uniforms:{...uniforms,uLayer:{value:layer}},vertexShader,fragmentShader,side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});materials.push(material);
          const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=layer===2?0:layer+1;scene.add(mesh);
        }
        function resize(){renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);camera.left=-width/height;camera.right=width/height;camera.updateProjectionMatrix();uniforms.uAspect.value=width/height;uniforms.uAnchorY.value=1-anchor.y/height*2;uniforms.uBaseline.value=56/height;uniforms.uRuffle.value=6/height;uniforms.uBreadth.value=Math.min(anchor.h*.095,width*.135)*RIBBON_SCALE/height*2;uniforms.uAmplitude.value=Math.min(anchor.h*.18,width<=1000?135:180)/height*2;uniforms.uTapAnchor.value.set(anchor.x/width,anchor.y/height);}
        function render(){if(contextLost)throw new Error('Lost field context');uniforms.uTime.value=time;uniforms.uWorld.value=world;uniforms.uPulse.value=selectionAge;uniforms.uTapAge.value=effectAge;uniforms.uSourceSide.value=[0,1,6,7].includes(targetWorld)?0:1;uniforms.uPointer.value.set(eased.x+rotation.x*.25,-eased.y-rotation.y*.15);renderer.render(scene,camera);if(shaderFailed)throw new Error('Field shader could not compile');}
        lostListener=event=>{event.preventDefault();contextLost=true;dropGPU('context_lost');sync();};meshCanvas.addEventListener('webglcontextlost',lostListener);
        resize();render();
        stage.insertBefore(meshCanvas,canvas);gpu={resize,render,destroy:clean};canvas.dataset.renderer='webgl';delete canvas.dataset.rendererReason;sync();
      }catch(_){clean();canvas.dataset.renderer='canvas2d';canvas.dataset.rendererReason='initialization_failed';draw();}
    }
  }
  window.KROBridgeField={mount};
})();

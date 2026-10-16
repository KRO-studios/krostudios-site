/* Bridge-only product presentation: leaning aluminium handset, direct drag and keyboard tilt. */
(() => {
  'use strict';
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const mounted=new WeakMap();
  const defaultPose=Object.freeze({yaw:-24,pitch:-5,roll:-5});
  const rendererURL=new URL('bridge-phone3d.js?v=bridge-contained-pulse-6',document.currentScript?.src||location.href).href;
  const tapDuration=350,tapDistance=7;
  const fallbackScreen={width:73.4,height:159.48,radius:11.4,z:4.57};
  const fallbackModelPose=new DOMMatrix().rotateAxisAngle(0,1,0,defaultPose.yaw).rotateAxisAngle(1,0,0,defaultPose.pitch).rotateAxisAngle(0,0,1,defaultPose.roll);
  const fallbackPose=fallbackModelPose.inverse();
  function insideRoundedRect(x,y,width,height,radius) {
    const dx=Math.abs(x),dy=Math.abs(y);
    if(dx>width/2||dy>height/2)return false;
    return Math.hypot(Math.max(0,dx-(width/2-radius)),Math.max(0,dy-(height/2-radius)))<=radius;
  }
  function mount(device,options={}) {
    if(!device)return null;
    if(mounted.has(device))return mounted.get(device);
    const rotor=device.querySelector('.signal-device-rotator');
    const floater=device.querySelector('.signal-device-float');
    const stage=device.closest('.signal-stage');
    if(!rotor||!floater||!stage)return null;
    const screen=rotor.querySelector('.signal-device-screen');
    const status=device.querySelector('[data-renderer-status]'),hint=device.querySelector('#signal-rotation-hint'),retry=device.querySelector('.phone-retry');
    let renderer=null,loading=false,loadTimer=0,rendererAttempt=0;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let yaw=defaultPose.yaw,pitch=defaultPose.pitch,targetYaw=defaultPose.yaw,targetPitch=defaultPose.pitch,velocityYaw=0,velocityPitch=0;
    let dragging=false,pointerId=null,startX=0,startY=0,startYaw=0,startPitch=0,pressStarted=0,tapEligible=false;
    let lastX=0,lastY=0,lastMove=0,clock=0,previous=0,frame=0;
    let paused=false,active=true,visible=true,destroyed=false;
    function align() {
      const anchor=typeof options.getAnchor==='function'?options.getAnchor():null;
      if(anchor&&Number.isFinite(anchor.x)&&Number.isFinite(anchor.y)){
        device.style.left=anchor.x+'px';device.style.top=anchor.y+'px';
      }
      if(renderer)renderer.resize();
      if(typeof options.onLayoutChange==='function')options.onLayoutChange();
    }
    function apply(idle=true) {
      const living=idle&&!paused&&!reduced.matches&&!dragging;
      const float=living?Math.sin(clock*.67)*8+Math.sin(clock*.31)*2.5:0;
      const breathingYaw=living?Math.sin(clock*.39)*3.8:0;
      const breathingPitch=living?Math.sin(clock*.53+.8)*1.8:0;
      const roll=defaultPose.roll+(living?Math.sin(clock*.36)*.9:0);
      floater.style.transform='translateY('+float.toFixed(2)+'px)';
      if(rotor.dataset.renderer==='webgl')rotor.style.transform='none';
      if(renderer){renderer.setPose({yaw:yaw+breathingYaw,pitch:pitch+breathingPitch,roll});}
      // Static fallbacks are rendered from this same default pose; apply only
      // interactive deltas, never a second copy of the handset's resting lean.
      rotor.style.transform=rotor.dataset.renderer==='webgl'?'none':'perspective(1500px) rotateX('+clamp(pitch-defaultPose.pitch+breathingPitch,-8,8).toFixed(2)+'deg) rotateY('+clamp(yaw-defaultPose.yaw+breathingYaw,-12,12).toFixed(2)+'deg) rotateZ('+(roll-defaultPose.roll).toFixed(2)+'deg)';
      rotor.style.setProperty('--phone-light-x',(50+(yaw+breathingYaw)*.7).toFixed(1)+'%');
      rotor.dataset.yaw=yaw.toFixed(2);rotor.dataset.pitch=pitch.toFixed(2);
      device.dataset.dragging=String(dragging);
      if(typeof options.onRotate==='function')options.onRotate({x:yaw/38,y:pitch/20});
    }
    function canAnimate(){return active&&visible&&!destroyed&&!document.hidden&&!paused&&!reduced.matches;}
    function tick(timestamp) {
      frame=0;if(!canAnimate()){previous=0;return;}
      if(previous&&timestamp-previous<1000/30){frame=requestAnimationFrame(tick);return;}
      const delta=previous?Math.min((timestamp-previous)/1000,.04):.016;
      previous=timestamp;clock+=delta;
      if(!dragging){
        if(Math.abs(velocityYaw)>.02||Math.abs(velocityPitch)>.02){
          targetYaw=clamp(targetYaw+velocityYaw*delta,-38,38);targetPitch=clamp(targetPitch+velocityPitch*delta,-20,20);
          const damp=Math.exp(-7*delta);velocityYaw*=damp;velocityPitch*=damp;
        }
      }
      const easing=1-Math.exp(-(dragging?22:10)*delta);
      yaw+=(targetYaw-yaw)*easing;pitch+=(targetPitch-pitch)*easing;
      apply();frame=requestAnimationFrame(tick);
    }
    function sync() {
      align();
      if(canAnimate()){if(!frame)frame=requestAnimationFrame(tick);}
      else{cancelAnimationFrame(frame);frame=0;previous=0;velocityYaw=0;velocityPitch=0;yaw=targetYaw;pitch=targetPitch;apply(false);}
    }
    function fallbackDisplayMapping() {
      const image=rotor.querySelector('.phone-render-fallback');
      if(!image?.complete||!image.naturalWidth||!image.naturalHeight)return null;
      const width=rotor.clientWidth,height=rotor.clientHeight,rect=rotor.getBoundingClientRect();
      if(!width||!height||!rect.width||!rect.height)return null;
      // Undo the fallback's CSS perspective tilt. getBoundingClientRect alone
      // is only an axis-aligned box and would turn empty corners into buttons.
      const style=getComputedStyle(rotor),matrix=new DOMMatrix(style.transform==='none'?undefined:style.transform);
      const origin=style.transformOrigin.split(' ').map(parseFloat),ox=origin[0]||0,oy=origin[1]||0;
      const project=(x,y)=>{
        const point=new DOMPoint(x-ox,y-oy,0,1).matrixTransform(matrix);
        return{x:point.x/point.w+ox,y:point.y/point.w+oy};
      };
      const corners=[[0,0],[width,0],[width,height],[0,height]].map(([x,y])=>project(x,y));
      const offsetX=rect.left-Math.min(...corners.map(point=>point.x)),offsetY=rect.top-Math.min(...corners.map(point=>point.y));
      const imageStyle=getComputedStyle(image),imageWidth=parseFloat(imageStyle.width),imageHeight=parseFloat(imageStyle.height);
      const scale=Math.min(imageWidth/image.naturalWidth,imageHeight/image.naturalHeight);
      const drawnWidth=image.naturalWidth*scale,drawnHeight=image.naturalHeight*scale;
      if(!drawnWidth||!drawnHeight)return null;
      const left=parseFloat(imageStyle.left)+(imageWidth-drawnWidth)/2,top=parseFloat(imageStyle.top)+(imageHeight-drawnHeight)/2;
      return {
        toImage(clientX,clientY){
          const px=clientX-offsetX-ox,py=clientY-offsetY-oy;
          const a=matrix.m11-px*matrix.m14,b=matrix.m21-px*matrix.m24,c=px*matrix.m44-matrix.m41;
          const d=matrix.m12-py*matrix.m14,e=matrix.m22-py*matrix.m24,f=py*matrix.m44-matrix.m42;
          const determinant=a*e-b*d;if(Math.abs(determinant)<.000001)return null;
          return{u:((c*e-b*f)/determinant+ox-left)/drawnWidth,v:((a*f-c*d)/determinant+oy-top)/drawnHeight};
        },
        toClient(u,v){const point=project(left+u*drawnWidth,top+v*drawnHeight);return{x:point.x+offsetX,y:point.y+offsetY};}
      };
    }
    function fallbackContainsScreenPoint(clientX,clientY) {
      const point=fallbackDisplayMapping()?.toImage(clientX,clientY);if(!point)return false;
      const {u,v}=point;
      if(u<0||u>1||v<0||v>1)return false;
      // The baked image was captured from exactly this same 78 × 163.4 mm
      // model and camera. Cast the image ray into its original resting pose.
      const origin3D=new DOMPoint(0,0,500,1).matrixTransform(fallbackPose);
      const ray=new DOMPoint((u*2-1)*78*1.32/(2*(500-fallbackScreen.z)),(1-v*2)*163.4*1.16/(2*(500-fallbackScreen.z)),-1,0).matrixTransform(fallbackPose);
      const distance=(fallbackScreen.z-origin3D.z)/ray.z;if(distance<=0)return false;
      const x=origin3D.x+ray.x*distance,y=origin3D.y+ray.y*distance;
      return insideRoundedRect(x,y,fallbackScreen.width,fallbackScreen.height,fallbackScreen.radius)&&!insideRoundedRect(x,y-73.65,22.3,6.25,3.12);
    }
    function containsScreenPoint(clientX,clientY) {
      if(destroyed||!Number.isFinite(clientX)||!Number.isFinite(clientY))return false;
      if(rotor.dataset.renderer==='webgl')return Boolean(renderer?.containsScreenPoint?.(clientX,clientY));
      return fallbackContainsScreenPoint(clientX,clientY);
    }
    function getScreenPolygon() {
      if(destroyed)return null;
      if(rotor.dataset.renderer==='webgl')return renderer?.getScreenPolygon?.()||null;
      const mapping=fallbackDisplayMapping();if(!mapping)return null;
      return [[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>{
        const point=new DOMPoint(x*fallbackScreen.width/2,y*fallbackScreen.height/2,fallbackScreen.z,1).matrixTransform(fallbackModelPose);
        const distance=500-point.z;
        const u=(point.x/distance/(78*1.32/(2*(500-fallbackScreen.z)))+1)/2;
        const v=(1-point.y/distance/(163.4*1.16/(2*(500-fallbackScreen.z))))/2;
        return mapping.toClient(u,v);
      });
    }
    function begin(event) {
      if(dragging){if(event.pointerId!==pointerId)tapEligible=false;return;}
      if(!active||destroyed||!event.isPrimary||event.button!==0)return;
      tapEligible=typeof options.onScreenTap==='function'&&containsScreenPoint(event.clientX,event.clientY);pressStarted=performance.now();
      dragging=true;pointerId=event.pointerId;
      startX=lastX=event.clientX;startY=lastY=event.clientY;startYaw=targetYaw;startPitch=targetPitch;lastMove=performance.now();
      velocityYaw=velocityPitch=0;rotor.setPointerCapture(pointerId);sync();
    }
    function move(event) {
      if(!dragging||event.pointerId!==pointerId)return;
      if(tapEligible){
        const points=typeof event.getCoalescedEvents==='function'?event.getCoalescedEvents():[];
        if([...points,event].some(point=>Math.hypot(point.clientX-startX,point.clientY-startY)>tapDistance))tapEligible=false;
      }
      const elapsed=Math.max(8,performance.now()-lastMove)/1000;
      const sensitivity=event.pointerType==='touch'?.24:.22;
      targetYaw=clamp(startYaw+(event.clientX-startX)*sensitivity,-38,38);
      targetPitch=clamp(startPitch-(event.clientY-startY)*sensitivity*.7,-20,20);
      velocityYaw=clamp((event.clientX-lastX)*sensitivity/elapsed,-110,110);
      velocityPitch=clamp(-(event.clientY-lastY)*sensitivity*.7/elapsed,-75,75);
      lastX=event.clientX;lastY=event.clientY;lastMove=performance.now();
      if(paused||reduced.matches){yaw=targetYaw;pitch=targetPitch;apply(false);}
    }
    function finish(event) {
      if(!dragging||event&&event.pointerId!==pointerId)return;
      const tapped=tapEligible&&event?.type==='pointerup'&&rotor.hasPointerCapture(pointerId)&&performance.now()-pressStarted<=tapDuration&&Math.hypot(event.clientX-startX,event.clientY-startY)<=tapDistance&&containsScreenPoint(event.clientX,event.clientY);
      tapEligible=false;
      const captured=pointerId;dragging=false;pointerId=null;
      if(tapped){targetYaw=startYaw;targetPitch=startPitch;velocityYaw=velocityPitch=0;}
      else if(!event||event.type==='pointercancel'||event.type==='lostpointercapture'||performance.now()-lastMove>100)velocityYaw=velocityPitch=0;
      if(captured!==null&&rotor.hasPointerCapture(captured))rotor.releasePointerCapture(captured);
      sync();
      if(tapped&&!destroyed&&active)options.onScreenTap({source:'pointer',pointerType:event.pointerType});
    }
    function reset() {finish();targetYaw=0;targetPitch=0;velocityYaw=velocityPitch=0;sync();}
    function keys(event) {
      const steps={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,4],ArrowDown:[0,-4]};
      if(steps[event.key]){event.preventDefault();targetYaw=clamp(targetYaw+steps[event.key][0],-38,38);targetPitch=clamp(targetPitch+steps[event.key][1],-20,20);velocityYaw=velocityPitch=0;sync();}
      else if(['Enter',' '].includes(event.key)&&typeof options.onScreenTap==='function'){
        event.preventDefault();if(!event.repeat&&active&&!destroyed)options.onScreenTap({source:'keyboard'});
      }
      else if(['Home','Escape','0','Enter',' '].includes(event.key)){event.preventDefault();reset();}
    }
    rotor.addEventListener('pointerdown',begin);rotor.addEventListener('pointermove',move);
    rotor.addEventListener('pointerup',finish);rotor.addEventListener('pointercancel',finish);rotor.addEventListener('lostpointercapture',finish);rotor.addEventListener('keydown',keys);
    const resetButton=device.querySelector('.phone-reset');if(resetButton)resetButton.addEventListener('click',reset);
    function rendererState(value,reason='') {
      device.dataset.rendererState=value;device.dataset.rendererReason=reason;
      if(status)status.textContent=value==='webgl'?'Live 3D':value==='loading'?'Preparing 3D preview…':'Preview image · 3D unavailable';
      if(hint)hint.textContent=(value==='fallback'?'Drag to tilt image':'Drag to rotate')+' · arrow keys · P pauses motion · Home resets';
      if(retry)retry.hidden=value!=='fallback';
    }
    const rendererChanged=()=>{
      const ready=rotor.dataset.renderer==='webgl';
      if(ready)clearTimeout(loadTimer);
      rendererState(ready?'webgl':'fallback',ready?'':'context_lost');sync();
    };
    rotor.addEventListener('krophone3dready',rendererChanged);rotor.addEventListener('krophone3dfallback',rendererChanged);
    const resized=()=>{align();};
    const observer=new ResizeObserver(resized);observer.observe(stage);observer.observe(rotor);
    const intersection=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);sync();},{threshold:.01});intersection.observe(stage);
    const visibility=()=>{if(document.hidden)finish();sync();};document.addEventListener('visibilitychange',visibility);
    const preference=()=>sync();reduced.addEventListener('change',preference);
    const api={
      setPaused(value){paused=Boolean(value);sync();},
      setActive(value){active=Boolean(value);if(!active)finish();sync();},
      align,
      reset,
      containsScreenPoint,
      getScreenPolygon,
      setScreen(src,key){if(renderer)renderer.setScreen(src,key);},
      getRotation(){return{yaw,pitch,dragging};},
      destroy(){destroyed=true;finish();cancelAnimationFrame(frame);clearTimeout(loadTimer);observer.disconnect();intersection.disconnect();rotor.removeEventListener('pointerdown',begin);rotor.removeEventListener('pointermove',move);rotor.removeEventListener('pointerup',finish);rotor.removeEventListener('pointercancel',finish);rotor.removeEventListener('lostpointercapture',finish);rotor.removeEventListener('keydown',keys);rotor.removeEventListener('krophone3dready',rendererChanged);rotor.removeEventListener('krophone3dfallback',rendererChanged);if(resetButton)resetButton.removeEventListener('click',reset);if(retry)retry.removeEventListener('click',loadRenderer);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',preference);if(renderer)renderer.destroy();delete rotor.kroPhone3D;mounted.delete(device);}
    };
    mounted.set(device,api);sync();
    // Progressive enhancement keeps the preview usable when WebGL or modules
    // are unavailable; only the selected Signal Field needs the 3D dependency.
    async function loadRenderer() {
      if(destroyed||loading)return;
      loading=true;clearTimeout(loadTimer);rendererState('loading');
      if(renderer){renderer.destroy();renderer=null;delete rotor.kroPhone3D;}
      try {
        const attemptURL=new URL(rendererURL);
        if(rendererAttempt>0)attemptURL.searchParams.set('retry',String(rendererAttempt));
        rendererAttempt++;
        await import(attemptURL.href);
        if(destroyed)return;
        if(!window.KROPhone3D){rendererState('fallback','module_unavailable');return;}
        renderer=window.KROPhone3D.mount(rotor);
        if(!renderer){rendererState('fallback','webgl_unavailable');return;}
        rotor.kroPhone3D=renderer;
        renderer.setScreen(screen.src,device.closest('[data-app]')?.dataset.app||'kino');sync();
        loadTimer=setTimeout(()=>{if(!destroyed&&rotor.dataset.renderer!=='webgl')rendererState('fallback','render_not_ready');},10000);
      } catch (_) {if(!destroyed)rendererState('fallback','module_load_failed');}
      finally {loading=false;}
    }
    if(retry)retry.addEventListener('click',loadRenderer);
    loadRenderer();
    return api;
  }
  window.KROPhone={mount,defaultPose};
})();

/* A readable 3D product preview: natural idle motion, direct drag and keyboard tilt. */
(() => {
  'use strict';
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const mounted=new WeakMap();
  function mount(device,options={}) {
    if(!device)return null;
    if(mounted.has(device))return mounted.get(device);
    const rotor=device.querySelector('.signal-device-rotator');
    const floater=device.querySelector('.signal-device-float');
    const stage=device.closest('.signal-stage');
    if(!rotor||!floater||!stage)return null;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let yaw=-6,pitch=2,targetYaw=-6,targetPitch=2,velocityYaw=0,velocityPitch=0;
    let dragging=false,pointerId=null,startX=0,startY=0,startYaw=0,startPitch=0;
    let lastX=0,lastY=0,lastMove=0,clock=0,previous=0,frame=0;
    let paused=false,active=true,visible=true,destroyed=false;
    function align() {
      const anchor=typeof options.getAnchor==='function'?options.getAnchor():null;
      if(anchor&&Number.isFinite(anchor.x)&&Number.isFinite(anchor.y)){
        device.style.left=anchor.x+'px';device.style.top=anchor.y+'px';
      }
      if(typeof options.onLayoutChange==='function')options.onLayoutChange();
    }
    function apply(idle=true) {
      const living=idle&&!paused&&!reduced.matches&&!dragging;
      const float=living?Math.sin(clock*.82)*7+Math.sin(clock*.39)*2:0;
      const breathingYaw=living?Math.sin(clock*.48)*4:0;
      const breathingPitch=living?Math.sin(clock*.66+.8)*2.5:0;
      const roll=living?Math.sin(clock*.44)*1.3:0;
      floater.style.transform='translateY('+float.toFixed(2)+'px)';
      rotor.style.transform='perspective(1000px) rotateX('+(pitch+breathingPitch).toFixed(2)+'deg) rotateY('+(yaw+breathingYaw).toFixed(2)+'deg) rotateZ('+roll.toFixed(2)+'deg)';
      rotor.style.setProperty('--phone-light-x',(50+(yaw+breathingYaw)*.7).toFixed(1)+'%');
      rotor.dataset.yaw=yaw.toFixed(2);rotor.dataset.pitch=pitch.toFixed(2);
      device.dataset.dragging=String(dragging);
      if(typeof options.onRotate==='function')options.onRotate({x:yaw/38,y:pitch/20});
    }
    function canAnimate(){return active&&visible&&!destroyed&&!document.hidden&&!paused&&!reduced.matches;}
    function tick(timestamp) {
      frame=0;if(!canAnimate()){previous=0;return;}
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
    function begin(event) {
      if(!active||dragging||!event.isPrimary||event.button!==0)return;
      dragging=true;pointerId=event.pointerId;
      startX=lastX=event.clientX;startY=lastY=event.clientY;startYaw=targetYaw;startPitch=targetPitch;lastMove=performance.now();
      velocityYaw=velocityPitch=0;rotor.setPointerCapture(pointerId);sync();
    }
    function move(event) {
      if(!dragging||event.pointerId!==pointerId)return;
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
      const captured=pointerId;dragging=false;pointerId=null;
      if(!event||event.type==='pointercancel'||event.type==='lostpointercapture'||performance.now()-lastMove>100)velocityYaw=velocityPitch=0;
      if(captured!==null&&rotor.hasPointerCapture(captured))rotor.releasePointerCapture(captured);
      sync();
    }
    function reset() {finish();targetYaw=0;targetPitch=0;velocityYaw=velocityPitch=0;sync();}
    function keys(event) {
      const steps={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,4],ArrowDown:[0,-4]};
      if(steps[event.key]){event.preventDefault();targetYaw=clamp(targetYaw+steps[event.key][0],-38,38);targetPitch=clamp(targetPitch+steps[event.key][1],-20,20);velocityYaw=velocityPitch=0;sync();}
      else if(['Home','Escape','0','Enter',' '].includes(event.key)){event.preventDefault();reset();}
    }
    rotor.addEventListener('pointerdown',begin);rotor.addEventListener('pointermove',move);
    rotor.addEventListener('pointerup',finish);rotor.addEventListener('pointercancel',finish);rotor.addEventListener('lostpointercapture',finish);rotor.addEventListener('keydown',keys);
    const resetButton=device.querySelector('.phone-reset');if(resetButton)resetButton.addEventListener('click',reset);
    const resized=()=>{align();};
    const observer=new ResizeObserver(resized);observer.observe(stage);observer.observe(rotor.querySelector('img'));
    const intersection=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);sync();},{threshold:.01});intersection.observe(stage);
    const visibility=()=>{if(document.hidden)finish();sync();};document.addEventListener('visibilitychange',visibility);
    const preference=()=>sync();reduced.addEventListener('change',preference);
    const api={
      setPaused(value){paused=Boolean(value);sync();},
      setActive(value){active=Boolean(value);if(!active)finish();sync();},
      align,
      reset,
      getRotation(){return{yaw,pitch,dragging};},
      destroy(){destroyed=true;finish();cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();rotor.removeEventListener('pointerdown',begin);rotor.removeEventListener('pointermove',move);rotor.removeEventListener('pointerup',finish);rotor.removeEventListener('pointercancel',finish);rotor.removeEventListener('lostpointercapture',finish);rotor.removeEventListener('keydown',keys);if(resetButton)resetButton.removeEventListener('click',reset);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',preference);mounted.delete(device);}
    };
    mounted.set(device,api);sync();return api;
  }
  window.KROPhone={mount};
})();

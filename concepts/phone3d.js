/* Original, millimetre-scale product geometry. No model or Apple artwork is redistributed. */
import * as THREE from './vendor/three.module.min.js';

const WIDTH=78,HEIGHT=163.4,DEPTH=8.75;
const SCREEN={width:73.4,height:159.48,radius:11.4,z:4.57};
const mounted=new WeakMap();
const radians=THREE.MathUtils.degToRad;

function roundedShape(width,height,radius) {
  const x=-width/2,y=-height/2,r=Math.min(radius,width/2,height/2);
  const shape=new THREE.Shape();
  shape.moveTo(x+r,y);
  shape.lineTo(x+width-r,y);shape.quadraticCurveTo(x+width,y,x+width,y+r);
  shape.lineTo(x+width,y+height-r);shape.quadraticCurveTo(x+width,y+height,x+width-r,y+height);
  shape.lineTo(x+r,y+height);shape.quadraticCurveTo(x,y+height,x,y+height-r);
  shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
  return shape;
}

function solid(width,height,radius,depth,bevel=.2) {
  // Extrusion and curved bevels make a single continuous frame, not independent side rails.
  const geometry=new THREE.ExtrudeGeometry(roundedShape(width-bevel*2,height-bevel*2,radius-bevel),{
    depth:Math.max(.01,depth-bevel*2),steps:1,curveSegments:36,
    bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:8
  });
  geometry.translate(0,0,-depth/2+bevel);
  return geometry;
}

function face(width,height,radius) {
  const geometry=new THREE.ShapeGeometry(roundedShape(width,height,radius),36);
  const positions=geometry.getAttribute('position'),uvs=geometry.getAttribute('uv');
  for(let i=0;i<positions.count;i++)uvs.setXY(i,positions.getX(i)/width+.5,positions.getY(i)/height+.5);
  return geometry;
}

function metalGrain() {
  const width=128,height=512,pixels=new Uint8Array(width*height*4);
  let seed=874319;
  for(let y=0;y<height;y++){
    seed=(seed*1664525+1013904223)>>>0;
    const band=236+(seed%5);
    for(let x=0;x<width;x++){
      const offset=(y*width+x)*4,value=band+((x*17+y*11)%2);
      pixels[offset]=pixels[offset+1]=pixels[offset+2]=value;pixels[offset+3]=255;
    }
  }
  const texture=new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,10);
  texture.needsUpdate=true;
  return texture;
}

function makeStudio(renderer) {
  // Floating softboxes produce real, view-dependent specular reflections without a remote HDRI.
  const studio=new THREE.Scene();studio.background=new THREE.Color('#1e1d21');
  const shell=new THREE.Mesh(new THREE.BoxGeometry(900,900,900),new THREE.MeshBasicMaterial({color:'#353439',side:THREE.BackSide}));
  studio.add(shell);
  const lightCard=(color,intensity,width,height,x,y,z)=>{
    const material=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide});
    const card=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
    card.position.set(x,y,z);card.lookAt(0,0,0);studio.add(card);
  };
  lightCard('#fff4e7',2.2,230,360,-170,115,240);
  lightCard('#fff8f1',1.1,120,340,190,30,130);
  lightCard('#fff6ec',1.2,130,350,-285,20,-85);
  lightCard('#fff9ef',1.8,340,140,20,245,70);
  lightCard('#fff5eb',.9,170,300,160,-40,-210);
  lightCard('#d7a875',.85,270,60,-35,-220,130);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(studio,.035,.1,1200);
  pmrem.dispose();
  studio.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material)object.material.dispose();});
  return environment;
}

function makePhone(environment) {
  const group=new THREE.Group();group.name='Cosmic Orange physical phone';
  const grain=metalGrain();
  const orange=new THREE.MeshPhysicalMaterial({color:'#d36d32',metalness:.78,roughness:.38,
    roughnessMap:grain,clearcoat:.12,clearcoatRoughness:.32,envMapIntensity:.95});
  const edge=new THREE.MeshPhysicalMaterial({color:'#cc622a',metalness:.76,roughness:.36,envMapIntensity:.88});
  const dark=new THREE.MeshPhysicalMaterial({color:'#030407',metalness:0,roughness:.16,
    clearcoat:.65,clearcoatRoughness:.12,specularIntensity:.45,envMapIntensity:.35});
  const polymer=new THREE.MeshStandardMaterial({color:'#ac582d',roughness:.65,metalness:0});
  const black=new THREE.MeshStandardMaterial({color:'#030406',roughness:.4,metalness:.1,envMapIntensity:.25});
  const add=(geometry,material,x=0,y=0,z=0)=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);group.add(mesh);return mesh;
  };

  add(solid(WIDTH,HEIGHT,13.4,DEPTH,.67),orange);
  // A thin anodized-orange lip surrounds near-black glass; the front is not a chrome frame.
  add(solid(76.65,162.05,12.78,.40,.12),edge,0,0,4.10);
  add(solid(75.9,161.25,12.35,.34,.12),dark,0,0,4.29);
  const screenMaterial=new THREE.MeshBasicMaterial({color:'#121027',toneMapped:false});
  const screen=add(face(SCREEN.width,SCREEN.height,SCREEN.radius),screenMaterial,0,0,SCREEN.z);
  const coverMaterial=new THREE.MeshPhysicalMaterial({color:'#111923',metalness:0,roughness:.09,
    clearcoat:1,clearcoatRoughness:.04,transparent:true,opacity:.075,depthWrite:false,
    envMapIntensity:1.05,reflectivity:.32});
  const cover=add(face(SCREEN.width,SCREEN.height,SCREEN.radius),coverMaterial,0,0,SCREEN.z+.045);
  cover.renderOrder=2;

  // The pill is embedded in the glass; the tiny sapphire optic catches its own softbox highlight.
  // At this height the physical pill also covers the pill already present in the Tanakh capture.
  const islandY=74.2;
  add(solid(22.3,6.25,3.12,.18,.055),black,0,islandY,4.70);
  const lensRim=new THREE.MeshPhysicalMaterial({color:'#081119',metalness:.6,roughness:.20,envMapIntensity:.40});
  const lens=new THREE.MeshPhysicalMaterial({color:'#061223',metalness:.05,roughness:.12,
    clearcoat:.7,clearcoatRoughness:.06,specularIntensity:.45,iridescence:.2,iridescenceIOR:1.32,envMapIntensity:.32});
  add(new THREE.CircleGeometry(1.2,32),lensRim,7.2,islandY,4.84);
  add(new THREE.CircleGeometry(.85,32),lens,7.2,islandY,4.86);
  add(new THREE.CircleGeometry(.12,24),new THREE.MeshBasicMaterial({color:'#84b8d6',transparent:true,opacity:.35}),6.96,islandY+.32,4.88);
  // Earpiece slit lives at the seam above the display rather than over the app screenshot.
  add(face(10.6,.32,.16),black,0,80.12,4.50);

  const sideControl=(side,y,height,width=2.75,material=orange)=>{
    const recess=add(solid(width+.35,height+.55,(width+.35)/2,.14,.035),black,side*38.93,y,0);
    recess.rotation.y=side*Math.PI/2;
    const button=add(solid(width,height,width/2,.58,.13),material,side*39.02,y,0);
    button.rotation.y=side*Math.PI/2;
  };
  sideControl(-1,51.5,5.5);sideControl(-1,32,13.2);sideControl(-1,12.8,13.2);
  sideControl(1,30.5,18.5);sideControl(1,-39.5,17.2,3.3,edge);
  // Camera Control's recessed capacitive surface is flush with its bevelled aluminium surround.
  const cameraSurface=add(solid(2.15,15.1,1.06,.12,.035),new THREE.MeshPhysicalMaterial({
    color:'#b05d32',metalness:.55,roughness:.36,envMapIntensity:1.1}),39.36,-39.5,0);
  cameraSurface.rotation.y=Math.PI/2;

  // Narrow polymer breaks sit on the metal, following the frame's thickness, not floating beside it.
  for(const side of [-1,1])for(const y of [-63.1,62.6]){
    const antenna=add(solid(6.95,.65,.28,.04,.01),polymer,side*39.015,y,0);
    antenna.rotation.y=side*Math.PI/2;
  }
  for(const x of [-23.8,23.8]){
    const topAntenna=add(solid(.67,6.95,.29,.035,.01),polymer,x,81.695,0);
    topAntenna.rotation.x=-Math.PI/2;
  }

  // Milled USB-C recess, inner tongue and individually modelled bottom speaker bores.
  const usb=add(face(8.35,2.6,1.1),black,0,-81.71,0);usb.rotation.x=Math.PI/2;
  const tongue=add(face(5.45,.46,.18),new THREE.MeshStandardMaterial({color:'#292b2c',roughness:.45}),0,-81.73,.10);tongue.rotation.x=Math.PI/2;
  for(const side of [-1,1])for(let i=0;i<5;i++){
    const hole=add(new THREE.CircleGeometry(.52,20),black,side*(8.4+i*2.05),-81.715,0);
    hole.rotation.x=Math.PI/2;
  }
  for(const x of [-5.75,5.75]){
    const screw=add(new THREE.CircleGeometry(.37,20),new THREE.MeshPhysicalMaterial({color:'#7d492c',metalness:.9,roughness:.3}),x,-81.716,0);
    screw.rotation.x=Math.PI/2;
  }

  // The ceramic rear inlay and the unibody camera plateau remain real geometry when tilted.
  const rearMaterial=new THREE.MeshPhysicalMaterial({color:'#d67a48',metalness:.05,roughness:.30,
    clearcoat:.55,clearcoatRoughness:.20,envMapIntensity:1.1});
  const back=add(face(72.65,126.0,10.1),rearMaterial,0,-14.5,-4.39);back.rotation.y=Math.PI;
  const plateau=add(solid(75.4,38.2,10.9,2.8,.65),orange,0,59.8,-5.1);
  const rearLensMaterial=new THREE.MeshPhysicalMaterial({color:'#091019',metalness:.25,roughness:.055,clearcoat:1,envMapIntensity:1.6});
  for(const [x,y] of [[-23.3,68],[-23.3,51.9],[-7.6,59.95]]){
    const rim=add(new THREE.CylinderGeometry(6.2,6.2,1.75,48),edge,x,y,-7.15);rim.rotation.x=Math.PI/2;
    const optic=add(new THREE.CircleGeometry(5.3,48),rearLensMaterial,x,y,-8.06);optic.rotation.y=Math.PI;
  }
  const flash=add(new THREE.CircleGeometry(2.3,32),new THREE.MeshPhysicalMaterial({color:'#ebe3c4',roughness:.4,metalness:.05}),15.8,66.5,-6.55);flash.rotation.y=Math.PI;
  const lidar=add(new THREE.CircleGeometry(2.1,32),black,15.8,53.4,-6.55);lidar.rotation.y=Math.PI;
  group.traverse(object=>{if(object.material&&object.material.isMeshStandardMaterial)object.material.envMap=environment;});
  return {group,screen,screenMaterial,grain};
}

function screenTexture(image,appKey,anisotropy) {
  const canvas=document.createElement('canvas');canvas.width=1320;canvas.height=2868;
  const context=canvas.getContext('2d');
  if(!context)throw new Error('Screen texture canvas is unavailable');
  const backgrounds={echo:'#131028',kino:'#101010',tanakh:'#10131b'};
  context.fillStyle=backgrounds[appKey]||'#101018';context.fillRect(0,0,canvas.width,canvas.height);
  const scale=Math.min(canvas.width/image.naturalWidth,canvas.height/image.naturalHeight);
  const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
  context.drawImage(image,(canvas.width-width)/2,(canvas.height-height)/2,width,height);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=anisotropy;texture.minFilter=THREE.LinearMipmapLinearFilter;
  return texture;
}

function mount(rotor) {
  if(!rotor)return null;
  if(mounted.has(rotor))return mounted.get(rotor);
  let renderer;
  try{
    const canvas=document.createElement('canvas');
    const context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:true});
    if(!context)return null;
    renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:true});
  }catch{return null;}
  let destroyed=false,ready=false,screenReady=false,lost=false,request=0,currentSrc='',environment;
  const canvas=renderer.domElement;
  canvas.className='phone-webgl';canvas.setAttribute('aria-hidden','true');canvas.dataset.renderer='webgl';
  Object.assign(canvas.style,{position:'absolute',width:'132%',height:'116%',left:'-16%',top:'-8%',pointerEvents:'none',visibility:'hidden'});
  rotor.appendChild(canvas);
  renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new THREE.Scene();
  try{environment=makeStudio(renderer);}catch{renderer.dispose();canvas.remove();return null;}
  scene.environment=environment.texture;
  const phone=makePhone(environment.texture);scene.add(phone.group);
  scene.add(new THREE.HemisphereLight('#fff3e7','#6d4834',.65));
  const lighting=(color,intensity,x,y,z)=>{const light=new THREE.DirectionalLight(color,intensity);light.position.set(x,y,z);scene.add(light);};
  lighting('#fff2e2',2,-130,190,250);lighting('#fff7ee',.8,190,30,140);lighting('#ffe1b0',.9,-40,-180,70);
  const camera=new THREE.PerspectiveCamera(22,1,.5,1600);camera.position.set(0,0,500);camera.lookAt(0,0,0);
  let width=0,height=0;
  const fitCompactPose=()=>{
    phone.group.scale.setScalar(1);phone.group.updateMatrixWorld(true);
    if(!ready||window.innerWidth>620)return;
    const rect=canvas.getBoundingClientRect(),viewport=document.documentElement.clientWidth||window.innerWidth;
    const margin=12.5,point=new THREE.Vector3();camera.updateMatrixWorld(true);
    const fits=scale=>{
      phone.group.scale.setScalar(scale);phone.group.updateMatrixWorld(true);
      for(const x of [-39.6,39.6])for(const y of [-81.74,81.74])for(const z of [-8.2,4.9]){
        point.set(x,y,z).applyMatrix4(phone.group.matrixWorld).project(camera);
        const clientX=rect.left+(point.x+1)*rect.width/2;
        if(clientX<margin||clientX>viewport-margin)return false;
      }
      return true;
    };
    if(fits(1))return;
    // Only compact, edge-reaching poses shrink; the full-size frontal presentation stays untouched.
    let low=.6,high=1;
    for(let i=0;i<14;i++){const middle=(low+high)/2;if(fits(middle))low=middle;else high=middle;}
    phone.group.scale.setScalar(Math.max(.6,low-.002));phone.group.updateMatrixWorld(true);
  };
  const announce=()=>{
    if(ready||!screenReady)return;
    ready=true;rotor.dataset.renderer='webgl';canvas.style.visibility='visible';
    rotor.dispatchEvent(new CustomEvent('krophone3dready',{bubbles:true}));
  };
  const render=()=>{
    if(destroyed||lost||renderer.getContext().isContextLost()||width<=0||height<=0)return;
    try{renderer.render(scene,camera);announce();}
    catch{canvas.style.visibility='hidden';delete rotor.dataset.renderer;ready=false;}
  };
  const resize=()=>{
    if(destroyed)return;
    const rotorWidth=rotor.clientWidth,rotorHeight=rotor.clientHeight;
    if(!rotorWidth||!rotorHeight)return;
    width=rotorWidth*1.32;height=rotorHeight*1.16;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.fov=THREE.MathUtils.radToDeg(2*Math.atan((HEIGHT*1.16)/(2*(camera.position.z-SCREEN.z))));
    camera.updateProjectionMatrix();fitCompactPose();render();
  };
  const setPose=({yaw=0,pitch=0,roll=0}={})=>{
    if(destroyed)return;
    phone.group.rotation.set(radians(pitch),radians(yaw),radians(roll),'YXZ');
    fitCompactPose();render();
  };
  const setScreen=(src,appKey='')=>{
    if(destroyed||!src)return;
    const resolved=new URL(src,document.baseURI).href;
    if(resolved===currentSrc)return;
    currentSrc=resolved;
    const version=++request,image=new Image();image.crossOrigin='anonymous';
    image.onload=()=>{
      if(destroyed||version!==request)return;
      try{
        const texture=screenTexture(image,appKey,Math.min(8,renderer.capabilities.getMaxAnisotropy()));
        const previous=phone.screenMaterial.map;phone.screenMaterial.map=texture;phone.screenMaterial.color.set('#ffffff');
        phone.screenMaterial.needsUpdate=true;screenReady=true;canvas.dataset.screenSrc=resolved;render();if(previous)previous.dispose();
      }catch{currentSrc='';}
    };
    image.onerror=()=>{if(version===request)currentSrc='';};image.src=resolved;
  };
  const getScreenPolygon=()=>{
    if(!ready||destroyed)return null;
    const rect=canvas.getBoundingClientRect();phone.group.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    return [[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>{
      const point=new THREE.Vector3(x*SCREEN.width/2,y*SCREEN.height/2,SCREEN.z+.05);
      phone.group.localToWorld(point);point.project(camera);
      return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
    });
  };
  const observer=new ResizeObserver(resize);observer.observe(rotor);
  const contextLost=event=>{
    event.preventDefault();lost=true;canvas.style.visibility='hidden';delete rotor.dataset.renderer;ready=false;
    rotor.dispatchEvent(new CustomEvent('krophone3dfallback',{bubbles:true}));
  };
  const contextRestored=()=>{
    if(destroyed)return;
    try{
      // RenderTarget-backed PMREM data must be regenerated after losing the GPU context.
      const restored=makeStudio(renderer);environment.dispose();environment=restored;
      scene.environment=environment.texture;
      phone.group.traverse(object=>{if(object.material&&object.material.isMeshStandardMaterial){
        object.material.envMap=environment.texture;object.material.needsUpdate=true;
      }});
      phone.grain.needsUpdate=true;if(phone.screenMaterial.map)phone.screenMaterial.map.needsUpdate=true;
      lost=false;resize();
    }catch{lost=true;}
  };
  canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored);
  const api={setPose,setScreen,resize,getScreenPolygon,destroy(){
    if(destroyed)return;destroyed=true;request++;observer.disconnect();
    canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored);
    const geometries=new Set(),materials=new Set(),textures=new Set([phone.grain]);
    scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material){
      const list=Array.isArray(object.material)?object.material:[object.material];
      list.forEach(material=>{materials.add(material);if(material.map)textures.add(material.map);});
    }});
    geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());
    environment.dispose();renderer.dispose();canvas.remove();delete rotor.dataset.renderer;mounted.delete(rotor);
  }};
  mounted.set(rotor,api);resize();
  const image=rotor.querySelector('.signal-device-screen');
  if(image){const appKey=rotor.closest('[data-app]')?.dataset.app||'';setScreen(image.src,appKey);}
  return api;
}

window.KROPhone3D={mount};
export {mount};

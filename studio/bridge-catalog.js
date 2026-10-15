/* Bridge-only authentic, high-resolution Echo captures and matching handset renders.
 * The base registry and other two design directions remain unchanged. */
(() => {
  'use strict';
  const catalog=window.KROCatalog;if(!catalog)return;
  const apps={};
  for(const key of catalog.order){
    const source=catalog.apps[key];
    const shots=key==='echo'?['assets/bridge-echoHome.jpg','assets/bridge-echoListen.jpg']:Array.from(source.shots);
    apps[key]=Object.freeze({...source,shots:Object.freeze(shots),fallbacks:Object.freeze(shots.map((_,shot)=>`assets/bridge-phone-${key}-${shot}.webp`))});
  }
  window.KROCatalog=Object.freeze({...catalog,apps:Object.freeze(apps)});
})();

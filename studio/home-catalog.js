/* Homepage asset paths are document-relative; preserve the immutable real catalog. */
(() => {
  'use strict';
  const source=window.KROCatalog,prefix=document.body.dataset.assetBase||'';
  if(!source||!prefix)return;
  const apps={};
  for(const key of source.order){
    const app=source.apps[key];
    apps[key]=Object.freeze({...app,
      icon:prefix+app.icon,
      shots:Object.freeze(app.shots.map(path=>prefix+path)),
      fallbacks:Object.freeze(app.fallbacks.map(path=>prefix+path))
    });
  }
  window.KROCatalog=Object.freeze({...source,apps:Object.freeze(apps)});
})();

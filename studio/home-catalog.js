/* Homepage asset paths are document-relative; preserve the immutable real catalog. */
(() => {
  'use strict';
  const source=window.KROCatalog,prefix=document.body.dataset.assetBase||'';
  if(!source||!prefix)return;
  const apps={};
  for(const key of source.order){
    const app=source.apps[key];
    const gallery=(window.KROStoreGallery?.apps?.[key]?.images||[]).filter(image=>!app.shots.includes(image.path)&&!app.shots.includes(image.representedBy));
    const shots=[...app.shots,...gallery.map(image=>image.path)];
    const fallbacks=[...app.fallbacks,...gallery.map((_,index)=>`assets/gallery-phones/${key}-${index+app.shots.length}.webp`)];
    apps[key]=Object.freeze({...app,
      icon:prefix+app.icon,
      shots:Object.freeze(shots.map(path=>prefix+path)),
      fallbacks:Object.freeze(fallbacks.map(path=>prefix+path))
    });
  }
  window.KROCatalog=Object.freeze({...source,apps:Object.freeze(apps)});
})();

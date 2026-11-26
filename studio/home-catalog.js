/* Homepage asset paths are document-relative; preserve the immutable real catalog. */
(() => {
  'use strict';
  const source=window.KROCatalog,prefix=document.body.dataset.assetBase||'';
  if(!source||!prefix)return;
  const apps={};
  const appleIds={kino:'6812753192',tanakh:'6797598421'};
  const playPackages={kino:'com.krostudios.sovietkino',tanakh:'com.krostudios.tanakh_quiz'};
  for(const key of source.order){
    const app=source.apps[key];
    const gallery=(window.KROStoreGallery?.apps?.[key]?.images||[]).filter(image=>!app.shots.includes(image.path)&&!app.shots.includes(image.representedBy));
    const shots=[...app.shots,...gallery.map(image=>image.path)];
    const fallbacks=[...app.fallbacks,...gallery.map((_,index)=>`assets/gallery-phones/${key}-${index+app.shots.length}.webp`)];
    apps[key]=Object.freeze({...app,
      icon:prefix+app.icon,
      appStoreUrl:appleIds[key]?'https://apps.apple.com/app/id'+appleIds[key]:null,
      googlePlayUrl:playPackages[key]?'https://play.google.com/store/apps/details?id='+playPackages[key]:app.url,
      websiteUrl:app.websiteUrl||(playPackages[key]?app.url:null),
      shots:Object.freeze(shots.map(path=>prefix+path)),
      fallbacks:Object.freeze(fallbacks.map(path=>prefix+path))
    });
  }
  window.KROCatalog=Object.freeze({...source,apps:Object.freeze(apps)});
})();

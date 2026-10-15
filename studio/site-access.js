/* Website navigation is separate from preview selection. No invented app sites. */
(() => {
  'use strict';
  const stage=document.querySelector('.prototype'),catalog=window.KROCatalog;
  const mode=document.body.dataset.siteAccess;
  if(!mode||!stage||!catalog||!window.KROPrototype)return;
  const assetBase=document.body.dataset.assetBase||'';
  const sites=Object.freeze({
    kino:assetBase+'assets/site-preview-kino.png',
    echo:assetBase+'assets/site-preview-echo.png',
    tanakh:assetBase+'assets/site-preview-tanakh.png'
  });
  const {apps,order}=catalog;
  function destination(key){
    const app=apps[key],website=Object.hasOwn(sites,key),url=new URL(app.url);
    return {app,website,url:app.url,kind:website?'Website':'Google Play',
      preview:website?sites[key]:app.shots[0],
      host:website?url.hostname+url.pathname:'play.google.com'};
  }
  function makeLink(key,className){
    const d=destination(key),link=document.createElement('a');
    link.className=className;link.dataset.destination=key;
    link.href=d.url;link.target='_blank';link.rel='noopener noreferrer';
    link.setAttribute('aria-label',`Open ${d.app.title} ${d.website?'website':'on Google Play'} in a new tab`);
    return link;
  }
  let orbitLayout=()=>{};
  if(mode==='orbit'){
    const root=stage.querySelector('.world-index'),pairs=[];
    for(const key of order){
      const button=root.querySelector(`.app-node[data-world="${key}"]`),d=destination(key);
      const link=makeLink(key,'orbit-site-link');
      link.innerHTML=`<span>${d.kind}</span><span aria-hidden="true">↗</span>`;
      root.append(link);pairs.push({button,link});
    }
    orbitLayout=()=>{
      const bounds=root.getBoundingClientRect(),compact=matchMedia('(max-width: 1000px)').matches;
      for(const {button,link} of pairs){
        const r=button.getBoundingClientRect();
        link.style.left=(r.left-bounds.left+r.width/2)+'px';
        link.style.top=(r.bottom-bounds.top-(compact?47:3))+'px';
      }
    };
    const observer=new ResizeObserver(orbitLayout);
    observer.observe(stage);observer.observe(root);
    for(const {button} of pairs)observer.observe(button);
    document.fonts.ready.then(orbitLayout);orbitLayout();
    window.addEventListener('pageshow',orbitLayout);
    window.addEventListener('pagehide',event=>{if(!event.persisted)observer.disconnect();});
  }
  for(const nav of document.querySelectorAll('[data-site-links="stores"]')){
    for(const key of order.filter(key=>!Object.hasOwn(sites,key))){
      const link=makeLink(key,'store-site-link');
      const label=document.createElement('span');label.textContent=apps[key].title;
      const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
      link.append(label,arrow);nav.append(link);
    }
  }
  function update(key){
    const d=destination(key);
    stage.dataset.siteKind=d.website?'website':'store';
    const values={title:d.app.title,category:d.app.category,host:d.host,kind:d.kind,status:d.app.status};
    for(const [field,value] of Object.entries(values)){
      for(const element of stage.querySelectorAll(`[data-active-${field}]`))element.textContent=value;
    }
    for(const img of stage.querySelectorAll('img[data-active-icon]')){img.src=d.app.icon;img.alt='';}
    for(const img of stage.querySelectorAll('img[data-active-preview]')){
      img.src=d.preview;img.alt=`${d.app.title} ${d.website?'website preview':'app screenshot'}`;
    }
    for(const link of stage.querySelectorAll('a[data-active-link]')){
      link.href=d.url;link.target='_blank';link.rel='noopener noreferrer';
      link.textContent=(d.website?'Visit website':'Google Play')+' ↗';
      link.setAttribute('aria-label',`Open ${d.app.title} ${d.website?'website':'on Google Play'} in a new tab`);
      link.dataset.destination=key;
    }
    for(const element of stage.querySelectorAll('[data-site-card]')){
      const active=element.dataset.siteCard===key;element.classList.toggle('is-active',active);
      if(active)element.setAttribute('aria-current','true');else element.removeAttribute('aria-current');
    }
    for(const element of stage.querySelectorAll('.orbit-site-link')){
      element.classList.toggle('is-active',element.dataset.destination===key);
    }
    orbitLayout();
  }
  stage.addEventListener('kro:appchange',event=>update(event.detail.key));
  stage.addEventListener('click',event=>{
    const button=event.target.closest('button.site-preview-button[data-preview-app]');
    if(button&&order.includes(button.dataset.previewApp))window.KROPrototype.select(button.dataset.previewApp);
  });
  update(window.KROPrototype.getState().key);
  window.KROSiteAccess=Object.freeze({mode,sites,destination,refresh:orbitLayout});
  window.KROHomeI18n?.refresh();
})();

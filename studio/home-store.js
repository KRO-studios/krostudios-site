/* Connect the studio's app picker and store badges to the interactive phone. */
(() => {
  'use strict';
  const home = document.getElementById('studio-home');
  const catalog = window.KROCatalog, preview = window.KROPrototype, i18n = window.KROHomeI18n;
  if (!home || !catalog || !preview || !i18n) return;
  const get = selector => home.querySelector(selector);
  const stage = get('.prototype'), chooser = get('.choose'), picker = get('.picker');
  const languages = get('.studio-language-switch'), langButton = get('.lang-toggle');
  const phone = get('.phone-host'), orbit = get('.world-index'), dock = get('.store-dock'), scrim = get('.scrim');
  const tip = get('.gesture-tip'), website = get('.store-web'), apple = get('.store-ios'), play = get('.store-play');
  const options = new Map();
  const words = {
    en: {
      choose: 'Choose an app', close: 'Close', language: 'Language', code: 'ENG', hint: 'Tap for next screen',
      apple: 'Download on the App Store', play: 'Get it on Google Play', site: 'Visit app website',
      more: 'More from KRO Studios', browse: 'Browse all KRO Studios apps', download: 'Download', screen: 'Screenshot',
      kinds: {kino: 'Classic cinema quiz', echo: 'Reverse-voice game · 18+', tanakh: 'Hebrew Bible trivia', 'half-life': 'Creature quiz', dune: 'Strategy trivia', rap: 'Hip-hop trivia', beer: 'Beer label quiz', feed: 'Arcade game'}
    },
    he: {
      choose: 'בחרו אפליקציה', close: 'סגירה', language: 'שפה', code: 'HEB', hint: 'הקישו למסך הבא',
      apple: 'הורדה מה-App Store', play: 'הורדה מ-Google Play', site: 'לאתר האפליקציה',
      more: 'עוד מ־KRO Studios', browse: 'כל האפליקציות של KRO Studios', download: 'הורדה', screen: 'צילום מסך',
      kinds: {kino: 'חידון קולנוע קלאסי', echo: 'משחק קול הפוך · 18+', tanakh: 'חידון תנ״ך בעברית', 'half-life': 'חידון יצורים', dune: 'טריוויה על משחק אסטרטגיה', rap: 'טריוויה על היפ הופ', beer: 'חידון תוויות בירה', feed: 'משחק ארקייד'}
    },
    ru: {
      choose: 'Выбрать приложение', close: 'Закрыть', language: 'Язык', code: 'RUS', hint: 'Коснитесь для смены экрана',
      apple: 'Загрузить в App Store', play: 'Скачать в Google Play', site: 'Сайт приложения',
      more: 'Другие приложения KRO Studios', browse: 'Все приложения KRO Studios', download: 'Скачать', screen: 'Скриншот',
      kinds: {kino: 'Викторина о кино', echo: 'Игра с голосом · 18+', tanakh: 'Викторина о Танахе', 'half-life': 'Викторина о существах', dune: 'Викторина о стратегии', rap: 'Хип-хоп-викторина', beer: 'Викторина о пиве', feed: 'Аркада'}
    }
  };
  for (const key of catalog.order) {
    const app = catalog.apps[key], option = document.createElement('button');
    option.type = 'button';
    option.className = 'pick-option';
    option.dataset.app = key;
    const image = document.createElement('img');
    image.alt = '';
    image.src = app.icon;
    image.draggable = false;
    const label = document.createElement('span');
    label.lang = key === 'feed' ? 'ru' : 'en';
    label.dir = 'ltr';
    label.textContent = app.title;
    option.append(image,label);
    get('.pick-grid').append(option);
    options.set(key,option);
  }
  function bind(link, url, label) {
    link.hidden = !url;
    if (url) { link.href = url; link.setAttribute('aria-label',label); }
    else { link.removeAttribute('href'); link.removeAttribute('aria-label'); }
  }
  function updateAvailability() {
    orbit.inert = phone.inert = !picker.hidden;
    dock.inert = !picker.hidden || Boolean(stage.dataset.pendingApp);
  }
  function render() {
    const lang = i18n.getLanguage(), t = words[lang], {key,shot} = preview.getState();
    const app = catalog.apps[key];
    for (const [id,option] of options) option.setAttribute('aria-pressed',String(id === (stage.dataset.pendingApp || key)));
    get('.current-name').textContent = app.title;
    get('.current-name').lang = key === 'feed' ? 'ru' : 'en';
    get('.current-kind').textContent = t.kinds[key] || app.category;
    get('.caption-icon img').src = app.icon;
    dock.setAttribute('aria-label',t.download + ' · ' + app.title);
    bind(website,app.websiteUrl,app.title + ' · ' + t.site);
    bind(apple,app.appStoreUrl,app.title + ' · ' + t.apple);
    bind(play,app.googlePlayUrl,app.title + ' · ' + t.play);
    website.firstElementChild.textContent = t.site;
    for (const [link,asset,alt] of [[apple,'apple-'+lang+'.svg',t.apple],[play,'play-'+lang+'.webp',t.play]]) {
      const image = link.firstElementChild, path = 'studio/assets/store-badges/'+asset;
      if (image.getAttribute('src') !== path) image.src = path;
      image.alt = alt;
    }
    chooser.querySelector('span').textContent = get('.picker h2').textContent = t.choose;
    get('.close-picker').setAttribute('aria-label',t.close);
    get('.publishers strong').textContent = t.more;
    for (const link of get('.publisher-sites').children) link.setAttribute('aria-label',t.browse+' · '+link.textContent.replace(' ↗',''));
    langButton.querySelector('span').textContent = t.code;
    langButton.setAttribute('aria-label',t.language+' · '+t.code);
    tip.textContent = t.hint;
    const count = get('.shot-count');
    count.textContent = (shot+1)+' / '+app.shots.length;
    count.setAttribute('aria-label',t.screen+' '+count.textContent);
    updateAvailability();
  }
  function fitPicker() {
    if (!picker.hidden) picker.style.maxHeight = (stage.getBoundingClientRect().bottom - chooser.getBoundingClientRect().bottom - 16) + 'px';
  }
  const layout = new ResizeObserver(fitPicker);
  layout.observe(stage);
  layout.observe(get('.hero-copy'));
  function setPicker(open, restoreFocus = false) {
    picker.hidden = !open;
    scrim.hidden = !open;
    chooser.setAttribute('aria-expanded',String(open));
    updateAvailability();
    if (open) {
      fitPicker();
      setLanguageMenu(false);
      options.get(stage.dataset.pendingApp || preview.getState().key).focus({preventScroll:true});
    } else if (restoreFocus) chooser.focus({preventScroll:true});
  }
  function setLanguageMenu(open, restoreFocus = false) {
    languages.hidden = !open;
    langButton.setAttribute('aria-expanded',String(open));
    if (open) {
      setPicker(false);
      languages.querySelector('[aria-pressed="true"]').focus({preventScroll:true});
    } else if (restoreFocus) langButton.focus({preventScroll:true});
  }
  function center(element) {
    const rect = element.getBoundingClientRect();
    return {clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2};
  }
  chooser.addEventListener('click',()=>setPicker(picker.hidden));
  get('.close-picker').addEventListener('click',()=>setPicker(false,true));
  scrim.addEventListener('click',()=>setPicker(false,true));
  get('.pick-grid').addEventListener('click',event=>{
    const option = event.target.closest('.pick-option');
    if (!option) return;
    let origin = center(option.querySelector('img'));
    const target = phone.getBoundingClientRect();
    if (origin.clientX >= target.left && origin.clientX <= target.right && origin.clientY >= target.top && origin.clientY <= target.bottom) origin = center(chooser);
    setPicker(false,true);
    preview.previewFrom(option.dataset.app,origin);
  });
  langButton.addEventListener('click',()=>setLanguageMenu(languages.hidden));
  languages.addEventListener('click',event=>{
    if (event.target.closest('[data-language]')) setLanguageMenu(false,true);
  });
  document.addEventListener('keydown',event=>{
    if (event.key !== 'Escape') return;
    if (!picker.hidden) setPicker(false,true);
    else if (!languages.hidden) setLanguageMenu(false,true);
  });
  const pickerWrap = get('.choose-wrap'), languageWrap = get('.language');
  function dismissOutside(target) {
    if (!picker.hidden && !pickerWrap.contains(target) && target !== scrim) setPicker(false);
    if (!languages.hidden && !languageWrap.contains(target)) setLanguageMenu(false);
  }
  document.addEventListener('pointerdown',event=>dismissOutside(event.target));
  document.addEventListener('focusin',event=>dismissOutside(event.target));
  for (const event of ['kro:languagechange','kro:previewrequest','kro:appchange']) stage.addEventListener(event,render);
  stage.addEventListener('kro:screenadvance',()=>{tip.hidden = true;});
  render();
  get('.tip-row').hidden = false;
  pickerWrap.hidden = langButton.hidden = false;
})();

/* Homepage-only language controls. Product names, artwork and destinations stay original. */
(() => {
  'use strict';
  const catalog = window.KROCatalog;
  const stage = document.querySelector('.prototype');
  if (!catalog || !stage) return;
  const languages = new Set(['en', 'he', 'ru']);
  const websiteKeys = new Set(['kino', 'echo', 'tanakh']);
  const storageKey = 'kro-studio-language';
  const copy = Object.freeze({
    en: {
      heroLead: 'Follow your', heroAccent: 'curiosity.', contact: 'Talk with us',
      website: 'Website', visitWebsite: 'Visit website', comingSoon: 'COMING SOON',
      title: 'KRO Studios — Follow your curiosity',
      description: 'Follow your curiosity with KRO Studios. Explore eight games and apps, from cinema and word puzzles to reverse-voice party play.',
      socialDescription: 'Eight worlds of unexpected play. Explore the games and apps of KRO Studios.',
      header: 'KRO Studios, contact and language', languageGroup: 'Choose the site language',
      languageNames: {en: 'English', he: 'Hebrew', ru: 'Russian'},
      languageButton: name => 'Switch the site to ' + name,
      contactLabel: 'Talk with KRO Studios by email at hello@krostudios.com',
      appIndex: 'Preview an app or open its website',
      noScriptIndex: 'Open a KRO Studios app website or store page',
      preview: name => 'Preview ' + name,
      destination: (name, website) => 'Open ' + name + (website ? ' website' : ' on Google Play') + ' in a new tab',
      phone: (name, shot, total) => `${name}, screenshot ${shot} of ${total}, on an orange 3D phone. Drag or use arrow keys to rotate. Home resets; P pauses motion.`,
      phoneHelp: 'Select an app to change the screen. Drag the phone horizontally to rotate it; vertical movement scrolls on touch screens. Arrow keys rotate. Home resets. P pauses or resumes motion.',
      phoneImage: name => name + "'s actual app screen on an orange phone",
      phoneHint: 'DRAG TO ROTATE · ARROW KEYS',
      tiltHint: 'Drag to tilt image · arrow keys · P pauses motion · Home resets',
      rotateHint: 'Drag to rotate · arrow keys · P pauses motion · Home resets',
      retry: 'Retry 3D',
      renderer: {webgl: 'Live 3D', loading: 'Preparing 3D preview…', fallback: 'Preview image · 3D unavailable'},
      selection: (name, status, shot, total) => `${name}. ${status}. Screenshot ${shot} of ${total}.`,
      paused: 'Motion paused. Press P to resume.', running: 'Motion resumed. Press P to pause.',
      statusComingSoon: 'Coming soon · 18+',
      imagePreview: (name, website) => name + (website ? ' website preview' : ' app screenshot')
    },
    he: {
      heroLead: 'תנו לסקרנות', heroAccent: 'להוביל.', contact: 'דברו איתנו',
      website: 'לאתר', visitWebsite: 'לאתר', comingSoon: 'בקרוב',
      title: 'KRO Studios — תנו לסקרנות להוביל',
      description: 'תנו לסקרנות להוביל עם KRO Studios. גלו שמונה משחקים ויישומים — מקולנוע וחידות מילים ועד משחקי מסיבה בקול הפוך.',
      socialDescription: 'שמונה עולמות של משחקים מפתיעים. גלו את המשחקים והיישומים של KRO Studios.',
      header: 'KRO Studios, יצירת קשר ושפה', languageGroup: 'בחירת שפת האתר',
      languageNames: {en: 'אנגלית', he: 'עברית', ru: 'רוסית'},
      languageButton: name => 'החלפת שפת האתר ל' + name,
      contactLabel: 'כתבו ל־KRO Studios בדוא״ל hello@krostudios.com',
      appIndex: 'בחירת יישום לתצוגה מקדימה או פתיחת האתר שלו',
      noScriptIndex: 'פתיחת אתר של יישום או דף בחנות של KRO Studios',
      preview: name => 'תצוגה מקדימה של ' + name,
      destination: (name, website) => website ? `פתיחת האתר של ${name} בכרטיסייה חדשה` : `פתיחת ${name} ב־Google Play בכרטיסייה חדשה`,
      phone: (name, shot, total) => `${name}, צילום מסך ${shot} מתוך ${total}, בטלפון תלת־ממדי כתום. גררו או השתמשו במקשי החצים כדי לסובב. Home מאפס; P משהה את התנועה.`,
      phoneHelp: 'בחרו יישום כדי להחליף את המסך. גררו את הטלפון לרוחב כדי לסובב; גרירה אנכית מאפשרת גלילה במסכי מגע. מקשי החצים מסובבים. Home מאפס. P משהה או מחדש את התנועה.',
      phoneImage: name => 'מסך אמיתי של ' + name + ' בטלפון כתום',
      phoneHint: 'גררו כדי לסובב · מקשי החצים',
      tiltHint: 'גררו כדי להטות את התמונה · מקשי החצים · P משהה תנועה · Home מאפס',
      rotateHint: 'גררו כדי לסובב · מקשי החצים · P משהה תנועה · Home מאפס',
      retry: 'ניסיון נוסף לתלת־ממד',
      renderer: {webgl: 'תצוגת תלת־ממד חיה', loading: 'מכינים תצוגת תלת־ממד…', fallback: 'תמונה מקדימה · תלת־ממד לא זמין'},
      selection: (name, status, shot, total) => `${name}. ${status}. צילום מסך ${shot} מתוך ${total}.`,
      paused: 'התנועה הושהתה. לחצו על P כדי לחדש.', running: 'התנועה חודשה. לחצו על P כדי להשהות.',
      statusComingSoon: 'בקרוב · 18+',
      imagePreview: (name, website) => (website ? 'תצוגה מקדימה של האתר של ' : 'צילום מסך של ') + name,
      categories: {kino: 'קולנוע רוסי', echo: 'משחק מסיבה בקול הפוך', tanakh: 'חידות מילים בעברית', 'half-life': 'טריוויה לא רשמית למעריצים', dune: 'טריוויה של אסטרטגיה קלאסית', rap: 'חידון תמונות של ראפרים', beer: 'חידון סמלי בירה', feed: 'משחק ארקייד ברוסית'}
    },
    ru: {
      heroLead: 'Доверьтесь', heroAccent: 'любопытству.', contact: 'Напишите нам',
      website: 'На сайт', visitWebsite: 'На сайт', comingSoon: 'Скоро',
      title: 'KRO Studios — Доверьтесь любопытству',
      description: 'Доверьтесь любопытству вместе с KRO Studios. Откройте восемь игр и приложений: от кино и словесных головоломок до вечеринок с голосом наоборот.',
      socialDescription: 'Восемь миров неожиданных открытий. Познакомьтесь с играми и приложениями KRO Studios.',
      header: 'KRO Studios, связь и язык', languageGroup: 'Выбор языка сайта',
      languageNames: {en: 'английский', he: 'иврит', ru: 'русский'},
      languageButton: name => 'Переключить сайт на ' + name,
      contactLabel: 'Написать KRO Studios на hello@krostudios.com',
      appIndex: 'Выбрать приложение для просмотра или открыть его сайт',
      noScriptIndex: 'Открыть сайт приложения KRO Studios или страницу в магазине',
      preview: name => 'Предпросмотр ' + name,
      destination: (name, website) => website ? `Открыть сайт ${name} в новой вкладке` : `Открыть ${name} в Google Play в новой вкладке`,
      phone: (name, shot, total) => `${name}, снимок экрана ${shot} из ${total}, на оранжевом 3D-телефоне. Перетаскивайте или используйте стрелки для поворота. Home сбрасывает поворот; P приостанавливает анимацию.`,
      phoneHelp: 'Выберите приложение, чтобы сменить экран. Перетаскивайте телефон по горизонтали для поворота; вертикальное движение на сенсорном экране прокручивает страницу. Клавиши со стрелками поворачивают телефон. Home сбрасывает поворот. P приостанавливает и возобновляет анимацию.',
      phoneImage: name => 'Настоящий экран ' + name + ' на оранжевом телефоне',
      phoneHint: 'ПЕРЕТАСКИВАЙТЕ ДЛЯ ПОВОРОТА · КЛАВИШИ СО СТРЕЛКАМИ',
      tiltHint: 'Перетаскивайте для наклона изображения · стрелки · P приостанавливает анимацию · Home сбрасывает поворот',
      rotateHint: 'Перетаскивайте для поворота · стрелки · P приостанавливает анимацию · Home сбрасывает поворот',
      retry: 'Повторить 3D-просмотр',
      renderer: {webgl: 'Интерактивный 3D-просмотр', loading: 'Подготовка 3D-просмотра…', fallback: 'Изображение · 3D недоступно'},
      selection: (name, status, shot, total) => `${name}. ${status}. Снимок экрана ${shot} из ${total}.`,
      paused: 'Анимация приостановлена. Нажмите P, чтобы продолжить.', running: 'Анимация возобновлена. Нажмите P, чтобы приостановить.',
      statusComingSoon: 'Скоро · 18+',
      imagePreview: (name, website) => (website ? 'Предпросмотр сайта ' : 'Снимок экрана приложения ') + name,
      categories: {kino: 'Русскоязычное кино', echo: 'Игра для вечеринок с голосом наоборот', tanakh: 'Словесные головоломки на иврите', 'half-life': 'Неофициальная викторина для поклонников', dune: 'Викторина о классической стратегии', rap: 'Угадайте рэпера по фото', beer: 'Викторина по пивным логотипам', feed: 'Аркада на русском языке'}
    }
  });
  function preferredLanguage() {
    const queryLanguage = new URLSearchParams(location.search).get('lang');
    if (languages.has(queryLanguage)) return queryLanguage;
    try {
      const stored = localStorage.getItem(storageKey);
      if (languages.has(stored)) return stored;
    } catch (_) { /* Private browsing and disabled storage must not block the page. */ }
    return 'en';
  }
  let language = preferredLanguage();
  let lastSelection = null;
  let layoutFrame = 0;
  let rendererObserver = null;
  let observedStatus = null;

  const setText = (element, value) => { if (element && element.textContent !== value) element.textContent = value; };
  const setAttribute = (element, name, value) => { if (element && element.getAttribute(name) !== value) element.setAttribute(name, value); };
  function currentSelection(detail) {
    if (detail && catalog.order.includes(detail.key)) {
      lastSelection = {key: detail.key, shot: detail.shot === 1 ? 1 : 0, app: catalog.apps[detail.key]};
      return lastSelection;
    }
    const state = window.KROPrototype?.getState?.();
    if (state && catalog.order.includes(state.key)) return {key: state.key, shot: state.shot === 1 ? 1 : 0, app: catalog.apps[state.key]};
    if (lastSelection) return lastSelection;
    const query = new URLSearchParams(location.search);
    const key = catalog.order.includes(query.get('app')) ? query.get('app') : (catalog.order.includes(stage.dataset.app) ? stage.dataset.app : 'echo');
    return {key, shot: query.get('shot') === '1' ? 1 : 0, app: catalog.apps[key]};
  }
  const appLanguage = key => key === 'feed' ? 'ru' : 'en';
  const translatedStatus = (key, app) => key === 'echo' ? copy[language].statusComingSoon : app.status;
  function selectionAnnouncement(key, shot, app) {
    const actual = catalog.apps[key] || app;
    if (!actual) return '';
    return copy[language].selection(actual.title, translatedStatus(key, actual), shot === 1 ? 2 : 1, actual.shots?.length || 2);
  }
  function motionAnnouncement(paused) { return paused ? copy[language].paused : copy[language].running; }
  function rendererStatus() {
    const status = stage.querySelector('[data-renderer-status]');
    const device = stage.querySelector('.signal-device');
    if (!status || !device) return;
    const state = device.dataset.rendererState;
    if (copy[language].renderer[state]) setText(status, copy[language].renderer[state]);
  }
  function observeRendererStatus() {
    const status = stage.querySelector('[data-renderer-status]');
    if (status === observedStatus) return;
    rendererObserver?.disconnect();
    observedStatus = status;
    if (status && typeof MutationObserver !== 'undefined') {
      rendererObserver = new MutationObserver(rendererStatus);
      rendererObserver.observe(status, {childList: true, characterData: true, subtree: true});
    }
  }
  function refresh(detail) {
    const t = copy[language], selected = currentSelection(detail);
    for (const element of document.querySelectorAll('[data-i18n]')) {
      const value = t[element.dataset.i18n];
      if (typeof value === 'string') setText(element, value);
    }
    setAttribute(document.querySelector('.studio-header'), 'aria-label', t.header);
    setAttribute(document.querySelector('.studio-header-contact'), 'aria-label', t.contactLabel);
    setAttribute(document.querySelector('.studio-language-switch'), 'aria-label', t.languageGroup);
    for (const button of document.querySelectorAll('.studio-language-switch button[data-language]')) {
      const next = button.dataset.language;
      if (!languages.has(next)) continue;
      button.disabled = false;
      setAttribute(button, 'aria-pressed', String(next === language));
      setAttribute(button, 'aria-label', t.languageButton(t.languageNames[next]));
      setAttribute(button, 'lang', language);
      setAttribute(button, 'dir', 'ltr');
    }
    for (const brand of document.querySelectorAll('.studio-header-brand')) {
      setAttribute(brand, 'lang', 'en'); setAttribute(brand, 'dir', 'ltr');
    }
    setAttribute(stage.querySelector('.world-index'), 'aria-label', t.appIndex);
    setAttribute(stage.querySelector('.no-script-apps'), 'aria-label', t.noScriptIndex);
    for (const node of stage.querySelectorAll('.app-node[data-world]')) {
      const key = node.dataset.world, app = catalog.apps[key];
      if (!app) continue;
      if (node.tagName === 'BUTTON') setAttribute(node, 'aria-label', t.preview(app.title));
      const title = node.querySelector('.app-title');
      setAttribute(title, 'lang', appLanguage(key)); setAttribute(title, 'dir', 'ltr');
      if (key === 'echo') setText(node.querySelector('.app-status'), t.comingSoon);
    }
    for (const title of stage.querySelectorAll('[data-active-title]')) {
      setAttribute(title, 'lang', appLanguage(selected.key)); setAttribute(title, 'dir', 'ltr');
    }
    for (const link of stage.querySelectorAll('a[data-destination], a[data-active-link]')) {
      const key = catalog.order.includes(link.dataset.destination) ? link.dataset.destination : selected.key;
      const app = catalog.apps[key], website = websiteKeys.has(key);
      setAttribute(link, 'aria-label', t.destination(app.title, website));
      if (link.classList.contains('orbit-site-link')) {
        const label = Array.from(link.children).find(child => child.getAttribute('aria-hidden') !== 'true');
        setText(label, website ? t.website : 'Google Play');
        setAttribute(label, 'lang', website ? language : 'en');
        setAttribute(label, 'dir', website && language === 'he' ? 'rtl' : 'ltr');
      } else if (link.matches('[data-active-link]')) setText(link, (website ? t.visitWebsite : 'Google Play') + ' ↗');
    }
    for (const target of stage.querySelectorAll('[data-active-category]')) setText(target, t.categories?.[selected.key] || selected.app.category);
    for (const target of stage.querySelectorAll('[data-active-status]')) setText(target, translatedStatus(selected.key, selected.app));
    for (const target of stage.querySelectorAll('[data-active-kind]')) setText(target, websiteKeys.has(selected.key) ? t.website : 'Google Play');
    for (const image of stage.querySelectorAll('img[data-active-preview]')) setAttribute(image, 'alt', t.imagePreview(selected.app.title, websiteKeys.has(selected.key)));
    const rotor = stage.querySelector('.signal-device-rotator');
    setAttribute(rotor, 'aria-label', t.phone(selected.app.title, selected.shot + 1, selected.app.shots.length));
    if (rotor?.getAttribute('role') === 'img') setAttribute(rotor, 'aria-keyshortcuts', 'P Home ArrowLeft ArrowRight ArrowUp ArrowDown');
    setText(stage.querySelector('#phone-accessible-hint'), t.phoneHelp);
    setText(stage.querySelector('.phone-hint'), t.phoneHint);
    const fallback = stage.querySelector('.phone-render-fallback');
    setAttribute(fallback, 'alt', rotor?.getAttribute('role') === 'img' ? '' : t.phoneImage(selected.app.title));
    setText(stage.querySelector('#signal-rotation-hint'), stage.querySelector('.signal-device')?.dataset.rendererState === 'fallback' ? t.tiltHint : t.rotateHint);
    setText(stage.querySelector('.phone-retry'), t.retry);
    observeRendererStatus(); rendererStatus();
    if (document.title !== t.title) document.title = t.title;
    for (const [selector, value] of [
      ['meta[name="description"]', t.description],
      ['meta[property="og:title"]', t.title],
      ['meta[property="og:description"]', t.socialDescription]
    ]) setAttribute(document.querySelector(selector), 'content', value);
  }
  function relayout() {
    if (layoutFrame) return;
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      window.KROSiteAccess?.refresh?.();
      window.KROPrototype?.field?.refresh?.();
    });
  }
  function applyLanguage(next, options = {}) {
    if (!languages.has(next)) return false;
    const changed = next !== language;
    language = next;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    document.body.dataset.language = language;
    if (options.persist) {
      try { localStorage.setItem(storageKey, language); } catch (_) { /* Optional preference only. */ }
    }
    if (options.writeURL) {
      try {
        const url = new URL(location.href);
        url.searchParams.set('lang', language);
        history.replaceState(history.state, '', url.href);
      } catch (_) { /* file: previews and restricted history must remain usable. */ }
    }
    refresh();
    relayout();
    if (options.announce && changed) {
      const selected = currentSelection();
      const paused = window.KROPrototype?.getState?.().paused;
      setText(stage.querySelector('.selection-announcement'), selectionAnnouncement(selected.key, selected.shot, selected.app) + (paused ? ' ' + motionAnnouncement(true) : ''));
    }
    return true;
  }
  function setLanguage(next) { return applyLanguage(next, {persist: true, writeURL: true, announce: true}); }
  window.KROHomeI18n = Object.freeze({getLanguage: () => language, setLanguage, refresh, selectionAnnouncement, motionAnnouncement});
  document.addEventListener('click', event => {
    const button = event.target.closest?.('.studio-language-switch button[data-language]');
    if (button) setLanguage(button.dataset.language);
  });
  // Mirrored horizontal navigation affects app selectors, never phone rotation.
  document.addEventListener('keydown', event => {
    if (language !== 'he' || !['ArrowLeft', 'ArrowRight'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    const node = event.target.closest?.('.world-index button.app-node[data-world]');
    if (!node || !catalog.order.includes(node.dataset.world)) return;
    const index = catalog.order.indexOf(node.dataset.world), offset = event.key === 'ArrowLeft' ? 1 : -1;
    const next = catalog.order[(index + offset + catalog.order.length) % catalog.order.length];
    const target = stage.querySelector(`.world-index button.app-node[data-world="${next}"]`);
    if (target) { event.preventDefault(); event.stopPropagation(); target.focus(); }
  }, true);
  stage.addEventListener('kro:appchange', event => {
    const detail = event.detail;
    // Run after other synchronous controllers have populated their app-specific labels.
    Promise.resolve().then(() => refresh(detail));
  });
  window.addEventListener('popstate', () => applyLanguage(preferredLanguage()));
  window.addEventListener('pageshow', event => { if (event.persisted) applyLanguage(preferredLanguage()); });
  applyLanguage(language);
  if (document.fonts?.ready) document.fonts.ready.then(relayout);
})();

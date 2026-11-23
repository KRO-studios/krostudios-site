import { hike as shofetHike, venues as shofetVenues } from './data.js';
import { upperHikes } from './amud-upper.js?v=4';
import { lowerHikes } from './amud-lower.js?v=4';
import { nearbyHikes, amudVenues } from './amud-nearby.js?v=3';
import { mountTrailMap } from './map.js?v=11';
import { mountWeather } from './weather.js';
import { afterTrip } from './after-trip-data.js?v=9';
import { renderAfterTrip } from './after-trip.js?v=7';

const icons = {
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h2m4 0h2"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
  beer: '<path d="M5 8h11v12H5zM16 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2M8.5 12v5m4-5v5M5 8V7a2 2 0 0 1 3.2-1.6A2.8 2.8 0 0 1 13 5a2 2 0 0 1 3 2v1"/>',
  share: '<path d="M12 16V3m-4 4 4-4 4 4M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.4"/>',
  edit: '<path d="m13.5 6.5 4 4M4 20l4-.8L20 7a2.8 2.8 0 0 0-4-4L4.8 15.9 4 20Z"/>',
  route: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h9a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h9"/>',
  car: '<path d="m5 10 1.5-4.2A2 2 0 0 1 8.4 4h7.2a2 2 0 0 1 1.9 1.8L19 10m-15 7v2m16-2v2M4 10h16l1 3v4H3v-4l1-3Zm2 4h2m8 0h2"/>',
  arrow: '<path d="M19 12H5m6 6-6-6 6-6"/>',
  external: '<path d="M14 4h6v6m0-6-9 9m0-7H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 4H6a2 2 0 0 0-2 2v10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mountain: '<path d="m2.5 19 6-11 3 5L15 5l6.5 14H2.5Zm10.4-9.8 2.1 1.9 2.1-1.9"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};

const $ = (id) => document.getElementById(id);
const storageKey = 'shishi-trails-plan-v1';
const tabs = ['plan', 'map', 'after'];
const amudReserveUrl = 'https://www.parks.org.il/reserve-park/שמורת-טבע-נחל-עמוד/';
const routeTypes = { loop: 'מעגלי', partial: 'חצי מעגלי', linear: 'קווי', outback: 'הלוך וחזור' };
const typeOrder = ['loop', 'partial', 'linear', 'outback'];
const isNearTen = ({ distanceKm }) => distanceKm >= 8 && distanceKm <= 12;
const fromTen = ({ distanceKm }) => Number.isFinite(distanceKm) ? Math.abs(distanceKm - 10) : Infinity;
const amudHikes = [...upperHikes, ...lowerHikes, ...nearbyHikes].sort(compareRoutes);
const hikesById = new Map([...amudHikes, shofetHike].map((route) => [route.id, route]));
const featuredHikes = [
  hikesById.get('amud-upper-shkhvi'),
  hikesById.get('amud-lower-8077-pillar-sifon-return'),
  hikesById.get('amud-lower-85-pillar-return'),
];
const defaultHike = featuredHikes[0];
const dateFormat = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const localDateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' });
let plan = readSharedPlan() || readSavedPlan() || {
  hikeId: defaultHike.id, date: nextFriday(), time: defaultHike.startTime,
};
let hike = hikesById.get(plan.hikeId);
let routeFilter = amudHikes.some(isNearTen) && (isNearTen(hike) || hike.id === shofetHike.id) ? 'near' : 'all';
let routeArea = 'all';
let currentView = 'plan';
let mapInstance;
let toastTimer;

function compareRoutes(left, right) {
  return Number(Boolean(left.guidedOnly)) - Number(Boolean(right.guidedOnly))
    || Number(isNearTen(right)) - Number(isNearTen(left))
    || (isNearTen(left) && isNearTen(right) ? typeOrder.indexOf(left.type) - typeOrder.indexOf(right.type) : 0)
    || fromTen(left) - fromTen(right)
    || Number(Boolean(right.trackVerified)) - Number(Boolean(left.trackVerified))
    || left.name.localeCompare(right.name, 'he');
}

function venuesFor(route) {
  if (route.id === shofetHike.id) return shofetVenues;
  const options = route.venueIds ? amudVenues.filter(({ id }) => route.venueIds.includes(id)) : amudVenues;
  const [lat, lon] = route.trackVerified ? route.track.at(-1) ?? [route.lat, route.lon] : [route.exitLat ?? route.lat, route.exitLon ?? route.lon];
  const distance = (item) => (item.lat - lat) ** 2 + ((item.lon - lon) * Math.cos(lat * Math.PI / 180)) ** 2;
  return [...options].sort((left, right) => distance(left) - distance(right));
}

function paintIcons(container) {
  for (const icon of container.querySelectorAll('[data-icon]')) {
    const path = icons[icon.dataset.icon];
    if (path && !icon.firstChild) {
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">${path}</svg>`;
    }
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function isolateNumericRanges(text) {
  return text.replace(/\d+(?:\.\d+)?[–-]\d+(?:\.\d+)?/g, (range) => `\u2066${range}\u2069`);
}

function withIcon(parent, icon, text) {
  const indicator = element('span');
  indicator.dataset.icon = icon;
  parent.append(indicator, document.createTextNode(text));
  return parent;
}

function dateObject(value) {
  return new Date(`${value}T12:00:00Z`);
}

function dayInIsrael() {
  const parts = Object.fromEntries(localDateFormat.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function nextFriday() {
  const today = dateObject(dayInIsrael());
  today.setUTCDate(today.getUTCDate() + ((5 - today.getUTCDay() + 7) % 7));
  return today.toISOString().slice(0, 10);
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = dateObject(value);
  return date.getUTCDay() === 5 && date.toISOString().slice(0, 10) === value;
}

function validTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validatedPlan(candidate, fallbackId) {
  if (!candidate || !validDate(candidate.date) || !validTime(candidate.time)) return null;
  const route = hikesById.get(candidate.hikeId ?? fallbackId);
  if (!route) return null;
  return { hikeId: route.id, date: candidate.date, time: candidate.time };
}

function readSavedPlan() {
  try {
    return validatedPlan(JSON.parse(localStorage.getItem(storageKey)), defaultHike.id);
  } catch {
    return null;
  }
}

function readSharedPlan() {
  const fields = new URLSearchParams(location.hash.slice(1));
  return validatedPlan({ hikeId: fields.get('h'), date: fields.get('d'), time: fields.get('t') });
}

function sharedView() {
  return new URLSearchParams(location.hash.slice(1)).get('v') === 'map' ? 'map' : 'plan';
}

function shareUrl(view = 'plan', sharedPlan = plan) {
  const url = new URL(location.href);
  const fields = new URLSearchParams({ h: sharedPlan.hikeId, d: sharedPlan.date, t: sharedPlan.time });
  if (view === 'map') fields.set('v', 'map');
  url.hash = fields.toString();
  return url;
}

function isPublishedUrl(url) {
  return ['https:', 'http:'].includes(url.protocol) && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

function savePlan() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(plan));
  } catch {
    // Updating the current page remains possible with storage disabled.
  }
  if (readSharedPlan()) history.replaceState(null, '', shareUrl(sharedView()));
}

function showToast(message) {
  const toast = $('toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3800);
}

function durationLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} דק׳`;
  return remainder ? `${hours} שע׳ ו־${remainder} דק׳` : `${hours} שע׳`;
}

function renderSchedule() {
  const day = dateFormat.format(dateObject(plan.date));
  $('trip-date').textContent = `${day} · ${plan.time}`;
  $('weather-location').textContent = `תחזית באזור תחילת ההליכה · ${hike.forecastPlace || hike.parkingName || hike.region}`;
  for (const link of document.querySelectorAll('[data-map-link]')) {
    const route = hikesById.get(link.dataset.mapRoute);
    link.href = shareUrl('map', route ? planForRoute(route) : plan).href;
  }
  mountWeather($('weather'), { ...hike, startTime: plan.time }, plan.date);
}

function routeLogistics(route) {
  if (route.guidedOnly) return 'אפשרות שפורסמה כטיול מודרך. נקודות האיסוף והתוואי לפי המארגנים.';
  if (route.type === 'linear') return 'נקודות ההתחלה והסיום שונות. תכננו רכב מאסף או הסעה מראש.';
  if (route.type === 'partial') return (route.shuttleRequired ?? Boolean(route.exitUrl)) ? 'מתחילים ומסיימים במקומות שונים. תכננו איסוף מראש.' : 'חלק מההליכה חוזר על אותו שביל. מתחילים ומסיימים באותה נקודה.';
  if (route.type === 'outback') return 'חוזרים באותו שביל לנקודת ההתחלה.';
  return 'מתחילים ומסיימים באותה נקודה.';
}

function reachesPillar(route) {
  return route.stops.some(({ id }) => id === 'amud-pillar');
}

function matchesRouteArea(route) {
  if (routeArea === 'all') return true;
  if (routeArea === 'pillar') return reachesPillar(route);
  return route.section === routeArea || route.section === 'crossing';
}

function showHikeDetails() {
  $('hike-title').focus({ preventScroll: true });
  $('hike-title').closest('section').scrollIntoView({ block: 'start' });
}

function planForRoute(route) {
  const time = plan.time === hike.startTime ? route.startTime : plan.time;
  return { ...plan, hikeId: route.id, time };
}

function selectHike(route) {
  if (route.id === hike.id) return false;
  applyPlan(planForRoute(route));
  savePlan();
  return true;
}

function routeOption(route, featured = false) {
  const option = element('button', 'route-option');
  option.type = 'button';
  option.dataset.routeId = route.id;
  option.setAttribute('aria-pressed', String(route.id === hike.id));
  const facts = element('span', 'route-option-meta');
  facts.append(element('bdi', '', distanceLabel(route)), ` · ${routeTypes[route.type] || route.trailType} · ${route.difficulty}`);
  const needsPickup = route.shuttleRequired ?? (route.type === 'linear' || Boolean(route.exitUrl));
  let status = route.guidedOnly ? 'טיול מודרך' : needsPickup ? 'נדרש תיאום איסוף' : 'חזרה לנקודת ההתחלה';
  if (reachesPillar(route) && routeArea !== 'pillar' && !featured) status += ' · סלע העמוד בדרך';
  option.append(element('strong', '', featured ? route.shortName || route.name : route.name), facts, element('span', 'route-option-status', featured ? route.parkingName : status));
  option.addEventListener('click', () => {
    if (selectHike(route) && !featured) {
      $('route-list').querySelector(`[data-route-id="${CSS.escape(route.id)}"]`)?.focus({ preventScroll: true });
      showToast(`נבחר מסלול · ${hike.name}`);
    }
    if (featured) showHikeDetails();
  });
  return option;
}

function featuredRouteCard(route) {
  const card = element('div', 'featured-route');
  card.classList.toggle('is-selected', route.id === hike.id);
  const mapLink = withIcon(element('a', 'button button-outline featured-route-map'), 'map', 'פתיחת מפה');
  mapLink.dataset.view = 'map';
  mapLink.dataset.mapLink = '';
  mapLink.dataset.mapRoute = route.id;
  mapLink.setAttribute('aria-label', `פתיחת מפה · ${route.shortName || route.name}`);
  card.append(routeOption(route, true), mapLink);
  return card;
}

function renderFridayRoutes() {
  const [upper, lowerShort, lowerLong] = featuredHikes;
  const total = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 }).format(upper.distanceKm + lowerShort.distanceKm);
  $('two-walks-distance').textContent = `כ־${total} ק״מ בסך הכול, ברכב אחד`;
  $('two-walks').replaceChildren(...[upper, lowerShort].map((route) => {
    const item = element('li');
    item.append(featuredRouteCard(route));
    return item;
  }));
  $('one-walk').replaceChildren(featuredRouteCard(lowerLong));
}

function renderRouteCatalogue() {
  const list = $('route-list');
  for (const button of document.querySelectorAll('[data-route-filter]')) {
    button.setAttribute('aria-pressed', String(button.dataset.routeFilter === routeFilter));
  }
  for (const button of document.querySelectorAll('[data-route-area]')) {
    button.setAttribute('aria-pressed', String(button.dataset.routeArea === routeArea));
  }
  const results = amudHikes.filter((route) => matchesRouteArea(route)
    && (routeFilter === 'all' || routeFilter === route.type || (routeFilter === 'near' && isNearTen(route))));
  list.replaceChildren(...results.map((route) => routeOption(route)));
  $('route-filter-message').textContent = results.length === 0 ? 'אין מסלולים שעונים על הסינון. אפשר לשנות את האזור, המרחק או הסוג.' : '';
}

function distanceLabel(route) {
  if (!Number.isFinite(route.distanceKm)) return '';
  if (route.distanceKm < 1) return `כ־${Math.round(route.distanceKm * 1000)} מ׳`;
  return `${route.id === shofetHike.id ? '' : 'כ־'}${route.distanceKm} ק״מ`;
}

function applyPlan(incoming) {
  const changedRoute = incoming.hikeId !== plan.hikeId;
  plan = incoming;
  if (changedRoute) {
    mapInstance?.destroy();
    mapInstance = undefined;
    hike = hikesById.get(plan.hikeId);
    renderHike();
    renderFridayRoutes();
    renderRouteCatalogue();
    if (currentView === 'map') showMap();
  }
  renderSchedule();
  paintIcons(document);
}

function renderHike() {
  $('hike-title').textContent = hike.name;
  $('hike-summary').textContent = hike.summary;
  $('details-map-link').hidden = featuredHikes.includes(hike);
  $('map-subtitle').textContent = `${hike.name} · ${hike.region}`;
  for (const id of ['parking-link', 'map-parking-link']) {
    const link = $(id);
    link.hidden = !hike.parkingUrl;
    if (hike.parkingUrl) link.href = hike.parkingUrl;
    else link.removeAttribute('href');
    link.querySelector('.arrival-link-label').textContent = hike.parkingName ? 'ניווט לנקודת ההתחלה' : 'ניווט לחניה';
  }
  for (const id of ['finish-link', 'map-finish-link']) {
    const link = $(id);
    link.hidden = !hike.exitUrl;
    if (hike.exitUrl) link.href = hike.exitUrl;
    else link.removeAttribute('href');
  }
  $('route-link').href = hike.sourceUrl;
  const canOpenGpx = hike.trackVerified && hike.track.length > 1 && location.protocol === 'https:' && isPublishedUrl(location);
  if (canOpenGpx) {
    const gpxUrl = new URL(`./assets/gpx/${hike.id}.gpx`, location.href);
    $('hiking-map-link').href = `https://israelhiking.osm.org.il/url/${encodeURIComponent(gpxUrl.href)}`;
    $('hiking-map-label').textContent = 'פתיחת GPX ב־Israel Hiking Map';
  } else {
    $('hiking-map-link').href = hike.hikingMapUrl || `https://israelhiking.osm.org.il/map/15/${hike.lat}/${hike.lon}`;
    $('hiking-map-label').textContent = 'מפת סימון שבילים';
  }
  $('map-source-hint').textContent = hike.trackVerified ? 'לפני היציאה כדאי לבדוק אם פורסם שינוי במסלול ולהיעזר בסימוני השבילים בשטח.' : 'התצוגה כוללת נקודות ייחוס בלבד. לניווט בשטח, פתחו את מקור המסלול.';

  const metrics = [
    ['route', 'מרחק', distanceLabel(hike) || 'לא פורסם'],
    ['clock', 'זמן משוער', isolateNumericRanges(hike.durationLabel || (Number.isFinite(hike.durationMinutes) ? durationLabel(hike.durationMinutes) : 'לא פורסם'))],
    ['mountain', 'קושי', hike.difficulty],
    ['map', 'סוג מסלול', hike.trailType || routeTypes[hike.type]],
  ];
  if (Number.isFinite(hike.elevationGainM)) metrics.push(['mountain', 'טיפוס משוער', `${hike.elevationGainM} מ׳`]);

  for (const id of ['hike-metrics', 'hike-stops', 'hike-notes', 'hike-steps', 'hike-blazes', 'route-logistics']) $(id).replaceChildren();
  for (const [icon, name, value] of metrics) {
    const item = element('div', 'metric');
    item.append(withIcon(element('dt'), icon, name), element('dd', '', value));
    $('hike-metrics').append(item);
  }
  if (hike.parkingName || hike.exitName) {
    const endpoints = element('p');
    if (hike.parkingName) endpoints.append(element('strong', '', 'התחלה: '), hike.parkingName);
    if (hike.exitName) endpoints.append(hike.parkingName ? ' · ' : '', element('strong', '', 'סיום: '), hike.exitName);
    $('route-logistics').append(endpoints);
  }
  $('route-logistics').append(element('p', '', routeLogistics(hike)));
  $('hike-directions').hidden = !hike.directions?.length;
  for (const direction of hike.directions ?? []) $('hike-steps').append(element('li', '', direction));
  for (const blaze of hike.blazes ?? []) {
    const key = element('li');
    const symbol = element('span', 'blaze-symbol');
    symbol.dataset.blaze = blaze.color;
    symbol.setAttribute('aria-hidden', 'true');
    key.append(symbol, blaze.label);
    $('hike-blazes').append(key);
  }
  $('hike-notes-panel').open = featuredHikes.includes(hike);
  for (const [index, stop] of hike.stops.entries()) {
    const item = element('li');
    const link = element('button', 'stop-link', stop.name);
    link.type = 'button';
    link.setAttribute('aria-label', `הצגה במפה: ${stop.name}`);
    link.addEventListener('click', () => {
      showView('map');
      mapInstance?.focusStop?.(index);
    });
    item.append(link);
    if (stop.note) item.append(document.createTextNode(` · ${stop.note}`));
    $('hike-stops').append(item);
  }
  for (const note of hike.notes) $('hike-notes').append(element('li', '', note));
}

function showView(view) {
  if (!tabs.includes(view) || view === currentView) return;
  if (currentView === 'map') mapInstance?.suspend?.();
  if (view !== 'map' && sharedView() === 'map') history.replaceState(null, '', shareUrl());
  for (const tab of tabs) $(`view-${tab}`).hidden = tab !== view;
  const banner = $('category-banner');
  banner.hidden = view === 'map';
  $('share-open-label').textContent = view === 'map' ? 'שיתוף מפה' : 'שיתוף הטיול';
  const category = view === 'map' ? 'plan' : view;
  for (const button of banner.querySelectorAll('[data-view]')) {
    if (button.dataset.view === category) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (view === 'map') showMap();
  currentView = view;
  $({ plan: 'friday-routes-title', map: 'map-title', after: 'after-title' }[view]).focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function showMap() {
  mapInstance ??= mountTrailMap($('trail-map'), hike, venuesFor(hike));
  mapInstance.resize();
}

function openShare(view) {
  const url = shareUrl(view);
  $('share-title').textContent = view === 'map' ? 'שיתוף מפת המסלול' : 'שיתוף הטיול';
  $('share-url-label').textContent = view === 'map' ? 'קישור לפתיחת המפה' : 'קישור לתוכנית';
  const details = view === 'map' ? 'מפת המסלול' : afterTrip.name;
  $('share-summary').textContent = `${hike.name} · ${dateFormat.format(dateObject(plan.date))} · ${plan.time} · ${details}`;
  $('share-url').value = url.href;
  $('share-status').hidden = true;
  const localHost = !isPublishedUrl(url);
  $('share-host-note').hidden = !localHost;
  $('share-native').hidden = localHost || typeof navigator.share !== 'function';
  $('share-dialog').showModal();
}

async function copyShare() {
  const status = $('share-status');
  const input = $('share-url');
  try {
    await navigator.clipboard.writeText(input.value);
    status.textContent = 'הקישור הועתק.';
  } catch {
    input.focus();
    input.select();
    status.textContent = 'הקישור מסומן להעתקה.';
  }
  status.hidden = false;
}

function updateNetwork() {
  const offline = !navigator.onLine;
  $('network-footer').hidden = !offline;
  $('network-status').textContent = offline ? 'אין חיבור לאינטרנט' : '';
}

document.addEventListener('click', (event) => {
  const control = event.target.closest('[data-view]');
  if (!control) return;
  if (control.matches('a[href]') && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) return;
  event.preventDefault();
  const route = hikesById.get(control.dataset.mapRoute);
  if (route) selectHike(route);
  showView(control.dataset.view);
});
for (const control of document.querySelectorAll('[data-close-dialog]')) {
  control.addEventListener('click', () => control.closest('dialog').close());
}
for (const filter of document.querySelectorAll('[data-route-filter]')) {
  filter.addEventListener('click', () => {
    routeFilter = filter.dataset.routeFilter;
    renderRouteCatalogue();
  });
}
for (const filter of document.querySelectorAll('[data-route-area]')) {
  filter.addEventListener('click', () => {
    if (routeArea === filter.dataset.routeArea) return;
    routeArea = filter.dataset.routeArea;
    if (routeArea !== 'all') routeFilter = 'all';
    renderRouteCatalogue();
  });
}
$('show-route-details').addEventListener('click', showHikeDetails);
$('edit-open').addEventListener('click', () => {
  $('plan-date').min = dayInIsrael();
  $('plan-date').value = plan.date;
  $('start-time').value = plan.time;
  $('edit-message').hidden = true;
  $('edit-dialog').showModal();
});
$('edit-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const date = $('plan-date').value;
  const time = $('start-time').value;
  if (!validDate(date) || !validTime(time)) {
    $('edit-message').textContent = 'יש לבחור תאריך שחל ביום שישי ושעת יציאה תקינה.';
    $('edit-message').hidden = false;
    return;
  }
  plan = { ...plan, date, time };
  savePlan();
  renderSchedule();
  $('edit-dialog').close();
  showToast('מועד הטיול נשמר.');
});
$('share-open').addEventListener('click', () => openShare(currentView));
$('share-map').addEventListener('click', () => openShare('map'));
$('share-copy').addEventListener('click', copyShare);
$('share-native').addEventListener('click', async () => {
  try {
    await navigator.share({ title: 'שישי בשבילים', text: $('share-summary').textContent, url: $('share-url').value });
  } catch (error) {
    if (error.name !== 'AbortError') await copyShare();
  }
});
window.addEventListener('online', updateNetwork);
window.addEventListener('offline', updateNetwork);
window.addEventListener('hashchange', () => {
  const incoming = readSharedPlan();
  if (!incoming) return;
  applyPlan(incoming);
  showView(sharedView());
});

$('amud-official-link').href = amudReserveUrl;
renderFridayRoutes();
renderRouteCatalogue();
renderHike();
renderSchedule();
renderAfterTrip($('after-trip'), afterTrip);
paintIcons(document);
updateNetwork();
if (readSharedPlan()) showView(sharedView());
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Offline cache setup failed', error));
}

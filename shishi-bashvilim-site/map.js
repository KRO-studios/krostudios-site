const LEAFLET_ROOT = new URL("./vendor/leaflet/", import.meta.url);
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TRAIL_COLORS = {
  black: ["#262b22", "שחור"],
  blue: ["#1768ae", "כחול"],
  green: ["#28713d", "ירוק"],
  red: ["#b42b36", "אדום"],
};
const GPS_OPTIONS = { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 };
const POINT_TYPES = {
  parking: ["חניה", "P"],
  trailhead: ["תחילת מסלול", "▶"],
  start: ["תחילת מסלול", "▶"],
  finish: ["סיום המסלול", "■"],
  end: ["סיום המסלול", "■"],
  viewpoint: ["תצפית", "◆"],
  view: ["תצפית", "◆"],
  water: ["מים", "≈"],
  restaurant: ["מסעדה", "🍴"],
  cafe: ["בית קפה", "☕"],
  bar: ["בר", "🍷"],
  winery: ["יקב", "🍷"],
  site: ["אתר", "◆"],
  spring: ["מעיין", "≈"],
};
const HEBREW_TYPES = {
  חניה: "parking",
  תצפית: "viewpoint",
  אתר: "site",
  מעיין: "spring",
  מסעדה: "restaurant",
  "בית קפה": "cafe",
  בר: "bar",
  יקב: "winery",
  "נקודת התחלה": "start",
  סיום: "finish",
};
let leafletReady;

function loadLeafletAsset(element) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(fail, 8000);
    function fail() {
      clearTimeout(timer);
      element.remove();
      reject(new Error("Leaflet asset unavailable"));
    }
    element.addEventListener("load", () => {
      clearTimeout(timer);
      resolve(element);
    }, { once: true });
    element.addEventListener("error", fail, { once: true });
    document.head.append(element);
  });
}

function loadLeaflet() {
  if (leafletReady) return leafletReady;
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = new URL("leaflet.css", LEAFLET_ROOT).href;
  style.crossOrigin = "anonymous";
  style.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
  const script = document.createElement("script");
  script.src = new URL("leaflet.js", LEAFLET_ROOT).href;
  script.crossOrigin = "anonymous";
  script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
  leafletReady = Promise.all([loadLeafletAsset(style), loadLeafletAsset(script)])
    .then(() => window.L)
    .catch(error => {
      style.remove();
      script.remove();
      leafletReady = undefined;
      throw error;
    });
  return leafletReady;
}

function validCoordinates([lat, lon] = []) {
  return Number.isFinite(lat) && Number.isFinite(lon)
    && Math.abs(lat) <= 85.05 && Math.abs(lon) <= 180;
}

function safeLink(link, url) {
  link.hidden = true;
  link.removeAttribute("href");
  if (!url) return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") {
      link.href = parsed.href;
      link.hidden = false;
    }
  } catch {
    // Keep the direction link hidden until a valid HTTPS URL is available.
  }
}

function createButton(label, action, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (options.aria) button.setAttribute("aria-label", options.aria);
  if (options.className) button.className = options.className;
  button.addEventListener("click", action);
  return button;
}

function formatDistance(meters) {
  return meters >= 1000 ? (meters / 1000).toLocaleString("he-IL") + " ק״מ" : meters + " מ׳";
}

function distanceToPath([x, y], path) {
  let nearest = Infinity;
  for (let index = 1; index < path.length; index += 1) {
    const [startX, startY] = path[index - 1];
    const [endX, endY] = path[index];
    const dx = endX - startX;
    const dy = endY - startY;
    const lengthSquared = dx * dx + dy * dy;
    const projection = lengthSquared ? ((x - startX) * dx + (y - startY) * dy) / lengthSquared : 0;
    const t = Math.min(1, Math.max(0, projection));
    nearest = Math.min(nearest, Math.hypot(x - startX - t * dx, y - startY - t * dy));
  }
  return nearest;
}

export function mountTrailMap(container, hike, venues = []) {
  const track = hike.trackVerified ? (hike.track ?? []).filter(point => Array.isArray(point) && validCoordinates(point)) : [];
  const hasRoute = track.length > 1;
  const sections = hasRoute ? (hike.lineSections ?? [])
    .filter(section => Object.hasOwn(TRAIL_COLORS, section.color) && Array.isArray(section.track)
      && section.track.length > 1 && section.track.every(point => Array.isArray(point) && validCoordinates(point))) : [];
  const unavailableMessage = "לא הצלחנו לטעון את המפה.";
  const offlineMessage = "אין חיבור לאינטרנט. המפה תיטען כשהחיבור יחזור.";
  container.classList.add("trail-map");
  container.dir = "rtl";
  const stops = (hike.stops ?? [])
    .map((stop, stopIndex) => ({ ...stop, stopIndex }))
    .filter(({ lat, lon }) => validCoordinates([lat, lon]));
  if (!hasRoute && !stops.length && validCoordinates([hike.lat, hike.lon])) {
    stops.push({ name: hike.parkingName || hike.name, lat: hike.lat, lon: hike.lon, kind: "נקודת עניין", note: "נקודת ייחוס באזור המסלול." });
  }
  const pointLists = [[stops, false], [venues, true]];
  const points = pointLists.flatMap(([entries, venue]) => entries
    .filter(point => validCoordinates([point.lat, point.lon]))
    .map(point => ({
      ...point,
      venue,
      type: HEBREW_TYPES[point.kind] ?? (Object.hasOwn(POINT_TYPES, point.kind)
        ? point.kind : venue ? "restaurant" : "site"),
    })));
  const origin = track[0] || (stops[0] && [stops[0].lat, stops[0].lon]);
  if (!origin) {
    container.textContent = "אין נקודות ייחוס להצגה. אפשר לפתוח את מקור המסלול.";
    return { resize() {}, suspend() {}, focusStop() {}, destroy() { container.replaceChildren(); } };
  }
  const longitudeScale = 111_320 * Math.cos(origin[0] * Math.PI / 180);
  const project = ([lat, lon]) => [(lon - origin[1]) * longitudeScale, (origin[0] - lat) * 111_132];
  const projectedTrack = track.map(project);
  for (const point of points) point.position = project([point.lat, point.lon]);
  let includeVenues = false;
  let location;
  let selectedPoint;
  let onlineMap;
  let onlineVenueLayer;
  let onlinePosition;
  let onlineRequest = 0;
  let tileTimer;
  let mapLoading = false;
  let mapReady = false;
  let activeWatch;
  let gpsGeneration = 0;
  let watching = false;
  let followCenter = false;
  let destroyed = false;

  container.innerHTML = `
    <div class="trail-map-frame">
      <div class="trail-map-live" hidden role="region" aria-label="מפת המסלול על גבי OpenStreetMap"></div>
      <div class="trail-map-state">
        <p class="trail-map-status" role="status">המפה נטענת…</p>
      </div>
      <div class="trail-map-controls" aria-label="בקרי מפה" hidden></div>
    </div>
    <div class="trail-map-tools"></div>
    <p class="trail-map-gps-status" aria-live="polite" hidden></p>
    <div class="trail-map-details" hidden>
      <div>
        <span class="trail-map-point-type"></span>
        <strong></strong>
        <p></p>
        <a target="_blank" rel="noopener noreferrer" hidden>ניווט לנקודה ↗</a>
      </div>
    </div>
    <div class="trail-map-key" hidden>
      ${hasRoute && !sections.length ? '<span class="trail-map-key-route">מסלול הליכה</span>' : ''}
      <span class="trail-map-key-stop">נקודה במסלול</span>
      <span class="trail-map-key-venue">אוכל ושתייה</span>
    </div>`;

  const frame = container.querySelector(".trail-map-frame");
  const onlineView = container.querySelector(".trail-map-live");
  const state = container.querySelector(".trail-map-state");
  const controls = container.querySelector(".trail-map-controls");
  const tools = container.querySelector(".trail-map-tools");
  const status = container.querySelector(".trail-map-status");
  const gpsStatus = container.querySelector(".trail-map-gps-status");
  const details = container.querySelector(".trail-map-details");
  const detailType = details.querySelector(".trail-map-point-type");
  const detailTitle = details.querySelector("strong");
  const detailNote = details.querySelector("p");
  const detailLink = details.querySelector("a");
  const mapKey = container.querySelector(".trail-map-key");
  const displayedColors = new Set(sections.map(section => section.color));
  const blazes = (hike.blazes ?? []).filter(blaze => displayedColors.has(blaze.color) && blaze.label);
  for (const color of displayedColors) {
    if (!blazes.some(blaze => blaze.color === color)) blazes.push({ color, label: TRAIL_COLORS[color][1] });
  }
  mapKey.prepend(...blazes.map(({ color, label }) => {
    const key = document.createElement("span");
    key.className = "trail-map-key-blaze";
    key.style.setProperty("--blaze-color", TRAIL_COLORS[color][0]);
    key.textContent = label;
    return key;
  }));
  function showPoint(point) {
    selectedPoint?.marker?.getElement()?.removeAttribute("aria-current");
    selectedPoint = point;
    details.hidden = !point;
    if (!point) return;
    point.marker?.getElement()?.setAttribute("aria-current", "true");
    detailType.textContent = POINT_TYPES[point.type][0];
    detailTitle.textContent = point.name;
    detailNote.textContent = point.note ?? "";
    detailNote.hidden = !point.note;
    safeLink(detailLink, point.mapsUrl);
  }

  details.append(createButton("×", () => {
    const point = selectedPoint;
    showPoint(null);
    point?.marker?.getElement()?.focus();
  }, { aria: "סגירת פרטי הנקודה", className: "trail-map-close" }));

  function fitOnline() {
    if (!onlineMap) return;
    const positions = points.filter(point => !point.venue || includeVenues).map(point => [point.lat, point.lon]);
    const bounds = window.L.latLngBounds(track.concat(positions));
    onlineMap.fitBounds(bounds, { padding: [48, 68], maxZoom: 17, animate: false });
  }

  function fit() {
    followCenter = false;
    fitOnline();
  }

  controls.append(
    createButton("+", () => onlineMap?.zoomIn(), { aria: "הגדלת המפה" }),
    createButton("−", () => onlineMap?.zoomOut(), { aria: "הקטנת המפה" }),
    createButton("⤢", fit, { aria: hasRoute ? "הצגת המסלול המלא" : "הצגת כל נקודות הייחוס" }),
  );

  function updateVenueDisplay() {
    includeVenues = !includeVenues;
    venuesButton.setAttribute("aria-pressed", String(includeVenues));
    if (!includeVenues && selectedPoint?.venue) showPoint(null);
    if (onlineVenueLayer) {
      if (includeVenues) onlineVenueLayer.addTo(onlineMap);
      else onlineVenueLayer.remove();
    }
    fit();
  }

  const venuesButton = createButton("אוכל ושתייה", updateVenueDisplay);
  const hasVenues = points.some(point => point.venue);
  venuesButton.hidden = true;
  venuesButton.setAttribute("aria-pressed", "false");

  function updateOnlinePosition() {
    if (!onlineMap) return;
    if (!location) {
      onlinePosition?.remove();
      onlinePosition = undefined;
      return;
    }
    const coordinates = [location.lat, location.lon];
    if (onlinePosition) {
      onlinePosition.setLatLng(coordinates);
      return;
    }
    onlinePosition = window.L.circleMarker(coordinates, {
      radius: 6, weight: 3, color: "white", fillColor: "#2563eb", fillOpacity: 1,
    }).bindTooltip("המיקום שלי").addTo(onlineMap);
  }

  function setGpsStatus(message) {
    gpsStatus.hidden = false;
    if (gpsStatus.textContent !== message) gpsStatus.textContent = message;
  }

  function centerLocation() {
    if (onlineMap && mapReady) onlineMap.panTo([location.lat, location.lon]);
  }

  function showFix({ coords }, recenter) {
    const coordinates = [coords.latitude, coords.longitude];
    if (!validCoordinates(coordinates)) return;
    location = {
      lat: coords.latitude,
      lon: coords.longitude,
      position: project(coordinates),
    };
    const distance = hasRoute ? distanceToPath(location.position, projectedTrack)
      : Math.min(...points.filter(point => !point.venue)
        .map(({ position: [x, y] }) => Math.hypot(x - location.position[0], y - location.position[1])));
    const isNearby = distance < 15_000;
    location.isNearby = isNearby;
    const statusParts = [];
    if (watching) statusParts.push("מעקב פעיל");
    statusParts.push(isNearby ? "המיקום אותר" : "המיקום מחוץ לאזור המסלול");
    if (Number.isFinite(coords.accuracy)) statusParts.push("דיוק משוער " + formatDistance(Math.round(coords.accuracy)));
    if (hasRoute && isNearby) {
      statusParts.push(distance < 5 ? "סמוך לקו המסלול"
        : "מרחק בקו ישר מתוואי המסלול כ־" + formatDistance(Math.round(distance / 10) * 10));
    }
    setGpsStatus(statusParts.join(" · ") + ".");
    updateOnlinePosition();
    if (recenter && isNearby) centerLocation();
  }

  function gpsError(error) {
    return error.code === 1
      ? "לא ניתן לגשת למיקום. אפשר לאפשר גישה בהגדרות הדפדפן."
      : "לא התקבל מיקום. אפשר לנסות שוב.";
  }

  function clearLocation() {
    location = undefined;
    updateOnlinePosition();
  }

  function stopTracking(message) {
    gpsGeneration += 1;
    if (activeWatch !== undefined) navigator.geolocation.clearWatch(activeWatch);
    activeWatch = undefined;
    watching = false;
    followCenter = false;
    gpsButton.disabled = false;
    trackingButton.textContent = "מעקב בזמן הליכה";
    trackingButton.classList.remove("is-tracking");
    clearLocation();
    if (message) setGpsStatus(message);
  }

  function showLocation() {
    if (watching) {
      if (location?.isNearby) {
        followCenter = true;
        centerLocation();
      }
      return;
    }
    if (!navigator.geolocation) return setGpsStatus("המכשיר אינו תומך באיתור מיקום בדפדפן.");
    gpsButton.disabled = true;
    const generation = ++gpsGeneration;
    setGpsStatus("מאתר את המיקום…");
    clearLocation();
    navigator.geolocation.getCurrentPosition(fix => {
      if (destroyed || generation !== gpsGeneration) return;
      gpsButton.disabled = false;
      showFix(fix, true);
    }, error => {
      if (destroyed || generation !== gpsGeneration) return;
      gpsButton.disabled = false;
      clearLocation();
      setGpsStatus(gpsError(error));
    }, GPS_OPTIONS);
  }

  const gpsButton = createButton("המיקום שלי", showLocation);
  const trackingButton = createButton("מעקב בזמן הליכה", () => {
    if (watching) return stopTracking("מעקב המיקום הופסק.");
    if (!navigator.geolocation?.watchPosition) return setGpsStatus("המכשיר אינו תומך במעקב מיקום בדפדפן.");
    const generation = ++gpsGeneration;
    watching = true;
    followCenter = true;
    gpsButton.disabled = true;
    trackingButton.textContent = "עצירת מעקב";
    trackingButton.classList.add("is-tracking");
    setGpsStatus("מחפש את המיקום כדי להתחיל במעקב…");
    clearLocation();
    activeWatch = navigator.geolocation.watchPosition(fix => {
      if (destroyed || generation !== gpsGeneration) return;
      gpsButton.disabled = false;
      showFix(fix, followCenter);
    }, error => {
      if (destroyed || generation !== gpsGeneration) return;
      if (error.code === 1) {
        stopTracking(gpsError(error));
      } else {
        clearLocation();
        gpsButton.disabled = true;
        setGpsStatus("ממתין לאיתות מיקום. המעקב עדיין פעיל.");
      }
    }, GPS_OPTIONS);
  });

  function suspend() {
    const wasWatching = watching;
    stopTracking(wasWatching ? "מעקב המיקום הופסק כשהמפה הוסתרה." : undefined);
    if (!wasWatching) gpsStatus.hidden = true;
  }

  function visibilityChanged() {
    if (document.hidden) suspend();
  }

  function focusStop(index) {
    const point = points.find(candidate => candidate.stopIndex === index);
    if (!point) return;
    followCenter = false;
    showPoint(point);
    if (mapReady) {
      onlineMap.setView([point.lat, point.lon], Math.max(onlineMap.getZoom(), 15), { animate: false });
    }
  }

  function showMap() {
    mapLoading = false;
    mapReady = true;
    clearTimeout(tileTimer);
    onlineView.classList.remove("is-loading");
    if (retryButton === document.activeElement) onlineView.focus();
    state.hidden = true;
    controls.hidden = false;
    mapKey.hidden = false;
    venuesButton.hidden = !hasVenues;
  }

  function hasVisibleTile(layer) {
    const bounds = onlineView.getBoundingClientRect();
    return Array.from(layer.getContainer().querySelectorAll(".leaflet-tile-loaded")).some(tile => {
      const box = tile.getBoundingClientRect();
      return box.right > bounds.left && box.left < bounds.right
        && box.bottom > bounds.top && box.top < bounds.bottom;
    });
  }

  function buildOnlineMap(L) {
    const request = onlineRequest;
    onlineMap = L.map(onlineView, { zoomControl: false, scrollWheelZoom: false, minZoom: 4, maxZoom: 19 });
    onlineMap.on("dragstart", () => { followCenter = false; });
    onlineMap.attributionControl.setPrefix(false);
    const base = L.tileLayer(TILE_URL, {
      maxZoom: 19,
      referrerPolicy: "strict-origin-when-cross-origin",
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    });
    base.on("tileload", () => {
      if (mapLoading) showMap();
    });
    base.on("load", () => queueMicrotask(() => {
      if (destroyed || request !== onlineRequest || !frame.clientWidth) return;
      if (!hasVisibleTile(base)) showUnavailable(navigator.onLine ? unavailableMessage : offlineMessage);
    }));
    base.addTo(onlineMap);
    if (hasRoute) {
      L.polyline(track, { color: "#fff8eb", weight: 9, smoothFactor: 0 }).addTo(onlineMap);
      L.polyline(track, { color: "#ab471e", weight: 5, smoothFactor: 0 }).addTo(onlineMap);
      for (const section of sections) L.polyline(section.track, { color: TRAIL_COLORS[section.color][0], weight: 5, smoothFactor: 0 }).addTo(onlineMap);
    }
    onlineVenueLayer = L.layerGroup();
    for (const point of points) {
      const marker = L.marker([point.lat, point.lon], {
        icon: L.divIcon({
          className: "trail-map-leaflet-pin" + (point.venue ? " is-venue" : ""),
          html: POINT_TYPES[point.type][1],
          iconSize: [32, 32],
        }),
        title: point.name,
        alt: POINT_TYPES[point.type][0] + ": " + point.name,
      });
      marker.on("click", () => showPoint(point));
      marker.on("add", () => {
        const element = marker.getElement();
        element?.setAttribute("aria-label", POINT_TYPES[point.type][0] + ": " + point.name);
        if (point === selectedPoint) element?.setAttribute("aria-current", "true");
      });
      point.marker = marker;
      marker.addTo(point.venue ? onlineVenueLayer : onlineMap);
    }
    if (includeVenues) onlineVenueLayer.addTo(onlineMap);
    updateOnlinePosition();
  }

  function showUnavailable(message) {
    mapLoading = false;
    mapReady = false;
    onlineRequest++;
    clearTimeout(tileTimer);
    onlineMap?.remove();
    onlineMap = undefined;
    onlineVenueLayer = undefined;
    onlinePosition = undefined;
    onlineView.hidden = true;
    state.hidden = false;
    controls.hidden = true;
    mapKey.hidden = true;
    venuesButton.hidden = true;
    retryButton.hidden = !navigator.onLine;
    retryButton.disabled = false;
    frame.classList.add("is-unavailable");
    status.textContent = message;
  }

  async function openOnline() {
    if (destroyed || mapLoading || mapReady) return;
    if (!navigator.onLine) {
      showUnavailable(offlineMessage);
      return;
    }
    mapLoading = true;
    const request = ++onlineRequest;
    frame.classList.remove("is-unavailable");
    retryButton.disabled = true;
    status.textContent = "המפה נטענת…";
    try {
      const L = await loadLeaflet();
      if (destroyed || request !== onlineRequest) return;
      onlineView.classList.add("is-loading");
      onlineView.hidden = false;
      tileTimer = setTimeout(() => showUnavailable(navigator.onLine ? unavailableMessage : offlineMessage), 6000);
      buildOnlineMap(L);
      if (followCenter && location?.isNearby) {
        onlineMap.setView([location.lat, location.lon], 15, { animate: false });
      } else if (selectedPoint) {
        onlineMap.setView([selectedPoint.lat, selectedPoint.lon], 15, { animate: false });
      } else {
        fitOnline();
      }
    } catch {
      if (!destroyed && request === onlineRequest) showUnavailable(navigator.onLine ? unavailableMessage : offlineMessage);
    }
  }

  const retryButton = createButton("טעינה מחדש של המפה", openOnline, { className: "trail-map-retry" });
  retryButton.hidden = true;
  state.append(retryButton);
  tools.append(trackingButton, gpsButton, venuesButton);

  function goOffline() {
    if (!mapReady) showUnavailable(offlineMessage);
  }

  function resize() {
    if (frame.clientWidth < 100 || frame.clientHeight < 100) return;
    onlineMap?.invalidateSize({ pan: false });
  }

  const observer = new ResizeObserver(resize);
  observer.observe(frame);
  document.addEventListener("visibilitychange", visibilityChanged);
  window.addEventListener("pagehide", suspend);
  window.addEventListener("online", openOnline);
  window.addEventListener("offline", goOffline);
  openOnline();

  return {
    resize,
    suspend,
    focusStop,
    destroy() {
      destroyed = true;
      stopTracking();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("pagehide", suspend);
      window.removeEventListener("online", openOnline);
      window.removeEventListener("offline", goOffline);
      clearTimeout(tileTimer);
      onlineMap?.remove();
      container.replaceChildren();
    },
  };
}

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
const SVG_NS = "http://www.w3.org/2000/svg";
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

function range(values) {
  return values.reduce(([low, high], value) => [Math.min(low, value), Math.max(high, value)], [Infinity, -Infinity]);
}

function formatDistance(meters) {
  return meters >= 1000 ? (meters / 1000).toLocaleString("he-IL") + " ק״מ" : meters + " מ׳";
}

function svgPath(points) {
  return points.map(([x, y], index) => (index ? "L" : "M") + x + " " + y).join(" ");
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
  const viewLabel = hasRoute ? "תרשים המסלול" : "מפת נקודות הייחוס";
  const routeMessage = hasRoute ? "מוצג תרשים המסלול." : "מוצגות נקודות הייחוס באזור. תוואי ההליכה אינו זמין כאן.";
  const unavailableMessage = `מפת הרקע אינה זמינה כרגע. ${routeMessage}`;
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
  const routePath = svgPath(projectedTrack);
  let center = [0, 0];
  let width = 320;
  let height = 430;
  let baseZoom = 1;
  let zoom = 1;
  let includeVenues = false;
  let location;
  let drag;
  let activeMode = "route";
  let selectedPoint;
  let onlineMap;
  let onlineVenueLayer;
  let onlinePosition;
  let onlineRequest = 0;
  let tileTimer;
  let preferOnline = true;
  let activeWatch;
  let gpsGeneration = 0;
  let watching = false;
  let followCenter = false;
  let destroyed = false;

  container.innerHTML = `
    <div class="trail-map-frame">
      <div class="trail-map-viewport" tabindex="0" role="region" aria-label="${viewLabel}. מקשי החצים מזיזים את התצוגה">
        <svg aria-hidden="true" class="trail-map-drawing" xmlns="${SVG_NS}">
          <path class="trail-map-outline" vector-effect="non-scaling-stroke"></path>
          <path class="trail-map-line" vector-effect="non-scaling-stroke"></path>
        </svg>
        <div class="trail-map-pin-layer"></div>
        <span class="trail-map-north" aria-hidden="true">▲ צפון</span>
        <span class="trail-map-scale" aria-hidden="true"></span>
      </div>
      <div class="trail-map-live" hidden aria-label="מפת OpenStreetMap"></div>
      <div class="trail-map-controls" aria-label="בקרי מפה"></div>
    </div>
    <div class="trail-map-tools"></div>
    <p class="trail-map-status" aria-live="polite">${routeMessage}</p>
    <p class="trail-map-gps-status" aria-live="polite" hidden></p>
    <div class="trail-map-details" hidden>
      <div>
        <span class="trail-map-point-type"></span>
        <strong></strong>
        <p></p>
        <a target="_blank" rel="noopener noreferrer" hidden>ניווט לנקודה ↗</a>
      </div>
    </div>
    <div class="trail-map-key">
      ${hasRoute && !sections.length ? '<span class="trail-map-key-route">מסלול הליכה</span>' : ''}
      <span class="trail-map-key-stop">נקודה במסלול</span>
      <span class="trail-map-key-venue">אוכל ושתייה</span>
    </div>`;

  const frame = container.querySelector(".trail-map-frame");
  const routeView = container.querySelector(".trail-map-viewport");
  const drawing = container.querySelector(".trail-map-drawing");
  const scale = container.querySelector(".trail-map-scale");
  const pinLayer = container.querySelector(".trail-map-pin-layer");
  const onlineView = container.querySelector(".trail-map-live");
  const controls = container.querySelector(".trail-map-controls");
  const tools = container.querySelector(".trail-map-tools");
  const status = container.querySelector(".trail-map-status");
  const gpsStatus = container.querySelector(".trail-map-gps-status");
  const details = container.querySelector(".trail-map-details");
  const detailType = details.querySelector(".trail-map-point-type");
  const detailTitle = details.querySelector("strong");
  const detailNote = details.querySelector("p");
  const detailLink = details.querySelector("a");
  for (const path of drawing.querySelectorAll("path")) path.setAttribute("d", routePath);
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
  for (const section of sections) {
    const path = document.createElementNS(SVG_NS, "path");
    path.classList.add("trail-map-line");
    path.dataset.blaze = section.color;
    path.setAttribute("vector-effect", "non-scaling-stroke");
    path.setAttribute("d", svgPath(section.track.map(project)));
    path.style.stroke = TRAIL_COLORS[section.color][0];
    drawing.append(path);
  }

  function showPoint(point) {
    if (selectedPoint) selectedPoint.marker.removeAttribute("aria-current");
    selectedPoint = point;
    details.hidden = !point;
    if (!point) return;
    point.marker.setAttribute("aria-current", "true");
    detailType.textContent = POINT_TYPES[point.type][0];
    detailTitle.textContent = point.name;
    detailNote.textContent = point.note ?? "";
    detailNote.hidden = !point.note;
    safeLink(detailLink, point.mapsUrl);
  }

  details.append(createButton("×", () => {
    const point = selectedPoint;
    showPoint(null);
    if (activeMode === "route") point?.marker.focus();
  }, { aria: "סגירת פרטי הנקודה", className: "trail-map-close" }));

  for (const point of points) {
    const [type, symbol] = POINT_TYPES[point.type];
    const marker = createButton(symbol, () => showPoint(point), {
      aria: type + ": " + point.name,
      className: "trail-map-pin" + (point.venue ? " is-venue" : ""),
    });
    marker.title = point.name;
    point.marker = marker;
    pinLayer.append(marker);
  }
  const locationMarker = document.createElement("span");
  locationMarker.className = "trail-map-user-pin";
  locationMarker.title = "המיקום שלי";
  locationMarker.hidden = true;
  locationMarker.setAttribute("aria-hidden", "true");
  pinLayer.append(locationMarker);

  function screenPoint([x, y]) {
    return [(x - center[0]) * zoom + width / 2, (y - center[1]) * zoom + height / 2];
  }

  function positionMarker(element, position, visible, priority = 0) {
    if (!visible) {
      element.hidden = true;
      return;
    }
    const [x, y] = screenPoint(position);
    element.hidden = x < 0 || x > width || y < 0 || y > height;
    element.style.left = x + "px";
    element.style.top = y + "px";
    element.style.zIndex = priority;
  }

  function draw() {
    const viewWidth = width / zoom;
    const viewHeight = height / zoom;
    drawing.setAttribute("viewBox", [center[0] - viewWidth / 2, center[1] - viewHeight / 2, viewWidth, viewHeight].join(" "));
    for (const [index, point] of points.entries()) {
      positionMarker(point.marker, point.position, !point.venue || includeVenues, index + 1);
    }
    if (location) positionMarker(locationMarker, location.position, true, points.length + 1);
    else locationMarker.hidden = true;
    const targetMeters = 70 / zoom;
    const magnitude = 10 ** Math.floor(Math.log10(targetMeters));
    const distance = (targetMeters >= 5 * magnitude ? 5 : targetMeters >= 2 * magnitude ? 2 : 1) * magnitude;
    scale.style.width = distance * zoom + "px";
    scale.textContent = formatDistance(Number(distance.toPrecision(3)));
  }

  function resetRoute() {
    const positions = projectedTrack.concat(points
      .filter(point => !point.venue || includeVenues).map(point => point.position));
    const [left, right] = range(positions.map(([x]) => x));
    const [top, bottom] = range(positions.map(([, y]) => y));
    center = [(left + right) / 2, (top + bottom) / 2];
    baseZoom = Math.min((width - 84) / Math.max(right - left, 150), (height - 108) / Math.max(bottom - top, 150));
    zoom = baseZoom;
    draw();
  }

  function changeZoom(factor) {
    if (activeMode === "online") {
      onlineMap.setZoom(onlineMap.getZoom() + Math.sign(factor - 1));
      return;
    }
    zoom = Math.min(baseZoom * 9, Math.max(baseZoom / 3, zoom * factor));
    draw();
  }

  function pan(x, y) {
    followCenter = false;
    center = [center[0] + x / zoom, center[1] + y / zoom];
    draw();
  }

  function fitOnline() {
    if (!onlineMap) return;
    const positions = points.filter(point => !point.venue || includeVenues).map(point => [point.lat, point.lon]);
    const bounds = window.L.latLngBounds(track.concat(positions));
    onlineMap.fitBounds(bounds, { padding: [48, 68], maxZoom: 17, animate: false });
  }

  function fit() {
    followCenter = false;
    if (activeMode === "online") fitOnline();
    else resetRoute();
  }

  controls.append(
    createButton("+", () => changeZoom(1.4), { aria: "הגדלת המפה" }),
    createButton("−", () => changeZoom(1 / 1.4), { aria: "הקטנת המפה" }),
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
  venuesButton.hidden = !points.some(point => point.venue);
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
    center = location.position;
    if (activeMode === "online") onlineMap.panTo([location.lat, location.lon]);
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
    statusParts.push(isNearby ? "המיקום מופיע בכחול" : "המיקום מחוץ לאזור המסלול");
    if (Number.isFinite(coords.accuracy)) statusParts.push("דיוק משוער " + formatDistance(Math.round(coords.accuracy)));
    if (hasRoute && isNearby) {
      statusParts.push(distance < 5 ? "סמוך לקו המסלול"
        : "מרחק בקו ישר מתוואי המסלול כ־" + formatDistance(Math.round(distance / 10) * 10));
    }
    setGpsStatus(statusParts.join(" · ") + ".");
    updateOnlinePosition();
    if (recenter && isNearby) centerLocation();
    draw();
  }

  function gpsError(error) {
    return error.code === 1
      ? "לא ניתן לגשת למיקום. אפשר לאפשר גישה בהגדרות הדפדפן."
      : "לא התקבל מיקום. אפשר לנסות שוב.";
  }

  function clearLocation() {
    location = undefined;
    updateOnlinePosition();
    draw();
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
        draw();
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
    center = point.position;
    zoom = Math.max(zoom, Math.min(baseZoom * 9, Math.min(width, height) / 650));
    draw();
    if (activeMode === "online") {
      onlineMap.setView([point.lat, point.lon], Math.max(onlineMap.getZoom(), 15), { animate: false });
    }
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
      if (activeMode !== "loading") return;
      clearTimeout(tileTimer);
      activeMode = "online";
      routeView.hidden = true;
      onlineView.classList.remove("is-loading");
      onlineButton.textContent = "תרשים";
      onlineButton.setAttribute("aria-label", viewLabel);
      status.textContent = hasRoute ? "" : routeMessage;
    });
    base.on("load", () => queueMicrotask(() => {
      if (!destroyed && request === onlineRequest && activeMode === "loading") showRouteMode(unavailableMessage);
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
      marker.addTo(point.venue ? onlineVenueLayer : onlineMap);
    }
    if (includeVenues) onlineVenueLayer.addTo(onlineMap);
    updateOnlinePosition();
  }

  function showRouteMode(message = routeMessage) {
    activeMode = "route";
    onlineRequest++;
    clearTimeout(tileTimer);
    onlineMap?.remove();
    onlineMap = undefined;
    onlineVenueLayer = undefined;
    onlinePosition = undefined;
    routeView.hidden = false;
    onlineView.hidden = true;
    onlineView.classList.remove("is-loading");
    onlineButton.textContent = "מפת רקע";
    onlineButton.setAttribute("aria-label", "מפת רקע");
    status.textContent = message;
    resize();
  }

  async function openOnline() {
    if (activeMode !== "route") return;
    if (!navigator.onLine) {
      status.textContent = `אין חיבור למפת הרקע. ${routeMessage}`;
      return;
    }
    activeMode = "loading";
    const request = ++onlineRequest;
    onlineButton.textContent = "טוען מפה…";
    onlineButton.setAttribute("aria-label", "ביטול טעינת מפת הרקע");
    status.textContent = "מפת הרקע נטענת…";
    try {
      const L = await loadLeaflet();
      if (destroyed || request !== onlineRequest) return;
      onlineView.classList.add("is-loading");
      onlineView.hidden = false;
      tileTimer = setTimeout(() => showRouteMode(unavailableMessage), 6000);
      buildOnlineMap(L);
      if (followCenter && location?.isNearby) {
        onlineMap.setView([location.lat, location.lon], 15, { animate: false });
      } else if (selectedPoint) {
        onlineMap.setView([selectedPoint.lat, selectedPoint.lon], 15, { animate: false });
      } else {
        fitOnline();
      }
    } catch {
      if (!destroyed && request === onlineRequest) showRouteMode(unavailableMessage);
    }
  }

  const onlineButton = createButton("מפת רקע", () => {
    preferOnline = activeMode === "route";
    if (preferOnline) openOnline();
    else showRouteMode();
  }, { className: "trail-map-layer" });
  frame.append(onlineButton);
  tools.append(trackingButton, gpsButton, venuesButton);

  function goOnline() {
    if (preferOnline) openOnline();
  }

  function goOffline() {
    if (preferOnline) showRouteMode(`אין חיבור למפת הרקע. ${routeMessage}`);
  }

  routeView.addEventListener("pointerdown", event => {
    if (event.target.closest("button") || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    routeView.setPointerCapture(event.pointerId);
  });
  routeView.addEventListener("pointermove", event => {
    if (drag?.id !== event.pointerId) return;
    pan(drag.x - event.clientX, drag.y - event.clientY);
    drag.x = event.clientX;
    drag.y = event.clientY;
  });
  routeView.addEventListener("lostpointercapture", () => { drag = undefined; });
  routeView.addEventListener("keydown", event => {
    if (event.target !== routeView) return;
    const directions = { ArrowUp: [0, -40], ArrowDown: [0, 40], ArrowLeft: [-40, 0], ArrowRight: [40, 0] };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    pan(...direction);
  });

  function resize() {
    if (frame.clientWidth < 100 || frame.clientHeight < 100) return;
    onlineMap?.invalidateSize({ pan: false });
    if (width === frame.clientWidth && height === frame.clientHeight) return;
    width = frame.clientWidth;
    height = frame.clientHeight;
    resetRoute();
  }

  resetRoute();
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(frame);
  document.addEventListener("visibilitychange", visibilityChanged);
  window.addEventListener("pagehide", suspend);
  window.addEventListener("online", goOnline);
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
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearTimeout(tileTimer);
      onlineMap?.remove();
      container.replaceChildren();
    },
  };
}

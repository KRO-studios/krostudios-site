const timeZone = 'Asia/Jerusalem';
const cacheKey = 'friday-hike-weather-v1';
const requestTimeout = 10000;
const recentForecastMs = 5 * 60 * 1000;
const forecastDays = 16;
const activeRequests = new WeakMap();
const hebrewTimestamp = new Intl.DateTimeFormat('he-IL', {
  timeZone,
  dateStyle: 'short',
  timeStyle: 'short',
});
const israelCalendar = new Intl.DateTimeFormat('en-CA', {
  timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const fields = {
  temperature: 'temperature_2m',
  feelsLike: 'apparent_temperature',
  rainChance: 'precipitation_probability',
  precipitation: 'precipitation',
  wind: 'wind_speed_10m',
  gusts: 'wind_gusts_10m',
  code: 'weather_code',
};

const conditions = new Map([
  [0, ['☀', 'בהיר']],
  [1, ['☀', 'בהיר לרוב']],
  [2, ['⛅', 'מעונן חלקית']],
  [3, ['☁', 'מעונן']],
  [45, ['≋', 'ערפל']],
  [48, ['≋', 'ערפל קופא']],
  [51, ['☂', 'טפטוף קל']],
  [53, ['☂', 'טפטוף']],
  [55, ['☂', 'טפטוף כבד']],
  [56, ['☂', 'טפטוף קופא']],
  [57, ['☂', 'טפטוף קופא']],
  [61, ['☂', 'גשם קל']],
  [63, ['☂', 'גשם']],
  [65, ['☂', 'גשם כבד']],
  [66, ['☂', 'גשם קופא']],
  [67, ['☂', 'גשם קופא']],
  [71, ['❄', 'שלג קל']],
  [73, ['❄', 'שלג']],
  [75, ['❄', 'שלג כבד']],
  [77, ['❄', 'גרגירי שלג']],
  [80, ['☂', 'ממטרים קלים']],
  [81, ['☂', 'ממטרים']],
  [82, ['☂', 'ממטרים כבדים']],
  [85, ['❄', 'ממטרי שלג']],
  [86, ['❄', 'ממטרי שלג כבדים']],
  [95, ['ϟ', 'סופת רעמים']],
  [96, ['ϟ', 'סופת רעמים עם ברד']],
  [97, ['ϟ', 'סופת רעמים חזקה']],
  [99, ['ϟ', 'סופת רעמים עם ברד כבד']],
]);

function dayInIsrael() {
  const parts = Object.fromEntries(israelCalendar.formatToParts(new Date()).map(({type, value}) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function canonicalDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const millis = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(millis) && new Date(millis).toISOString().slice(0, 10) === value;
}

function readCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(cacheKey) ?? '[]');
    return Array.isArray(cache) ? cache : [];
  } catch {
    return [];
  }
}

function readForecast(key) {
  const entry = readCache().find(item => item?.key === key);
  return entry && Number.isFinite(entry.savedAt) && Array.isArray(entry.data?.hourly?.time) ? entry : null;
}

function saveForecast(entry) {
  const cache = readCache().filter(item => item?.key !== entry.key);
  try {
    localStorage.setItem(cacheKey, JSON.stringify([entry, ...cache.slice(0, 7)]));
  } catch {
    // The forecast is still available for this visit when storage is disabled.
  }
}

function clock(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? value.slice(-5)
    : null;
}

function numeric(value) {
  return Number.isFinite(value) ? value : null;
}

function forecastHours(data, date) {
  const hourly = data?.hourly;
  if (!Array.isArray(hourly?.time)) return [];

  return hourly.time.flatMap((timestamp, index) => {
    const hour = clock(timestamp);
    if (!hour || !timestamp.startsWith(`${date}T`)) return [];
    const values = Object.fromEntries(
      Object.entries(fields).map(([key, field]) => [key, numeric(hourly[field]?.[index])]),
    );
    return [{hour, ...values}];
  });
}

function hikeWindow(hours, hike) {
  const startTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hike.startTime) ? hike.startTime : '08:00';
  const [hour, minute] = startTime.split(':').map(Number);
  const start = hour * 60 + minute;
  const length = Number.isFinite(hike.durationMinutes) && hike.durationMinutes > 0 ? hike.durationMinutes : 180;
  const firstHour = Math.floor(start / 60);
  const lastHour = Math.min(23, Math.ceil((start + length) / 60));
  const outing = hours.filter(row => {
    const hourOfDay = Number(row.hour.slice(0, 2));
    return hourOfDay >= firstHour && hourOfDay <= lastHour;
  });
  return outing.length ? outing : hours;
}

function weatherIcon(code) {
  const [icon, label] = conditions.get(code) ?? ['–', 'לא ידוע'];
  return `<span class="wx-condition" aria-hidden="true">${icon}</span><span>${label}</span>`;
}

function formatNumber(value, unit, digits = 0) {
  if (value === null) return '—';
  const rounded = Number(value.toFixed(digits));
  return `<bdi>${rounded}${unit}</bdi>`;
}

function maxOf(rows, key) {
  const values = rows.map(row => row[key]).filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

function displayTable(hours) {
  const rows = hours.map(row => `
    <tr>
      <th scope="row"><bdi>${row.hour}</bdi></th>
      <td class="wx-table-condition">${weatherIcon(row.code)}</td>
      <td>${formatNumber(row.temperature, '°')}</td>
      <td>${formatNumber(row.feelsLike, '°')}</td>
      <td>${formatNumber(row.rainChance, '%')}</td>
      <td>${formatNumber(row.precipitation, ' מ״מ', 1)}</td>
      <td>${formatNumber(row.wind, ' קמ״ש')}</td>
      <td>${formatNumber(row.gusts, ' קמ״ש')}</td>
    </tr>`).join('');
  return `
    <details class="wx-details">
      <summary>תחזית לפי שעה</summary>
      <div class="wx-table-wrap" tabindex="0" role="region" aria-label="תחזית לפי שעה">
        <table>
          <thead><tr><th scope="col">שעה</th><th scope="col">תנאים</th>
            <th scope="col">טמפ׳</th><th scope="col">מרגיש כמו</th><th scope="col">סיכוי למשקעים</th>
            <th scope="col">משקעים</th><th scope="col">רוח</th><th scope="col">משבים</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </details>`;
}

function displayForecast(panel, entry, date, hike) {
  const hours = forecastHours(entry.data, date);
  if (!hours.some(row => row.temperature !== null)) return false;

  const outing = hikeWindow(hours, hike);
  const first = outing[0];
  const sunset = entry.data.daily?.time?.[0] === date ? clock(entry.data.daily?.sunset?.[0]) : null;
  const forecast = panel.querySelector('.wx-forecast');
  const detailsExpanded = forecast.querySelector('details')?.open ?? false;
  forecast.innerHTML = `
    <div class="wx-metrics">
      <div class="wx-metric">
        <span class="wx-metric-label">סביב שעת היציאה</span>
        <strong>${formatNumber(first.temperature, '°')}</strong>
        <span class="wx-metric-detail">${weatherIcon(first.code)}</span>
      </div>
      <div class="wx-metric">
        <span class="wx-metric-label">סיכוי למשקעים</span>
        <strong>${formatNumber(maxOf(outing, 'rainChance'), '%')}</strong>
        <span class="wx-metric-detail">שיא בשעות הטיול</span>
      </div>
      <div class="wx-metric">
        <span class="wx-metric-label">משבי רוח</span>
        <strong>${formatNumber(maxOf(outing, 'gusts'), ' קמ״ש')}</strong>
        <span class="wx-metric-detail">שיא בשעות הטיול</span>
      </div>
      <div class="wx-metric">
        <span class="wx-metric-label">שקיעה</span>
        <strong>${sunset ? `<bdi>${sunset}</bdi>` : '—'}</strong>
        <span class="wx-metric-detail">שעון ישראל</span>
      </div>
    </div>
    ${displayTable(hours)}`;
  forecast.querySelector('details').open = detailsExpanded;
  return true;
}

function updateStatus(panel, message, retry = false, busy = false) {
  panel.querySelector('.wx-status').textContent = message;
  panel.querySelector('.wx-retry').hidden = !retry;
  panel.querySelector('.wx-forecast').setAttribute('aria-busy', String(busy));
}

async function loadForecast(panel, hike, date, state, force = false) {
  const key = `${hike.lat},${hike.lon},${date}`;
  const cached = readForecast(key);
  const hasCache = cached && displayForecast(panel, cached, date, hike);
  const timestamp = hasCache ? hebrewTimestamp.format(cached.savedAt) : '';
  if (!force && !navigator.onLine) {
    updateStatus(panel, hasCache
      ? `אין חיבור. מוצגת תחזית שנשמרה ב־${timestamp}`
      : 'אין חיבור ואין תחזית שמורה לתאריך הזה.', true);
    return;
  }
  if (!force && hasCache && Date.now() - cached.savedAt < recentForecastMs) {
    updateStatus(panel, `התחזית נשלפה ב־${timestamp}`);
    return;
  }
  updateStatus(panel, hasCache ? `מרעננים את התחזית. הגרסה המוצגת נשמרה ב־${timestamp}` : 'טוענים תחזית למסלול…', false, true);

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: hike.lat,
    longitude: hike.lon,
    timezone: timeZone,
    start_date: date,
    end_date: date,
    hourly: Object.values(fields).join(','),
    daily: 'sunset',
  });

  const controller = new AbortController();
  state.controller = controller;
  const timeout = setTimeout(() => controller.abort(), requestTimeout);
  try {
    const response = await fetch(url, {signal: controller.signal, cache: 'no-store'});
    if (!response.ok) throw new Error('Forecast unavailable');
    const data = await response.json();
    if (state.controller !== controller || !panel.isConnected) return;
    const entry = {key, data, savedAt: Date.now()};
    if (!displayForecast(panel, entry, date, hike)) throw new Error('No hourly forecast for the requested day');
    saveForecast(entry);
    updateStatus(panel, `התחזית נשלפה ב־${hebrewTimestamp.format(entry.savedAt)}`);
  } catch {
    if (state.controller !== controller || !panel.isConnected) return;
    updateStatus(panel, hasCache
      ? `התחזית לא התעדכנה. מוצגים נתונים שנשמרו ב־${timestamp}`
      : 'אין כרגע תחזית זמינה למסלול.', true);
  } finally {
    clearTimeout(timeout);
  }
}

export function mountWeather(container, hike, date) {
  activeRequests.get(container)?.controller?.abort();
  const state = {controller: null};
  activeRequests.set(container, state);
  container.innerHTML = `
    <section class="wx-panel" aria-label="מזג אוויר במסלול">
      <div class="wx-heading">
        <h2>מזג אוויר במסלול</h2>
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" dir="ltr">Open-Meteo ↗</a>
      </div>
      <div class="wx-forecast"></div>
      <div class="wx-status-row">
        <p class="wx-status" role="status"></p>
        <button class="wx-retry" type="button" hidden>רענון התחזית</button>
      </div>
      <div class="wx-alerts">
        <span>עדכונים רשמיים לפני היציאה</span>
        <div class="wx-links">
          <a href="https://ims.gov.il/he/warning" target="_blank" rel="noopener noreferrer">אזהרות מזג אוויר ↗</a>
          <a href="https://www.parks.org.il/category/newsflash/" target="_blank" rel="noopener noreferrer">סגירות מסלולים ↗</a>
        </div>
      </div>
    </section>`;
  const panel = container.firstElementChild;
  if (!canonicalDate(date) || !Number.isFinite(hike.lat) || !Number.isFinite(hike.lon)) {
    updateStatus(panel, 'יש לבחור תאריך ומסלול כדי לקבל תחזית.');
    return;
  }

  const daysAway = (Date.parse(date) - Date.parse(dayInIsrael())) / 86400000;
  if (daysAway < 0) {
    updateStatus(panel, 'התאריך כבר עבר. בחרו תאריך עתידי לתחזית.');
    return;
  }
  if (daysAway >= forecastDays) {
    updateStatus(panel, 'התאריך עדיין מעבר לטווח התחזית. בדקו שוב כשיתקרב.');
    return;
  }

  panel.querySelector('.wx-retry').addEventListener('click', () => {
    state.controller?.abort();
    void loadForecast(panel, hike, date, state, true);
  });
  void loadForecast(panel, hike, date, state);
}

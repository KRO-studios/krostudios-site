function externalAction(document, url, label, stopName, className) {
  if (!url) return null;

  let destination;
  try {
    destination = new URL(url);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(destination.protocol)) return null;

  const link = document.createElement('a');
  link.href = destination.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = className;
  link.textContent = label;
  link.setAttribute('aria-label', `${label} — ${stopName}`);
  return link;
}

function isolateNumberRanges(text) {
  return text.replace(/\d+(?::\d{2})?[–-]\d+(?::\d{2})?/g, range => `\u2066${range}\u2069`);
}

function renderStop(document, stop) {
  const row = document.createElement('li');
  row.className = 'after-trip-stop';
  row.dataset.afterStop = stop.id;

  const heading = document.createElement('div');
  heading.className = 'after-trip-stop-heading';
  const name = document.createElement('h3');
  name.textContent = stop.name;
  heading.append(name);
  if (stop.optional) {
    row.dataset.optional = '';
    const optional = document.createElement('span');
    optional.className = 'after-trip-optional';
    optional.textContent = 'אם מסתדר';
    heading.append(optional);
  }
  row.append(heading);

  if (stop.area || stop.time) {
    const details = document.createElement('p');
    details.className = 'after-trip-stop-details';
    details.textContent = isolateNumberRanges([stop.area, stop.time].filter(Boolean).join(' · '));
    row.append(details);
  }
  if (stop.note) {
    const note = document.createElement('p');
    note.className = 'after-trip-stop-note';
    note.textContent = isolateNumberRanges(stop.note);
    row.append(note);
  }

  const actions = document.createElement('div');
  actions.className = 'after-trip-stop-actions';
  const navigation = externalAction(document, stop.navUrl, 'ניווט', stop.name, 'button button-outline after-trip-navigation');
  if (navigation) actions.append(navigation);
  const number = stop.phone?.replace(/[^\d+]/g, '');
  if (number) {
    const phone = document.createElement('a');
    phone.href = `tel:${number}`;
    phone.className = 'button button-outline';
    phone.textContent = 'חיוג';
    phone.setAttribute('aria-label', `חיוג אל ${stop.name}`);
    actions.append(phone);
  }
  const booking = externalAction(document, stop.bookingUrl, 'הזמנת מקום', stop.name, 'button button-outline');
  if (booking) actions.append(booking);
  if (actions.childElementCount) row.append(actions);

  return row;
}

export function renderAfterTrip(container, trip) {
  const document = container.ownerDocument;

  const itinerary = document.createElement('section');
  itinerary.id = 'after-trip-itinerary';
  itinerary.className = 'card after-trip-itinerary';
  itinerary.setAttribute('aria-labelledby', 'after-trip-stops-title');

  const intro = document.createElement('div');
  intro.className = 'after-trip-intro';
  const summary = document.createElement('p');
  summary.className = 'after-trip-summary';
  summary.textContent = trip.summary;
  intro.append(summary);
  const timing = document.createElement('p');
  timing.className = 'after-trip-timing';
  timing.textContent = isolateNumberRanges(trip.timing);
  intro.append(timing);
  itinerary.append(intro);

  const stopsTitle = document.createElement('h2');
  stopsTitle.id = 'after-trip-stops-title';
  stopsTitle.textContent = 'סדר העצירות';
  const stops = document.createElement('ol');
  stops.className = 'after-trip-stops';
  stops.append(...trip.stops.map(stop => renderStop(document, stop)));
  itinerary.append(stopsTitle, stops);

  container.replaceChildren(itinerary);
}

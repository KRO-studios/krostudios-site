PRAGUE 2026 – FULL FUN AUDIT

UPDATE 2026-11-15 — POCKET GUIDE 4.0 SMART TRAVEL RELEASE
Eight upgrades: HTTPS update checker with version.json; focused seven-button
mobile layout cleanup; optional GPS next-stop suggestions with estimates;
editable daily schedules (reorder/day/time/duration); opening-hour conflict
watch; explicit-import shareable one-time progress links for Dima; collapsible
offline essentials and cached app shell; per-flight checklists saved locally.
All existing 122 place records and importance levels are retained. Old beer
history, visited checkmarks and chosen stops are preserved. No account or
live server is introduced, and GPS is never saved to local storage.
Upload v4.js, v4.css and version.json alongside index.html, sw.js, manifest
and icons for the release to function. Revisit via ?v=40 after deploy.

UPDATE 2026-11-15 — POCKET GUIDE 3.9: CLEARER NAVIGATION
The nine-icon bottom bar is now seven buttons. A single larger highlighted
Beer / FX launcher opens a small menu with two choices; Beer Counter and
Currency Converter remain separate full-page tools with their original saved
settings and beer history. The More tab is removed, with its apartment/taxi
and app help moved to Today, Prague local transport to Map, and route statistics,
manual progress sharing, and official source notes to Plan. Flight and Weather
screens remain dedicated to their own subjects. The offline-shell cache was
bumped; no saved choices or personal entries are migrated or reset.

122 places: 107 original + 15 verified additions.
Added: U Kunstatu historic craft beer palace, Prague Beer Museum (Dlouha), Anonymous Bar, Foggy Prague shisha, Casablanca Sky Bar shisha, Vojan Gardens, Vytopna Railway Restaurant, Cafe Louvre, Cafe Slavia, Kantyna, Cerveny Jelen, Cafe Imperial, Hemingway Bar, Franciscan Garden, Namesti Miru Christmas Market.
All 15 new stops start EXCLUDED from the map (red X) to keep planned walking route unchanged; all remain visible in the list.
Check seasonal opening before travel; main Christmas markets start 28 Nov, while Peace Square starts 20 Nov.
Some newly added map pins are indicative; Google Maps buttons use full street addresses for new stops.
The published directory is prague/ under the site's GitHub Pages root. Do not overwrite the user's homepage or CNAME.

UPDATE 2026-11-15 — LOCATION IMPORTANCE
Every place now has a separate editorial importance score: Level 1 Must See (19),
Level 2 Highly Recommended (46), and Level 3 Nice to Have (57).
Importance is distinct from the old green check/red X route-selection status.
Plan, Explore and Map have independent importance filters; the map can optionally
show off-route suggestions. Place cards, map pins and popups display the level.
The Plan and Trip pages also show visit progress by level, and Plan highlights
must-see stops each day with a button to add missing Level 1 stops to the route.
Walking/navigation order and existing saved selections are preserved.

UPDATE 2026-11-15 — SIGHTSEEING-ONLY ROUTE
The default daily timetable now includes only sights, architecture and hidden gems,
plus visually marked unscheduled breaks. Food and nightlife destinations remain
available in Explore, but are not included in the default walking route.
The 19 importance Level-1 scores are unchanged. All 15 non-food Level-1 sites
appear in the new sightseeing timetable. All 122 places remain searchable.
Because this update intentionally changes the route, older saved route selections
are backed up once in browser storage before the new sightseeing defaults apply.
Visited states, theme, language and the separate personal beer log are retained.

UPDATE 2026-11-15 — POCKET COMPANION 3.0
Added a live Today screen, explicit opt-in GPS Near Me, three route pace modes,
compact expandable place cards, historic stories and independent hidden-gem tags.
Seven bottom navigation tabs become five, with Plan/Trip/Beers/Weather under More.
Official seasonal opening-hour guidance covers the main castle and Jewish sites
and the Idiom library installation; all other hours require verification.
Weather updates now request hourly temperatures, rain probability and wind.
The offline app shell and pinned map library are cached where possible, but
Google Maps navigation and live map imagery need internet.
The More screen offers trip statistics and manual JSON progress transfer with Dima.
Location is never persisted; previous chosen/visited/beer data is preserved.

UPDATE 2026-11-15 — POCKET COMPANION 3.1
On-demand FOSSGIS/OpenStreetMap pedestrian routing replaces dashed straight-line
map outlines with road/path geometry, distance and walking time after a tap.
Public-routing requests are deliberately opt-in and session-cached, and transmit
only chosen stop coordinates — never the user's live GPS. Google Maps section
links and labelled rough estimates stay available if routing fails or offline.
Over 20 curated sites now have seasonal entry-hour guidance with day-and-time
warnings; unknown interiors are explicitly labelled as unverified. Guided-tour
venues retain their reservation caveats. On Today and Weather, rainy/windy
periods can trigger suggestions for nearby indoor sights that appear open at
the relevant time; these options never automatically reorder the itinerary.

UPDATE 2026-11-15 — POCKET COMPANION 3.2 NAVIGATION REPAIR
The compressed five-button navigation hid useful pages behind More. Version 3.2
keeps the prominent, centered currency button and adds an always-visible row
of four direct page buttons: Plan, Beers, Weather and Trip. More still shows
those same destinations, but its statistics are collapsed by default. Tab
switching scrolls to the top instantly so menus cannot appear to open at the
statistics section when previously scrolled down. Existing saved progress,
itinerary selections and personal beer entries are untouched.

UPDATE 2026-11-15 — POCKET COMPANION 3.3 SINGLE BOTTOM BAR
Supersedes the two-row shortcut design of 3.2. The main bottom bar now has
nine direct icons in one row: Today, Map, Plan, Weather, centered glowing
Convert, Explore, Beers, Trip, and More. All nine pages remain available,
without a stacked shortcuts bar. Small-screen icon labels are compact to fit
the available width. App data, language, route choices and the beer log are
unchanged.

UPDATE 2026-11-15 — POCKET COMPANION 3.4 STATUS ICON FIX
Removed a duplicate checkmark/cross from map inclusion controls and a duplicate
checkmark from visited controls. Localized labels already contain the indicator,
so the card now uses that label once. Stored selections and visits are unchanged.

UPDATE 2026-11-15 — POCKET COMPANION 3.5 DUAL CENTER BUTTONS
The Beer Counter and Convert shortcuts are now an adjacent highlighted pair
near the exact center of the one-row bottom bar. Beer gets a larger raised
gold/amber glowing badge matching the existing currency shortcut. All nine
pages remain directly available; persistent beer entries and all trip content
are unaffected.

UPDATE 2026-11-15 — POCKET COMPANION 3.6 LAYOUT REPAIR AND AUDIT
Fixed a shared CSS class name: the Beer navigation button had inadvertently
inherited the layout for beer-journal history rows, so its glowing icon and
label were misaligned with Convert. Navigation uses a dedicated beer-nav-entry
class now. Both central buttons share one size/height/offset rule, including
small-screen breakpoints. Checked the 122-location data, every navigation
target, EN/HE UI keys, DOM and CSS syntax, links, local-storage flows, GPS,
weather advice, route geometry and fallbacks, progress import, currency and
beer actions, and PWA support using automated structural/functional tests.
Code tests pass. A browser screenshot check of local HTML was prevented by
the browser's organization policy; no claim of pixel-perfect live rendering.

UPDATE 2026-11-15 — POCKET COMPANION 3.7 LOCKED NAVIGATION GRID
An additional screenshot still showed the Beer badge lower and its label to
the right. This release makes the two featured buttons use exactly the same
CSS grid rows for icon and label, with explicit placement, size, offset and
mobile breakpoints, rather than relying on inherited flex behavior. The More
page now displays its v3.7 release marker for detecting stale HTML; deployment
instructions include a cache-busted URL. SW cache revision bumped to v37.

UPDATE 2026-11-15 — POCKET COMPANION 3.8 CLEAR SCREEN RESPONSIBILITIES
Removed duplicate weather and flight snippets from the global header, Today,
and the old general Essentials view. Trip is now a flight/airport hub with
countdown, tickets, terminals, check-in, luggage, airport maps and timetable.
Weather alone holds the daily forecast, eight two-hour slots per day, likely
calmer walking windows, rain/wind highs, feels-like temperatures, clothing
notes, sunset and forecast-derived indoor alternatives. The castle/Jewish
opening notes now belong to Plan; apartment, airport-to-city taxi, transport,
app instructions, progress transfer and sharing belong to More. Redundant
trip-day/fun-audit copies were removed; the underlying 122 places and hidden
gems remain in Plan and Explore. The global date picker only appears on
Today, Plan and Map; duplicate statistics shortcuts were removed.
Existing user storage keys and personal logs were left unchanged.

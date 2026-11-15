Prague 2026 Pocket Guide 3.8 — Clear, Dedicated Screens (15 Nov 2026)

DEPLOYMENT
1. Extract this archive.
2. Upload the entire prague/ directory into the GitHub Pages publishing root of KRO-studios/krostudios-site.
3. Do not overwrite your site's CNAME or home page.
4. After deployment, open https://krostudios.com/prague/index.html?v=38 to fetch the newly deployed HTML (the query is a cache-buster).
5. If your installed PWA shows an older version, fully close and reopen it, or remove/re-add the home-screen icon after updating.
6. Open More. Under its heading you must see “Pocket Guide v3.8 · 15.11.2026”. If that marker is missing, the browser is showing an older index.html; try the cache-busted URL, then a hard refresh or a fresh browser tab. Do NOT clear site storage: that could erase local beer history and route progress.

WHAT CHANGED
- NEW in 3.8: Screen responsibilities are clear. Trip contains ONLY flights, airline and airport planning: confirmed ticket facts, next-flight countdown, terminal maps, airport-day timeline and a practical flight checklist. Apartment, arrival taxi, transport instructions, app help and progress sharing have moved to More.
- NEW in 3.8: Weather contains ONLY forecast-related information: three-day outlook, detailed two-hour temperature/apparent-temperature/rain/wind data, relative calmer walking hours, peak rain and wind, clothing suggestions, daylight, forecast source and weather-aware indoor alternatives. Forecast suggestions remain optional and do not edit the route.
- NEW in 3.8: Today focuses on the next stop, upcoming sights, progress and GPS nearby places; detailed weather moved to Weather. Plan owns route selection, importance and attraction ticket/seasonal-hours tips. Explore owns the full 122-place catalog and hidden gems. Global day switcher appears only where useful (Today, Plan and Map); global trip-stat tiles and repeated hero facts are removed from visible screens. More no longer repeats the bottom navigation shortcuts.
- PRESERVED: Nine bottom icons, Beer/Convert center controls, 122 location records, EN/HE, all saved route/visited and personal beer history, GPS privacy, on-demand walking routes and manual progress sharing.
- FIXED in 3.7: Beer and Convert now use explicit CSS grid rows for the badge and text, with matching widths, heights, offsets and mobile breakpoints; this prevents any layout rule from placing “Beers” beside its icon. The More page has a visible build number to distinguish the current file from an older browser tab or cache. The release uses a new PWA cache version.
- FIXED in 3.6: Convert and Beers now use a shared, identical size, height, vertical offset and label layout at every responsive breakpoint. A CSS class-name collision with beer-history entries was moving the Beers badge and overflowing its text; the navigation now uses a dedicated class. Both golden badges sit together in the center of the nine-icon bottom bar.
- AUDITED in 3.6: Parsed the complete HTML, CSS, JavaScript, PWA manifest and service worker; verified 122 unique places, nine navigation tabs, bilingual labels, location IDs, responsive featured-control CSS and safe external links. Simulated itinerary, GPS, map routing and fallback, weather, beer logging, currency conversion, backups and failure handling. Automated structural and functional checks pass. A pixel-perfect browser screenshot check was not possible here because local HTML previews were blocked by the browser environment; please visually check after deployment.
- NEW in 3.5: The Beer Counter button sits directly beside Convert in the central feature pair. Both buttons are larger, raised above the single bottom bar, and glow with warm gold/amber highlights even when inactive. The nine pages remain one-tap accessible; bar columns balance the two large central controls.
- NEW in 3.4: Map-selection buttons now display only one green ✓ or red ✕ indicator. Visited buttons also display only one ✓. The status text already included the symbol; an extra symbol from the card renderer has been removed in English and Hebrew.
- NEW in 3.3: All nine pages became separate icons in ONE bottom navigation row, without the temporary second shortcut row from 3.2. More holds progress backup and expandable trip statistics; switching tabs resets scroll immediately.
- NEW in 3.1: Optional “Calculate real walking route” on the Map page uses the public volunteer OpenStreetMap/FOSSGIS foot router. It returns route geometry, approximate walking distance and moving time (not sightseeing/break time). It runs only when tapped, once per route in the current session, and displays routing-server credits. This sends the chosen stops' coordinates, not the user's GPS position, to that third party. If offline/unavailable/too many stops, the straight-line-derived approximation and Google Maps navigation buttons remain available. Please use the volunteer service sparingly.
- NEW in 3.1: Extended seasonal entry-hour guidance now covers 20+ verified attractions, showing warnings when a scheduled visit is before opening, near last entry, after closing, or on a closed day. These are published schedules, not live guarantees. Other indoor sights are clearly marked “hours not verified”. Guided-only Clementinum tour is marked as reservation-dependent.
- NEW in 3.1: Weather-aware options now live only in Weather and point out outdoor sights likely to face significant rain/wind with apparently open indoor alternatives. Suggestions use hourly Open-Meteo forecast data and NEVER change your chosen route or checkmarks automatically.
- Today home screen shows the next unvisited sight, quick navigation, day's progress and next stops; weather details are in Weather.
- New opt-in Nearby GPS discovery for all 122 places. Location is kept in memory only, never saved or shared.
- Three non-destructive route display modes: Essentials (L1 sightseeing), Recommended (L1+L2 sightseeing), Everything (all checked locations).
- Nine direct bottom-bar icons in one row, including Beers, Weather, Plan and Trip. No additional shortcut row.
- One-tap 🍺 +1 action on Today; beer journal still belongs to the current phone.
- Compact location cards expand to history, entry notes, sources and official hours when known.
- Hidden gems are a separate category/tag, without changing their L1/L2/L3 importance levels.
- Curated November opening guidance for Jewish Museum interiors, Prague Castle interiors and the Municipal Library Idiom installation.
- Hourly rain/wind outlook using Open-Meteo when the dates are within live forecast range. Cached observations show when offline.
- More page adds travel stats and JSON export/import of chosen/visited status for manual sharing with Dima; personal beer logs are excluded.
- Stronger offline shell and optional caching of the pinned Leaflet map engine. Internet is still needed for live map tiles and weather.
- Thursday: Old Town, Jewish Quarter, Speculum Alchemiae, Celetná, Powder Tower, Idiom and hanging Freud; breaks included.
- Friday: Charles Bridge, Prague Castle, Golden Lane, Nový Svět, Strahov, narrowest alley, Little Venice and Kampa; breaks included.
- Saturday: National Theatre, Dancing House, Heydrich crypt, Kafka Head at 11:00, Lucerna, Wenceslas Square, Náměstí Míru 87m escalator and Christmas market.
- The sightseeing itinerary does NOT schedule pubs, breweries, restaurants, casinos or shows. All remain in Explore.
- The default route is reorganized ONCE for existing users and a backup of the old route is kept in the browser under the app's previous-route key. Already-visited checkmarks and personal beer history are preserved.

PRESERVED FEATURES
- Every one of 122 locations has L1 Must See, L2 Highly Recommended, or L3 Nice to Have importance.
- Priority filters on itinerary, Explore and map, with color-coded pins and badges.
- Must-see highlights per day, and visited-place progress per importance level.
- Green check/red X toggles still keep skipped locations visible in the itinerary; filtering does not change saved selections.
- Outbound: Smartwings QS1287, 19 Nov 2026 05:35 TLV T3 -> 08:45 PRG T1, Boeing 737-900.
- Return: TUS Airways U8461, 21 Nov 2026 18:00 PRG T1 -> 22:45 TLV, per e-ticket. Verify schedule with TUS before departure.
- Central glowing ₪ ⇄ Kč currency converter with both directions and dated rate data.
- Personal beer tracker, interactive embedded map, Google Maps place shortcuts, EN/HE language toggle, dark/light themes and 122 Prague sites.
- Do not publish private booking references, passenger names or payment details.

NOTES
- Nearby uses a one-time, explicit browser location request. It sorts by straight-line distance; Google Maps opens actual walking routes.
- Weather alternatives are optional; check official opening sites, tickets and live conditions before heading indoors. Walking-router values are modelled pedestrian routes, not a guarantee of access. Routed time excludes queues, breaks and stops.
- The existing 52 core sightseeing suggestions remain intact; mode filters change the active display, not the stored checked places or visited history.
- Opening hours are sourced seasonal guidance, not live occupancy or guaranteed admission. Confirm on the official site.
- Historical stories are short summaries; not every optional location has a separate curated story.
- Automatic cross-device synchronization is intentionally absent: static GitHub Pages has no private sync backend. Use the export/import controls instead.
- Location and offline-weather features may be unavailable if mobile browser permissions or connectivity fail.

Changes only affect prague/, not your site's homepage.

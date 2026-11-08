# Kro Studios website

This repository is the static site served at `https://krostudios.com/`.

## Selected homepage — Orbit Links

The local homepage now implements the approved Orbit Links design: all eight
app orbits have separate preview controls and direct destination links, around
the live gold/rose signal field and rotatable orange phone. The three owned
app websites are labelled Website; the remaining five apps link to their
actual Google Play listings. BlabFlip stays marked coming soon.

`index.html` uses an isolated local bundle in `studio/`. It does not alter
`concepts/` or any app-specific marketing, support or legal page. The old
navigation, bottom selected-app controls and design-switch footer stay removed.
The real `logo.png`, KRO Studios name and contact link are now in a compact
top bar, alongside functional ENG / HEB / RUS language buttons. There is no
bottom footer. The contact action remains a native `mailto:hello@krostudios.com`
link, not a contact form or automatic email sender.

`studio/home-i18n.js` translates interface text, accessible instructions and
metadata while keeping product names, screenshots and destination URLs intact.
Hebrew uses right-to-left text, mirrored app orbits and matching keyboard
navigation; the phone and screenshot artwork are never mirrored. Switching
language preserves the selected app, screenshot, phone pose and motion state.
A valid `?lang=en`, `?lang=he` or `?lang=ru` overrides the saved local preference;
otherwise the saved preference or English is used. Storage failures are safe.
Language controls need JavaScript and remain disabled in the English no-JS
fallback, where all app links and the contact link are still usable.
The homepage remains navigable with JavaScript disabled, using eight actual
HTML links and the matching phone render. Fonts and Three.js are served locally.

The desktop handset is centered vertically within the app-icon constellation.
A quick click/tap on its actual display advances the selected app's gallery;
holding or dragging rotates without changing screenshots. Enter/Space advances,
the arrow keys rotate, and Home resets the pose. The phone rim and Dynamic
Island are not screenshot-advance targets. Mobile vertical scrolling is retained.

The homepage has 61 distinct screens. `studio/store-gallery.json` records the
55 official Google Play/iPhone listing screenshots collected on 2026-10-15,
with listing URLs, original/delivery hashes and dimensions. Its browser subset
is `studio/store-gallery.js`. Existing real in-app captures remain first;
store posters already represented by an existing image are not repeated.
BlabFlip remains coming soon with two genuine Android UI captures refreshed on
2026-11-01, not an invented store gallery. Its renamed icon, screenshots, preview
and all six matching handset fallbacks use the new branding. The screenshot
bytes and provenance are recorded under the stable `echo` entry in
`studio/store-gallery.json`. Large store images use uncropped WebP delivery copies; gallery
images are requested as selected rather than all at startup. Every screenshot
has a matching same-model orange-phone render for browsers without WebGL.

Every screenshot is shown in full using centered contain fitting: no cropping
or stretching. The display keeps a matching background where the screenshot's
aspect ratio differs. The original16 phone renders and45 matching frames in
`studio/assets/gallery-phones/` provide the same uncropped fallback appearance.
The screenshot-change energy wave and handset glow remain enabled.

Screenshot taps and Enter/Space also send a1.18-second gold/rose energy wave
through the larger, brighter ribbons, with a short glow around the handset.
The signal uses a fixed32-spark pool; repeated taps restart the effect rather
than stacking animations. Dragging and holding do not emit the signal.
Paused/reduced-motion modes receive static field feedback with no phone glow.

The hero heading and its container are transparent. The gold/rose gradient
remains clipped to the text, while the live field, particles and tap signal
continue behind the heading without a black rectangle or headline-shaped
cutout in either the WebGL or Canvas2D renderer.

Additional gallery QA and fallback generation live in the working project's
`prototypes/world-atlas/tests/verify-phone-gallery.mjs`,
`prototypes/world-atlas/tests/verify-cover-effects.mjs` and
`prototypes/world-atlas/tests/render-homepage-gallery.mjs`. The generator renders
the additional45 `studio/assets/gallery-phones/` frames from the real local3D
model; it never changes the original prototype renders or publishes the site.

Run `node tests/verify_studio_homepage.js` and the existing app-page contracts
before publishing. Browser coverage is in the working project’s
`prototypes/world-atlas/tests/verify-homepage.mjs` and
`prototypes/world-atlas/tests/verify-homepage-languages.mjs`. The main local
homepage preview is `http://127.0.0.1:8771/`; the older standalone layout at
`prototypes/world-atlas/constellation-bridge.html` has no production top bar.
`prototypes/world-atlas/tests/sync-homepage-bundle.mjs` mechanically syncs the
approved shared runtime and assets into `studio/`; `home-catalog.js`,
`home-i18n.js` and `homepage.css` are homepage-specific. No publishing is
performed by that script.

## Signal Field preview

The `/concepts/` preview's eight-app registry is `concepts/catalog.js`. Keep
its selector nodes, real screenshots and same-model fallback images in sync.
The app list includes the seven games on the official KRO Studios Google Play
publisher page plus BlabFlip, which remains coming soon. Do not add invented
screens, availability claims, ratings or download counts.

Run the catalog contract before publishing preview changes:

```sh
node tests/verify_concepts_catalog.js
```

## Tanakh Quiz pages

The Tanakh Quiz landing page, Hebrew Bible practice pages, and bilingual privacy page are maintained in:

- `tanakh-quiz/index.html`
- `chidon-hatanach.html`
- `psukim-mefursamim.html`
- `privacy.html`

Run the Tanakh contracts before publishing:

```sh
python3 tests/verify_tanakh_marketing.py
python3 tests/verify_tanakh_privacy.py
python3 tests/verify_tanakh_qr.py
```

The main store buttons also have a compact Hebrew desktop-to-phone QR card,
shown only above 1000px. Its locally hosted
`tanakh-quiz/assets/download-qr.svg` opens
`https://krostudios.com/tanakh-quiz/#download`, where phone visitors immediately
get both official store choices. The page remains RTL; the QR and printed
address are LTR and the QR is never mirrored. The code has plain black modules,
an opaque white background, Q error correction and a four-module quiet zone.
Do not crop the margin or add a logo. Regenerate it offline on macOS with
`swift tools/generate_tanakh_qr.swift`; no external QR service or runtime
dependency is used. Phones and tablets keep their existing direct-store flow
without a QR card.

Browser layout and phone-anchor checks (including no-JavaScript navigation):

```sh
SITE_URL=http://127.0.0.1:8778/tanakh-quiz/ node tests/verify_tanakh_qr_browser.cjs
```

Set `PLAYWRIGHT_MODULE` to the installed Playwright module if needed and
`REPORT_DIR` to a private evidence folder. Before publishing, decode the QR
from the generated browser screenshots with an independent QR decoder and
confirm the exact `https://krostudios.com/tanakh-quiz/#download` payload.
The download hash intentionally skips smooth scrolling so scanned phone
visits show both stores immediately, even without JavaScript.

## Soviet Kino pages

The Russian marketing page for the Android and iOS releases is `sovietkino/index.html`.
Its screenshots and icon in `sovietkino/assets/` are copies of approved Google
Play artwork from the app repository. Its download buttons point to the
production Play package `com.krostudios.sovietkino` and App Store product
`id6812753192`. The Play links retain a shared UTM source/campaign for Play
Console referral reporting. Update the screenshots, platform links, and claims
when the released game changes.

The landing page presents the full game with a static, searchable catalog of
all 64 films and 215 enabled questions. `sovietkino/catalog.json` is the public
catalog snapshot; `index.html` renders all 64 entries in ordinary HTML, so the
catalog remains usable without JavaScript. Keep the counts, titles and years
in sync with the enabled app content when that collection changes.

`landing.css` contains the responsive cinema layout, six-film illustrated
preview controls, uncropped screenshot gallery and persistent mobile store
choices. `landing.js` progressively enhances the film search and a definite
three-question round, with Cyrillic answer entry, duplicate-aware letter
feedback, an optional first-letter hint, honest answer reveals and accessible
status messages. The result distinguishes independent answers, answers with a
hint, and revealed answers; reveals earn no point. Both official stores are
available immediately after an answer and on the result screen.

Seven curated records across six films are embedded: `g-c-01`, `g-a-01`,
`r-f-01`, `d-p-01`, `c-c-05`, `m-c-01` and `c-p-04` from
`lib/data/soviet_questions.dart`. The city question keeps its canonical app
clue and a separately owner-approved `campaignClue` for the Vasily promotion.
Only these seven samples are embedded; the full app answer database is not
exported. Each round selects three different films. The no-JavaScript fallback
exposes native answer disclosures and keeps store links and the full 64-film
catalog usable. The page does not save answers or send them to a server, and
does not promise that web progress resumes inside the app.

Campaign matching accepts only the fixed `?film=` values `diamond`, `irony`,
`office`, `moscow`, `kin-dza-dza` and `gentlemen`. An explicit
`?challenge=vasily-city` selects the approved city challenge and matching
Vasily illustration. Unknown query values fall back to the collection;
query strings cannot choose arbitrary assets or inject displayed text. Films
without an embedded sample lead to their collection entry rather than an
invented playable level.

The five poster screenshots come from the previously public approved store
artwork. The existing panoramas are approved people-free app illustrations,
not movie frames. Their responsive WebP copies remain uncropped in
`sovietkino/assets/web/`. Separately approved Vasily character artwork from the
published promotion is composed into a silent six-second scene. A silent
ten-second collection loop combines existing panoramas with that scene. These
are animated illustrations, not recorded film footage or an actor's recorded
performance. The default collection hero represents multiple films; the city
campaign can show the matching Vasily scene. Motion pauses outside the viewport
or in a hidden tab, respects reduced motion and data saver, and has a manual
pause control plus static poster fallback.

The four new delivery assets are `assets/web/hero-vasily-poster.webp`,
`assets/web/hero-cinema-poster.webp`, `media/hero-vasily-loop.mp4` and
`media/hero-cinema-loop.mp4`. The already public approved promotional MP4 remains
an optional native video player with sound only after the visitor plays it.
`asset-provenance.json` records delivery hashes, dimensions, sizes and scoped
artwork approvals. The original public PNG/JPG paths remain available. Raw
creative sources, private native captures, QA evidence and the standalone
soundtrack are not exported.

The page emits local `funnel_event` DOM events for `page_view`, `demo_start`,
`question_answered`, `demo_complete` and `store_click`. Fields are allowlisted;
raw guesses and raw query strings are excluded. These events are integration
hooks only: no analytics script, network collector, persistent answer storage
or GA4 Measurement ID is configured. A future consent-aware collector needs
separate setup. Store opens must not be reported as confirmed app installs.

The desktop download area also offers a locally hosted QR code, visible above
1000px. Scanning `assets/download-qr.svg` opens
`https://krostudios.com/sovietkino/#download`, where phone visitors choose the
correct official store. The code uses plain black modules on opaque white,
Q error correction and an encoded four-module quiet zone; do not add a logo
or crop that margin. Reproduce it offline on macOS from the site root with
`swift tools/generate_sovietkino_qr.swift`. No QR redirect service or runtime
dependency is used. Tablets and phones continue to use the store buttons.

The Russian store badges on the Soviet Kino page are unmodified official
artwork, kept locally in `sovietkino/assets/`:

- Apple App Store badge: [Apple Marketing Tools](https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/ru-ru?size=250x83)
- Google Play badge: [Google Play badge library](https://play.google.com/intl/en_us/badges/static/images/badges/ru_badge_web_generic.png)

Keep the platform labels outside the badge images. Apple appears first when
the two badges are shown together; retain the trademark credits in the page
footer when updating the badges or platform wording.

The Russian/English privacy and account-deletion disclosures are maintained in:

- `sovietkino-privacy.html`
- `sovietkino-delete-account.html`

Their launch contract uses the Firebase Spark plan: an authenticated in-app
request immediately blocks new online writes, KRO Studios processes the queue
manually within seven calendar days, and the app checks an unguessable,
no-UID receipt for completion. The private UID barrier and completion receipt
are removed by the daily maintenance command after their documented safety and
confirmation windows; the pages must never claim managed TTL or immediate
Cloud Function deletion.

Run the static contracts and browser journey before publishing:

```sh
python3 tests/verify_sovietkino_legal.py
python3 tests/verify_sovietkino_marketing.py
SITE_URL=http://127.0.0.1:8774/sovietkino/ node tests/verify_sovietkino_browser.cjs
SITE_URL=http://127.0.0.1:8774/sovietkino/ node tests/verify_sovietkino_funnel.cjs
```

The browser journey uses installed Chrome via Playwright. Set `PLAYWRIGHT_MODULE`
to your installed module path and `REPORT_DIR` to a private evidence folder.
An optional `APP_QUESTIONS` JSON export enables source fidelity checks; it must
remain outside this public repository. Coverage includes desktop, tablet,
compact phones, quiz retry/win/reveal, search, no-JavaScript fallback,
reduced motion, complete gallery delivery and footer access above the store bar.
The extended funnel check covers campaign selection, three-question rounds,
independent/hinted/revealed scoring, restart state, result store choices,
safe local measurement events and the silent hero controls.

## BlabFlip pages

The BlabFlip marketing, privacy, and support pages are maintained in:

- `blabflip.html`
- `blabflip-privacy.html`
- `blabflip-support.html`

The three former `echodare*.html` URLs remain as immediate HTML redirects with
visible BlabFlip fallback links and new canonical URLs. They are compatibility
routes for saved links and older builds, not duplicate branded pages. They set
`noindex,follow` and must be deployed alongside the canonical pages. These are
browser-level redirects, not HTTP 301 responses.

The app-specific privacy page must remain separate from `privacy.html`, which belongs to Tanakh Quiz. The root `app-ads.txt` record is shared across Kro Studios apps.

Run the BlabFlip static contract, accessibility, link, and publisher-record check before publishing:

```sh
python3 tests/verify_blabflip_site.py
```

The local browser check covers the three canonical pages at four viewport sizes,
keyboard skip links, FAQ interaction, all three legacy redirects with JavaScript
disabled, and the studio homepage in English, Hebrew, Russian and no-JavaScript
mode. It does not contact a live website or store:

```sh
node tests/verify_blabflip_browser.cjs
```

After replacing the genuine BlabFlip Home/Listen captures, this scoped renderer
refreshes only that app's six existing-model handset fallbacks and website
preview. It uses local Chrome/Playwright and makes no publishing calls:

```sh
node tests/render_blabflip_artwork.cjs
node tests/verify_blabflip_artwork.cjs
```

# Kro Studios website

This repository is the static site served at `https://krostudios.com/`.

## Selected homepage — Orbit Links

The local homepage now implements the approved Orbit Links design: all eight
app orbits have separate preview controls and direct destination links, around
the live gold/rose signal field and rotatable orange phone. The three owned
app websites are labelled Website; the remaining five apps link to their
actual Google Play listings. Echo Dare stays marked coming soon.

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
Echo Dare remains coming soon with its two approved captures, not an invented
store gallery. Large store images use uncropped WebP delivery copies; gallery
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
publisher page plus Echo Dare, which remains coming soon. Do not add invented
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

Run both Tanakh contracts before publishing:

```sh
python3 tests/verify_tanakh_marketing.py
python3 tests/verify_tanakh_privacy.py
```

## Soviet Kino pages

The Russian marketing page for the Android and iOS releases is `sovietkino/index.html`.
Its screenshots and icon in `sovietkino/assets/` are copies of approved Google
Play artwork from the app repository. Its download buttons point to the
production Play package `com.krostudios.sovietkino` and App Store product
`id6812753192`. The Play links retain a shared UTM source/campaign for Play
Console referral reporting. Update the screenshots, platform links, and claims
when the released game changes.

The five poster screenshots come from
`store/google_play/phone_creatives/screenshots/` in the app repository. Four
sample-question illustrations are unmodified copies of its audited
`assets/images/home/cinema_quote_scenes/` panoramas. The question clues and
answers are the enabled records `g-c-01`, `g-a-01`, `r-f-01`, and `d-p-01` in
`lib/data/soviet_questions.dart`; keep the web examples in sync if those
records change.

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

Run the static contract check before publishing:

```sh
python3 tests/verify_sovietkino_legal.py
python3 tests/verify_sovietkino_marketing.py
```

## Echo Dare pages

The Echo Dare marketing, privacy, and support pages are maintained in:

- `echodare.html`
- `echodare-privacy.html`
- `echodare-support.html`

The app-specific privacy page must remain separate from `privacy.html`, which belongs to Tanakh Quiz. The root `app-ads.txt` record is shared across Kro Studios apps.

Run the Echo Dare static contract, accessibility, link, and publisher-record check before publishing:

```sh
python3 tests/verify_echodare_site.py
```

# Kro Studios website

This repository is the static site served at `https://krostudios.com/`.

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

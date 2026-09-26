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

## Soviet Kino legal pages

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

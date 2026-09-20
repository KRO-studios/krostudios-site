#!/usr/bin/env python3
"""Dependency-free release checks for the Echo Dare website bundle."""

from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
PAGES = (
    "echodare.html",
    "echodare-privacy.html",
    "echodare-support.html",
)
APP_ADS = b"google.com, pub-7516656455022740, DIRECT, f08c47fec0942fa0\n"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.html_lang = ""
        self.title_parts: list[str] = []
        self.h1_parts: list[list[str]] = []
        self.in_title = False
        self.h1_depth = 0
        self.main_count = 0
        self.description = ""
        self.canonical = ""
        self.ids: list[str] = []
        self.links: list[dict[str, object]] = []
        self._anchor_stack: list[dict[str, object]] = []
        self.image_errors: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "html":
            self.html_lang = values.get("lang") or ""
        if tag == "title":
            self.in_title = True
        if tag == "main":
            self.main_count += 1
        if tag == "h1":
            self.h1_depth += 1
            self.h1_parts.append([])
        if identifier := values.get("id"):
            self.ids.append(identifier)
        if tag == "meta" and (values.get("name") or "").lower() == "description":
            self.description = values.get("content") or ""
        if tag == "link" and "canonical" in (values.get("rel") or "").lower().split():
            self.canonical = values.get("href") or ""
        if tag == "a":
            anchor: dict[str, object] = {
                "href": values.get("href") or "",
                "text": [],
                "aria": values.get("aria-label") or "",
                "target": values.get("target") or "",
                "rel": values.get("rel") or "",
            }
            self.links.append(anchor)
            self._anchor_stack.append(anchor)
        if tag == "img" and "alt" not in values:
            self.image_errors.append("an image is missing alt text")

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False
        if tag == "h1" and self.h1_depth:
            self.h1_depth -= 1
        if tag == "a" and self._anchor_stack:
            self._anchor_stack.pop()

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)
        if self.h1_depth:
            self.h1_parts[-1].append(data)
        for anchor in self._anchor_stack:
            text = anchor["text"]
            assert isinstance(text, list)
            text.append(data)


def normalized(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def fail(errors: list[str], page: str, message: str) -> None:
    errors.append(f"{page}: {message}")


def main() -> int:
    errors: list[str] = []
    parsed: dict[str, PageParser] = {}
    sources: dict[str, str] = {}

    app_ads_path = ROOT / "app-ads.txt"
    if not app_ads_path.is_file():
        errors.append("app-ads.txt is missing")
    elif app_ads_path.read_bytes() != APP_ADS:
        errors.append("app-ads.txt must contain exactly the authorized AdMob record")

    cname_path = ROOT / "CNAME"
    if not cname_path.is_file() or cname_path.read_text(encoding="utf-8").strip() != "krostudios.com":
        errors.append("CNAME must contain exactly krostudios.com")

    index_path = ROOT / "index.html"
    if not index_path.is_file():
        errors.append("index.html is missing")
    elif not re.search(r'href=["\']echodare\.html["\']', index_path.read_text(encoding="utf-8")):
        errors.append("index.html must contain a discoverable link to echodare.html")

    for page in PAGES:
        path = ROOT / page
        if not path.is_file():
            errors.append(f"{page}: file is missing")
            continue
        source = path.read_text(encoding="utf-8")
        sources[page] = source
        parser = PageParser()
        try:
            parser.feed(source)
            parser.close()
        except Exception as error:  # HTMLParser provides useful malformed-input failures.
            fail(errors, page, f"could not be parsed: {error}")
            continue
        parsed[page] = parser

        if not re.match(r"\s*<!doctype html>", source, re.IGNORECASE):
            fail(errors, page, "missing an HTML5 doctype")
        if parser.html_lang != "en":
            fail(errors, page, 'expected <html lang="en">')
        if not normalized("".join(parser.title_parts)):
            fail(errors, page, "title is empty")
        if not normalized(parser.description):
            fail(errors, page, "meta description is empty")
        if parser.main_count != 1:
            fail(errors, page, "must contain exactly one main element")
        nonempty_h1 = [normalized("".join(parts)) for parts in parser.h1_parts if normalized("".join(parts))]
        if len(nonempty_h1) != 1:
            fail(errors, page, "must contain exactly one nonempty h1")
        if not parser.canonical.startswith("https://krostudios.com/"):
            fail(errors, page, "canonical URL must use https://krostudios.com/")
        duplicate_ids = sorted({item for item in parser.ids if parser.ids.count(item) > 1})
        if duplicate_ids:
            fail(errors, page, f"duplicate IDs: {', '.join(duplicate_ids)}")
        for message in parser.image_errors:
            fail(errors, page, message)

        forbidden = re.compile(
            r"\b(?:placeholder|replace(?:_with)?|todo|tbd|example\.com|id0{5,})\b",
            re.IGNORECASE,
        )
        if forbidden.search(source):
            fail(errors, page, "contains a release placeholder")

    for page, parser in parsed.items():
        for link in parser.links:
            href = str(link["href"])
            link_text = normalized("".join(link["text"])) or normalized(str(link["aria"]))
            if not link_text:
                fail(errors, page, f"link {href!r} has no accessible name")
            if not href or href == "#" or href.lower().startswith("javascript:"):
                fail(errors, page, f"invalid link target {href!r}")
                continue
            if str(link["target"]) == "_blank":
                rel = set(str(link["rel"]).lower().split())
                if not {"noopener", "noreferrer"}.issubset(rel):
                    fail(errors, page, f"new-window link {href!r} needs rel=\"noopener noreferrer\"")

            target = urlsplit(href)
            if target.scheme:
                if target.scheme not in {"https", "mailto"}:
                    fail(errors, page, f"external link must use HTTPS or mailto: {href!r}")
                continue
            if href.startswith("//"):
                fail(errors, page, f"protocol-relative link is not allowed: {href!r}")
                continue
            if target.path in {"", "/"}:
                target_page = page if target.path == "" else None
            else:
                relative = Path(unquote(target.path))
                if relative.is_absolute() or ".." in relative.parts:
                    fail(errors, page, f"unsafe local link: {href!r}")
                    continue
                destination = ROOT / relative
                if not destination.is_file():
                    fail(errors, page, f"broken local link: {href!r}")
                    continue
                target_page = relative.as_posix()
            if target.fragment and target_page:
                destination_parser = parsed.get(target_page)
                if destination_parser and target.fragment not in destination_parser.ids:
                    fail(errors, page, f"broken fragment in {href!r}")

    landing = normalized(re.sub(r"<[^>]+>", " ", sources.get("echodare.html", "")))
    landing_contract = (
        "Echo Dare",
        "reverse-voice party game",
        "pass-and-play",
        "Voice clips are processed on your device and are not uploaded to an Echo Dare server.",
        "A clip leaves the App only if you choose to share it.",
        "Core gameplay works offline",
    )
    for statement in landing_contract:
        if statement not in landing:
            fail(errors, "echodare.html", f"missing product contract text: {statement!r}")
    if not re.search(r"2\s*[–-]\s*12 players", landing):
        fail(errors, "echodare.html", "missing the 2–12 players claim")

    landing_links = {str(link["href"]) for link in parsed.get("echodare.html", PageParser()).links}
    for required in {"echodare-privacy.html", "echodare-support.html", "/"}:
        if required not in landing_links:
            fail(errors, "echodare.html", f"missing required link to {required!r}")
    generic_store_links = {
        "https://apps.apple.com/",
        "https://play.google.com/",
        "https://play.google.com/store/apps/developer",
    }
    if landing_links & generic_store_links:
        fail(errors, "echodare.html", "contains a generic store link instead of an app listing")

    privacy = normalized(re.sub(r"<[^>]+>", " ", sources.get("echodare-privacy.html", "")))
    privacy_contract = (
        "Last updated: September 20, 2026",
        "hello@krostudios.com",
        "Google Mobile Ads (AdMob)",
        "User Messaging Platform (UMP)",
        "marks all ad requests for teen treatment",
        "PG-or-lower content label",
        "intended for teens and adults aged 13 and older",
        "not directed to children under 13",
        "does not sell",
    )
    for statement in privacy_contract:
        if statement not in privacy:
            fail(errors, "echodare-privacy.html", f"missing privacy contract text: {statement!r}")

    if errors:
        print("Echo Dare website verification failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"Echo Dare website verification passed ({len(PAGES)} pages + app-ads.txt).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

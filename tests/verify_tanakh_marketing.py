#!/usr/bin/env python3
"""Dependency-free checks for the Tanakh Quiz marketing funnel."""

from __future__ import annotations

from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
LANDING = ROOT / "tanakh-quiz" / "index.html"
CANONICAL = "https://krostudios.com/tanakh-quiz/"
APPLE = "https://apps.apple.com/app/id6797598421"
GOOGLE = "https://play.google.com/store/apps/details?id=com.krostudios.tanakh_quiz"
SOCIAL_IMAGE = "https://krostudios.com/tanakh-quiz/assets/social-cover.png"
DISCOVERY_PAGES = (
    ROOT / "index.html",
    ROOT / "chidon-hatanach.html",
    ROOT / "psukim-mefursamim.html",
)


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.html_lang = ""
        self.html_dir = ""
        self.title_parts: list[str] = []
        self.in_title = False
        self.description = ""
        self.canonical = ""
        self.meta_properties: dict[str, str] = {}
        self.main_count = 0
        self.h1_parts: list[list[str]] = []
        self.h1_depth = 0
        self.ids: list[str] = []
        self.links: list[dict[str, object]] = []
        self.images: list[dict[str, str | None]] = []
        self._anchor_stack: list[dict[str, object]] = []
        self._json_script_depth = 0
        self._json_parts: list[str] = []
        self.json_ld: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "html":
            self.html_lang = values.get("lang") or ""
            self.html_dir = values.get("dir") or ""
        elif tag == "title":
            self.in_title = True
        elif tag == "main":
            self.main_count += 1
        elif tag == "h1":
            self.h1_depth += 1
            self.h1_parts.append([])

        if identifier := values.get("id"):
            self.ids.append(identifier)
        if tag == "meta":
            name = (values.get("name") or "").lower()
            prop = (values.get("property") or "").lower()
            if name == "description":
                self.description = values.get("content") or ""
            if prop:
                self.meta_properties[prop] = values.get("content") or ""
        if tag == "link" and "canonical" in (values.get("rel") or "").lower().split():
            self.canonical = values.get("href") or ""
        if tag == "a":
            anchor: dict[str, object] = {
                "href": values.get("href") or "",
                "aria": values.get("aria-label") or "",
                "text": [],
                "images": [],
            }
            self.links.append(anchor)
            self._anchor_stack.append(anchor)
        if tag == "img":
            image = {"src": values.get("src"), "alt": values.get("alt")}
            self.images.append(image)
            if self._anchor_stack:
                anchor_images = self._anchor_stack[-1]["images"]
                assert isinstance(anchor_images, list)
                anchor_images.append(image)
        if tag == "script" and (values.get("type") or "").lower() == "application/ld+json":
            self._json_script_depth = 1
            self._json_parts = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False
        elif tag == "h1" and self.h1_depth:
            self.h1_depth -= 1
        elif tag == "a" and self._anchor_stack:
            self._anchor_stack.pop()
        elif tag == "script" and self._json_script_depth:
            self.json_ld.append("".join(self._json_parts))
            self._json_script_depth = 0

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)
        if self.h1_depth:
            self.h1_parts[-1].append(data)
        for anchor in self._anchor_stack:
            text = anchor["text"]
            assert isinstance(text, list)
            text.append(data)
        if self._json_script_depth:
            self._json_parts.append(data)


def normalized(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def local_target(page: Path, reference: str) -> Path | None:
    parsed = urlsplit(reference)
    if parsed.scheme or reference.startswith("//"):
        return None
    path = unquote(parsed.path)
    if not path:
        return page
    if path == "/":
        return ROOT / "index.html"
    target = ROOT / path.lstrip("/") if path.startswith("/") else page.parent / path
    if target.is_dir() or path.endswith("/"):
        target = target / "index.html"
    return target


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def main() -> int:
    errors: list[str] = []
    if not LANDING.is_file():
        print("Tanakh marketing verification failed: landing page is missing", file=sys.stderr)
        return 1

    source = LANDING.read_text(encoding="utf-8")
    parser = PageParser()
    parser.feed(source)
    parser.close()

    if not re.match(r"\s*<!doctype html>", source, re.IGNORECASE):
        fail(errors, "tanakh-quiz/index.html: missing HTML5 doctype")
    if parser.html_lang != "he" or parser.html_dir != "rtl":
        fail(errors, 'tanakh-quiz/index.html: expected lang="he" and dir="rtl"')
    if parser.main_count != 1:
        fail(errors, "tanakh-quiz/index.html: must contain exactly one main element")
    headings = [normalized("".join(parts)) for parts in parser.h1_parts if normalized("".join(parts))]
    if len(headings) != 1:
        fail(errors, "tanakh-quiz/index.html: must contain exactly one nonempty h1")
    if not normalized("".join(parser.title_parts)):
        fail(errors, "tanakh-quiz/index.html: title is empty")
    if not normalized(parser.description):
        fail(errors, "tanakh-quiz/index.html: meta description is empty")
    if parser.canonical != CANONICAL:
        fail(errors, f"tanakh-quiz/index.html: canonical must be {CANONICAL}")

    for name in ("og:type", "og:locale", "og:title", "og:description", "og:url", "og:image"):
        if not normalized(parser.meta_properties.get(name, "")):
            fail(errors, f"tanakh-quiz/index.html: missing {name}")
    if parser.meta_properties.get("og:image") != SOCIAL_IMAGE:
        fail(errors, f"tanakh-quiz/index.html: og:image must be {SOCIAL_IMAGE}")
    if not (ROOT / "tanakh-quiz" / "assets" / "social-cover.png").is_file():
        fail(errors, "tanakh-quiz/index.html: social cover image is missing")

    expected_ui_assets = (
        "ui-categories.jpg",
        "ui-gameplay.jpg",
        "ui-correct.jpg",
        "ui-daily.jpg",
        "ui-leaderboard.jpg",
        "ui-difficulty.jpg",
    )
    for asset in expected_ui_assets:
        if f"/tanakh-quiz/assets/{asset}" not in source:
            fail(errors, f"tanakh-quiz/index.html: missing current UI asset {asset!r}")
    frame_asset = ROOT / "tanakh-quiz" / "assets" / "iphone-real-frame-v3.png"
    if "/tanakh-quiz/assets/iphone-real-frame-v3.png" not in source or not frame_asset.is_file():
        fail(errors, "tanakh-quiz/index.html: missing photorealistic iPhone frame")
    if "inset:4.7526% 6.0417% 4.1016%" not in source:
        fail(errors, "tanakh-quiz/index.html: app screenshots are not aligned to the iPhone frame aperture")
    if "object-fit:cover;object-position:50% 0" not in source:
        fail(errors, "tanakh-quiz/index.html: screenshots must retain their natural Dynamic Island inset")
    if source.count('class="device-slide') != 5:
        fail(errors, "tanakh-quiz/index.html: hero carousel must contain five UI screens")
    if "var interval = 7000" not in source:
        fail(errors, "tanakh-quiz/index.html: hero carousel must use the slower seven-second interval")
    for autoplay_blocker in (
        "!motion.matches",
        "interactionPaused",
        "carousel.addEventListener('focusin'",
        "IntersectionObserver",
        "var inView",
    ):
        if autoplay_blocker in source:
            fail(errors, f"tanakh-quiz/index.html: carousel autoplay can still be permanently blocked: {autoplay_blocker}")
    for obsolete_control in (
        "carousel-controls",
        "carousel-button",
        "carousel-dot",
        "slide-caption",
        "iphone-shell",
        "phone-button",
    ):
        if obsolete_control in source:
            fail(errors, f"tanakh-quiz/index.html: obsolete visible carousel UI remains: {obsolete_control}")
    if "feature-graphic.jpg" in source:
        fail(errors, "tanakh-quiz/index.html: obsolete feature graphic is still referenced")

    duplicates = sorted({identifier for identifier in parser.ids if parser.ids.count(identifier) > 1})
    if duplicates:
        fail(errors, f"tanakh-quiz/index.html: duplicate IDs: {', '.join(duplicates)}")

    for image in parser.images:
        src = image["src"] or ""
        if image["alt"] is None:
            fail(errors, f"tanakh-quiz/index.html: image {src!r} is missing alt")
        target = local_target(LANDING, src)
        if target is not None and not target.is_file():
            fail(errors, f"tanakh-quiz/index.html: missing local image {src!r}")

    landing_hrefs: list[str] = []
    badge_links: list[tuple[str, str]] = []
    for link in parser.links:
        href = str(link["href"])
        landing_hrefs.append(href)
        text = normalized("".join(link["text"])) or normalized(str(link["aria"]))
        images = link["images"]
        assert isinstance(images, list)
        if not text and not any(normalized(str(image.get("alt") or "")) for image in images):
            fail(errors, f"tanakh-quiz/index.html: link {href!r} has no accessible name")
        if not href or href == "#" or href.lower().startswith("javascript:"):
            fail(errors, f"tanakh-quiz/index.html: invalid link {href!r}")
            continue
        target = local_target(LANDING, href)
        if target is not None and not target.is_file():
            fail(errors, f"tanakh-quiz/index.html: broken local link {href!r}")
        fragment = urlsplit(href).fragment
        if fragment and urlsplit(href).path in {"", "/tanakh-quiz/"} and fragment not in parser.ids:
            fail(errors, f"tanakh-quiz/index.html: broken fragment {href!r}")
        for image in images:
            image_src = str(image.get("src") or "")
            if "badge" in image_src.lower():
                badge_links.append((image_src, href))

    if landing_hrefs.count(APPLE) != 2 or landing_hrefs.count(GOOGLE) != 2:
        fail(errors, "tanakh-quiz/index.html: each exact store listing must appear twice")
    for image_src, href in badge_links:
        expected = APPLE if "appstore" in image_src.lower() else GOOGLE
        if href != expected:
            fail(errors, f"tanakh-quiz/index.html: badge {image_src!r} has wrong target {href!r}")

    visible_text = normalized(re.sub(r"<[^>]+>", " ", source))
    for phrase in (
        "חידון התנ״ך",
        "משחק מילים וטריוויה בעברית",
        "השלמת פסוקים",
        "מי אמר למי",
        "האתגר היומי נמצא באפליקציה בלבד",
    ):
        if phrase not in visible_text:
            fail(errors, f"tanakh-quiz/index.html: missing product copy {phrase!r}")

    if len(parser.json_ld) != 1:
        fail(errors, "tanakh-quiz/index.html: expected one JSON-LD block")
    else:
        try:
            structured = json.loads(parser.json_ld[0])
            if structured.get("@type") != "SoftwareApplication":
                fail(errors, "tanakh-quiz/index.html: JSON-LD must describe SoftwareApplication")
            if structured.get("applicationCategory") != "GameApplication":
                fail(errors, "tanakh-quiz/index.html: JSON-LD must describe GameApplication")
            if structured.get("operatingSystem") != "Android, iOS":
                fail(errors, "tanakh-quiz/index.html: JSON-LD must list Android and iOS")
            if structured.get("offers", {}).get("price") != "0":
                fail(errors, "tanakh-quiz/index.html: JSON-LD must describe the app as free")
        except (json.JSONDecodeError, AttributeError) as error:
            fail(errors, f"tanakh-quiz/index.html: invalid JSON-LD: {error}")

    for page in DISCOVERY_PAGES:
        page_source = page.read_text(encoding="utf-8")
        if not re.search(r'href=["\']/tanakh-quiz/["\']', page_source):
            fail(errors, f"{page.name}: missing discoverable link to /tanakh-quiz/")

    for page in ROOT.rglob("*.html"):
        page_source = page.read_text(encoding="utf-8")
        if re.search(r'href=["\']/daily/?(?:["\'#?])', page_source, re.IGNORECASE):
            fail(errors, f"{page.relative_to(ROOT)}: obsolete /daily link remains")

    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8") if (ROOT / "sitemap.xml").is_file() else ""
    robots = (ROOT / "robots.txt").read_text(encoding="utf-8") if (ROOT / "robots.txt").is_file() else ""
    if CANONICAL not in sitemap:
        fail(errors, "sitemap.xml: missing Tanakh Quiz landing page")
    if "https://krostudios.com/sitemap.xml" not in robots:
        fail(errors, "robots.txt: missing sitemap declaration")

    if errors:
        print("Tanakh marketing verification failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("Tanakh Quiz marketing funnel verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

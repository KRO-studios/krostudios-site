#!/usr/bin/env python3
"""Dependency-free contract for Tanakh Quiz's desktop-to-phone QR handoff.

This checks local markup, responsive intent and exact SVG module geometry.
Decoding an actual browser screenshot remains a separate browser QA step.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "tanakh-quiz/index.html"
QR = ROOT / "tanakh-quiz/assets/download-qr.svg"
GENERATOR = ROOT / "tools/generate_tanakh_qr.swift"
DESTINATION = "https://krostudios.com/tanakh-quiz/#download"
APPLE = "https://apps.apple.com/app/id6797598421"
GOOGLE = "https://play.google.com/store/apps/details?id=com.krostudios.tanakh_quiz"
TITLE = "סרקו כדי להמשיך בטלפון"
SVG_NS = "{http://www.w3.org/2000/svg}"


@dataclass
class Element:
    tag: str
    attrs: dict[str, str | None] = field(default_factory=dict)
    children: list[Element] = field(default_factory=list)
    text: list[str] = field(default_factory=list)
    order: int = 0

    def has_class(self, name: str) -> bool:
        return name in (self.attrs.get("class") or "").split()

    def descendants(self) -> list[Element]:
        return [child for node in self.children for child in [node, *node.descendants()]]

    def content(self) -> str:
        return re.sub(r"\s+", " ", " ".join(self.text)).strip()


class Document(HTMLParser):
    VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Element("document")
        self.stack = [self.root]
        self.count = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.count += 1
        node = Element(tag, dict(attrs), order=self.count)
        self.stack[-1].children.append(node)
        if tag not in self.VOID_TAGS:
            self.stack.append(node)

    def handle_endtag(self, tag: str) -> None:
        assert len(self.stack) > 1, f"closing unopened <{tag}>"
        assert self.stack[-1].tag == tag, f"closing <{tag}> while <{self.stack[-1].tag}> is open"
        self.stack.pop()

    def handle_data(self, data: str) -> None:
        for node in self.stack:
            node.text.append(data)


def only(nodes: list[Element], label: str) -> Element:
    assert len(nodes) == 1, f"expected exactly one {label}; found {len(nodes)}"
    return nodes[0]


def css_rules(source: str, media: tuple[str, ...] = ()) -> list[tuple[str, dict[str, str], tuple[str, ...]]]:
    """Read this page's ordinary CSS rules without a third-party CSS parser."""
    source = re.sub(r"/\*.*?\*/", "", source, flags=re.S)
    rules = []
    offset = 0
    while offset < len(source):
        start = source.find("{", offset)
        if start < 0:
            break
        header = source[offset:start].strip()
        depth = 1
        end = start + 1
        while end < len(source) and depth:
            depth += (source[end] == "{") - (source[end] == "}")
            end += 1
        assert depth == 0, "unbalanced CSS block"
        body = source[start + 1:end - 1]
        if header.lower().startswith("@media"):
            rules.extend(css_rules(body, (*media, header)))
        elif not header.startswith("@"):
            declarations = {}
            for declaration in body.split(";"):
                if ":" in declaration:
                    key, value = declaration.split(":", 1)
                    declarations[key.strip().lower()] = value.strip().lower()
            rules.append((header, declarations, media))
        offset = end
    return rules


def check_markup(source: str) -> None:
    document = Document()
    document.feed(source)
    document.close()
    assert len(document.stack) == 1, "unclosed HTML elements"
    nodes = document.root.descendants()
    html = only([node for node in nodes if node.tag == "html"], "HTML root")
    assert html.attrs.get("lang") == "he" and html.attrs.get("dir") == "rtl", "keep the Hebrew RTL page"
    hero = only([node for node in nodes if node.has_class("hero")], "hero")
    copy = only([node for node in hero.descendants() if node.has_class("hero-copy")], "hero copy")
    card = only([node for node in nodes if node.has_class("desktop-qr")], "desktop QR card")
    assert card.tag == "aside" and card in copy.descendants(), "QR must be a compact aside inside hero copy"
    store_row = only([node for node in copy.descendants() if node.has_class("store-row")], "hero store row")
    assert card.order > max(node.order for node in [store_row, *store_row.descendants()]), "QR must follow the main store buttons"
    assert card.attrs.get("aria-labelledby") == "desktop-qr-title", "QR card needs its accessible Hebrew title"
    title = only([node for node in card.descendants() if node.attrs.get("id") == "desktop-qr-title"], "QR title")
    assert title.content() == TITLE, "use the Hebrew scan-to-continue instruction"
    links = [node for node in card.descendants() if node.tag == "a"]
    link = only([node for node in links if node.has_class("desktop-qr-link")], "QR link")
    assert link.attrs.get("href") == DESTINATION, "QR click must open this app's download section"
    image = only([node for node in card.descendants() if node.tag == "img"], "QR image")
    assert image in link.descendants(), "make the QR a normal link as well as a scannable image"
    assert image.attrs.get("src") == "/tanakh-quiz/assets/download-qr.svg", "serve the QR locally, not through a third party"
    assert image.attrs.get("width") == image.attrs.get("height") == "164", "QR display dimensions must be 164 by 164"
    assert image.attrs.get("alt"), "QR image needs an accessible alternative"
    assert link.attrs.get("aria-label") or link.content() or image.attrs.get("alt"), "QR link needs an accessible name"
    assert not any("hidden" in node.attrs for node in [card, link, image]), "responsive CSS, not permanently hidden markup, controls the QR"

    download = only([node for node in nodes if node.attrs.get("id") == "download"], "download destination")
    download_links = [node.attrs.get("href") for node in download.descendants() if node.tag == "a"]
    assert download_links.count(APPLE) == download_links.count(GOOGLE) == 1, "#download must offer each exact verified app listing once"
    assert len(download_links) == 2, "keep the phone destination focused on the two store choices"
    for node in download.descendants():
        assert "hidden" not in node.attrs, "phone store choices must be available without JavaScript"


def check_css(source: str) -> None:
    styles = re.findall(r"<style\b[^>]*>(.*?)</style>", source, flags=re.I | re.S)
    rules = css_rules("\n".join(styles))
    card_rules = [(values, media) for selectors, values, media in rules if ".desktop-qr" in [part.strip() for part in selectors.split(",")]]
    assert any(not media and values.get("display") == "none" for values, media in card_rules), "hide the QR by default on phones/tablets"
    visible_rules = [(values, media) for values, media in card_rules if "display" in values and values["display"] != "none"]
    assert visible_rules, "QR needs an explicit desktop display rule"
    for values, media in visible_rules:
        assert any(re.search(r"min-width\s*:\s*1001px", query, re.I) for query in media), "show QR only above the 1000px breakpoint"
    qr_rules = [(selectors, values) for selectors, values, _ in rules if re.search(r"\.desktop-qr(?:[-\s.:>#\[]|$)", selectors)]
    assert any(values.get("direction") == "ltr" and ("desktop-qr-link" in selectors or "img" in selectors) for selectors, values in qr_rules), "explicitly keep QR artwork left-to-right in the RTL page"
    for selectors, values in qr_rules:
        transform = values.get("transform", "")
        assert not re.search(r"scale(?:x|y)?\s*\([^)]*-", transform), f"QR must never be mirrored: {selectors}"
        assert not re.search(r"rotate(?:x|y)\s*\(\s*180", transform), f"QR must never be mirrored: {selectors}"


def check_svg() -> None:
    svg = ET.parse(QR).getroot()
    assert svg.tag == SVG_NS + "svg", "QR must be a normal local SVG"
    viewbox = [int(value) for value in (svg.get("viewBox") or "").split()]
    assert len(viewbox) == 4 and viewbox[:2] == [0, 0] and viewbox[2] == viewbox[3], "QR viewBox must be a square module grid"
    side = viewbox[2]
    modules = side - 8
    assert 21 <= modules <= 177 and (modules - 21) % 4 == 0, "QR dimensions must include exactly four quiet modules per edge"
    assert svg.get("shape-rendering") == "crispEdges", "retain crisp square QR modules"
    assert svg.get("width") == svg.get("height") == "164", "SVG must have the intended 164px intrinsic size"
    assert any((node.text or "").strip() == DESTINATION for node in svg.findall(SVG_NS + "desc")), "QR description must record the app-specific destination"
    assert all(node.tag in {SVG_NS + tag for tag in ("title", "desc", "rect", "path")} for node in svg), "QR must not contain scripts, images, overlays or external resources"
    background = svg.findall(SVG_NS + "rect")
    assert len(background) == 1, "QR needs one opaque background"
    assert background[0].get("fill") == "#fff", "QR background must be white"
    assert background[0].get("width") == background[0].get("height") == str(side), "white background must include the entire quiet zone"
    paths = svg.findall(SVG_NS + "path")
    assert len(paths) == 1 and paths[0].get("fill") == "#000", "QR modules must be plain black"
    assert not any(node.get("transform") or node.get("style") or node.get("opacity") for node in svg.iter()), "QR geometry/colors must not be transformed or made translucent"
    commands = paths[0].get("d") or ""
    module = re.compile(r"M\s*(\d+)\s*[, ]\s*(\d+)\s*h\s*1\s*v\s*1\s*h\s*-1\s*z", re.I)
    coordinates = [(int(match[1]), int(match[2])) for match in module.finditer(commands)]
    assert coordinates and not module.sub("", commands).strip(), "QR path must consist only of square 1-module cells"
    dark = set(coordinates)
    assert len(dark) == len(coordinates), "QR module path must not contain duplicate cells"
    assert min(x for x, _ in dark) == min(y for _, y in dark) == 4, "QR needs a four-module top/left quiet zone"
    assert max(x for x, _ in dark) == max(y for _, y in dark) == side - 5, "QR needs a four-module bottom/right quiet zone"
    for left, top in ((4, 4), (side - 11, 4), (4, side - 11)):
        for y in range(7):
            for x in range(7):
                expected = x in (0, 6) or y in (0, 6) or (2 <= x <= 4 and 2 <= y <= 4)
                assert ((left + x, top + y) in dark) == expected, "QR finder patterns must be intact and unmirrored"


def check_generator() -> None:
    source = GENERATOR.read_text(encoding="utf-8")
    assert re.search(r'let\s+destination\s*=\s*"' + re.escape(DESTINATION) + r'"', source), "offline generator must encode the app's own download URL"
    assert re.search(r'correctionLevel\s*=\s*"Q"', source), "offline QR generation must use Q error correction"
    assert re.search(r"let\s+margin\s*=\s*4\b", source), "offline generator must preserve four quiet modules"
    assert "tanakh-quiz/assets/download-qr.svg" in source, "generator must target the local Tanakh QR asset"


def main() -> int:
    missing = [str(path.relative_to(ROOT)) for path in (PAGE, QR, GENERATOR) if not path.is_file()]
    if missing:
        print("Tanakh QR verification failed: missing " + ", ".join(missing), file=sys.stderr)
        return 1
    try:
        source = PAGE.read_text(encoding="utf-8")
        check_markup(source)
        check_css(source)
        check_svg()
        check_generator()
    except (AssertionError, ET.ParseError, ValueError) as error:
        print(f"Tanakh QR verification failed: {error}", file=sys.stderr)
        return 1
    print("Tanakh desktop QR markup, responsive contract, store destination and four-module SVG quiet zone verified.")
    print("Actual browser screenshot decoding must also pass before publishing.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

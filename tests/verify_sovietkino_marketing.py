#!/usr/bin/env python3
"""Check that Soviet Kino's store cards open the right app with official badges."""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "sovietkino/index.html"
APPLE = "https://apps.apple.com/app/id6812753192"
GOOGLE = (
    "https://play.google.com/store/apps/details?id=com.krostudios.sovietkino"
    "&utm_source=krostudios&utm_medium=website&utm_campaign=sovietkino_landing"
)
APPLE_BADGE = "assets/app-store-badge-ru.svg"
GOOGLE_BADGE = "assets/google-play-badge-ru.png"


class StoreCards(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.cards: list[dict[str, object]] = []
        self.current: dict[str, object] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "a" and "store-option" in (values.get("class") or "").split():
            assert self.current is None, "nested store-card links"
            self.current = {"href": values.get("href"), "images": [], "text": ""}
        elif tag == "img" and self.current is not None:
            self.current["images"].append((values.get("src"), values.get("alt")))

    def handle_data(self, data: str) -> None:
        if self.current is not None:
            self.current["text"] += data

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self.current is not None:
            self.cards.append(self.current)
            self.current = None


def main() -> None:
    parser = StoreCards()
    parser.feed(PAGE.read_text(encoding="utf-8"))
    parser.close()
    assert parser.current is None
    assert len(parser.cards) == 4, "expected two store cards in both download sections"

    for index, card in enumerate(parser.cards):
        is_apple = index % 2 == 0
        expected_link = APPLE if is_apple else GOOGLE
        expected_badge = APPLE_BADGE if is_apple else GOOGLE_BADGE
        assert card["href"] == expected_link, (index, card["href"])
        assert len(card["images"]) == 1, (index, card["images"])
        badge_src, badge_alt = card["images"][0]
        assert badge_src == expected_badge, (index, badge_src)
        assert badge_alt and ("App Store" if is_apple else "Google Play") in badge_alt
        assert ("iPhone" if is_apple else "Android") in card["text"]
        assert (PAGE.parent / badge_src).is_file(), f"missing badge: {badge_src}"

    apple_art = (PAGE.parent / APPLE_BADGE).read_text(encoding="utf-8")
    google_art = (PAGE.parent / GOOGLE_BADGE).read_bytes()
    assert "Download_on_the_App_Store_Badge_RU_RGB_blk" in apple_art
    assert google_art.startswith(b"\x89PNG\r\n\x1a\n")
    print("Soviet Kino store-card links and official badges verified.")


if __name__ == "__main__":
    main()

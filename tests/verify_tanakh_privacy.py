#!/usr/bin/env python3
"""Static contract checks for the bilingual Tanakh Quiz privacy page."""

from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PRIVACY = ROOT / "privacy.html"


class Document(HTMLParser):
    VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.open_tags: list[str] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        if tag not in self.VOID_TAGS:
            self.open_tags.append(tag)

    def handle_endtag(self, tag: str) -> None:
        assert self.open_tags, f"closing unopened <{tag}>"
        expected = self.open_tags.pop()
        assert expected == tag, f"closing <{tag}> while <{expected}> is open"


def require(source: str, *phrases: str) -> None:
    for phrase in phrases:
        assert phrase in source, f"missing required disclosure: {phrase!r}"


def main() -> None:
    source = PRIVACY.read_text(encoding="utf-8")
    document = Document()
    document.feed(source)
    document.close()
    assert not document.open_tags, f"unclosed tags: {document.open_tags[-5:]}"

    require(
        source,
        "Last updated: September 2026",
        "name, score, selected badge, and anonymous account identifier",
        "השם, הציון, התג הנבחר ומזהה החשבון האנונימי",
        "random anonymous Firebase account identifier",
        "מזהה אקראי של חשבון Firebase אנונימי",
        "Google Firebase Authentication / Firestore",
        "Google Play Billing on Android and Apple App Store / StoreKit on iOS",
        "Google Play Billing ב-Android וה-App Store / StoreKit של Apple ב-iOS",
        "Advertising Choices",
        "אפשרויות פרטיות בפרסום",
        "Privacy choices option appears in Settings",
        "בקשת המערכת לאישור מעקב",
    )

    print("Tanakh Quiz privacy-page contract verified.")


if __name__ == "__main__":
    main()

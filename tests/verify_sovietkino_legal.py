#!/usr/bin/env python3
"""Static contract checks for the bilingual Soviet Kino legal pages."""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re


ROOT = Path(__file__).resolve().parents[1]
PRIVACY = ROOT / "sovietkino-privacy.html"
DELETION = ROOT / "sovietkino-delete-account.html"


class Document(HTMLParser):
    VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.references: list[str] = []
        self.open_tags: list[str] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"])
        for attribute in ("href", "src"):
            if values.get(attribute):
                self.references.append(values[attribute])
        if tag not in self.VOID_TAGS:
            self.open_tags.append(tag)

    def handle_endtag(self, tag: str) -> None:
        assert self.open_tags, f"closing unopened <{tag}>"
        expected = self.open_tags.pop()
        assert expected == tag, f"closing <{tag}> while <{expected}> is open"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def verify_document(path: Path) -> str:
    source = read(path)
    document = Document()
    document.feed(source)
    document.close()
    assert not document.open_tags, (
        f"{path.name}: unclosed tags: {document.open_tags[-5:]}"
    )

    duplicate_ids = sorted(
        value for value in set(document.ids) if document.ids.count(value) > 1
    )
    assert not duplicate_ids, f"{path.name}: duplicate ids: {duplicate_ids}"

    for reference in document.references:
        parsed = urlsplit(reference)
        if parsed.scheme or reference.startswith("#"):
            continue
        target = path.parent / unquote(parsed.path)
        assert target.is_file(), f"{path.name}: missing local reference {reference}"

    for css_reference in re.findall(r'url\(["\']?([^"\')]+)', source):
        parsed = urlsplit(css_reference)
        if parsed.scheme or css_reference.startswith("data:"):
            continue
        target = path.parent / unquote(parsed.path)
        assert target.is_file(), (
            f"{path.name}: missing local CSS reference {css_reference}"
        )

    return source


def require(source: str, *phrases: str) -> None:
    for phrase in phrases:
        assert phrase in source, f"missing required disclosure: {phrase!r}"


def forbid(source: str, *phrases: str) -> None:
    for phrase in phrases:
        assert phrase not in source, f"obsolete disclosure remains: {phrase!r}"


def main() -> None:
    privacy = verify_document(PRIVACY)
    deletion = verify_document(DELETION)
    combined = privacy + deletion

    require(
        privacy,
        "Версия 1.2",
        "Version 1.2",
        'datetime="2026-09-06"',
        "Запрос на удаление и квитанция",
        "Deletion request and receipt",
    )
    require(
        deletion,
        "Версия 1.1",
        "Version 1.1",
        'datetime="2026-09-06"',
        "ЗАПРОС НА УДАЛЕНИЕ ПРИНЯТ",
        "DELETION REQUEST ACCEPTED",
        "игра выходит из анонимной онлайн-учётной записи",
        "game signs out of the anonymous online account",
        "mailto:hello@krostudios.com",
    )
    require(
        combined,
        "Советское кино: Угадай слово",
        "7 календарных дней",
        "7 calendar days",
        "неугадываемый номер запроса",
        "unguessable request number",
        "30 дней после завершения",
        "30 days after completion",
    )
    forbid(
        combined,
        "Советское кино. Проверим?",
        "обычно выполняется во время подтверждённой операции",
        "normally completes during the confirmed operation",
        "резервный срок до 30 дней",
        "fallback expiry of up to 30 days",
        "Firestore обычно удаляет метку автоматически",
        "Firestore then ordinarily removes the marker automatically",
        "managed TTL",
        "deletePlayerAccount",
    )

    print("Soviet Kino legal-page contract verified.")


if __name__ == "__main__":
    main()

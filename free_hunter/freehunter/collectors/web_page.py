"""任意の公開 Web ページ 1 件を解析する。"""
from __future__ import annotations

from ..extract import html_to_text, page_title
from ..models import Campaign
from .base import BaseCollector, log


class WebPageCollector(BaseCollector):
    kind = "web_page"

    def collect(self) -> list[Campaign]:
        url = self.source["url"]
        html = self.fetch(url)
        c = self.parse(html, url)
        log.info("[%s] ページ解析 1件", self.name)
        return [c]

    def parse(self, html: str, url: str) -> Campaign:
        return self.build(page_title(html) or self.name, url, html_to_text(html))

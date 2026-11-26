"""RSS 2.0 / Atom フィードの収集。"""
from __future__ import annotations

from bs4 import BeautifulSoup

from ..extract import html_to_text
from ..models import Campaign
from .base import BaseCollector, CAMPAIGN_WORDS, log


class RssCollector(BaseCollector):
    kind = "rss"

    def collect(self) -> list[Campaign]:
        xml = self.fetch(self.source["url"])
        return self.parse(xml)

    def parse(self, xml: str) -> list[Campaign]:
        soup = BeautifulSoup(xml, "xml")
        items = soup.find_all("item") or soup.find_all("entry")
        out = []
        only_campaign = self.source.get("filter_keywords", True)
        for it in items:
            title = (it.find("title").get_text(strip=True) if it.find("title") else "").strip()
            link_tag = it.find("link")
            link = ""
            if link_tag is not None:
                link = link_tag.get("href") or link_tag.get_text(strip=True)
            desc_tag = it.find("description") or it.find("content") or it.find("summary") or it.find("encoded")
            desc = html_to_text(desc_tag.get_text()) if desc_tag else ""
            if not title or not link:
                continue
            if only_campaign and not (CAMPAIGN_WORDS.search(title) or CAMPAIGN_WORDS.search(desc)):
                continue
            out.append(self.build(title, link, desc))
        if self.source.get("follow_detail"):
            for c in out[: self.max_detail]:
                self.enrich_from_detail(c)
        log.info("[%s] RSS %d件", self.name, len(out))
        return out

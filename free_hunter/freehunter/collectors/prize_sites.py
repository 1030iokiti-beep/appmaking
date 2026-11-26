"""懸賞専門サイトの一覧ページ収集。
selectors を設定すればそれに従い、無ければリンク文字・周辺テキストから自動判定する。"""
from __future__ import annotations

from bs4 import BeautifulSoup

from ..models import Campaign
from ..normalize import normalize_url
from .base import BaseCollector, find_campaign_links, log


class ListPageCollector(BaseCollector):
    kind = "list_page"

    def collect(self) -> list[Campaign]:
        html = self.fetch(self.source["url"])
        out = self.parse(html)
        if self.source.get("follow_detail"):
            for c in out[: self.max_detail]:
                self.enrich_from_detail(c)
        log.info("[%s] 一覧から %d件", self.name, len(out))
        return out

    def parse(self, html: str) -> list[Campaign]:
        base = self.source["url"]
        sel = self.source.get("selectors")
        out: list[Campaign] = []
        if sel and sel.get("item"):
            soup = BeautifulSoup(html, "lxml")
            for item in soup.select(sel["item"]):
                a = item.select_one(sel.get("link", "a")) if sel.get("link") else item.find("a", href=True)
                if a is None or not a.get("href"):
                    continue
                t = item.select_one(sel["title"]) if sel.get("title") else a
                title = (t.get_text(" ", strip=True) if t else a.get_text(" ", strip=True))
                out.append(self.build(title, normalize_url(a["href"], base, for_key=False), item.get_text("\n", strip=True)))
            if not out:
                log.warning("[%s] セレクタ %s で0件。サイト構造が変わった可能性があります", self.name, sel)
            return out
        for text, url, blk in find_campaign_links(html, base):
            out.append(self.build(text, url, blk))
        return out

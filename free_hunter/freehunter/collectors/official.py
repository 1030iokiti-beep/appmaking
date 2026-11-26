"""企業公式サイト（キャンペーン一覧ページ・ニュースページ）の収集。
「キャンペーン」「プレゼント」等を含む同一ドメイン内リンクを探し、詳細ページから項目を抽出する。"""
from __future__ import annotations

import re

from ..extract import html_to_text, page_title
from ..models import Campaign
from .base import BaseCollector, find_campaign_links, log

OFFICIAL_WORDS = re.compile(r"(キャンペーン|プレゼント|当たる|抽選|懸賞|campaign|present|/cp/)", re.IGNORECASE)


class OfficialSiteCollector(BaseCollector):
    kind = "official"

    def collect(self) -> list[Campaign]:
        html = self.fetch(self.source["url"])
        links = find_campaign_links(html, self.source["url"],
                                    same_domain_only=self.source.get("same_domain_only", False),
                                    word_re=OFFICIAL_WORDS,
                                    link_pattern=self.source.get("link_pattern"))
        out: list[Campaign] = []
        for text, url, blk in links:
            c = self.build(text, url, blk, is_official=True)
            out.append(c)
        if self.source.get("follow_detail", True):
            for c in out[: self.max_detail]:
                self.enrich_from_detail(c)
        if not out:
            # ページ自体がキャンペーン詳細の場合
            text = html_to_text(html)
            if OFFICIAL_WORDS.search(text):
                out.append(self.build(page_title(html) or self.name, self.source["url"], text, is_official=True))
        log.info("[%s] 公式サイトから %d件", self.name, len(out))
        return out

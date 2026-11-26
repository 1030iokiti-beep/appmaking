"""Instagram Graph API によるハッシュタグ検索。

必要なもの（無料だが準備が必要）:
- Instagram ビジネス/クリエイターアカウント + Facebook ページ + Meta 開発者アプリ
- 環境変数 FH_IG_ACCESS_TOKEN, FH_IG_USER_ID
- 1 アカウントあたり 7 日間で 30 ハッシュタグまでの制限あり
スクレイピングは規約違反のため実装しません。
"""
from __future__ import annotations

import os

import requests

from ..models import Campaign
from .base import BaseCollector, log
from .x_api import ApiNotConfigured

GRAPH = "https://graph.facebook.com/v19.0"


class InstagramApiCollector(BaseCollector):
    kind = "instagram"

    def collect(self) -> list[Campaign]:
        token = os.environ.get("FH_IG_ACCESS_TOKEN")
        user_id = os.environ.get("FH_IG_USER_ID")
        if not token or not user_id:
            raise ApiNotConfigured("FH_IG_ACCESS_TOKEN / FH_IG_USER_ID が未設定のため Instagram 収集はスキップ")
        tags = self.source.get("hashtags") or (self.settings.get("api", "instagram_hashtags", []) if self.settings else [])
        out: list[Campaign] = []
        for tag in tags:
            r = requests.get(f"{GRAPH}/ig_hashtag_search", timeout=20,
                             params={"user_id": user_id, "q": tag, "access_token": token})
            r.raise_for_status()
            ids = [d["id"] for d in r.json().get("data", [])]
            if not ids:
                continue
            r = requests.get(f"{GRAPH}/{ids[0]}/recent_media", timeout=20, params={
                "user_id": user_id, "fields": "id,caption,permalink,timestamp", "access_token": token})
            r.raise_for_status()
            out.extend(self.parse(r.json()))
        log.info("[%s] Instagram から %d件", self.name, len(out))
        return out

    def parse(self, payload: dict) -> list[Campaign]:
        out = []
        for m in payload.get("data", []):
            cap = m.get("caption") or ""
            if not cap or not m.get("permalink"):
                continue
            title = cap.splitlines()[0][:80]
            out.append(self.build(title, m["permalink"], cap, is_official=False))
        return out

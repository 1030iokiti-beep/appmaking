"""X（旧Twitter）公式 API v2 による収集。

- 環境変数 FH_X_BEARER_TOKEN と settings.toml の api.x_enabled = true が必要。
- 投稿検索(recent search)は X の有料プラン(Basic 以上)が必要になる可能性があります。
  契約はご自身の判断で行ってください。本システムが自動で契約することはありません。
- ログイン画面のスクレイピングや自動操作（フォロー・リポストの自動化）は規約違反のため実装しません。
"""
from __future__ import annotations

import os

import requests

from ..models import Campaign
from .base import BaseCollector, log

API = "https://api.x.com/2/tweets/search/recent"


class ApiNotConfigured(Exception):
    pass


class XApiCollector(BaseCollector):
    kind = "x"

    def collect(self) -> list[Campaign]:
        token = os.environ.get("FH_X_BEARER_TOKEN")
        if not token:
            raise ApiNotConfigured("FH_X_BEARER_TOKEN が未設定のため X 収集はスキップ")
        queries = self.source.get("queries") or (self.settings.get("api", "x_queries", []) if self.settings else [])
        out: list[Campaign] = []
        for q in queries:
            r = requests.get(API, headers={"Authorization": f"Bearer {token}"}, timeout=20, params={
                "query": f"{q} lang:ja",
                "max_results": 50,
                "tweet.fields": "created_at,author_id",
                "expansions": "author_id",
                "user.fields": "name,username,verified,verified_type",
            })
            if r.status_code in (401, 403):
                raise PermissionError(f"X API 認証/権限エラー {r.status_code}: 契約プランで検索APIが使えない可能性 {r.text[:200]}")
            if r.status_code == 429:
                log.warning("X API レート制限。次回に持ち越します")
                break
            r.raise_for_status()
            out.extend(self.parse(r.json()))
        log.info("[%s] X から %d件", self.name, len(out))
        return out

    def parse(self, payload: dict) -> list[Campaign]:
        users = {u["id"]: u for u in payload.get("includes", {}).get("users", [])}
        out = []
        for t in payload.get("data", []):
            u = users.get(t.get("author_id"), {})
            username = u.get("username", "i")
            url = f"https://x.com/{username}/status/{t['id']}"
            text = t.get("text", "")
            title = text.splitlines()[0][:80] if text else url
            # 企業の認証(verified_type == "business")のみ公式扱い
            official = u.get("verified_type") == "business"
            out.append(self.build(title, url, text, company=u.get("name"), is_official=official))
        return out

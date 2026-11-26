"""キリン公式キャンペーン一覧の公開データ（campaign.json）から収集する。

https://www.kirin.co.jp/campaign/ のページ自身が読み込んでいる公開 JSON を使う。
締切・購入要否・はがき・20歳以上などが項目として入っているため、本文解析より正確。
"""
from __future__ import annotations

import json
import re
from datetime import date, datetime

from ..genres import classify_genre
from ..models import Campaign
from .base import BaseCollector, log

DEFAULT_URL = "https://campaign.kirin.co.jp/campaign/json/campaign.json"


def _parse_jsonp(text: str):
    """campaign([...]) 形式（JSONP）にも素の JSON にも対応。"""
    text = text.strip().lstrip("﻿")
    m = re.match(r"^[\w$.]+\s*\((.*)\)\s*;?\s*$", text, re.S)
    return json.loads(m.group(1) if m else text)


def _dt(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


class KirinJsonCollector(BaseCollector):
    kind = "kirin_json"

    def collect(self) -> list[Campaign]:
        data = _parse_jsonp(self.fetch(self.source.get("url") or DEFAULT_URL))
        out = self.parse(data)
        log.info("[%s] キリン公開データから %d件（受付中のみ）", self.name, len(out))
        return out

    def parse(self, data: list[dict], today: date | None = None) -> list[Campaign]:
        today = today or date.today()
        out = []
        for x in data:
            end = _dt(x.get("end"))
            if not x.get("title") or not x.get("link") or (end and end < today):
                continue
            conds: list[str] = []
            if x.get("konyu"):
                conds += ["purchase"]
            if x.get("hagaki"):
                conds += ["postcard"]
            if x.get("tw"):
                conds += ["follow", "repost"]
            if x.get("ig") or x.get("fb"):
                conds += ["follow"]
            if x.get("imasugu"):
                conds += ["instant_win"]
            if x.get("zettai"):
                conds += ["everyone"]
            if x.get("mykirin") not in (None, "", "none"):
                conds += ["membership"]
            if not any(c in conds for c in ("postcard", "follow")):
                conds += ["web_form"]
            conds = sorted(set(conds))
            method = ("postcard" if "postcard" in conds else "sns" if "repost" in conds
                      else "web_form")
            title = x["title"].strip()
            note = " / ".join(filter(None, [x.get("read"), x.get("attention")]))
            out.append(Campaign(
                title=title, url=x["link"], source_name=self.name, source_kind=self.kind,
                company="キリン", start_date=_dt(x.get("start")), deadline=end,
                conditions=conds, method=method, apply_url=x["link"], is_official=True,
                eligibility={"min_age": 20} if x.get("over20") else {},
                genre=classify_genre(title), raw_text=f"{title}\n{note}"[:3000],
            ))
        return out

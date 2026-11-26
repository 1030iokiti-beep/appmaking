"""共通データ型。すべての収集モジュールは Campaign を返す。"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import date, datetime
from typing import Optional


@dataclass
class Campaign:
    title: str
    url: str
    source_name: str
    source_kind: str                     # rss / list_page / official / web_page
    company: Optional[str] = None
    prize: Optional[str] = None
    prize_value_yen: Optional[int] = None  # 本文に「○円相当」等の記載がある場合のみ
    prize_value_estimated: bool = False    # True=キーワードからの推定値
    winners: Optional[int] = None          # 当選人数（記載がある場合のみ）
    start_date: Optional[date] = None
    deadline: Optional[date] = None
    conditions: list[str] = field(default_factory=list)  # 条件タグ（follow, purchase 等）
    conditions_text: Optional[str] = None
    method: Optional[str] = None           # web_form / sns_follow_repost / receipt / postcard / ...
    apply_url: Optional[str] = None
    is_official: bool = False
    ended: bool = False                    # 本文に「終了しました」等
    raw_text: str = ""                     # 抽出元テキスト（先頭のみ保存）
    fetched_at: datetime = field(default_factory=datetime.now)
    genre: Optional[str] = None
    eligibility: dict = field(default_factory=dict)  # min_age / max_age / regions

    def to_dict(self) -> dict:
        d = asdict(self)
        for k in ("start_date", "deadline", "fetched_at"):
            if d[k] is not None:
                d[k] = d[k].isoformat()
        return d

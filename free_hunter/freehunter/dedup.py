"""重複判定。
1) 正規化 URL が同じ → 同一
2) 企業名（無ければドメイン）が同じ かつ タイトル類似度が閾値以上 かつ 締切が同じか片方不明 → 同一
同じ企業でも賞品・締切が違えば別キャンペーンとして扱う。
"""
from __future__ import annotations

import hashlib
import re
from difflib import SequenceMatcher

from .extract import normalize_text

_NOISE = re.compile(r"[【】\[\]（）()「」『』!！?？・\s\-_|｜:：/／~〜♪★☆◆■●]+")
_STOP = re.compile(r"(キャンペーン|プレゼント|懸賞|実施中|開催中|応募|抽選で|名様に?|当たる|もらえる|公式|に|が|を|で|の)")


def title_key(title: str) -> str:
    t = normalize_text(title).lower()
    t = _STOP.sub("", t)
    t = re.sub(r"\d[\d,]*", "", t)  # 人数・金額などの数字は表記ゆれが多いので除外（締切で区別）
    return _NOISE.sub("", t)


def similarity(a: str, b: str) -> float:
    ka, kb = title_key(a), title_key(b)
    if not ka or not kb:
        return 0.0
    return SequenceMatcher(None, ka, kb).ratio()


def fingerprint(company: str | None, title: str, deadline) -> str:
    base = f"{(company or '').strip()}|{title_key(title)}|{deadline or ''}"
    return hashlib.sha1(base.encode("utf-8")).hexdigest()[:16]


def is_same_campaign(a: dict, b: dict, threshold: float = 0.85) -> bool:
    if a.get("url_norm") and a.get("url_norm") == b.get("url_norm"):
        return True
    owner_a = a.get("company") or a.get("domain")
    owner_b = b.get("company") or b.get("domain")
    if not owner_a or owner_a != owner_b:
        # 懸賞サイト経由と公式で企業名が片方だけの場合はタイトル類似度をより厳しく
        if similarity(a.get("title", ""), b.get("title", "")) < 0.95:
            return False
    elif similarity(a.get("title", ""), b.get("title", "")) < threshold:
        return False
    da, db_ = a.get("deadline"), b.get("deadline")
    if da and db_ and str(da) != str(db_):
        return False
    return True

"""案件評価エンジン。

8 項目を 0〜100 点で評価し、重み付き平均で総合スコア(0〜100)を出す。
- 当選確率は応募者数が公開されないため算出しない（当選人数のみ評価に使う）。
- 不明な項目は中間点で扱い、理由欄に「不明」と明記する。
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

WEIGHTS = {
    "winners": 0.20,       # 当選人数
    "value": 0.20,         # 賞品価値
    "time": 0.15,          # 応募に必要な時間
    "difficulty": 0.10,    # 条件の難易度
    "deadline": 0.05,      # 締切までの日数
    "cost": 0.15,          # 購入・有料登録の必要性
    "reliability": 0.15,   # 情報の信頼性
}
# 応募資格は点数ではなく「合う / 合わない(除外)」で判定

RANK_EXCLUDED = "除外"

# 応募方法・条件ごとのおおよその所要時間（分）
TIME_COST = {
    "follow": 0.5, "repost": 0.5, "like": 0.2, "comment": 2, "hashtag": 3,
    "survey": 3, "membership": 5, "line_friend": 1, "app": 5, "quiz": 2,
    "web_form": 3, "receipt": 10, "postcard": 15, "purchase": 5,
}
DIFFICULTY_COST = {
    "comment": 15, "hashtag": 25, "quiz": 15, "postcard": 30, "receipt": 25,
    "app": 10, "membership": 10, "survey": 5,
}


@dataclass
class ScoreResult:
    score: float
    rank: str
    breakdown: dict = field(default_factory=dict)
    reasons: list[str] = field(default_factory=list)
    est_minutes: float = 0.0
    excluded_reason: Optional[str] = None


def _log_scale(x: float, lo: float, hi: float) -> float:
    """lo→0点, hi→100点 の対数スケール"""
    if x <= lo:
        return 0.0
    if x >= hi:
        return 100.0
    return 100.0 * (math.log10(x) - math.log10(lo)) / (math.log10(hi) - math.log10(lo))


def score_winners(winners: Optional[int], conds: list[str]) -> tuple[float, str]:
    if "everyone" in conds:
        return 100.0, "もれなく/全員プレゼント"
    if not winners:
        return 40.0, "当選人数: 記載なし（不明）"
    return 10 + 0.9 * _log_scale(winners, 1, 10_000), f"当選人数: {winners:,}名"


def score_value(value: Optional[int], estimated: bool) -> tuple[float, str]:
    if not value:
        return 30.0, "賞品価値: 不明"
    s = _log_scale(value, 100, 100_000)
    if estimated:
        return s * 0.85, f"賞品価値: 約{value:,}円（キーワードからの推定）"
    return s, f"賞品価値: {value:,}円（記載値）"


def estimate_minutes(conds: list[str], method: Optional[str]) -> float:
    m = sum(TIME_COST.get(c, 0) for c in conds)
    if m == 0:
        m = 3.0  # 不明時は Web フォーム相当とみなす
    return round(m, 1)


def score_time(minutes: float) -> float:
    # 1分以内=100, 5分=70, 15分=30, 30分以上=0
    if minutes <= 1:
        return 100.0
    return max(0.0, 100.0 - (minutes - 1) * 7.5 if minutes <= 5 else 70 - (minutes - 5) * 2.8)


def score_difficulty(conds: list[str]) -> float:
    return max(0.0, 100.0 - sum(DIFFICULTY_COST.get(c, 0) for c in conds))


def score_deadline(deadline: Optional[date], today: date) -> tuple[float, str]:
    if not deadline:
        return 50.0, "締切: 不明"
    days = (deadline - today).days
    if days <= 2:
        s = 75.0
    elif days <= 14:
        s = 90.0
    elif days <= 60:
        s = 80.0
    else:
        s = 60.0
    return s, f"締切まで{days}日"


def score_cost(conds: list[str]) -> tuple[float, str]:
    if "paid_membership" in conds:
        return 0.0, "有料登録が必要な可能性"
    if "purchase" in conds or "receipt" in conds:
        return 20.0, "商品購入が必要な可能性"
    return 100.0, "購入・有料登録: 不要（記載上）"


def score_reliability(c: dict) -> tuple[float, str]:
    s = 50.0
    notes = []
    if c.get("is_official"):
        s += 40
        notes.append("公式サイト")
    elif c.get("source_kind") in ("list_page", "rss"):
        s += 15
        notes.append("懸賞サイト掲載")
    if c.get("company"):
        s += 5
    else:
        s -= 10
        notes.append("企業名不明")
    if not c.get("deadline"):
        s -= 10
        notes.append("締切不明")
    if not c.get("prize"):
        s -= 10
        notes.append("賞品不明")
    s = max(0.0, min(100.0, s))
    return s, "信頼性: " + ("・".join(notes) if notes else "標準")


def check_eligibility(c: dict, profile: dict) -> Optional[str]:
    elig = c.get("eligibility") or {}
    age = profile.get("age")
    if age:
        if elig.get("min_age") and age < elig["min_age"]:
            return f"{elig['min_age']}歳以上が条件"
        if elig.get("max_age") and age > elig["max_age"]:
            return f"{elig['max_age']}歳以下が条件"
    pref = profile.get("prefecture")
    if pref and elig.get("regions") and pref not in elig["regions"]:
        return "居住地域の条件: " + "・".join(elig["regions"])
    return None


def evaluate(c: dict, settings=None, today: Optional[date] = None) -> ScoreResult:
    """c は Campaign.to_dict() 相当、もしくは DB の行(dict)。"""
    today = today or date.today()
    conds = c.get("conditions") or []
    deadline = c.get("deadline")
    if isinstance(deadline, str):
        deadline = date.fromisoformat(deadline[:10])

    def cfg(sec, key, default):
        return settings.get(sec, key, default) if settings else default

    profile = {"age": cfg("profile", "age", None), "prefecture": cfg("profile", "prefecture", None)}

    bd: dict[str, float] = {}
    reasons: list[str] = []
    bd["winners"], r = score_winners(c.get("winners"), conds); reasons.append(r)
    bd["value"], r = score_value(c.get("prize_value_yen"), bool(c.get("prize_value_estimated"))); reasons.append(r)
    minutes = estimate_minutes(conds, c.get("method"))
    bd["time"] = score_time(minutes); reasons.append(f"所要時間: 約{minutes}分（目安）")
    bd["difficulty"] = score_difficulty(conds)
    bd["deadline"], r = score_deadline(deadline, today); reasons.append(r)
    bd["cost"], r = score_cost(conds); reasons.append(r)
    bd["reliability"], r = score_reliability({**c, "deadline": deadline}); reasons.append(r)

    total = round(sum(bd[k] * w for k, w in WEIGHTS.items()), 1)

    # ── 除外判定 ──
    excluded = None
    status = c.get("status")
    if c.get("ended") or status == "ended":
        excluded = "募集終了"
    elif deadline and deadline < today:
        excluded = "締切切れ"
    elif c.get("applied"):
        excluded = "応募済み"
    elif (e := check_eligibility(c, profile)):
        excluded = "応募資格不一致: " + e
    elif "paid_membership" in conds and cfg("profile", "exclude_paid_membership", True):
        excluded = "有料登録が必要"
    elif ("purchase" in conds or "receipt" in conds) and cfg("profile", "exclude_purchase_required", False):
        excluded = "購入が必要"
    elif bd["reliability"] < 25:
        excluded = "情報が不確実"

    if excluded:
        rank = RANK_EXCLUDED
        reasons.insert(0, "除外理由: " + excluded)
    elif total >= cfg("scoring", "rank_s", 75):
        rank = "S"
    elif total >= cfg("scoring", "rank_a", 60):
        rank = "A"
    elif total >= cfg("scoring", "rank_b", 45):
        rank = "B"
    else:
        rank = "C"
    reasons.append("※当選確率は応募者数が非公開のため算出していません")
    return ScoreResult(score=total, rank=rank, breakdown={k: round(v, 1) for k, v in bd.items()},
                       reasons=reasons, est_minutes=minutes, excluded_reason=excluded)

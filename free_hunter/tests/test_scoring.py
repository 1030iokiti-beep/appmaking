from datetime import date

from freehunter.config import Settings
from freehunter.scoring import evaluate

T = date(2026, 11, 26)
S = Settings({"profile": {"age": 30, "prefecture": "大阪府", "exclude_paid_membership": True}})


def base(**kw):
    d = dict(title="t", url="u", source_kind="official", is_official=True, company="X社", prize="賞品",
             deadline="2026-12-10", conditions=["web_form"], winners=100, prize_value_yen=10000)
    d.update(kw)
    return d


def test_good_campaign_high_rank():
    r = evaluate(base(winners=1000, conditions=["follow", "repost"]), S, T)
    assert r.rank in ("S", "A"), r
    assert any("当選確率" in x for x in r.reasons)


def test_weak_campaign_low_rank():
    r = evaluate(base(is_official=False, source_kind="list_page", winners=1, prize_value_yen=500,
                      conditions=["purchase", "receipt", "postcard"]), S, T)
    assert r.rank in ("C", "B")
    assert r.score < evaluate(base(), S, T).score


def test_exclusions():
    assert evaluate(base(deadline="2026-11-01"), S, T).excluded_reason == "締切切れ"
    assert evaluate(base(ended=True), S, T).excluded_reason == "募集終了"
    assert evaluate(base(applied=1), S, T).excluded_reason == "応募済み"
    assert "応募資格" in evaluate(base(eligibility={"regions": ["東京都"]}), S, T).excluded_reason
    assert evaluate(base(conditions=["paid_membership"]), S, T).excluded_reason == "有料登録が必要"
    r = evaluate(base(is_official=False, source_kind="web_page", company=None, prize=None, deadline=None), S, T)
    assert r.rank == "除外" and r.excluded_reason == "情報が不確実"


def test_unknowns_are_labeled():
    r = evaluate(base(winners=None, prize_value_yen=None), S, T)
    assert any("不明" in x for x in r.reasons)

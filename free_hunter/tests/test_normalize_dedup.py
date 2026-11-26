from freehunter.dedup import is_same_campaign, similarity
from freehunter.normalize import normalize_url
from freehunter.status import judge_status
from datetime import date


def test_normalize_url():
    a = normalize_url("http://www.Example.com/cp/index.html?utm_source=x&b=2&a=1&fbclid=zz#top")
    assert a == "https://example.com/cp?a=1&b=2"
    assert normalize_url("https://twitter.com/foo/status/1") == "https://x.com/foo/status/1"
    assert normalize_url("/a/b/", base="https://ex.com/x") == "https://ex.com/a/b"
    assert normalize_url("http://127.0.0.1:8000/a?utm_x=1", for_key=False) == "http://127.0.0.1:8000/a"


def test_dedup_same_company_similar_title():
    a = {"url_norm": "https://a.com/1", "company": "サンプル", "title": "【抽選で100名様】冬のギフトキャンペーン", "deadline": "2026-12-15"}
    b = {"url_norm": "https://b.com/2", "company": "サンプル", "title": "冬のギフトキャンペーン！100名様に当たる", "deadline": "2026-12-15"}
    assert similarity(a["title"], b["title"]) > 0.85
    assert is_same_campaign(a, b)


def test_same_company_different_campaigns():
    a = {"url_norm": "https://a.com/1", "company": "サンプル", "title": "冬のギフトキャンペーン", "deadline": "2026-12-15"}
    b = {"url_norm": "https://a.com/2", "company": "サンプル", "title": "春のお花見セットが当たる", "deadline": "2027-04-01"}
    assert not is_same_campaign(a, b)
    c = dict(a, url_norm="https://a.com/3", deadline="2027-12-15")  # 同名でも締切が違えば別回
    assert not is_same_campaign(a, c)


def test_status():
    t = date(2026, 11, 26)
    assert judge_status(date(2026, 11, 25), None, False, t) == "expired"
    assert judge_status(date(2026, 12, 1), None, False, t) == "open"
    assert judge_status(None, None, True, t) == "ended"
    assert judge_status(date(2027, 1, 1), date(2026, 12, 1), False, t) == "not_started"
    assert judge_status(None, None, False, t) == "open_unknown_deadline"

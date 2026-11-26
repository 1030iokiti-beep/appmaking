"""ローカル HTTP サーバーから実際に取得して、収集 → 保存 → 評価まで通す。"""
from datetime import date

from freehunter.collectors import COLLECTORS
from freehunter.config import Settings
from freehunter.pipeline import rescore_all, run_collection, save_campaigns

S = Settings({"http": {"max_detail_pages": 10}, "profile": {"age": 30, "prefecture": "大阪府"}})


def test_list_page_auto(server, client):
    src = {"name": "テスト懸賞", "kind": "list_page", "url": server + "/list_page.html", "follow_detail": True}
    items = COLLECTORS["list_page"](src, client, S).collect()
    titles = [c.title for c in items]
    assert len(items) == 5, titles
    by = {c.url.rsplit("/", 1)[-1]: c for c in items}
    a = by["101"]
    assert a.winners == 100 and a.prize_value_yen == 1000 and a.deadline == date(2026, 12, 15)
    assert "utm_source" not in a.url and set(a.conditions) >= {"follow", "repost"}
    b = by["102"]  # 詳細ページから補完
    assert b.company == "株式会社サンプルフーズ" and b.prize_value_yen == 15000
    assert b.start_date == date(2026, 11, 20) and b.eligibility.get("min_age") == 20
    assert by["103"].winners == 1000 and "receipt" in by["103"].conditions
    assert by["104"].ended
    assert by["105"].eligibility == {"regions": ["東京都"]}


def test_official(server, client):
    src = {"name": "サンプル飲料", "kind": "official", "url": server + "/official_list.html",
           "company": "サンプル飲料", "is_official": True, "follow_detail": True}
    items = COLLECTORS["official"](src, client, S).collect()
    assert len(items) == 2
    w = [c for c in items if "winter" in c.url][0]
    assert w.is_official and w.winners == 300 and w.deadline == date(2026, 12, 25)
    assert "line_friend" in w.conditions
    assert w.prize.startswith("オリジナル電気ケトル") and w.prize_value_estimated
    old = [c for c in items if "old" in c.url][0]
    assert old.ended


def test_rss(server, client):
    src = {"name": "RSS", "kind": "rss", "url": server + "/feed.xml"}
    items = COLLECTORS["rss"](src, client, S).collect()
    assert len(items) == 1 and items[0].prize_value_estimated and items[0].deadline.month == 12


def test_robots(server, client):
    assert client.allowed(server + "/list_page.html")
    assert not client.allowed(server + "/private/x.html")


def test_pipeline_dedup_and_rescore(server, client, db):
    sources = [
        {"name": "テスト懸賞", "kind": "list_page", "url": server + "/list_page.html", "follow_detail": True},
        {"name": "壊れた情報源", "kind": "web_page", "url": server + "/not_found.html"},
    ]
    rep = run_collection(db, S, sources, client)
    assert rep[0]["new"] == 5 and rep[1]["error"]  # 1つ失敗しても他は続行
    rep2 = run_collection(db, S, sources[:1], client)
    assert rep2[0]["new"] == 0 and rep2[0]["updated"] == 5  # 2回目は重複として更新のみ
    counts = rescore_all(db, S, today=date(2026, 11, 26))
    assert counts.get("除外", 0) >= 2  # 終了済み + 東京都限定(大阪在住)
    rows = {c["url"].rsplit("/", 1)[-1]: c for c in db.all_campaigns()}
    assert rows["104"]["rank"] == "除外"
    assert rows["101"]["rank"] in ("S", "A", "B")
    # 応募済みにすると除外される
    db.record_application(rows["101"]["id"])
    rescore_all(db, S, today=date(2026, 11, 26))
    assert db.get_campaign(rows["101"]["id"])["rank"] == "除外"
    # 締切が過ぎると除外
    rescore_all(db, S, today=date(2027, 1, 5))
    assert all(c["rank"] == "除外" for c in db.all_campaigns() if c.get("deadline"))

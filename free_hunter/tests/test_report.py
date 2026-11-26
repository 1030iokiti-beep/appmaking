from datetime import date

from freehunter.report import build_report


def test_report(db):
    cid = db.insert_campaign({"url": "https://a.com/1", "url_norm": "https://a.com/1", "title": "テスト|キャンペーン",
                              "rank": "S", "score": 80, "deadline": "2026-11-28", "winners": 100,
                              "prize": "ギフト券", "prize_value_yen": 1000, "apply_url": "https://a.com/apply",
                              "first_seen": "2026-11-26T00:00:00"})
    db.insert_campaign({"url": "https://a.com/2", "url_norm": "https://a.com/2", "title": "終了", "rank": "除外"})
    db.conn.commit()
    md = build_report(db, today=date(2026, 11, 26))
    assert "[テスト／キャンペーン](https://a.com/apply)" in md  # | はエスケープ
    assert "あと2日" in md and "締切間近" in md and "終了" not in md
    assert "応募済み" not in md  # 既定では履歴を載せない（公開リポジトリ対策）
    assert f"| {cid} |" in md


def test_env_override(monkeypatch):
    from freehunter.config import Settings
    s = Settings({"profile": {"age": 30, "prefecture": "東京都"}})
    monkeypatch.setenv("FH_PROFILE_AGE", "41")
    monkeypatch.setenv("FH_PROFILE_PREFECTURE", "大阪府")
    assert s.get("profile", "age") == 41 and s.get("profile", "prefecture") == "大阪府"

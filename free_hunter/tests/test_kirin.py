from datetime import date

from freehunter.collectors.kirin import KirinJsonCollector, _parse_jsonp

SAMPLE = '''campaign([
 {"mykirin":"none","start":"2026-11-20 10:00:00","end":"2026-12-14 23:59:00","title":"FIRE飲んで毎日チャンス！","link":"https://cp.kirin.jp/story/1","over20":false,"imasugu":false,"konyu":true,"zettai":false,"hagaki":false,"tw":false,"fb":false,"ig":false,"read":"","attention":""},
 {"mykirin":"none","start":"2026-11-01 10:00:00","end":"2026-11-30 23:59:00","title":"ビール ペアグラスが当たる","link":"https://x.com/kirin/1","over20":true,"imasugu":true,"konyu":false,"zettai":false,"hagaki":false,"tw":true,"fb":false,"ig":false,"read":"","attention":""},
 {"mykirin":"none","start":"2026-01-01 10:00:00","end":"2026-02-01 23:59:00","title":"終わった企画","link":"https://cp.kirin.jp/story/0","over20":false,"konyu":false,"tw":false}
])'''


def test_kirin_parse():
    data = _parse_jsonp(SAMPLE)
    items = KirinJsonCollector({"name": "キリン", "kind": "kirin_json", "url": "x"}, None, None).parse(
        data, today=date(2026, 11, 26))
    assert len(items) == 2  # 締切切れは除く
    a, b = items
    assert a.deadline == date(2026, 12, 14) and "purchase" in a.conditions and a.is_official
    assert b.eligibility == {"min_age": 20} and {"follow", "repost", "instant_win"} <= set(b.conditions)
    assert b.method == "sns"

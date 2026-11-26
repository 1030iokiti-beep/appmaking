from datetime import date

from freehunter import extract as ex

REF = date(2026, 11, 26)


def test_period_range():
    s, d = ex.extract_period("応募期間\n2026年11月20日(金)10:00 ～ 2026年12月31日(木)23:59", REF)
    assert s == date(2026, 11, 20) and d == date(2026, 12, 31)


def test_deadline_variants():
    assert ex.extract_period("締切：2026/12/15", REF)[1] == date(2026, 12, 15)
    assert ex.extract_period("12月5日まで応募受付", REF)[1] == date(2026, 12, 5)
    assert ex.extract_period("締切 １２月１０日 当日消印有効", REF)[1] == date(2026, 12, 10)
    # 年なし・過去日付 → 翌年
    assert ex.extract_period("1月15日まで", REF)[1] == date(2027, 1, 15)
    assert ex.extract_period("賞品は豪華です", REF) == (None, None)


def test_winners():
    assert ex.extract_winners("抽選で100名様にプレゼント") == 100
    assert ex.extract_winners("A賞 5名様\nB賞 50名様") == 55
    assert ex.extract_winners("総計1,000名様に当たる") == 1000
    assert ex.extract_winners("ペア宿泊券を1組様にプレゼント") == 1
    assert ex.extract_winners("会社の名前") is None


def test_value():
    assert ex.extract_value("Amazonギフト券1,000円分") == (1000, False)
    assert ex.extract_value("賞品：すき焼きセット（1.5万円相当）") == (15000, False)
    v, est = ex.extract_value("Nintendo Switch が当たる")
    assert est and v == 50000
    assert ex.extract_value("すてきな何か") == (None, False)


def test_conditions_and_method():
    c = ex.extract_conditions("公式アカウントをフォロー＆リポストで応募")
    assert "follow" in c and "repost" in c and ex.detect_method(c) == "sns"
    c = ex.extract_conditions("対象商品を購入しレシートを撮影して応募")
    assert "purchase" in c and "receipt" in c and ex.detect_method(c) == "receipt"
    assert "paid_membership" in ex.extract_conditions("月額プランの有料会員限定")


def test_ended_and_eligibility():
    assert ex.is_ended("このキャンペーンは終了しました")
    assert not ex.is_ended("好評実施中")
    e = ex.extract_eligibility("東京都在住の20歳以上の方")
    assert e == {"min_age": 20, "regions": ["東京都"]}


def test_company():
    assert ex.extract_company("主催：株式会社サンプルフーズ") == "株式会社サンプルフーズ"
    assert ex.extract_company("主催: サンプル飲料株式会社") == "サンプル飲料株式会社"


def test_estimate_uses_prize_not_company():
    info = ex.extract_all("オリジナル電気ケトルを抽選で300名様にプレゼント!\n主催:サンプル飲料株式会社",
                          REF, title="冬のあったかキャンペーン")
    assert info["prize"].startswith("オリジナル電気ケトル")
    assert info["prize_value_yen"] == 3000 and info["prize_value_estimated"]


def test_deadline_not_confused_with_posted_date():
    # Koubo 形式: 締切の次の行が掲載日
    assert ex.extract_period("12/24 締切\n2026/11/25\n掲載", REF)[1] == date(2026, 12, 24)
    assert ex.extract_period("締切日\n2026/12/24", REF)[1] == date(2026, 12, 24)


KOUBO = """2026/11/25 掲載
締切日
2026年12月24日（木）
主催者
マリンフード
賞
北海道 The プレミアムケーキ 1箱
プレゼント内容
北海道 The プレミアムケーキ 1箱
当選者数：300名
応募方法/応募先
「応募する」ボタンより応募フォームにアクセスし、必要事項を入力してご応募ください。
応募時の会員登録
不要
出典：
https://www.marinfood.co.jp/campaign/monthly/
"""


def test_koubo_label_layout():
    info = ex.extract_all(KOUBO, REF, title="マリンフードのキャンペーン")
    assert info["deadline"] == date(2026, 12, 24)
    assert info["company"] == "マリンフード"
    assert info["prize"].startswith("北海道 The プレミアムケーキ")
    assert info["winners"] == 300
    assert info["source_url"] == "https://www.marinfood.co.jp/campaign/monthly/"
    assert "membership" not in info["conditions"] and "web_form" in info["conditions"]


def test_deadline_nearest_keyword_on_one_line():
    line = "金券 12/1 締切 楽天トラベル 楽パック20周年記念キャンペーン 2026/11/25 NEW"
    assert ex.extract_period(line, REF)[1] == date(2026, 12, 1)

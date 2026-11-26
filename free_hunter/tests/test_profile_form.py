import os
from datetime import date

import pytest

from freehunter.form_assist import check_conditions, match_field, plan_fields, split_part, value_for
from freehunter.profile import ProfileStore

P = {"last_name": "山田", "first_name": "太郎", "last_name_kana": "ヤマダ", "first_name_kana": "タロウ",
     "email": "taro@example.com", "phone": "090-1234-5678", "postal_code": "530-0001",
     "prefecture": "大阪府", "city": "大阪市北区", "address1": "梅田1-1-1", "birth_date": "1995-04-01"}


def test_profile_encrypted(tmp_path):
    st = ProfileStore(tmp_path)
    st.save(P)
    raw = (tmp_path / "profile.enc").read_bytes()
    assert b"taro@example.com" not in raw and "山田".encode() not in raw
    assert ProfileStore(tmp_path).load() == P
    assert ProfileStore.masked({"email": "taro@example.com"})["email"].startswith("t*")
    (tmp_path / "secret.key").write_bytes(b"x" * 44)
    with pytest.raises(Exception):
        ProfileStore(tmp_path).load()


def test_match_field():
    assert match_field("sei お名前（姓）") == "last_name"
    assert match_field("mei お名前（名）") == "first_name"
    assert match_field("kana_sei フリガナ（セイ）") == "last_name_kana"
    assert match_field("email_confirm メールアドレス（確認）") == "email"
    assert match_field("zip1 郵便番号") == "postal_code"
    assert match_field("x", "address-level1") == "prefecture"
    assert match_field("name 氏名") == "full_name"
    assert split_part("tel2") == 2 and split_part("zip_1") == 1 and split_part("email") is None
    assert value_for("phone", P, 3) == "5678" and value_for("postal_code", P, 2) == "0001"
    assert value_for("address_full", P) == "大阪府大阪市北区梅田1-1-1"


def test_check_conditions():
    w = check_conditions({"eligibility": {"min_age": 40, "regions": ["東京都"]}, "conditions": ["purchase"],
                          "deadline": "2026-12-01"}, P, date(2026, 11, 26))
    assert len(w) == 3


def test_fill_real_browser(server):
    """Playwright で実際にフォームへ入力し、送信されないことを確認。"""
    pw = pytest.importorskip("playwright.sync_api")
    from freehunter.form_assist import fill_page
    with pw.sync_playwright() as p:
        b = p.chromium.launch(headless=True, executable_path=os.environ.get("FH_CHROMIUM_PATH") or None)
        page = b.new_page()
        page.goto(server + "/form.html")
        res = fill_page(page, P)
        assert page.input_value("[name=sei]") == "山田"
        assert page.input_value("[name=kana_mei]") == "タロウ"
        assert page.input_value("[name=email_confirm]") == "taro@example.com"
        assert page.input_value("[name=zip1]") == "530" and page.input_value("[name=zip2]") == "0001"
        assert page.input_value("[name=tel3]") == "5678"
        assert page.input_value("[name=pref]") == "27"
        assert page.input_value("[name=address]") == "大阪府大阪市北区梅田1-1-1"
        assert not page.is_checked("[name=agree]")          # 同意は自動チェックしない
        assert page.evaluate("window.__submitted") is None  # 送信していない
        assert not res["captcha"]
        b.close()

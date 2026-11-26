"""応募フォーム入力支援（Playwright）。

できること:
- 応募ページをブラウザで開き、氏名・住所・メール等を暗号化プロフィールから自動入力
- 応募条件とプロフィールの照合結果を表示（年齢・居住地・購入要否など）
- 入力内容の確認表示（伏せ字）→ 利用者がブラウザで内容を確認し、自分で送信ボタンを押す
- 送信後、ターミナルで「応募した」と答えると応募履歴に記録

やらないこと（意図的に未実装）:
- 送信ボタンの自動クリック（キャンペーン規約で自動応募が明示的に許可されたもの以外は不可。
  現時点で許可を機械的に確認する手段がないため、全案件で手動送信）
- CAPTCHA の突破、ログインの自動化、同意チェックボックスの自動チェック、複数アカウント応募
"""
from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass
from datetime import date
from typing import Optional

log = logging.getLogger("freehunter.form")

SKIP_TYPES = {"hidden", "submit", "button", "checkbox", "radio", "file", "password", "image", "reset", "search"}

AUTOCOMPLETE_MAP = {
    "email": "email", "tel": "phone", "tel-national": "phone", "postal-code": "postal_code",
    "address-level1": "prefecture", "address-level2": "city", "address-line1": "address1",
    "address-line2": "address2", "street-address": "address_full", "family-name": "last_name",
    "given-name": "first_name", "name": "full_name", "bday": "birth_date", "sex": "gender",
}

# 上から順に判定（具体的なもの → 一般的なもの）
FIELD_RULES: list[tuple[str, str]] = [
    ("email", r"mail|メール"),
    ("postal_code", r"zip|postal|post_?code|postcode|郵便"),
    ("phone", r"tel|phone|電話|携帯"),
    ("prefecture", r"pref|都道府県"),
    ("city", r"city|市区町村|市町村"),
    ("address2", r"address_?2|addr_?2|building|建物|マンション|部屋"),
    ("address1", r"address_?1|addr_?1|street|番地|町名"),
    ("address_full", r"address|addr|住所"),
    ("birth_date", r"birth|bday|生年月日|誕生"),
    ("gender", r"gender|sex|性別"),
    ("last_name_kana", r"sei_?kana|kana_?sei|last_?name_?kana|kana_?last|セイ|せい|姓.{0,3}(カナ|フリガナ|ふりがな)"),
    ("first_name_kana", r"mei_?kana|kana_?mei|first_?name_?kana|kana_?first|メイ|めい|名.{0,3}(カナ|フリガナ|ふりがな)"),
    ("full_name_kana", r"kana|カナ|フリガナ|ふりがな|furigana"),
    ("last_name", r"last_?name|family|surname|\bsei\b|^sei|姓"),
    ("first_name", r"first_?name|given|\bmei\b|^mei|[（(]名[)）]|^名$|^名[\s*※]"),
    ("full_name", r"氏名|お名前|名前|full_?name|your_?name"),
    ("full_name", r"name"),
]

_PART_RE = re.compile(r"(?:[_\-\[]|^|\D)([123])\]?$")


def match_field(descriptor: str, autocomplete: str = "") -> Optional[str]:
    ac = (autocomplete or "").strip().lower()
    if ac in AUTOCOMPLETE_MAP:
        return AUTOCOMPLETE_MAP[ac]
    d = descriptor.lower()
    for key, pat in FIELD_RULES:
        if re.search(pat, d, re.IGNORECASE):
            return key
    return None


def split_part(name_or_id: str) -> Optional[int]:
    """tel1 / zip_2 / phone[3] のような分割入力欄の番号。"""
    m = _PART_RE.search(name_or_id.strip())
    return int(m.group(1)) if m else None


def value_for(key: str, profile: dict, part: Optional[int] = None) -> Optional[str]:
    p = profile
    if key == "full_name":
        v = " ".join(x for x in (p.get("last_name"), p.get("first_name")) if x) or None
    elif key == "full_name_kana":
        v = " ".join(x for x in (p.get("last_name_kana"), p.get("first_name_kana")) if x) or None
    elif key == "address_full":
        v = "".join(x for x in (p.get("prefecture"), p.get("city"), p.get("address1"), p.get("address2")) if x) or None
    else:
        v = p.get(key)
    if v is None:
        return None
    if part and key in ("phone", "postal_code"):
        pieces = re.split(r"[-ー－\s]", v)
        if len(pieces) == 1 and key == "postal_code" and len(v) == 7:
            pieces = [v[:3], v[3:]]
        return pieces[part - 1] if part <= len(pieces) else None
    if part and key == "birth_date":
        pieces = v.split("-")
        return pieces[part - 1].lstrip("0") if part <= len(pieces) else None
    return v


@dataclass
class FieldPlan:
    index: int
    tag: str
    descriptor: str
    key: Optional[str]
    value: Optional[str]


def plan_fields(fields: list[dict], profile: dict) -> list[FieldPlan]:
    plans = []
    for f in fields:
        if f.get("type") in SKIP_TYPES or not f.get("visible", True):
            continue
        desc = " ".join(str(f.get(k) or "") for k in ("name", "id", "placeholder", "aria", "label"))
        key = match_field(desc, f.get("autocomplete", ""))
        part = split_part(f.get("name") or f.get("id") or "") if key in ("phone", "postal_code", "birth_date") else None
        if key == "birth_date" and part is None:
            lbl = desc
            part = 1 if re.search(r"year|年", lbl) else 2 if re.search(r"month|月", lbl) else 3 if re.search(r"day|日", lbl) and "生年月日" not in lbl else None
        val = value_for(key, profile, part) if key else None
        plans.append(FieldPlan(f["index"], f.get("tag", "input"), desc.strip(), key, val))
    return plans


def check_conditions(campaign: dict, profile: dict, today: Optional[date] = None) -> list[str]:
    """応募条件と入力内容の照合。問題・注意点のリストを返す（空なら問題なし）。"""
    today = today or date.today()
    warns = []
    elig = campaign.get("eligibility") or {}
    bd = profile.get("birth_date")
    if bd and (elig.get("min_age") or elig.get("max_age")):
        try:
            b = date.fromisoformat(bd)
            age = today.year - b.year - ((today.month, today.day) < (b.month, b.day))
            if elig.get("min_age") and age < elig["min_age"]:
                warns.append(f"年齢条件 {elig['min_age']}歳以上 を満たしていません")
            if elig.get("max_age") and age > elig["max_age"]:
                warns.append(f"年齢条件 {elig['max_age']}歳以下 を満たしていません")
        except ValueError:
            warns.append("生年月日の形式が不正です (YYYY-MM-DD)")
    if elig.get("regions") and profile.get("prefecture") not in elig["regions"]:
        warns.append("居住地域の条件: " + "・".join(elig["regions"]))
    conds = campaign.get("conditions") or []
    notes = {
        "purchase": "商品の購入が必要な可能性があります", "receipt": "レシートの撮影・保管が必要です",
        "paid_membership": "有料登録が必要な可能性があります", "follow": "SNS アカウントのフォローが必要です",
        "repost": "リポスト（リツイート）が必要です", "line_friend": "LINE 友だち追加が必要です",
        "membership": "会員登録が必要です", "postcard": "はがき応募です（フォーム入力対象外）",
    }
    warns += [notes[c] for c in conds if c in notes]
    if campaign.get("deadline") and campaign["deadline"] < today.isoformat():
        warns.append("締切を過ぎています")
    return warns


_COLLECT_JS = r"""
() => {
  const els = Array.from(document.querySelectorAll('input, select, textarea'));
  return els.map((el, i) => {
    let label = '';
    if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) label = l.innerText; }
    if (!label) { const l = el.closest('label'); if (l) label = l.innerText; }
    if (!label) { const row = el.closest('tr, dl, .form-group, .row, li, p');
      if (row) { const h = row.querySelector('th, dt, label, .label'); if (h) label = h.innerText; } }
    const r = el.getBoundingClientRect();
    const st = window.getComputedStyle(el);
    return { index: i, tag: el.tagName.toLowerCase(), type: (el.type || '').toLowerCase(),
      name: el.name || '', id: el.id || '', placeholder: el.placeholder || '',
      autocomplete: el.getAttribute('autocomplete') || '', aria: el.getAttribute('aria-label') || '',
      label: (label || '').trim().slice(0, 60),
      visible: r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' };
  });
}
"""

_CAPTCHA_JS = r"""
() => !!document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], .g-recaptcha, .h-captcha, [class*="captcha" i], iframe[src*="turnstile"]')
"""


def fill_page(page, profile: dict) -> dict:
    """開いている Playwright page のフォームに入力する（送信はしない）。"""
    fields = page.evaluate(_COLLECT_JS)
    plans = plan_fields(fields, profile)
    loc = page.locator("input, select, textarea")
    filled, unknown, skipped = [], [], []
    for p in plans:
        if not p.key:
            unknown.append(p.descriptor)
            continue
        if not p.value:
            skipped.append(f"{p.descriptor}（プロフィール未登録: {p.key}）")
            continue
        el = loc.nth(p.index)
        try:
            if p.tag == "select":
                _select_option(el, p.value)
            else:
                el.fill(p.value)
            filled.append((p.descriptor, p.key, p.value))
        except Exception as e:  # noqa: BLE001
            skipped.append(f"{p.descriptor}（入力失敗: {e.__class__.__name__}）")
    return {"filled": filled, "unknown": unknown, "skipped": skipped, "captcha": page.evaluate(_CAPTCHA_JS)}


def _select_option(el, value: str) -> None:
    opts = el.evaluate("e => Array.from(e.options).map(o => [o.value, o.text])")
    for v, t in opts:
        if value in (v, t.strip()) or (value and value in t):
            el.select_option(value=v)
            return
    raise ValueError("選択肢に一致なし")


def run_interactive(url: str, profile: dict, campaign: dict | None = None, headless: bool = False,
                    wait_for_user: bool = True) -> dict:
    """ブラウザを開いて入力し、利用者の確認を待つ。"""
    from playwright.sync_api import sync_playwright

    from .profile import ProfileStore

    if campaign:
        warns = check_conditions(campaign, profile)
        print("\n=== 応募条件チェック ===")
        print("\n".join(f"  ⚠ {w}" for w in warns) if warns else "  問題は見つかりませんでした")
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=headless, executable_path=os.environ.get("FH_CHROMIUM_PATH") or None)
        page = browser.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(1500)
        result = fill_page(page, profile)
        print("\n=== 入力内容の確認（伏せ字表示） ===")
        for desc, key, val in result["filled"]:
            print(f"  ✔ {desc[:40]:40s} ← {ProfileStore.masked({key: val})[key]}")
        for s in result["skipped"]:
            print(f"  - {s}")
        if result["unknown"]:
            print(f"  ? 自動判定できない欄 {len(result['unknown'])} 件（手入力してください）")
        if result["captcha"]:
            print("  ⚠ CAPTCHA があります。ご自身で操作してください（自動突破はしません）")
        print("\n※ 送信は自動で行いません。ブラウザで内容・規約を確認し、ご自身で送信してください。")
        if wait_for_user:
            input("ブラウザでの作業が終わったら Enter を押してください...")
            ans = input("応募を送信しましたか？ (y/N): ").strip().lower()
            result["applied"] = ans == "y"
        browser.close()
    return result

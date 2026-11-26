"""日本語のキャンペーン本文から項目を抽出する（正規表現ベース・AI不使用）。

抽出できなかった項目は None のまま返す。推測で埋めない。
賞品価値だけは、明記が無い場合にキーワード辞書で「推定値」を付け、推定フラグを立てる。
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date
from typing import Optional

from bs4 import BeautifulSoup

PREFECTURES = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県",
    "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県",
    "山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府",
    "兵庫県", "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県",
    "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県",
    "鹿児島県", "沖縄県",
]


def normalize_text(text: str) -> str:
    """全角数字→半角、全角スペース→半角などを統一。"""
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("〜", "~").replace("～", "~").replace("―", "-")
    return re.sub(r"[ \t]+", " ", text)


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for t in soup(["script", "style", "noscript", "header", "footer", "nav"]):
        t.decompose()
    text = soup.get_text("\n")
    lines = [ln.strip() for ln in text.splitlines()]
    return "\n".join(ln for ln in lines if ln)


def page_title(html: str) -> Optional[str]:
    soup = BeautifulSoup(html, "lxml")
    for sel in ["meta[property='og:title']", "meta[name='twitter:title']"]:
        m = soup.select_one(sel)
        if m and m.get("content"):
            return m["content"].strip()
    if soup.title and soup.title.string:
        return soup.title.string.strip()
    h1 = soup.find("h1")
    return h1.get_text(strip=True) if h1 else None


# ───────── 日付 ─────────
_DATE_RE = re.compile(
    r"(?:(?P<y>20\d{2})\s*[年/.\-]\s*)?(?P<m>1[0-2]|0?[1-9])\s*[月/.\-]\s*(?P<d>3[01]|[12]\d|0?[1-9])\s*日?"
)
_DEADLINE_KW = re.compile(r"(締切|締め切り|〆切|応募期限|応募期間|募集期間|キャンペーン期間|受付期間|実施期間|期間)")
_UNTIL_KW = re.compile(r"(まで|迄|締切|〆|必着|消印有効)")


def _mkdate(y: Optional[str], m: str, d: str, ref: date) -> Optional[date]:
    try:
        year = int(y) if y else ref.year
        dt = date(year, int(m), int(d))
    except ValueError:
        return None
    if not y and (ref - dt).days > 90:  # 年の記載なしで大きく過去 → 翌年とみなす
        try:
            dt = date(ref.year + 1, int(m), int(d))
        except ValueError:
            return None
    return dt


def _dates_in(s: str, ref: date) -> list[tuple[date, int, int]]:
    """(日付, 開始位置, 終了位置) のリスト。"""
    out = []
    last_year: Optional[str] = None
    for m in _DATE_RE.finditer(s):
        y = m.group("y") or last_year
        if m.group("y"):
            last_year = m.group("y")
        dt = _mkdate(y, m.group("m"), m.group("d"), ref)
        if dt:
            out.append((dt, m.start(), m.end()))
    return out


_END_KW = re.compile(r"締切|締め切り|〆切|期限|まで|迄|必着|消印有効")


def _nearest(ds: list[tuple[date, int, int]], seg: str) -> Optional[date]:
    """締切キーワードに最も近い日付（同じ行に掲載日などが混ざっていても誤らない）。"""
    kws = [m.start() for m in _END_KW.finditer(seg)]
    if not kws:
        return ds[-1][0]
    best = min(ds, key=lambda d: min(min(abs(k - d[2]), abs(k - d[1])) for k in kws))
    return best[0]


def extract_period(text: str, ref: Optional[date] = None) -> tuple[Optional[date], Optional[date]]:
    """(応募開始日, 締切) を返す。"""
    ref = ref or date.today()
    t = normalize_text(text)
    lines = t.splitlines()
    start: Optional[date] = None
    deadline: Optional[date] = None
    for i, line in enumerate(lines):
        if not _DEADLINE_KW.search(line) and not _UNTIL_KW.search(line):
            continue
        # 基本はキーワード行のみ。行内に日付が無い場合だけ次の行を見る（「応募期間」の次行に日付があるケース）
        seg = line
        ds = _dates_in(seg, ref)
        if not ds and i + 1 < len(lines):
            seg = line + " " + lines[i + 1]
            ds = _dates_in(seg, ref)
        if not ds:
            continue
        # 「A ~ B」の期間表記
        rng = re.search(r"(\S*?\d[^~]{0,25}?)\s*~\s*([^~]{0,30})", seg)
        if rng and len(ds) >= 2:
            pair = [d for d in ds if rng.start() <= d[1] < rng.end()]
            if len(pair) >= 2 and pair[0][0] <= pair[1][0]:
                start = start or pair[0][0]
                deadline = deadline or pair[1][0]
                break
        if _END_KW.search(seg):
            deadline = deadline or _nearest(ds, seg)
            break
        if _DEADLINE_KW.search(seg) and len(ds) == 1:
            deadline = deadline or ds[0][0]
            break
    return start, deadline


# ───────── 当選人数 ─────────
_TOTAL_RE = re.compile(r"(?:合計|総計|計|総勢)\s*([\d,]+)\s*(?:名|人|組)")
_WINNER_RE = re.compile(r"([\d,]+)\s*(?:名様|名|人|組様|組)(?!目|義|前|刺|物|所|称|簿)")
_WINNER_CTX = re.compile(r"(抽選|当選|プレゼント|名様|賞|もれなく)")


def extract_winners(text: str) -> Optional[int]:
    t = normalize_text(text)
    m = _TOTAL_RE.search(t)
    if m:
        return _to_int(m.group(1))
    total = 0
    seen = set()
    for line in t.splitlines():
        if not _WINNER_CTX.search(line):
            continue
        for mm in _WINNER_RE.finditer(line):
            n = _to_int(mm.group(1))
            key = (line, mm.start())
            if n and 0 < n < 10_000_000 and key not in seen:
                seen.add(key)
                total += n
    return total or None


def _to_int(s: str) -> Optional[int]:
    try:
        return int(s.replace(",", ""))
    except ValueError:
        return None


# ───────── 賞品価値 ─────────
_VALUE_RE = re.compile(r"([\d,.]+)\s*(万)?\s*円\s*(?:相当|分|程度)?")
_VALUE_CTX = re.compile(r"(相当|分|ギフト|カード|券|ポイント|賞|プレゼント|商品|価格)")

# 明記が無い場合の推定（あくまで目安）。キー: 正規表現, 値: 円
ESTIMATE_TABLE: list[tuple[str, int]] = [
    (r"試写会|舞台挨拶|トークイベント|観覧|鑑賞券|入場券", 3_000),
    (r"海外旅行|旅行券|航空券|ツアー", 100_000),
    (r"宿泊|ホテル|旅館|ペア.*招待", 30_000),
    (r"iPhone|MacBook|PlayStation ?5|PS5", 80_000),
    (r"iPad|Nintendo Switch|ニンテンドースイッチ|ルンバ|ダイソン|Dyson", 50_000),
    (r"AirPods|Apple Watch|家電|ドライヤー|空気清浄機", 20_000),
    (r"牛肉|和牛|ブランド牛|松阪|カニ|かに|蟹", 10_000),
    (r"1年分|１年分", 10_000),
    (r"ディナー|食事券", 10_000),
    (r"詰め合わせ|セット|ギフト", 3_000),
    (r"ケトル|タンブラー|マグカップ|オリジナルグッズ|トートバッグ", 3_000),
    (r"試供品|サンプル品|お試しサイズ", 500),
]


def extract_value(text: str, hint: Optional[str] = None) -> tuple[Optional[int], bool]:
    """(最高額の賞品価値, 推定かどうか)
    明記された金額は text 全体から、推定は hint（賞品名・タイトル）があればそこからのみ行う。"""
    t = normalize_text(text)
    best = 0
    for line in t.splitlines():
        if not _VALUE_CTX.search(line):
            continue
        for m in _VALUE_RE.finditer(line):
            try:
                v = float(m.group(1).replace(",", ""))
            except ValueError:
                continue
            if m.group(2):
                v *= 10_000
            if 10 <= v <= 50_000_000:
                best = max(best, int(v))
    if best:
        return best, False
    target = normalize_text(hint) if hint else t
    for pat, yen in ESTIMATE_TABLE:
        if re.search(pat, target, re.IGNORECASE):
            return yen, True
    return None, False


# ───────── 「見出し行 → 次の行が値」形式（Koubo 等の詳細ページ） ─────────
def label_value(text: str, labels: tuple[str, ...]) -> Optional[str]:
    lines = [ln.strip() for ln in normalize_text(text).splitlines()]
    for i, ln in enumerate(lines[:-1]):
        if ln.rstrip(":：") in labels and lines[i + 1]:
            return lines[i + 1]
    return None


_URL_RE = re.compile(r"https?://[^\s<>\"']+")


def extract_source_url(text: str) -> Optional[str]:
    """「出典」「公式サイト」として書かれた元キャンペーンの URL。"""
    t = normalize_text(text)
    m = re.search(r"(?:出典|公式サイト|キャンペーンサイト|応募ページ)\s*[:：]?\s*\n?\s*(https?://[^\s<>\"']+)", t)
    return m.group(1) if m else None


# ───────── 賞品 ─────────
_PRIZE_RE = re.compile(r"(?:賞品|景品|プレゼント内容|プレゼント賞品|プレゼント|賞)\s*[:：】\]]\s*(.+)")
_PRIZE_LINE = re.compile(r"(.{2,60}?)\s*(?:を)?\s*(?:抽選で)?\s*[\d,]+\s*名様")


def extract_prize(text: str) -> Optional[str]:
    v = label_value(text, ("賞品", "賞", "景品", "プレゼント内容", "プレゼント賞品"))
    if v and len(v) >= 2:
        return v[:120]
    t = normalize_text(text)
    for line in t.splitlines():
        m = _PRIZE_RE.search(line)
        if m and len(m.group(1).strip()) >= 2:
            return m.group(1).strip()[:120]
    for line in t.splitlines():
        m = _PRIZE_LINE.search(line)
        if m:
            return m.group(1).strip(" 、,。:：")[:120]
    return None


# ───────── 条件・方法 ─────────
CONDITION_PATTERNS: dict[str, str] = {
    "follow": r"フォロー",
    "repost": r"リポスト|リツイート|\bRT\b|再投稿",
    "like": r"いいね",
    "comment": r"コメント|リプライ|返信",
    "hashtag": r"ハッシュタグ|#\S+をつけ",
    "purchase": r"購入|お買い上げ|お買い求め|対象商品|シリアル|応募券|バーコード",
    "receipt": r"レシート",
    "membership": r"会員登録|会員限定|会員の方",
    "paid_membership": r"有料会員|月額|プレミアム会員|年会費|定期購入",
    "survey": r"アンケート",
    "postcard": r"はがき|ハガキ|葉書|郵便",
    "line_friend": r"LINE.{0,6}友だち|LINE公式アカウント",
    "app": r"アプリ(?:を|の)?(?:ダウンロード|インストール)|アプリ限定",
    "quiz": r"クイズ|正解",
    "web_form": r"応募フォーム|フォームから|応募する|応募ボタン|エントリー",
    "instant_win": r"その場で|即時|インスタントウィン|すぐに結果",
    "everyone": r"もれなく|全員",
}

_END_RE = re.compile(r"(終了しました|受付を終了|締め切りました|募集を終了|募集終了|応募受付は終了|当選者発表.{0,10}(?:済|しました)|キャンペーンは終了)")
_AGE_RE = re.compile(r"(\d{2})\s*歳以上")
_AGE_MAX_RE = re.compile(r"(\d{2})\s*歳(?:以下|未満)の方(?:限定|のみ)")
_REGION_RE = re.compile("(" + "|".join(PREFECTURES) + r")(?:内)?(?:に)?(?:在住|居住|お住まい)")


def extract_conditions(text: str) -> list[str]:
    t = normalize_text(text)
    # 「会員登録 不要」「購入 不要」のような否定表記は条件にしない
    t = re.sub(r"(会員登録|購入|アプリ)[^\n]{0,4}\n?\s*(不要|なし|必要ありません)", "", t)
    return [k for k, pat in CONDITION_PATTERNS.items() if re.search(pat, t, re.IGNORECASE)]


def detect_method(conds: list[str]) -> Optional[str]:
    if "postcard" in conds:
        return "postcard"
    if "receipt" in conds:
        return "receipt"
    if "repost" in conds or ("follow" in conds and "web_form" not in conds):
        return "sns"
    if "line_friend" in conds:
        return "line"
    if "web_form" in conds:
        return "web_form"
    return None


def is_ended(text: str) -> bool:
    return bool(_END_RE.search(normalize_text(text)))


def extract_eligibility(text: str) -> dict:
    t = normalize_text(text)
    out: dict = {}
    m = _AGE_RE.search(t)
    if m:
        out["min_age"] = int(m.group(1))
    m = _AGE_MAX_RE.search(t)
    if m:
        out["max_age"] = int(m.group(1))
    regions = sorted(set(_REGION_RE.findall(t)))
    if regions:
        out["regions"] = regions
    return out


_COMPANY_RE = re.compile(r"(?:主催|提供|運営|実施)\s*[:：】]?\s*((?:株式会社|有限会社|合同会社)\s*[^\s、。()（）]{1,30}|[^\s、。()（）]{1,30}\s*(?:株式会社|有限会社|合同会社))")
_COMPANY_ANY = re.compile(r"((?:株式会社|有限会社|合同会社)\s?[^\s、。()（）「」]{1,25}|[^\s、。()（）「」]{1,25}(?:株式会社|有限会社|合同会社))")


def extract_company(text: str) -> Optional[str]:
    v = label_value(text, ("主催者", "主催", "提供", "主催社"))
    if v and 1 < len(v) <= 40:
        return v
    t = normalize_text(text)
    m = _COMPANY_RE.search(t) or _COMPANY_ANY.search(t)
    return m.group(1).strip() if m else None


def extract_all(text: str, ref: Optional[date] = None, title: str = "") -> dict:
    """本文テキストからまとめて抽出。title を渡すと賞品は本文を優先して探す。"""
    full = f"{title}\n{text}" if title else text
    start, deadline = extract_period(full, ref)
    conds = extract_conditions(full)
    prize = extract_prize(text) or extract_prize(title) if title else extract_prize(text)
    value, estimated = extract_value(full, hint=f"{title} {prize or ''}" if title else None)
    text = full
    return {
        "start_date": start,
        "deadline": deadline,
        "winners": extract_winners(text),
        "prize": prize,
        "prize_value_yen": value,
        "prize_value_estimated": estimated,
        "conditions": conds,
        "method": detect_method(conds),
        "ended": is_ended(text),
        "company": extract_company(text),
        "eligibility": extract_eligibility(text),
        "source_url": extract_source_url(text),
    }

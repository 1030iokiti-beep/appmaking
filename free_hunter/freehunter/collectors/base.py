"""収集モジュールの共通部分。"""
from __future__ import annotations

import logging
import re
from datetime import date
from typing import Optional

from bs4 import BeautifulSoup, Tag

from ..extract import extract_all, html_to_text, page_title, normalize_text
from ..http_client import HttpClient, RobotsDisallowed, fetch_with_browser
from ..models import Campaign
from ..normalize import normalize_url

log = logging.getLogger("freehunter.collect")

CAMPAIGN_WORDS = re.compile(r"(プレゼント|懸賞|抽選|名様|キャンペーン|当たる|当選|campaign|present)", re.IGNORECASE)
SKIP_HREF = re.compile(r"^(javascript:|mailto:|tel:|#)")
SKIP_TEXT = re.compile(r"^(キャンペーン一覧|一覧|もっと見る|詳しく|詳細|次へ|前へ|トップ|ホーム|ログイン|会員登録|新規登録|プライバシー|利用規約|お問い合わせ|>|»|\d+)$")


class BaseCollector:
    kind = "base"

    def __init__(self, source: dict, http: HttpClient, settings=None):
        self.source = source
        self.http = http
        self.settings = settings
        self.name = source["name"]
        self.max_detail = settings.get("http", "max_detail_pages", 30) if settings else 30

    def collect(self) -> list[Campaign]:
        raise NotImplementedError

    # ── 取得 ──
    def fetch(self, url: str) -> str:
        if self.source.get("use_browser"):
            if not self.http.allowed(url):
                raise RobotsDisallowed(f"robots.txt により禁止: {url}")
            return fetch_with_browser(url)
        return self.http.get_text(url)

    # ── Campaign 生成 ──
    def build(self, title: str, url: str, text: str, *, company: Optional[str] = None,
              is_official: Optional[bool] = None, ref: Optional[date] = None) -> Campaign:
        info = extract_all(text, ref, title=title)
        return Campaign(
            title=normalize_text(title).strip()[:200],
            url=url,
            source_name=self.name,
            source_kind=self.kind,
            company=company or self.source.get("company") or info["company"],
            prize=info["prize"],
            prize_value_yen=info["prize_value_yen"],
            prize_value_estimated=info["prize_value_estimated"],
            winners=info["winners"],
            start_date=info["start_date"],
            deadline=info["deadline"],
            conditions=info["conditions"],
            conditions_text=_conditions_excerpt(text),
            method=info["method"],
            apply_url=url,
            is_official=self.source.get("is_official", False) if is_official is None else is_official,
            ended=info["ended"],
            raw_text=text[:3000],
            eligibility=info["eligibility"],
        )

    def enrich_from_detail(self, c: Campaign) -> Campaign:
        """詳細ページを取得して不足項目を補う。失敗しても一覧の情報は残す。"""
        try:
            html = self.fetch(c.url)
        except Exception as e:  # noqa: BLE001
            log.info("詳細ページ取得失敗（一覧情報のみ保存） %s: %s", c.url, e)
            return c
        text = html_to_text(html)
        d = self.build(page_title(html) or c.title, c.url, text, company=c.company)
        for f in ("company", "winners", "start_date", "deadline", "method", "conditions_text"):
            if getattr(c, f) in (None, "", []) and getattr(d, f) not in (None, "", []):
                setattr(c, f, getattr(d, f))
        # 賞品: 一覧のタイトルをそのまま拾っただけなら詳細ページの記載を優先
        if d.prize and (not c.prize or c.prize in c.title):
            c.prize = d.prize
        # 賞品価値: 記載値 > 推定値。値と推定フラグは必ずセットで更新
        if d.prize_value_yen and (not c.prize_value_yen or (c.prize_value_estimated and not d.prize_value_estimated)):
            c.prize_value_yen, c.prize_value_estimated = d.prize_value_yen, d.prize_value_estimated
        c.conditions = sorted(set(c.conditions) | set(d.conditions))
        c.ended = c.ended or d.ended
        c.eligibility = {**d.eligibility, **c.eligibility}
        c.raw_text = (c.raw_text + "\n---\n" + d.raw_text)[:3000]
        return c


def _conditions_excerpt(text: str) -> Optional[str]:
    lines = normalize_text(text).splitlines()
    for i, ln in enumerate(lines):
        if re.search(r"応募条件|応募方法|参加方法|応募資格", ln):
            return "\n".join(lines[i:i + 6])[:500]
    return None


def block_text(a: Tag, max_len: int = 600) -> str:
    """リンクを含む、1件分とみなせる親要素のテキスト。"""
    node: Tag = a
    best = a.get_text(" ", strip=True)
    for _ in range(5):
        parent = node.parent
        if parent is None or parent.name in ("body", "html", "[document]"):
            break
        t = parent.get_text("\n", strip=True)
        if len(t) > max_len or len(parent.find_all("a", href=True)) > 1:
            break
        best, node = t, parent
    return best


def find_campaign_links(html: str, base_url: str, same_domain_only: bool = False,
                        word_re: re.Pattern = CAMPAIGN_WORDS) -> list[tuple[str, str, str]]:
    """(リンク文字, 絶対URL, ブロックテキスト) を返す。"""
    from ..normalize import domain_of

    soup = BeautifulSoup(html, "lxml")
    for t in soup(["script", "style", "noscript", "header", "footer", "nav"]):
        t.decompose()
    base_domain = domain_of(base_url)
    base_norm = normalize_url(base_url, for_key=False)
    out, seen = [], set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if SKIP_HREF.match(href):
            continue
        url = normalize_url(href, base_url, for_key=False)
        if url == base_norm or url in seen:
            continue
        if same_domain_only and domain_of(url) != base_domain:
            continue
        text = a.get_text(" ", strip=True)
        if not text and a.find("img"):
            text = (a.find("img").get("alt") or "").strip()
        if len(text) < 6 or SKIP_TEXT.match(text):
            continue
        blk = block_text(a)
        if not (word_re.search(text) or word_re.search(blk) or word_re.search(href)):
            continue
        seen.add(url)
        out.append((text, url, blk))
    return out

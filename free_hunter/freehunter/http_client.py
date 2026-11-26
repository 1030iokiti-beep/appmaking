"""HTTP 取得。robots.txt を尊重し、同一ホストへのアクセス間隔を空け、失敗時はリトライする。"""
from __future__ import annotations

import logging
import os
import time
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import requests

log = logging.getLogger("freehunter.http")


class FetchError(Exception):
    pass


class RobotsDisallowed(FetchError):
    pass


class HttpClient:
    def __init__(self, user_agent: str = "FreeHunterBot/0.1", timeout: float = 20,
                 min_interval: float = 3.0, retries: int = 2, respect_robots: bool = True):
        self.user_agent = user_agent
        self.timeout = timeout
        self.min_interval = min_interval
        self.retries = retries
        self.respect_robots = respect_robots
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": user_agent,
            "Accept-Language": "ja,en;q=0.5",
        })
        self._last_access: dict[str, float] = {}
        self._robots: dict[str, RobotFileParser | None] = {}

    @classmethod
    def from_settings(cls, settings) -> "HttpClient":
        return cls(
            user_agent=settings.get("http", "user_agent", "FreeHunterBot/0.1"),
            timeout=settings.get("http", "timeout_sec", 20),
            min_interval=settings.get("http", "min_interval_sec", 3.0),
            retries=settings.get("http", "retries", 2),
            respect_robots=settings.get("http", "respect_robots_txt", True),
        )

    # ---- robots.txt ----
    def allowed(self, url: str) -> bool:
        if not self.respect_robots:
            return True
        parts = urlsplit(url)
        origin = f"{parts.scheme}://{parts.netloc}"
        if origin not in self._robots:
            rp = RobotFileParser()
            try:
                r = self.session.get(origin + "/robots.txt", timeout=self.timeout)
                if r.status_code >= 400:
                    rp = None  # robots.txt 無し = 制限なし
                else:
                    rp.parse(r.text.splitlines())
            except requests.RequestException as e:
                # 接続できないサイトは robots.txt を確認できないため、安全側に倒してスキップ
                raise FetchError(f"サイトに接続できません {origin}: {type(e).__name__}") from e
            self._robots[origin] = rp
        rp = self._robots[origin]
        if rp is None:
            return True
        return rp.can_fetch(self.user_agent, url)

    def _wait(self, host: str) -> None:
        last = self._last_access.get(host)
        if last is not None:
            delta = time.monotonic() - last
            if delta < self.min_interval:
                time.sleep(self.min_interval - delta)
        self._last_access[host] = time.monotonic()

    def get_text(self, url: str) -> str:
        if not self.allowed(url):
            raise RobotsDisallowed(f"robots.txt により禁止: {url}")
        host = urlsplit(url).netloc
        last_err: Exception | None = None
        for attempt in range(self.retries + 1):
            self._wait(host)
            try:
                r = self.session.get(url, timeout=self.timeout)
                if r.status_code == 429 or r.status_code >= 500:
                    raise FetchError(f"HTTP {r.status_code}")
                if r.status_code >= 400:
                    raise FetchError(f"HTTP {r.status_code}: {url}")  # 4xx はリトライしない
                if not r.encoding or r.encoding.lower() == "iso-8859-1":
                    r.encoding = r.apparent_encoding
                return r.text
            except FetchError as e:
                last_err = e
                if "HTTP 4" in str(e) and "429" not in str(e):
                    break
            except requests.RequestException as e:
                last_err = e
            log.info("取得リトライ %d/%d %s (%s)", attempt + 1, self.retries, url, last_err)
            time.sleep(2 ** attempt)
        raise FetchError(f"取得失敗 {url}: {last_err}")


def fetch_with_browser(url: str, timeout_ms: int = 30000) -> str:
    """JS 描画ページ用。Playwright(Chromium) でレンダリング後の HTML を返す。"""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=os.environ.get("FH_CHROMIUM_PATH") or None)
        try:
            page = browser.new_page()
            page.goto(url, timeout=timeout_ms, wait_until="networkidle")
            return page.content()
        finally:
            browser.close()

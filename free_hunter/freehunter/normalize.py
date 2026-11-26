"""URL 正規化。トラッキング用パラメータを除去し、同じページを同じ文字列にそろえる。"""
from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit, urljoin

TRACKING_PARAMS = {
    "fbclid", "gclid", "yclid", "msclkid", "igshid", "ref", "ref_src", "s", "t",
    "spm", "mc_cid", "mc_eid", "_ga", "cmpid", "from",
}
TRACKING_PREFIXES = ("utm_", "pk_", "hsa_")


def normalize_url(url: str, base: str | None = None, for_key: bool = True) -> str:
    """for_key=True: 重複判定用（https化・www除去・x.com統一）。
    for_key=False: 実際にアクセスする URL（トラッキング除去のみ）。"""
    if base:
        url = urljoin(base, url)
    url = url.strip()
    parts = urlsplit(url)
    scheme = (parts.scheme or "https").lower()
    host = parts.hostname.lower() if parts.hostname else ""
    if for_key:
        if scheme == "http":
            scheme = "https"
        if host.startswith("www."):
            host = host[4:]
        if host in ("twitter.com", "mobile.twitter.com", "mobile.x.com"):
            host = "x.com"
    port = parts.port
    netloc = host if port in (None, 80, 443) else f"{host}:{port}"
    path = parts.path or "/"
    if for_key:
        for idx in ("/index.html", "/index.htm", "/index.php"):
            if path.endswith(idx):
                path = path[: -len(idx) + 1]
        if len(path) > 1 and path.endswith("/"):
            path = path.rstrip("/")
    query = [
        (k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True)
        if k.lower() not in TRACKING_PARAMS and not k.lower().startswith(TRACKING_PREFIXES)
    ]
    query.sort()
    return urlunsplit((scheme, netloc, path, urlencode(query), ""))


def domain_of(url: str) -> str:
    h = urlsplit(url).hostname or ""
    return h[4:] if h.startswith("www.") else h

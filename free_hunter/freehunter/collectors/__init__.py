"""情報源ごとの収集モジュール。kind 名 → クラスの対応表。"""
from .rss import RssCollector
from .prize_sites import ListPageCollector
from .official import OfficialSiteCollector
from .web_page import WebPageCollector
from .x_api import XApiCollector
from .instagram_api import InstagramApiCollector

COLLECTORS = {
    "rss": RssCollector,
    "list_page": ListPageCollector,
    "official": OfficialSiteCollector,
    "web_page": WebPageCollector,
    "x": XApiCollector,
    "instagram": InstagramApiCollector,
}

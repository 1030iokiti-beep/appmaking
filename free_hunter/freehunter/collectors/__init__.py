"""情報源ごとの収集モジュール。kind 名 → クラスの対応表。"""
from .rss import RssCollector
from .prize_sites import ListPageCollector
from .official import OfficialSiteCollector
from .web_page import WebPageCollector

COLLECTORS = {
    "rss": RssCollector,
    "list_page": ListPageCollector,
    "official": OfficialSiteCollector,
    "web_page": WebPageCollector,
}

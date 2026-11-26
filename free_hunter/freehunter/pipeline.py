"""収集 → 正規化 → 重複排除 → 状態判定 → 評価 → 保存 の一連処理。"""
from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Iterable, Optional

from .collectors import COLLECTORS
from .config import load_sources
from .db import Database
from .dedup import fingerprint, is_same_campaign
from .genres import classify_genre
from .http_client import FetchError, HttpClient
from .models import Campaign
from .normalize import domain_of, normalize_url
from .scoring import evaluate
from .status import judge_status

log = logging.getLogger("freehunter.pipeline")

MERGE_FIELDS = ("company", "prize", "prize_value_yen", "winners", "start_date", "deadline",
                "conditions_text", "method", "apply_url")


def campaign_to_row(c: Campaign) -> dict:
    url_norm = normalize_url(c.url)
    now = datetime.now().isoformat(timespec="seconds")
    return {
        "fingerprint": fingerprint(c.company, c.title, c.deadline),
        "url": c.url,
        "url_norm": url_norm,
        "domain": domain_of(url_norm),
        "title": c.title,
        "company": c.company,
        "prize": c.prize,
        "prize_value_yen": c.prize_value_yen,
        "prize_value_estimated": c.prize_value_estimated,
        "winners": c.winners,
        "start_date": c.start_date.isoformat() if c.start_date else None,
        "deadline": c.deadline.isoformat() if c.deadline else None,
        "conditions": c.conditions,
        "conditions_text": c.conditions_text,
        "method": c.method,
        "apply_url": c.apply_url or c.url,
        "is_official": c.is_official,
        "ended": c.ended,
        "status": judge_status(c.deadline, c.start_date, c.ended),
        "genre": c.genre or classify_genre(c.title, c.prize),
        "eligibility": c.eligibility,
        "source_name": c.source_name,
        "source_kind": c.source_kind,
        "raw_text": c.raw_text,
        "first_seen": now,
        "last_seen": now,
    }


def upsert(db: Database, c: Campaign) -> tuple[int, bool]:
    """(campaign_id, 新規かどうか)"""
    row = campaign_to_row(c)
    existing = db.find_by_url(row["url_norm"])
    if existing is None:
        for cand in db.candidates_for_dedup(row["company"], row["domain"]):
            if is_same_campaign(row, cand):
                existing = cand
                break
    if existing is None:
        cid = db.insert_campaign(row)
        db.add_source_seen(cid, c.source_name, c.url)
        return cid, True
    upd: dict = {"last_seen": row["last_seen"]}
    for f in MERGE_FIELDS:
        if existing.get(f) in (None, "") and row.get(f) not in (None, ""):
            upd[f] = row[f]
    if row["prize_value_yen"] and (not existing.get("prize_value_yen") or
                                  (existing.get("prize_value_estimated") and not row["prize_value_estimated"])):
        upd["prize_value_yen"] = row["prize_value_yen"]
        upd["prize_value_estimated"] = row["prize_value_estimated"]
    conds = sorted(set(existing.get("conditions") or []) | set(row["conditions"]))
    if conds != sorted(existing.get("conditions") or []):
        upd["conditions"] = conds
    if row["ended"] and not existing.get("ended"):
        upd["ended"] = True
    if row["is_official"] and not existing.get("is_official"):
        # 公式情報が見つかったら公式 URL を優先
        upd.update(is_official=True, apply_url=row["url"])
    db.update_campaign(existing["id"], upd)
    db.add_source_seen(existing["id"], c.source_name, c.url)
    return existing["id"], False


def save_campaigns(db: Database, campaigns: Iterable[Campaign]) -> tuple[int, int]:
    new = upd = 0
    with db.tx():
        for c in campaigns:
            if not c.title or not c.url:
                continue
            _, is_new = upsert(db, c)
            new += is_new
            upd += not is_new
    return new, upd


def rescore_all(db: Database, settings=None, today: Optional[date] = None) -> dict[str, int]:
    """全案件の状態・スコアを再計算（締切は日々過ぎるため毎回実行）。"""
    today = today or date.today()
    counts: dict[str, int] = {}
    with db.tx():
        for c in db.all_campaigns(include_hidden=True):
            dl = date.fromisoformat(c["deadline"]) if c.get("deadline") else None
            st = date.fromisoformat(c["start_date"]) if c.get("start_date") else None
            c["status"] = judge_status(dl, st, bool(c.get("ended")), today)
            res = evaluate(c, settings, today)
            rank = (c.get("ai_rank") or res.rank) if res.rank != "除外" else res.rank
            db.update_campaign(c["id"], {
                "status": c["status"], "score": res.score, "rank": rank,
                "score_breakdown": res.breakdown, "reasons": res.reasons, "est_minutes": res.est_minutes,
            })
            counts[rank] = counts.get(rank, 0) + 1
    return counts


def build_sources(settings) -> list[dict]:
    return [s for s in load_sources() if s.get("enabled")]


def run_collection(db: Database, settings, sources: Optional[list[dict]] = None,
                   http: Optional[HttpClient] = None) -> list[dict]:
    """全情報源を収集。1つの情報源が失敗しても他は続行する。"""
    http = http or HttpClient.from_settings(settings)
    sources = sources if sources is not None else build_sources(settings)
    report = []
    for src in sources:
        cls = COLLECTORS.get(src["kind"])
        run_id = db.start_run(src["name"])
        fetched = new = upd = 0
        error = None
        if cls is None:
            error = f"未対応の kind: {src['kind']}"
        else:
            try:
                items = cls(src, http, settings).collect()
                fetched = len(items)
                new, upd = save_campaigns(db, items)
            except FetchError as e:
                error = f"取得失敗: {e}"
                log.warning("[%s] %s", src["name"], e)
            except Exception as e:  # noqa: BLE001 情報源単位で失敗を隔離
                error = f"{type(e).__name__}: {e}"
                log.exception("[%s] 収集エラー", src["name"])
        db.finish_run(run_id, fetched, new, upd, error)
        log.info("[%s] 取得%d 新規%d 更新%d %s", src["name"], fetched, new, upd, error or "")
        report.append({"source": src["name"], "fetched": fetched, "new": new, "updated": upd, "error": error})
    return report

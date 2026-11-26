"""Claude Code 連携（API は呼ばない）。

1. ai-export: ルールで判断しにくい案件を Markdown に書き出す
     data/ai_review/request_YYYYMMDD.md
2. 利用者が Claude Code で「このファイルを読んで分析し、指定の JSON 形式で回答ファイルを作って」と依頼
3. ai-import: 回答 JSON を取り込み、AI メモ・補正ランクを DB に反映
回答 JSON 形式: [{"id": 12, "rank": "A", "note": "公式サイトで確認済み..."}]
"""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from .db import Database

VALID_RANKS = {"S", "A", "B", "C", "除外"}


def needs_review(c: dict) -> list[str]:
    why = []
    if c.get("rank") == "除外" or c.get("hidden"):
        return why
    if not c.get("deadline"):
        why.append("締切不明")
    if not c.get("prize"):
        why.append("賞品不明")
    if not c.get("company"):
        why.append("企業名不明")
    if c.get("prize_value_estimated"):
        why.append("賞品価値が推定値")
    if c.get("rank") in ("S", "A") and not c.get("is_official"):
        why.append("高ランクだが公式未確認")
    return why


def export_requests(db: Database, out_dir: Path, limit: int = 30) -> Path | None:
    items = []
    for c in db.all_campaigns():
        if c.get("ai_note"):
            continue
        why = needs_review(c)
        if why:
            items.append((c, why))
    items.sort(key=lambda x: -(x[0].get("score") or 0))
    items = items[:limit]
    if not items:
        return None
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"request_{date.today():%Y%m%d}.md"
    lines = [
        "# FREE HUNTER 案件分析依頼（Claude Code 用）",
        "",
        "以下の懸賞案件について、本文抜粋から 賞品・締切・応募条件・公式性 を確認し、",
        "応募ランク(S/A/B/C/除外)と短いメモを付けてください。",
        "当選確率など根拠のない数値は書かないでください。",
        f"回答は `{out_dir.name}/answer_{date.today():%Y%m%d}.json` に次の形式で保存:",
        '`[{"id": 12, "rank": "A", "note": "..."}]`',
        "",
    ]
    for c, why in items:
        lines += [
            f"## id={c['id']} {c['title']}",
            f"- URL: {c['url']}",
            f"- 企業: {c.get('company') or '不明'} / 締切: {c.get('deadline') or '不明'} / 賞品: {c.get('prize') or '不明'}",
            f"- 現在ランク: {c.get('rank')}（スコア {c.get('score')}）/ 要確認: {'・'.join(why)}",
            "```", (c.get("raw_text") or "")[:1200], "```", "",
        ]
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def import_answers(db: Database, path: Path) -> int:
    data = json.loads(path.read_text(encoding="utf-8"))
    n = 0
    with db.tx():
        for a in data:
            cid = int(a["id"])
            rank = a.get("rank")
            if rank is not None and rank not in VALID_RANKS:
                raise ValueError(f"id={cid}: 不正なランク {rank}")
            if db.get_campaign(cid) is None:
                continue
            db.update_campaign(cid, {"ai_rank": rank, "ai_note": a.get("note")})
            n += 1
    return n

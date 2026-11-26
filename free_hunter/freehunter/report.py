"""スマホで見るための一覧レポート（Markdown）を作る。
GitHub 上で表示すると表とリンクがそのまま使える。"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from pathlib import Path

from .db import Database

RANK_ORDER = {"S": 0, "A": 1, "B": 2, "C": 3}
METHOD = {"web_form": "フォーム", "sns": "SNS", "receipt": "レシート", "postcard": "はがき", "line": "LINE"}


def _esc(s) -> str:
    return str(s or "").replace("|", "／").replace("\n", " ").strip()


def _row(c: dict, today: date) -> str:
    dl = c.get("deadline")
    days = (date.fromisoformat(dl) - today).days if dl else None
    dl_txt = f"{dl[5:].replace('-', '/')}（あと{days}日）" if dl else "不明"
    val = c.get("prize_value_yen")
    val_txt = (f"約{val:,}円" if c.get("prize_value_estimated") else f"{val:,}円") if val else "-"
    url = c.get("apply_url") or c["url"]
    return (f"| {c['rank']} | [{_esc(c['title'])[:40]}]({url}) | {_esc(c.get('prize'))[:30] or '-'} | "
            f"{val_txt} | {c['winners'] or '-'} | {dl_txt} | {METHOD.get(c.get('method'), '-')} | {c['id']} |")


HEAD = "| ランク | キャンペーン（タップで応募ページ） | 賞品 | 価値 | 当選数 | 締切 | 方法 | ID |\n|---|---|---|---|---|---|---|---|"


def build_report(db: Database, today: date | None = None, soon_days: int = 3,
                 include_history: bool = False) -> str:
    today = today or date.today()
    rows = [c for c in db.all_campaigns() if c.get("rank") in RANK_ORDER]
    rows.sort(key=lambda c: (RANK_ORDER[c["rank"]], -(c.get("score") or 0)))
    new_cut = (datetime.now() - timedelta(days=1)).isoformat()
    new = [c for c in rows if (c.get("first_seen") or "") >= new_cut]
    soon = [c for c in rows if c.get("deadline") and 0 <= (date.fromisoformat(c["deadline"]) - today).days <= soon_days]
    out = [
        "# 🎁 FREE HUNTER 懸賞リスト",
        f"更新: {datetime.now():%Y-%m-%d %H:%M}",
        "",
        f"**応募可能 {len(rows)}件** ／ Sランク {sum(c['rank'] == 'S' for c in rows)}件 ／ "
        f"新着 {len(new)}件 ／ 締切間近 {len(soon)}件",
        "",
        "※当選確率は応募者数が非公開のため表示していません。「約」は賞品名からの推定です。",
        "※応募前に必ずリンク先で条件・規約を確認してください。",
        "",
    ]
    if soon:
        out += [f"## ⏰ 締切間近（{soon_days}日以内）", "", HEAD, *[_row(c, today) for c in soon], ""]
    for rank, label in (("S", "🥇 Sランク（優先）"), ("A", "🥈 Aランク"), ("B", "🥉 Bランク"), ("C", "Cランク")):
        part = [c for c in rows if c["rank"] == rank]
        if part:
            out += [f"## {label} {len(part)}件", "", HEAD, *[_row(c, today) for c in part], ""]
    if include_history:
        apps = db.applications()
        wins = db.wins()
        month = today.strftime("%Y-%m")
        mv = sum((w.get("value_yen") or 0) for w in wins if (w.get("won_at") or "").startswith(month))
        out += ["## 📝 応募・当選", "", f"応募済み {len(apps)}件 ／ 当選 {len(wins)}件 ／ 今月の獲得 {mv:,}円", ""]
    return "\n".join(out) + "\n"


def write_report(db: Database, path: Path, **kw) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(build_report(db, **kw), encoding="utf-8")
    return path

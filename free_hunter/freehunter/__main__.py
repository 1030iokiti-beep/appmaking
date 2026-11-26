"""FREE HUNTER コマンド。 使い方: python -m freehunter <コマンド>

  init            DB を作成
  check-sources   情報源に接続できるか確認（保存しない）
  collect         情報を収集して保存
  score           全案件を再評価
  run             collect + score + AI 分析依頼ファイル出力（毎日の定期実行用）
  list            案件一覧を表示（--rank S など）
  add-url URL     1 ページを解析して登録
  applied ID      応募済みとして記録
  won ID          当選を記録（--value 円 --prize 賞品）
  hide ID         案件を非表示
  profile-set     応募用プロフィールを入力（暗号化保存）
  profile-show    プロフィールを伏せ字で表示
  fill ID         応募フォームに自動入力（送信は手動）
  ai-export       Claude Code 用の分析依頼ファイルを出力
  ai-import FILE  Claude Code の回答 JSON を取り込む
  dashboard       管理画面を起動
"""
from __future__ import annotations

import argparse
import getpass
import logging
import subprocess
import sys

from .config import BASE_DIR, load_settings
from .db import Database
from .logging_setup import setup_logging

log = logging.getLogger("freehunter.cli")


def _db(settings) -> Database:
    return Database(settings.db_path)


def cmd_init(a, s):
    _db(s).close()
    print(f"DB を作成しました: {s.db_path}")


def cmd_check_sources(a, s):
    from .collectors import COLLECTORS
    from .http_client import HttpClient
    from .pipeline import build_sources

    http = HttpClient.from_settings(s)
    for src in build_sources(s):
        try:
            items = COLLECTORS[src["kind"]](src, http, s).collect()
            print(f"OK   {src['name']}: {len(items)}件")
            for c in items[:3]:
                print(f"       - {c.title[:50]} | 締切 {c.deadline} | {c.winners}名")
        except Exception as e:  # noqa: BLE001
            print(f"NG   {src['name']}: {type(e).__name__}: {e}")


def cmd_collect(a, s):
    from .pipeline import run_collection
    db = _db(s)
    rep = run_collection(db, s)
    for r in rep:
        print(f"{r['source']}: 取得{r['fetched']} 新規{r['new']} 更新{r['updated']} {r['error'] or ''}")


def cmd_score(a, s):
    from .pipeline import rescore_all
    counts = rescore_all(_db(s), s)
    print("ランク別件数:", dict(sorted(counts.items())))


def cmd_run(a, s):
    from .ai_bridge import export_requests
    cmd_collect(a, s)
    cmd_score(a, s)
    p = export_requests(_db(s), s.data_dir / "ai_review")
    if p:
        print(f"Claude Code 用の分析依頼: {p}")


def cmd_list(a, s):
    db = _db(s)
    rows = [c for c in db.all_campaigns() if (not a.rank or c.get("rank") == a.rank)]
    order = {"S": 0, "A": 1, "B": 2, "C": 3, "除外": 9}
    rows.sort(key=lambda c: (order.get(c.get("rank"), 5), -(c.get("score") or 0)))
    for c in rows[: a.limit]:
        print(f"[{c.get('rank') or '-'}] {c.get('score') or 0:5.1f} id={c['id']:<5} 締切:{c.get('deadline') or '不明':10} "
              f"{(c.get('title') or '')[:40]}  {c.get('url')}")


def cmd_add_url(a, s):
    from .collectors.web_page import WebPageCollector
    from .http_client import HttpClient
    from .pipeline import rescore_all, save_campaigns
    src = {"name": "手動登録", "kind": "web_page", "url": a.url, "is_official": a.official,
           "use_browser": a.browser}
    items = WebPageCollector(src, HttpClient.from_settings(s), s).collect()
    db = _db(s)
    print("新規/更新:", save_campaigns(db, items))
    rescore_all(db, s)


def cmd_applied(a, s):
    db = _db(s)
    if not db.get_campaign(a.id):
        sys.exit(f"id={a.id} の案件がありません")
    db.record_application(a.id, note=a.note)
    print("応募済みとして記録しました")


def cmd_won(a, s):
    db = _db(s)
    c = db.get_campaign(a.id)
    if not c:
        sys.exit(f"id={a.id} の案件がありません")
    db.record_win(a.id, a.prize or c.get("prize"), a.value if a.value is not None else c.get("prize_value_yen"))
    print("当選を記録しました 🎉")


def cmd_hide(a, s):
    db = _db(s)
    db.update_campaign(a.id, {"hidden": 1})
    db.conn.commit()
    print("非表示にしました")


def cmd_profile_set(a, s):
    from .profile import PROFILE_FIELDS, ProfileStore
    store = ProfileStore(s.data_dir)
    cur = store.load()
    print("応募用プロフィールを入力します（Enter で現在の値を維持、'-' で削除）")
    print("※ データは暗号化して PC 内に保存し、外部には送信しません\n")
    for k, label in PROFILE_FIELDS.items():
        shown = ProfileStore.masked({k: cur[k]})[k] if k in cur else ""
        v = (getpass.getpass if k in ("phone",) and a.hide else input)(f"{label} [{shown}]: ").strip()
        if v == "-":
            cur.pop(k, None)
        elif v:
            cur[k] = v
    store.save(cur)
    print(f"保存しました: {store.path}")


def cmd_profile_show(a, s):
    from .profile import PROFILE_FIELDS, ProfileStore
    p = ProfileStore(s.data_dir).load()
    for k, v in ProfileStore.masked(p).items():
        print(f"{PROFILE_FIELDS.get(k, k)}: {v}")


def cmd_fill(a, s):
    from .form_assist import run_interactive
    from .profile import ProfileStore
    db = _db(s)
    c = db.get_campaign(a.id)
    if not c:
        sys.exit(f"id={a.id} の案件がありません")
    if db.is_applied(a.id):
        print("⚠ この案件は応募済みです（重複応募に注意）")
    profile = ProfileStore(s.data_dir).load()
    if not profile:
        sys.exit("プロフィール未登録です。先に `python -m freehunter profile-set` を実行してください")
    url = a.url or c.get("apply_url") or c["url"]
    res = run_interactive(url, profile, c)
    if res.get("applied"):
        db.record_application(a.id, method="web_form", note="フォーム入力支援")
        print("応募履歴に記録しました")


def cmd_ai_export(a, s):
    from .ai_bridge import export_requests
    p = export_requests(_db(s), s.data_dir / "ai_review", a.limit)
    print(f"出力: {p}" if p else "分析が必要な案件はありません")


def cmd_ai_import(a, s):
    from pathlib import Path

    from .ai_bridge import import_answers
    from .pipeline import rescore_all
    db = _db(s)
    n = import_answers(db, Path(a.file))
    rescore_all(db, s)
    print(f"{n}件の AI 分析結果を取り込みました")


def cmd_dashboard(a, s):
    subprocess.run([sys.executable, "-m", "streamlit", "run", str(BASE_DIR / "dashboard" / "app.py")], check=False)


def main(argv=None):
    p = argparse.ArgumentParser(prog="freehunter", description="FREE HUNTER 懸賞収集・分析・応募支援")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init").set_defaults(f=cmd_init)
    sub.add_parser("check-sources").set_defaults(f=cmd_check_sources)
    sub.add_parser("collect").set_defaults(f=cmd_collect)
    sub.add_parser("score").set_defaults(f=cmd_score)
    sub.add_parser("run").set_defaults(f=cmd_run)
    x = sub.add_parser("list"); x.add_argument("--rank"); x.add_argument("--limit", type=int, default=50); x.set_defaults(f=cmd_list)
    x = sub.add_parser("add-url"); x.add_argument("url"); x.add_argument("--official", action="store_true")
    x.add_argument("--browser", action="store_true", help="JS 描画ページを Playwright で取得"); x.set_defaults(f=cmd_add_url)
    x = sub.add_parser("applied"); x.add_argument("id", type=int); x.add_argument("--note"); x.set_defaults(f=cmd_applied)
    x = sub.add_parser("won"); x.add_argument("id", type=int); x.add_argument("--value", type=int)
    x.add_argument("--prize"); x.set_defaults(f=cmd_won)
    x = sub.add_parser("hide"); x.add_argument("id", type=int); x.set_defaults(f=cmd_hide)
    x = sub.add_parser("profile-set"); x.add_argument("--hide", action="store_true"); x.set_defaults(f=cmd_profile_set)
    sub.add_parser("profile-show").set_defaults(f=cmd_profile_show)
    x = sub.add_parser("fill"); x.add_argument("id", type=int); x.add_argument("--url"); x.set_defaults(f=cmd_fill)
    x = sub.add_parser("ai-export"); x.add_argument("--limit", type=int, default=30); x.set_defaults(f=cmd_ai_export)
    x = sub.add_parser("ai-import"); x.add_argument("file"); x.set_defaults(f=cmd_ai_import)
    sub.add_parser("dashboard").set_defaults(f=cmd_dashboard)
    a = p.parse_args(argv)
    s = load_settings()
    setup_logging(s.log_dir)
    try:
        a.f(a, s)
    except KeyboardInterrupt:
        print("\n中断しました")
    except Exception:
        log.exception("コマンド %s でエラー", a.cmd)
        sys.exit(1)


if __name__ == "__main__":
    main()

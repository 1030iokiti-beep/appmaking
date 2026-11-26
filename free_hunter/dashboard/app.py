"""FREE HUNTER 管理画面（Streamlit）
起動: python -m freehunter dashboard  または  streamlit run dashboard/app.py
"""
from __future__ import annotations

import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from freehunter.config import load_settings  # noqa: E402
from freehunter.db import Database  # noqa: E402
from freehunter.logging_setup import setup_logging  # noqa: E402
from freehunter.status import STATUS_LABELS  # noqa: E402

st.set_page_config(page_title="FREE HUNTER", page_icon="🎁", layout="wide")

settings = load_settings()
setup_logging(settings.log_dir)
RANK_ORDER = {"S": 0, "A": 1, "B": 2, "C": 3, "除外": 9}
METHOD_LABELS = {"web_form": "Webフォーム", "sns": "SNS", "receipt": "レシート", "postcard": "はがき", "line": "LINE"}


@st.cache_resource
def get_db() -> Database:
    return Database(settings.db_path)


db = get_db()


def load_df() -> pd.DataFrame:
    rows = db.all_campaigns()
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    df["rank_order"] = df["rank"].map(RANK_ORDER).fillna(5)
    df["deadline_dt"] = pd.to_datetime(df["deadline"], errors="coerce")
    df["days_left"] = (df["deadline_dt"] - pd.Timestamp(date.today())).dt.days
    df["first_seen_dt"] = pd.to_datetime(df["first_seen"], errors="coerce")
    df["状態"] = df["status"].map(STATUS_LABELS).fillna("-")
    df["応募方法"] = df["method"].map(METHOD_LABELS).fillna("不明")
    df["価値"] = df.apply(lambda r: (f"約{int(r.prize_value_yen):,}円(推定)" if r.prize_value_estimated else
                                     f"{int(r.prize_value_yen):,}円") if pd.notna(r.prize_value_yen) else "不明", axis=1)
    df["当選数"] = df["winners"].apply(lambda v: f"{int(v):,}名" if pd.notna(v) else "不明")
    for col in ("company", "prize", "genre", "deadline"):
        df[col] = df[col].fillna("")
    df["公式"] = df["is_official"].map({1: "✔", 0: ""})
    return df


# ───── サイドバー ─────
st.sidebar.title("🎁 FREE HUNTER")
st.sidebar.caption("懸賞情報 収集・分析・応募支援")
if st.sidebar.button("今すぐ収集を実行", help="config/sources.toml の情報源から収集します（数分かかります）"):
    from freehunter.pipeline import rescore_all, run_collection
    with st.spinner("収集中..."):
        rep = run_collection(db, settings)
        rescore_all(db, settings)
    st.sidebar.success("完了")
    st.sidebar.dataframe(pd.DataFrame(rep), hide_index=True)
if st.sidebar.button("再評価のみ"):
    from freehunter.pipeline import rescore_all
    rescore_all(db, settings)
    st.sidebar.success("再評価しました")

with st.sidebar.expander("URL を手動で追加"):
    url = st.text_input("キャンペーンページの URL")
    official = st.checkbox("企業公式ページ")
    if st.button("解析して追加") and url:
        from freehunter.collectors.web_page import WebPageCollector
        from freehunter.http_client import HttpClient
        from freehunter.pipeline import rescore_all, save_campaigns
        try:
            items = WebPageCollector({"name": "手動登録", "kind": "web_page", "url": url, "is_official": official},
                                     HttpClient.from_settings(settings), settings).collect()
            save_campaigns(db, items)
            rescore_all(db, settings)
            st.success("追加しました")
        except Exception as e:  # noqa: BLE001
            st.error(f"取得できませんでした: {e}")

df = load_df()
apps = pd.DataFrame(db.applications())
wins = pd.DataFrame(db.wins())

# ───── KPI ─────
st.title("ダッシュボード")
soon_days = settings.get("scoring", "deadline_soon_days", 3)
if df.empty:
    st.info("まだ案件がありません。左の「今すぐ収集を実行」を押すか、`python -m freehunter run` を実行してください。")
    st.stop()

active = df[df["rank"].isin(["S", "A", "B", "C"])]
new_24h = (df["first_seen_dt"] >= pd.Timestamp(datetime.now() - timedelta(days=1))).sum()
soon = active[(active["days_left"] >= 0) & (active["days_left"] <= soon_days)]
month_start = date.today().replace(day=1).isoformat()
month_value = int(wins[wins["won_at"] >= month_start]["value_yen"].fillna(0).sum()) if not wins.empty else 0

c = st.columns(4)
c[0].metric("新着（24時間）", f"{new_24h}件")
c[1].metric("応募可能", f"{len(active)}件")
c[2].metric("Sランク", f"{(active['rank'] == 'S').sum()}件")
c[3].metric(f"締切間近（{soon_days}日以内）", f"{len(soon)}件")
c = st.columns(4)
c[0].metric("応募済み", f"{len(apps)}件")
c[1].metric("当選", f"{len(wins)}件")
c[2].metric("今月の獲得賞品価値", f"{month_value:,}円")
c[3].metric("登録案件（全体）", f"{len(df)}件")

LIST_COLS = {"id": "ID", "rank": "ランク", "score": "スコア", "title": "キャンペーン", "company": "企業",
             "prize": "賞品", "価値": "価値", "当選数": "当選数", "deadline": "締切", "days_left": "残日数",
             "応募方法": "応募方法", "est_minutes": "所要(分)", "公式": "公式", "genre": "ジャンル",
             "状態": "状態", "source_name": "情報源", "apply_url": "応募URL"}
COL_CFG = {
    "応募URL": st.column_config.LinkColumn("応募URL", display_text="開く ↗"),
    "スコア": st.column_config.ProgressColumn("スコア", min_value=0, max_value=100, format="%.0f"),
}


def show_table(d: pd.DataFrame, key: str):
    d = d.sort_values(["rank_order", "score"], ascending=[True, False])
    st.dataframe(d[list(LIST_COLS)].rename(columns=LIST_COLS), hide_index=True, use_container_width=True,
                 column_config=COL_CFG, key=key)


tabs = st.tabs(["案件一覧", "締切間近", "案件の詳細・操作", "ジャンル別", "応募履歴", "当選履歴", "収集ログ"])

with tabs[0]:
    f = st.columns([1, 1, 2, 1])
    ranks = f[0].multiselect("ランク", ["S", "A", "B", "C", "除外"], default=["S", "A", "B"])
    genres = f[1].multiselect("ジャンル", sorted(df["genre"].dropna().unique()))
    q = f[2].text_input("キーワード検索（タイトル・賞品・企業）")
    only_official = f[3].checkbox("公式のみ")
    d = df[df["rank"].isin(ranks)] if ranks else df
    if genres:
        d = d[d["genre"].isin(genres)]
    if q:
        m = d["title"].str.contains(q, na=False) | d["prize"].str.contains(q, na=False) | d["company"].str.contains(q, na=False)
        d = d[m]
    if only_official:
        d = d[d["is_official"] == 1]
    st.caption(f"{len(d)}件 ／ ※当選確率は応募者数が非公開のため表示していません。「推定」は賞品名からの目安です。")
    show_table(d, "all")

with tabs[1]:
    st.caption(f"応募可能な案件のうち、締切まで {soon_days} 日以内")
    show_table(soon, "soon") if not soon.empty else st.write("該当なし")

with tabs[2]:
    options = df.sort_values(["rank_order", "score"], ascending=[True, False])
    sel = st.selectbox("案件を選択", options["id"].tolist(),
                       format_func=lambda i: f"[{df.loc[df.id == i, 'rank'].iat[0]}] {df.loc[df.id == i, 'title'].iat[0][:60]}")
    if sel:
        cmp = db.get_campaign(int(sel))
        l, r = st.columns([3, 2])
        with l:
            st.subheader(cmp["title"])
            st.markdown(f"**企業**: {cmp.get('company') or '不明'}　**賞品**: {cmp.get('prize') or '不明'}")
            st.markdown(f"**締切**: {cmp.get('deadline') or '不明'}　**開始**: {cmp.get('start_date') or '不明'}"
                        f"　**当選数**: {cmp.get('winners') or '不明'}")
            st.markdown(f"**応募URL**: [{cmp.get('apply_url')}]({cmp.get('apply_url')})")
            st.markdown("**評価の内訳**")
            for line in cmp.get("reasons") or []:
                st.write("・" + line)
            if cmp.get("ai_note"):
                st.info(f"Claude Code の分析メモ: {cmp['ai_note']}")
            if cmp.get("conditions_text"):
                st.markdown("**応募条件（抜粋）**")
                st.text(cmp["conditions_text"])
            with st.expander("取得した本文"):
                st.text(cmp.get("raw_text") or "")
        with r:
            st.markdown(f"### ランク {cmp.get('rank')}（{cmp.get('score')}点）")
            bd = cmp.get("score_breakdown") or {}
            if bd:
                labels = {"winners": "当選人数", "value": "賞品価値", "time": "所要時間", "difficulty": "難易度",
                          "deadline": "締切", "cost": "購入/有料", "reliability": "信頼性"}
                st.bar_chart(pd.Series({labels.get(k, k): v for k, v in bd.items()}))
            st.markdown("---")
            if db.is_applied(cmp["id"]):
                st.success("応募済み")
            elif st.button("応募済みにする", key=f"ap{sel}"):
                db.record_application(cmp["id"], note="管理画面から記録")
                st.rerun()
            with st.form(f"win{sel}"):
                st.write("当選を記録")
                val = st.number_input("賞品価値（円）", min_value=0, value=int(cmp.get("prize_value_yen") or 0), step=100)
                if st.form_submit_button("当選を記録"):
                    db.record_win(cmp["id"], cmp.get("prize"), int(val))
                    st.rerun()
            if st.button("この案件を非表示", key=f"hd{sel}"):
                db.update_campaign(cmp["id"], {"hidden": 1})
                db.conn.commit()
                st.rerun()
            st.caption(f"フォーム自動入力: `python -m freehunter fill {cmp['id']}`（送信は手動）")

with tabs[3]:
    g = active.groupby("genre").size().sort_values(ascending=False).rename("件数")
    st.bar_chart(g)
    st.dataframe(g, use_container_width=True)

with tabs[4]:
    st.dataframe(apps, hide_index=True, use_container_width=True) if not apps.empty else st.write("応募履歴はまだありません")

with tabs[5]:
    if wins.empty:
        st.write("当選履歴はまだありません")
    else:
        w = wins.copy()
        w["月"] = w["won_at"].str[:7]
        st.bar_chart(w.groupby("月")["value_yen"].sum().rename("獲得賞品価値(円)"))
        st.dataframe(w, hide_index=True, use_container_width=True)

with tabs[6]:
    st.dataframe(pd.DataFrame(db.recent_runs()), hide_index=True, use_container_width=True)

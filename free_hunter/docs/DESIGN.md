# FREE HUNTER システム設計書

懸賞情報を毎日自動で集め、応募価値を採点し、応募作業（フォーム入力まで）を支援する Windows 向けローカルシステム。
ポイ活機能は対象外。

---

## 1. システム全体の設計

```
 ┌──────────── 情報源 ────────────┐
 │ 懸賞専門サイト (RSS / 一覧ページ)   │
 │ 企業公式キャンペーンサイト / HP     │──┐
 │ その他の公開Webページ              │  │  HTTP (requests)
 │                                    │  │  ※robots.txt 確認・間隔制御・リトライ
 └────────────────────────────────┘  │
                                       ▼
 ┌──────────────────── collectors/ ────────────────────┐
 │ 情報源ごとに独立したモジュール。共通の Campaign 型を返す │
 └──────────────────────────┬──────────────────────────┘
                            ▼
 extract.py   … 日本語テキストから締切・当選人数・賞品・価値・条件・応募方法を抽出（正規表現）
 normalize.py … URL 正規化（utm 等の除去・ホスト小文字化・末尾 / 統一）
 dedup.py     … URL 一致 + 企業名×タイトル類似度による重複判定
 status.py    … 締切切れ・募集終了の判定
 genres.py    … ジャンル分類（キーワード辞書）
 scoring.py   … 8 項目を点数化 → 総合スコア → S/A/B/C/除外
                            ▼
 db.py (SQLite: data/freehunter.db) … 案件・応募履歴・当選履歴・収集ログ
                            ▼
 ┌──────────────┬─────────────────┬────────────────────┐
 │ dashboard/   │ form_assist.py   │ ai_bridge.py        │
 │ Streamlit    │ Playwright で     │ Claude Code 用の     │
 │ 管理画面      │ 入力のみ（送信なし）│ 分析依頼ファイル出力   │
 └──────────────┴─────────────────┴────────────────────┘
                            ▲
 scheduler: Windows タスクスケジューラ → scripts\run_daily.bat → python -m freehunter run
```

### AI（Claude Code）の使い方
- 通常の収集・分類・重複判定・採点は **すべて Python のルールで処理**（API 料金ゼロ）。
- ルールで判断しにくい案件（信頼性が低い・条件が読み取れない等）だけを
  `python -m freehunter ai-export` で `data/ai_review/request_YYYYMMDD.md` に書き出す。
- 利用者が Claude Code で「このファイルを分析して」と依頼 → Claude Code が回答 JSON を作成 →
  `python -m freehunter ai-import <file>` で DB にメモ・補正ランクを取り込む。
- Claude API を自動で呼び出す処理は **実装していない**。

### 安全設計
- 応募の **自動送信は実装しない**。フォーム入力後は必ずブラウザを開いたまま人が確認して送信する。
- CAPTCHA 突破・本人確認回避・複数アカウント・ログイン自動化は実装しない。
- 個人情報は `cryptography` (Fernet / AES) で暗号化し `data/profile.enc` に保存。鍵は `data/secret.key`（外部送信しない）。
- 個人情報はフォーム入力時にのみ、利用者が開いたページへ、利用者の確認後に入力される。

### VPS 移行を見据えた設計
- パスはすべて `config/settings.toml` と環境変数で切替。OS 固有処理は `scripts/` のみ。
- 収集・採点は GUI 不要（ヘッドレス）。Linux VPS では cron で `python -m freehunter run` を叩くだけ。
- DB は SQLite 1 ファイル。移行はファイルコピーのみ。

---

## 2. フォルダ構成

```
free_hunter/
├─ README.md                 使い方（初心者向け）
├─ requirements.txt
├─ config/
│   ├─ settings.example.toml  動作設定（コピーして settings.toml に）
│   └─ sources.toml           情報源リスト（URL・CSS セレクタを編集するだけで追加可）
├─ freehunter/               本体パッケージ
│   ├─ __main__.py            CLI
│   ├─ config.py / logging_setup.py / models.py
│   ├─ http_client.py         取得処理（robots.txt・間隔・リトライ）
│   ├─ collectors/            情報源別モジュール
│   │   ├─ base.py
│   │   ├─ rss.py             RSS/Atom 汎用
│   │   ├─ prize_sites.py     懸賞専門サイト一覧ページ（セレクタ設定）
│   │   ├─ official.py        企業公式サイト（キャンペーンリンク探索）
│   │   └─ web_page.py        単一の公開 Web ページ
│   ├─ extract.py / normalize.py / dedup.py / status.py / genres.py
│   ├─ scoring.py             評価エンジン
│   ├─ db.py                  SQLite
│   ├─ crypto.py / profile.py 個人情報の暗号化保存
│   ├─ form_assist.py         応募フォーム入力支援
│   ├─ ai_bridge.py           Claude Code 連携ファイル入出力
│   └─ pipeline.py            収集→評価→保存の一連処理
├─ dashboard/app.py          Streamlit 管理画面
├─ scripts/                  Windows 用 bat / PowerShell
├─ tests/                    pytest（オフラインで動く）
├─ data/   (git 管理外)       DB・暗号化プロフィール・鍵
└─ logs/   (git 管理外)       日別ログ
```

## 3. 必要ライブラリ（すべて無料・OSS）

| ライブラリ | 用途 |
|---|---|
| requests | HTTP 取得 |
| beautifulsoup4 + lxml | HTML / RSS 解析 |
| pandas | 集計・管理画面の表 |
| streamlit | 管理画面 |
| playwright | フォーム入力支援・JS 描画ページの取得（任意） |
| cryptography | 個人情報の暗号化 |
| pytest | テスト |

標準ライブラリ: sqlite3, tomllib, logging, difflib, urllib.robotparser, argparse。

## 4. 外部サービスなしで実現できる機能
- 懸賞サイト・企業サイト・公開 Web ページの収集（RSS / HTML）
- 項目抽出、URL 正規化、重複排除、終了判定、ジャンル分類、採点・ランク付け
- SQLite 保存、応募・当選履歴、管理画面、月間獲得額
- 個人情報の暗号化保存、フォーム自動入力（送信は手動）
- Windows タスクスケジューラによる定期実行
- Claude Code による高度分析（ファイル経由・API 料金なし ※Claude Code の契約範囲内）

## 5. API が必要になる可能性がある機能
| 機能 | 必要なもの | 費用 |
|---|---|---|
| AI 自動分析の完全自動化 | Claude API | 従量課金（本システムでは未使用） |

## 6. 各情報源の収集方法と制約

| 情報源 | 方法 | 制約 |
|---|---|---|
| 懸賞専門サイト | RSS があれば RSS、無ければ一覧ページを CSS セレクタで解析 | 各サイトの利用規約・robots.txt に従う。サイト改修でセレクタ修正が必要 |
| 企業公式キャンペーンサイト | 指定 URL を取得し本文から項目抽出 | JS 描画のサイトは Playwright 取得（任意設定） |
| 企業公式 HP | トップ/ニュースページから「キャンペーン」「プレゼント」を含むリンクを抽出 | 企業ごとに URL を設定に登録する必要あり |
| その他の公開 Web | URL 指定で単一ページ解析 | 同上 |

X / Instagram は対象外（コード削除済み）。SNS 発のキャンペーンも多くは懸賞専門サイトに掲載されるため、懸賞サイト経由で拾う。

## 7. 開発工程
STEP 1〜12 の順で実装。各 STEP の確認内容は README の「実装状況」に記載。

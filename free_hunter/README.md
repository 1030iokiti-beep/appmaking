# 🎁 FREE HUNTER

懸賞情報を自動で集め、応募価値を採点し、応募作業（フォーム入力まで）を支援する Windows 向けローカルシステムです。
ポイ活機能は含みません。設計の詳細は [docs/DESIGN.md](docs/DESIGN.md) を参照してください。

- 有料サービス・有料 API は不要です
- データはすべて PC 内（`data/`）に保存されます。個人情報は暗号化して保存します
- **応募の送信は自動で行いません**。フォームへの入力までを自動化し、送信はご自身で行います

---

## スマホだけで使う（パソコン不要・おすすめ）

GitHub Actions（無料）が毎朝 6:41 に自動で収集し、結果を **`freehunter-data` ブランチの一覧ページ** に保存します。

1. **見る**: GitHub アプリ（またはブラウザ）でこのリポジトリを開き、ブランチを `freehunter-data` に切り替えます。
   一覧が表示され、キャンペーン名をタップすると応募ページが開きます。ホーム画面にブックマークしておくと便利です
2. **応募する**: リンク先で条件・規約を確認し、スマホのブラウザで応募します（住所などはブラウザの自動入力が使えます）
3. **今すぐ収集したい**: Actions → 「FREE HUNTER 懸賞収集」→ Run workflow
4. **記録する**: Actions → 「FREE HUNTER 記録」→ Run workflow → 応募した(applied)/当選(won)/非表示(hide) と一覧の ID を入力
5. **応募資格の設定**: Settings → Secrets and variables → Actions → Variables に
   `FH_PROFILE_PREFECTURE`（例: 大阪府）と `FH_PROFILE_AGE`（例: 30）を登録

> ⚠ **リポジトリが公開（public）の場合**、一覧とデータは誰でも見られます。懸賞情報そのものは公開情報なので問題ありませんが、
> 応募・当選の記録は個人の情報になるため、**公開リポジトリでは記録しない**ようにしています（非表示のみ可）。
> 記録も使いたい場合は、リポジトリを非公開（private）にしてください。非公開でも個人アカウントなら月 2,000 分まで無料で、
> 1 回の収集は約 10 分です。

---

## はじめかた（Windows）

1. Python 3.11 以上をインストールします（インストール時に「Add Python to PATH」にチェック）
2. `scripts\setup.bat` をダブルクリックします（ライブラリとブラウザが入ります）
3. `config\settings.toml` を開き、`[profile]` の都道府県・年齢を自分に合わせます（応募資格の判定に使います）
4. コマンドプロンプトで情報源の接続を確認します
   ```bat
   cd free_hunter
   .venv\Scripts\activate
   python -m freehunter check-sources
   ```
5. `scripts\run_daily.bat` で収集し、`scripts\dashboard.bat` で管理画面を開きます
6. 毎日自動で実行するには、PowerShell で次を実行します（7時と19時に実行）
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\register_task.ps1 -Times "07:00","19:00"
   ```

## よく使うコマンド

| やりたいこと | コマンド |
|---|---|
| 収集＋評価（毎日の処理） | `python -m freehunter run` |
| 一覧を見る（S ランクだけ） | `python -m freehunter list --rank S` |
| 気になる URL を追加 | `python -m freehunter add-url https://... [--official] [--browser]` |
| 応募用プロフィールを登録（暗号化） | `python -m freehunter profile-set` |
| フォームに自動入力（送信は手動） | `python -m freehunter fill <ID>` |
| 応募済み / 当選を記録 | `python -m freehunter applied <ID>` / `won <ID> --value 3000` |
| 管理画面 | `python -m freehunter dashboard` |
| スマホ用一覧を出力 | `python -m freehunter report --out data\report.md` |
| Claude Code 用の分析依頼ファイル | `python -m freehunter ai-export` |
| Claude Code の回答を取り込む | `python -m freehunter ai-import data\ai_review\answer_YYYYMMDD.json` |

### 情報源を追加する
`config\sources.toml` に `[[source]]` を追加するだけです。書き方はファイル内のコメントにあります。
サイトの HTML が変わって 0 件になった場合は、ログ（`logs\`）に警告が出ます。

### Claude Code の使い方（API 料金なし）
1. `python -m freehunter ai-export` を実行すると、判断が難しい案件だけが `data\ai_review\request_日付.md` に書き出されます
2. Claude Code に「data/ai_review/request_日付.md を読んで、指示どおりに回答 JSON を作って」と依頼します
3. `python -m freehunter ai-import <回答JSON>` で取り込むと、管理画面にメモと補正ランクが表示されます

## 評価のしくみ

| 項目 | 重み | 内容 |
|---|---|---|
| 当選人数 | 20% | 多いほど高評価（対数スケール）。「もれなく」は満点。記載なしは中間点 |
| 賞品価値 | 20% | 「○円相当」の記載値を優先。記載が無ければ賞品名から推定し、15% 減点のうえ「推定」と表示 |
| 所要時間 | 15% | 応募方法から目安時間を算出（フォロー＆リポスト ≒ 1 分、はがき ≒ 15 分 など） |
| 購入・有料登録 | 15% | 購入やレシートが必要なら減点。有料登録が必要なら設定により除外 |
| 信頼性 | 15% | 公式サイトかどうか、企業名・締切・賞品が分かるか |
| 難易度 | 10% | ハッシュタグ投稿・コメント・クイズ・はがきなどで減点 |
| 締切 | 5% | 締切までの日数 |
| 応募資格 | 判定 | 年齢・居住地が合わなければ除外 |

ランク: **S** 75 点以上 / **A** 60 点以上 / **B** 45 点以上 / **C** それ未満 / **除外**（終了・締切切れ・応募済み・資格不一致・有料登録・情報が不確実）。
境界は `settings.toml` の `[scoring]` で変更できます。
**当選確率は応募者数が公開されないため算出・表示しません。**

---

## 実装状況

| STEP | 内容 | 状態 | 確認方法 |
|---|---|---|---|
| 1 | システム設計 | ✅ | docs/DESIGN.md |
| 2 | フォルダ構成 | ✅ | |
| 3 | ライブラリ | ✅ | requirements.txt / setup.bat |
| 4 | Web 懸賞情報収集（RSS・一覧ページ・単一ページ） | ✅ | ローカル HTTP サーバーで取得→抽出をテスト |
| 5 | 企業公式サイト収集 | ✅ | 同上（一覧→詳細→終了判定） |
| 6 | X / Instagram | ❌ 対象外 | 不要と判断し削除（下記） |
| 7 | 重複排除・分類 | ✅ | URL 正規化・類似タイトル判定・ジャンル分類をテスト |
| 8 | 評価エンジン | ✅ | ランク・除外理由をテスト |
| 9 | SQLite 管理 | ✅ | 2 回目の収集で新規 0・更新のみになることを確認 |
| 10 | 管理画面 | ✅ | Streamlit で表示確認 |
| 11 | フォーム入力支援 | ✅（送信は手動） | 実ブラウザでフォームに入力し、送信・同意チェックがされないことをテスト |
| 12 | 定期実行 | ✅ | GitHub Actions（スマホ運用）／タスクスケジューラ（PC 運用・Windows 実機では未実行） |

テスト: `python -m pytest`（31 件・ネット接続不要）

### 実在サイトでの確認結果（2026-11-26）
| 情報源 | 結果 |
|---|---|
| Koubo（公募ガイド）食品・金券・旅行・その他 | ✔ 約110件（カテゴリ間の重複は自動で統合）。詳細ページから主催者・賞品・当選数・主催者の応募ページを取得 |
| キリン | ✔ 公式ページが使う公開データから受付中の15件。締切・購入要否・20歳以上の条件が正確 |
| 明治 / 森永製菓 / カゴメ | ✔ 公式キャンペーン一覧から取得 |
| チャンスイット / サントリー | ✘ 自動アクセスを拒否されるため対象外（ブロックの回避はしません） |
| モニプラ | ✘ サイトに接続できず（サービス終了の可能性） |
| アサヒビール | ✘ 一覧が JavaScript 描画。`use_browser = true` で要検証のため無効 |

### 未検証・未実装（正直な報告）
- GitHub Actions での自動実行は、ワークフローが既定ブランチ（main）に入るまで動きません。データ保存スクリプトは手元で動作確認済みですが、GitHub 上での実行はまだです
- **X / Instagram**: 対象外としてコードを削除しました。SNS 発のキャンペーンも多くは懸賞サイトに掲載されるため、懸賞サイト経由で拾えます
- **応募の自動送信**: 未実装（意図的）。規約で自動応募が許可されているかを機械的に確認する方法がないためです
- **CAPTCHA 突破・ログイン自動化・同意チェックの自動化・複数アカウント応募**: 実装しません
- 項目抽出は正規表現によるルールベースです。サイトによっては締切・当選人数を読み取れないことがあり、その場合は「不明」と表示されます

## VPS（24時間稼働）へ移行する場合
- フォルダごとコピーし、`python -m venv .venv && pip install -r requirements.txt`
- `crontab` に `0 7,19 * * * /path/free_hunter/scripts/run_daily.sh` を登録
- 環境変数 `FH_HOME`（フォルダの場所）、`FH_DB`（DB の場所）、`FH_SECRET_KEY`（暗号鍵）で設定を切り替えられます
- 個人情報（`data/profile.enc`・`data/secret.key`）は VPS に置かず、フォーム入力は手元の PC で行うことをおすすめします

## 注意
- 各サイトの利用規約と robots.txt を守ってください（robots.txt で禁止された URL は自動でスキップします）
- アクセス間隔は既定で同一サイト 3 秒以上です。短くしすぎないでください
- `data\secret.key` を失うと暗号化したプロフィールは読めなくなります。鍵とプロフィールは別々にバックアップしてください

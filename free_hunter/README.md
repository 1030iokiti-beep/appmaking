# 🎁 FREE HUNTER

懸賞情報を自動で集め、応募価値を採点し、応募作業（フォーム入力まで）を支援する Windows 向けローカルシステムです。
ポイ活機能は含みません。設計の詳細は [docs/DESIGN.md](docs/DESIGN.md) を参照してください。

- 有料サービス・有料 API は不要です（X / Instagram の API を使う場合のみ、ご自身で申請が必要です）
- データはすべて PC 内（`data/`）に保存されます。個人情報は暗号化して保存します
- **応募の送信は自動で行いません**。フォームへの入力までを自動化し、送信はご自身で行います

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
| 6 | X / Instagram | ⚠ API 経由のみ実装 | API キーが無いため実通信は未検証（下記） |
| 7 | 重複排除・分類 | ✅ | URL 正規化・類似タイトル判定・ジャンル分類をテスト |
| 8 | 評価エンジン | ✅ | ランク・除外理由をテスト |
| 9 | SQLite 管理 | ✅ | 2 回目の収集で新規 0・更新のみになることを確認 |
| 10 | 管理画面 | ✅ | Streamlit で表示確認 |
| 11 | フォーム入力支援 | ✅（送信は手動） | 実ブラウザでフォームに入力し、送信・同意チェックがされないことをテスト |
| 12 | 定期実行 | ✅ | タスクスケジューラ登録スクリプト（Windows 実機では未実行） |

テスト: `python -m pytest`（25 件・ネット接続不要）

### 未検証・未実装（正直な報告）
- **実在サイトからの取得は開発環境で未確認です。** 開発環境のネットワーク制限により、`sources.toml` に入れた懸賞サイト・企業サイトに接続できませんでした。初回に `python -m freehunter check-sources` で確認し、0 件や NG のサイトがあれば、そのサイトの `selectors` 設定か `use_browser = true` が必要です
- **X**: 公式 API v2 の検索を実装済み。ただし検索 API は X の有料プランが必要になる可能性が高く、契約していないため動作未確認。ログイン画面のスクレイピングは規約違反のため実装しません
- **Instagram**: Graph API のハッシュタグ検索を実装済み。ビジネスアカウントと Meta アプリの準備が必要で、動作未確認。スクレイピングは実装しません
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

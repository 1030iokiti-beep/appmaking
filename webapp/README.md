# こいまち Web — AIマッチング × 位置情報 × スワイプ

Next.js・TypeScript・Tailwind CSS・Supabase で作った、実際に登録・利用できるマッチング Web アプリです。
スマートフォン優先のレスポンシブ設計で、PC ではサイドナビのレイアウトになります。

| | |
|---|---|
| フロントエンド | Next.js 16（App Router）/ React 19 / TypeScript / Tailwind CSS 4 / Motion |
| バックエンド | Next.js（Server Actions・Route Handlers・proxy.ts） |
| DB・認証・画像・リアルタイム | Supabase（PostgreSQL + RLS / Auth / Storage / Realtime） |
| テスト | SQL テスト（RLS・業務ルール 55項目）/ Playwright E2E（6シナリオ） |

## 主な機能

**このアプリならではの3つの軸**
- **AIマッチング**：恋愛タイプ診断（16タイプ）30%・価値観 20%・趣味 15%・距離 15%・アクティブ度 10%・**あなたの「いいね」傾向の学習** 10% で相性スコアを算出。カードに「価値観が5つ一致」「共通の趣味：カフェ・映画」など**おすすめの理由**を表示
- **位置情報**：ブラウザの現在地を**約1km単位に丸めて保存**。他のユーザーには「約3km」などの目安しか返さず、座標は一切外に出ない
- **スワイプ**：ドラッグ／ボタン／キーボード（← →）で操作。LIKE/NOPE 表示・ひとつ戻す・マッチング成立演出

**ユーザー機能**：メール＋パスワードでの登録（メール確認あり）・ログイン・ログアウト・パスワード再設定 / プロフィール作成・編集 / 写真6枚まで（並べ替え・削除） / 年齢・居住地・距離・趣味・恋愛タイプ・本人確認済みでの検索と並べ替え / おすすめ表示 / いいねの送信・取り消し / 相互いいねでマッチング / マッチング一覧・解除 / リアルタイムチャット・画像送信・既読表示 / いいね・マッチング・メッセージ通知（リアルタイム・バッジ） / マイページ・設定（メール・パスワード変更、非表示、ブロック解除）・退会

**安全機能**：ブロック・通報 / 年齢確認（書類提出 → 管理者が審査。承認されるまでメッセージ不可） / 禁止ワード（連絡先・電話番号・メールアドレス・援助交際・未成年を示す語など）をDB側で拒否 / 写真はブラウザで再エンコードして**位置情報などのメタデータを削除** / 画像の種類・サイズ制限 / 不適切画像の管理者審査 / 全バケット非公開＋署名付きURL

**管理者機能**：管理者専用ログイン / ダッシュボード（登録者数・アクティブ・マッチング数・通報・審査待ちなど） / 日別の推移グラフ（7・30・90日、表表示あり） / 性別・年代・地域の構成 / ユーザー検索・詳細・利用停止・再開・削除・プレミアム付与 / 通報管理 / 年齢確認の審査 / 画像審査 / 操作の監査ログ

## セットアップ（ローカル）

必要なもの：Node.js 20 以上、Docker（Supabase をローカルで動かすため）

```bash
cd webapp
npm install

# 1. Supabase をローカルで起動（初回はイメージのダウンロードに数分かかります）
npx supabase start
#    → 表示された API URL / Publishable key / Secret key を確認

# 2. 環境変数
cp .env.example .env.local   # 1 の値を書き込む

# 3. DB を作成（supabase/migrations を適用）してデモデータを投入
npx supabase db reset
npm run seed

# 4. 起動
npm run dev                  # http://localhost:3000
```

| アカウント | メール / パスワード | 入口 |
|---|---|---|
| 一般ユーザー（デモ） | `demo@example.com` / `Demo12345` | http://localhost:3000/login |
| 管理者 | `admin@example.com` / `Admin12345` | http://localhost:3000/admin/login |
| その他デモユーザー | `f1〜f20@example.com`・`m1〜m16@example.com` / `Demo12345` | |

新規登録の確認メール・パスワード再設定メールは、ローカルでは **Mailpit（http://127.0.0.1:54324）** に届きます。
位置情報（`navigator.geolocation`）は `localhost` か HTTPS でのみ動作します。

### テスト

```bash
npm run db:test     # RLS・業務ルールの SQL テスト（ロールバックするのでデータは残りません）
npm run typecheck
npm run lint
npm run build && npx playwright install chromium && npm run test:e2e   # E2E（seed 済みの状態で実行）
```

E2E はデータを変更するので、もう一度実行するときは先に `npm run seed` を実行してください。

## 本番環境へのデプロイ

1. [Supabase](https://supabase.com) でプロジェクトを作成（リージョン：Tokyo）
2. `npx supabase link --project-ref <ID>` → `npx supabase db push` でスキーマを適用
3. Authentication → URL Configuration の Site URL / Redirect URLs に本番URL（`https://your-domain/**`）を設定。メールテンプレートを日本語化し、独自の SMTP を設定
4. Vercel などに `webapp` をデプロイし、環境変数（`.env.example` の4つ）を設定。**`SUPABASE_SECRET_KEY` はサーバー専用**
5. 管理者を登録：SQL Editor で `insert into admin_users (user_id) select id from auth.users where email = '...';`
6. **`npm run seed` は本番では実行しない**（ローカル以外では実行できないようにしてあります）

## ディレクトリ構成

```
webapp/
├─ supabase/
│  ├─ migrations/          DB スキーマ・RLS・関数・トリガー・Storage・権限
│  │   ├─ …0001_core.sql                 テーブル・RLS・保護トリガー
│  │   ├─ …0002_interactions.sql         いいね／マッチ／メッセージ／ブロック／通知
│  │   ├─ …0003_matching_ai.sql          AI相性スコア・おすすめ・検索・一覧取得
│  │   └─ …0004_admin_storage_security.sql 管理者関数・Storage・Realtime・権限
│  └─ tests/security.test.sql  RLS・業務ルールのテスト
├─ src/
│  ├─ proxy.ts             セッション更新・未ログイン時のリダイレクト
│  ├─ app/
│  │  ├─ (public)/         トップ・利用規約・プライバシー・安全ガイド
│  │  ├─ (auth)/           ログイン・新規登録・パスワード再設定（Server Actions）
│  │  ├─ (setup)/          初回プロフィール作成（6ステップ）・利用停止画面
│  │  ├─ (app)/            ホーム（スワイプ）・さがす・ユーザー詳細・いいね・マッチング
│  │  │                    メッセージ・チャット・通知・マイページ・編集・設定・診断・年齢確認・プレミアム
│  │  ├─ admin/            管理者ログイン・ダッシュボード・ユーザー・通報・年齢確認・画像審査
│  │  ├─ api/              退会・管理者によるユーザー削除（サービスロールを使う処理だけ）
│  │  └─ auth/             メールリンクの戻り先
│  ├─ components/          UI 部品（ui/）・アプリ枠・スワイプ・プロフィール・管理画面
│  └─ lib/                 Supabase クライアント・型・診断データ・画像処理・ユーティリティ
├─ scripts/seed.mjs        ローカル用デモデータ
└─ e2e/                    Playwright E2E テスト
```

## セキュリティ設計

- **RLS をすべてのテーブルで有効化**。基本は「自分の行だけ読み書きできる」
- **他人のプロフィールは security definer 関数経由**で、公開してよい項目（年齢・距離の目安など）だけを返す。生年月日・座標・メールアドレスは他人に返らない
- **重要な列は本人が書き換えられない**（年齢確認状態・性別・利用停止・課金・画像の審査結果など）。トリガーで強制
- **未ログイン（anon）には一切の権限を与えない**。TRUNCATE など RLS を迂回できる権限も剥奪
- **管理者は `admin_users` で判定**し、管理者関数・画面・API はすべてサーバー側で確認。操作は監査ログに記録。管理者ログイン画面は一般ユーザーを拒否
- **サービスロールキーはサーバーでのみ使用**（退会・管理者削除の2か所だけ）
- **Storage はすべて非公開**。プロフィール写真は「閲覧できる相手」だけ、チャット画像は当事者だけ、本人確認書類は管理者だけが署名付きURLで閲覧可能
- **Realtime も RLS が適用**され、自分に関係するイベントだけが届く
- Content-Security-Policy・X-Frame-Options などのセキュリティヘッダー、認証クッキーを含むレスポンスのキャッシュ禁止、オープンリダイレクト対策（`next` パラメータの検証）
- 登録済みメールアドレスかどうかを推測されないよう、新規登録・パスワード再設定は同じ応答を返す

## 公開前に必要なこと

- **法的手続き**：インターネット異性紹介事業の届出（公安委員会）、電気通信事業の届出（総務省）。詳細はリポジトリ直下の `docs/BUSINESS.md`
- 利用規約・プライバシーポリシーの【】部分の記入（`src/app/(public)/terms` / `privacy`）
- **決済**：`subscriptions` テーブルと画面は用意済み。Stripe などとの連携（Webhook で `subscriptions` を更新する処理）は未実装で、現在は管理者が手動でプレミアムを付与できます
- メール通知・プッシュ通知（現在はアプリ内のリアルタイム通知のみ）
- 管理者アカウントへの多要素認証（Supabase Auth の MFA）の導入を推奨

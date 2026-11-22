# セットアップ手順

所要時間の目安：Supabase まで 30 分、ストア公開まで数日〜2週間（審査待ち含む）。

## 1. Supabase（バックエンド）

1. https://supabase.com でプロジェクトを作成（リージョンは **Tokyo (ap-northeast-1)**）
2. Supabase CLI をインストールし、このリポジトリのルートで:
   ```bash
   npx supabase login
   npx supabase link --project-ref <プロジェクトID>
   npx supabase db push          # supabase/migrations の SQL を適用
   ```
   CLI を使わない場合は、ダッシュボードの SQL Editor に `supabase/migrations/20261122000000_init.sql` の中身を貼って実行しても構いません。
3. Authentication → Sign In / Providers → Email を有効化（「Confirm email」はオン推奨）
4. Authentication → Email Templates を日本語に書き換える
5. Project Settings → API から URL と anon key を控える

### 管理者の登録

自分のアカウントでアプリに登録したあと、SQL Editor で:

```sql
insert into admins (user_id) select id from auth.users where email = 'あなたのメールアドレス';
```

### 年齢確認の審査（毎日の運営作業）

SQL Editor で審査待ちを一覧:

```sql
select v.id, v.created_at, p.nickname, p.birthdate, v.document_path
from age_verifications v join profiles p on p.id = v.user_id
where v.status = 'pending' order by v.created_at;
```

書類画像は Storage → `id-documents` → `document_path` のファイルを開いて確認します。
**確認すること**：書類の種類 / 生年月日が **20歳以上** / プロフィールの生年月日と一致（学生証は不可）

承認・否認（SQL Editor は管理者権限で動くので直接更新します）:

```sql
-- 承認
with v as (update age_verifications set status='approved', reviewed_at=now() where id='<申請ID>' returning user_id)
update profiles set verification_status='approved' where id in (select user_id from v);

-- 否認
with v as (update age_verifications set status='rejected', review_note='生年月日が読み取れません', reviewed_at=now() where id='<申請ID>' returning user_id)
update profiles set verification_status='rejected' where id in (select user_id from v);
```

### 通報の確認・利用停止

```sql
select r.created_at, r.reason, r.detail, a.nickname as 通報者, b.nickname as 対象, b.id as 対象ID
from reports r join profiles a on a.id=r.reporter_id join profiles b on b.id=r.reported_id
where r.status='open' order by r.created_at;

update profiles set is_banned = true where id = '<対象ID>';      -- 利用停止
update reports set status = 'resolved' where reported_id = '<対象ID>';
```

禁止ワードの追加: `insert into ng_words values ('追加したい語');`

> ユーザーが増えたら、この審査・通報対応を管理画面（Web）にするのがおすすめです。

## 2. アプリを手元で動かす

```bash
cd app
cp .env.example .env     # Supabase の URL と anon key を書く
npm install
npx expo start
```

- 課金（RevenueCat）を含むネイティブ機能を試すには **開発ビルド** が必要です（Expo Go では課金は動きません）:
  ```bash
  npx eas-cli@latest build --profile development --platform ios   # または android
  ```
- `npx expo start --web` でブラウザでも画面確認できます（課金・カメラ以外）

## 3. 課金（RevenueCat）

1. **App Store Connect** でサブスクリプションを作成（例）
   - `koimachi_premium_1m`：1か月 3,980円
   - `koimachi_premium_3m`：3か月 9,800円
   - `koimachi_premium_6m`：6か月 16,800円
   Google Play Console でも同じ商品を作成
2. **RevenueCat** でプロジェクト作成 → 両ストアのアプリを登録 → 商品を取り込み
   → Entitlement `premium` を作り商品を紐づけ → Offering `default` にパッケージを追加
3. RevenueCat の公開 API キーを `app/.env` の `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `..._ANDROID_KEY` に設定
4. Webhook を設定:
   ```bash
   npx supabase functions deploy revenuecat-webhook --no-verify-jwt
   npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=$(openssl rand -hex 32)
   ```
   RevenueCat → Integrations → Webhooks に
   - URL: `https://<プロジェクトID>.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization header: `Bearer <上で設定した値>`
5. Apple の **Small Business Program** に申請すると手数料が 30% → 15% になります（必ずやる）

## 4. ストア公開

1. `app/app.json` の `ios.bundleIdentifier` / `android.package`（`com.example.koimachi`）を自分のドメインに変更
2. アイコン（`app/assets/`）を差し替え
3. `app/src/lib/legal.ts` の【】をすべて埋める（**届出番号は必須**。docs/BUSINESS.md 参照）
4. ビルドと提出:
   ```bash
   cd app
   npx eas-cli@latest build --platform all --profile production
   npx eas-cli@latest submit --platform ios
   ```
5. 審査対策
   - 審査用のテストアカウント（年齢確認済み・相手がいてマッチ済み）を用意し、審査メモに記載
   - 年齢レーティングは「18+」（または審査時点の最上位）、「出会い系」に該当する旨を正直に申告
   - 通報・ブロック・退会がアプリ内でできることは実装済み

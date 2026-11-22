-- =====================================================================
-- こいまち Web — コアスキーマ
--
-- 設計方針
--  * すべてのテーブルで RLS を有効化。直接読めるのは「自分の行」が基本
--  * 他人のプロフィールは security definer 関数経由で「公開してよい項目」だけ返す
--    （生年月日・正確な位置情報・メールアドレスは他人に一切返さない）
--  * 年齢確認・停止状態・課金状態などの重要カラムは利用者が書き換えられない
--  * 管理者は admin_users に登録されたユーザーのみ。管理操作は監査ログに残す
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- users（アカウント状態。auth.users と 1:1）
-- ---------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  suspended_reason text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index users_created_at_idx on public.users (created_at);
create index users_last_seen_idx on public.users (last_seen_at);
alter table public.users enable row level security;

-- auth.users に登録されたら public.users を作る
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.handle_auth_user_email_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.users set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function public.handle_auth_user_email_change();

-- ---------------------------------------------------------------------
-- admin_users（管理者）
-- ---------------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references public.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'moderator')),
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users a join public.users u on u.id = a.user_id
    where a.user_id = auth.uid() and u.status = 'active'
  );
$$;

create or replace function public.is_active_user(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = uid and status = 'active');
$$;

create policy "users: 本人は自分を閲覧" on public.users for select using (id = auth.uid());
create policy "users: 管理者は全件閲覧" on public.users for select using (public.is_admin());
create policy "admin_users: 本人は自分の権限を閲覧" on public.admin_users for select using (user_id = auth.uid());
create policy "admin_users: 管理者は全件閲覧" on public.admin_users for select using (public.is_admin());

-- 管理操作の監査ログ
create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_id uuid references public.users (id) on delete set null,
  action text not null,
  target_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
alter table public.admin_audit_logs enable row level security;
create policy "audit: 管理者のみ閲覧" on public.admin_audit_logs for select using (public.is_admin());

create or replace function public.audit(p_action text, p_target uuid, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.admin_audit_logs (admin_id, action, target_id, detail) values (auth.uid(), p_action, p_target, p_detail);
$$;

-- ---------------------------------------------------------------------
-- 禁止ワード
-- ---------------------------------------------------------------------
create table public.ng_words (word text primary key);
alter table public.ng_words enable row level security;
create policy "ng_words: 管理者のみ" on public.ng_words for all using (public.is_admin()) with check (public.is_admin());

insert into public.ng_words (word) values
  ('jk'), ('jc'), ('中学生'), ('高校生'), ('小学生'), ('未成年'), ('18歳未満'),
  ('援助'), ('援交'), ('円光'), ('パパ活'), ('ママ活'), ('p活'), ('お小遣い'), ('ホ別'), ('割り切り'), ('大人の関係'),
  ('line id'), ('lineid'), ('ライン交換'), ('カカオ'), ('kakao'), ('telegram'), ('テレグラム'),
  ('ネットワークビジネス'), ('マルチ商法'), ('仮想通貨'), ('fx投資'), ('副業紹介');

create or replace function public.contains_ng_word(input text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(input, '') <> '' and (
    exists (
      select 1 from public.ng_words
      where position(lower(word) in lower(normalize(input, nfkc))) > 0
    )
    or normalize(input, nfkc) ~ '0[789]0[-\s]?[0-9]{4}[-\s]?[0-9]{4}'
    or normalize(input, nfkc) ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
  );
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  birthdate date not null,
  gender text not null check (gender in ('male', 'female', 'other')),
  seeking text[] not null default '{}' check (seeking <@ array['male', 'female', 'other'] and cardinality(seeking) between 1 and 3),
  prefecture text not null check (char_length(prefecture) between 2 and 4),
  city text not null default '' check (char_length(city) <= 30),
  bio text not null default '' check (char_length(bio) <= 1000),
  occupation text not null default '' check (char_length(occupation) <= 40),
  height smallint check (height between 120 and 230),
  hobbies text[] not null default '{}' check (cardinality(hobbies) <= 10),
  -- 恋愛タイプ診断（4軸 -100〜100）
  axis_passion smallint check (axis_passion between -100 and 100),
  axis_lead smallint check (axis_lead between -100 and 100),
  axis_together smallint check (axis_together between -100 and 100),
  axis_tempo smallint check (axis_tempo between -100 and 100),
  love_type text generated always as (
    case when axis_passion is null or axis_lead is null or axis_together is null or axis_tempo is null then null
    else (case when axis_passion >= 0 then 'P' else 'C' end)
      || (case when axis_lead >= 0 then 'L' else 'F' end)
      || (case when axis_together >= 0 then 'T' else 'I' end)
      || (case when axis_tempo >= 0 then 'S' else 'D' end)
    end
  ) stored,
  value_answers jsonb not null default '{}'::jsonb check (jsonb_typeof(value_answers) = 'object'),
  -- 位置情報（約1km単位に丸めて保存。他人には距離の目安しか返さない）
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  location_updated_at timestamptz,
  -- 検索条件
  pref_age_min smallint not null default 20 check (pref_age_min between 18 and 100),
  pref_age_max smallint not null default 50 check (pref_age_max between 18 and 100),
  pref_max_distance_km integer check (pref_max_distance_km between 1 and 1000),
  -- 本人が変更できない項目
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'approved', 'rejected')),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pref_age_min <= pref_age_max),
  check ((lat is null) = (lng is null))
);
create index profiles_gender_idx on public.profiles (gender);
create index profiles_prefecture_idx on public.profiles (prefecture);
create index profiles_birthdate_idx on public.profiles (birthdate);
create index profiles_hobbies_idx on public.profiles using gin (hobbies);
create index profiles_love_type_idx on public.profiles (love_type);
alter table public.profiles enable row level security;

create policy "profiles: 本人は閲覧" on public.profiles for select using (user_id = auth.uid());
create policy "profiles: 管理者は閲覧" on public.profiles for select using (public.is_admin());
create policy "profiles: 本人が作成" on public.profiles for insert with check (user_id = auth.uid() and public.is_active_user(auth.uid()));
create policy "profiles: 本人が更新" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.profiles_before_write() returns trigger
language plpgsql as $$
declare
  h text;
begin
  -- 位置は小数第2位（約1.1km）に丸める
  if new.lat is not null then
    new.lat := round(new.lat::numeric, 2)::double precision;
    new.lng := round(new.lng::numeric, 2)::double precision;
    if tg_op = 'INSERT' or new.lat is distinct from old.lat or new.lng is distinct from old.lng then
      new.location_updated_at := now();
    end if;
  else
    new.location_updated_at := null;
  end if;

  new.updated_at := now();

  -- 一般ユーザーからの書き込み時のみ検証・保護（管理者関数・サービスロールは素通し）
  if current_user = 'authenticated' then
    if date_part('year', age(new.birthdate)) < 18 then
      raise exception '18歳未満の方はご利用いただけません' using errcode = 'P0001';
    end if;
    if date_part('year', age(new.birthdate)) > 100 then
      raise exception '生年月日を正しく入力してください' using errcode = 'P0001';
    end if;
    if public.contains_ng_word(new.display_name) or public.contains_ng_word(new.bio)
       or public.contains_ng_word(new.occupation) or public.contains_ng_word(new.city) then
      raise exception 'プロフィールに使用できない表現が含まれています' using errcode = 'P0001';
    end if;
    foreach h in array new.hobbies loop
      if char_length(h) > 20 or public.contains_ng_word(h) then
        raise exception '趣味に使用できない表現が含まれています' using errcode = 'P0001';
      end if;
    end loop;

    if tg_op = 'INSERT' then
      new.verification_status := 'unverified';
      new.created_at := now();
    else
      new.verification_status := old.verification_status;
      new.created_at := old.created_at;
      new.gender := old.gender;
      if old.verification_status <> 'unverified' then
        new.birthdate := old.birthdate;  -- 年齢確認の申請後は生年月日を変更不可
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_before_write before insert or update on public.profiles
  for each row execute function public.profiles_before_write();

-- ---------------------------------------------------------------------
-- subscriptions（課金状態。書き込みはサーバー／管理者のみ）
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  plan text not null default 'premium' check (plan in ('premium')),
  status text not null default 'active' check (status in ('active', 'canceled', 'expired')),
  current_period_end timestamptz not null,
  provider text not null default 'manual' check (provider in ('stripe', 'app_store', 'google_play', 'manual')),
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_period_idx on public.subscriptions (current_period_end);
alter table public.subscriptions enable row level security;
create policy "subscriptions: 本人は閲覧" on public.subscriptions for select using (user_id = auth.uid());
create policy "subscriptions: 管理者は閲覧" on public.subscriptions for select using (public.is_admin());

create or replace function public.is_premium(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = uid and status in ('active', 'canceled') and current_period_end > now()
  );
$$;

-- ---------------------------------------------------------------------
-- blocks / 閲覧可否
-- ---------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);
alter table public.blocks enable row level security;
create policy "blocks: 本人のみ閲覧" on public.blocks for select using (blocker_id = auth.uid());
create policy "blocks: 本人がブロック" on public.blocks for insert with check (blocker_id = auth.uid());
create policy "blocks: 本人が解除" on public.blocks for delete using (blocker_id = auth.uid());

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- 自分（auth.uid()）が target のプロフィールを見てよいか
create or replace function public.can_view_profile(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
    and public.is_active_user(auth.uid())
    and (
      target = auth.uid()
      or (
        exists (
          select 1 from public.profiles p join public.users u on u.id = p.user_id
          where p.user_id = target and u.status = 'active' and not p.is_hidden
        )
        and not public.is_blocked_between(auth.uid(), target)
      )
    );
$$;

-- ---------------------------------------------------------------------
-- profile_images（複数写真・最大6枚）
-- ---------------------------------------------------------------------
create table public.profile_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  storage_path text not null unique,
  position smallint not null default 0 check (position between 0 and 5),
  status text not null default 'approved' check (status in ('approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index profile_images_user_idx on public.profile_images (user_id, position);
create index profile_images_created_idx on public.profile_images (created_at desc);
alter table public.profile_images enable row level security;

create policy "images: 本人と閲覧可能な相手" on public.profile_images for select
  using (user_id = auth.uid() or (status = 'approved' and public.can_view_profile(user_id)));
create policy "images: 管理者は閲覧" on public.profile_images for select using (public.is_admin());
create policy "images: 本人が追加" on public.profile_images for insert
  with check (user_id = auth.uid() and split_part(storage_path, '/', 1) = auth.uid()::text and public.is_active_user(auth.uid()));
create policy "images: 本人が並べ替え" on public.profile_images for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "images: 本人が削除" on public.profile_images for delete using (user_id = auth.uid());

create or replace function public.profile_images_before_write() returns trigger
language plpgsql as $$
begin
  if current_user = 'authenticated' then
    if tg_op = 'INSERT' then
      if (select count(*) from public.profile_images where user_id = new.user_id) >= 6 then
        raise exception '写真は6枚まで登録できます' using errcode = 'P0001';
      end if;
      new.status := 'approved';
      new.created_at := now();
    else
      new.status := old.status;         -- 審査結果は本人が変更できない
      new.storage_path := old.storage_path;
      new.user_id := old.user_id;
    end if;
  end if;
  return new;
end;
$$;
create trigger profile_images_before_write before insert or update on public.profile_images
  for each row execute function public.profile_images_before_write();

-- ---------------------------------------------------------------------
-- identity_verifications（年齢確認・本人確認）
-- ---------------------------------------------------------------------
create table public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  document_type text not null check (document_type in ('drivers_license', 'passport', 'my_number', 'health_insurance', 'other')),
  document_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index identity_verifications_status_idx on public.identity_verifications (status, created_at);
alter table public.identity_verifications enable row level security;
create policy "verifications: 本人は閲覧" on public.identity_verifications for select using (user_id = auth.uid());
create policy "verifications: 管理者は閲覧" on public.identity_verifications for select using (public.is_admin());

create or replace function public.submit_identity_verification(p_document_type text, p_document_path text)
returns void language plpgsql security definer set search_path = public as $$
declare
  st text;
begin
  if not public.is_active_user(auth.uid()) then raise exception 'forbidden'; end if;
  select verification_status into st from public.profiles where user_id = auth.uid();
  if st is null then raise exception 'プロフィールを先に作成してください' using errcode = 'P0001'; end if;
  if st in ('pending', 'approved') then raise exception 'すでに申請済みです' using errcode = 'P0001'; end if;
  if split_part(p_document_path, '/', 1) <> auth.uid()::text then raise exception '不正なファイルです' using errcode = 'P0001'; end if;
  insert into public.identity_verifications (user_id, document_type, document_path) values (auth.uid(), p_document_type, p_document_path);
  update public.profiles set verification_status = 'pending' where user_id = auth.uid();
end;
$$;

-- メッセージ送信の条件: 有効なアカウント・年齢確認済み
create or replace function public.can_send_message(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user(uid)
    and exists (select 1 from public.profiles where user_id = uid and verification_status = 'approved');
$$;

-- ---------------------------------------------------------------------
-- likes / passes / matches
-- ---------------------------------------------------------------------
create table public.likes (
  from_user uuid not null references public.users (id) on delete cascade,
  to_user uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user),
  check (from_user <> to_user)
);
create index likes_to_user_idx on public.likes (to_user, created_at desc);
create index likes_created_idx on public.likes (created_at);
alter table public.likes enable row level security;
create policy "likes: 送った本人は閲覧" on public.likes for select using (from_user = auth.uid());
create policy "likes: 管理者は閲覧" on public.likes for select using (public.is_admin());
create policy "likes: 本人が送信" on public.likes for insert with check (from_user = auth.uid());
create policy "likes: 本人が取り消し" on public.likes for delete using (from_user = auth.uid());

-- スワイプで「スキップ」した相手
create table public.passes (
  from_user uuid not null references public.users (id) on delete cascade,
  to_user uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user)
);
alter table public.passes enable row level security;
create policy "passes: 本人のみ" on public.passes for all using (from_user = auth.uid()) with check (from_user = auth.uid());

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.users (id) on delete cascade,
  user_b uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);
create index matches_user_b_idx on public.matches (user_b);
create index matches_created_idx on public.matches (created_at);
alter table public.matches enable row level security;
create policy "matches: 当事者は閲覧" on public.matches for select using (auth.uid() in (user_a, user_b));
create policy "matches: 管理者は閲覧" on public.matches for select using (public.is_admin());

create or replace function public.is_match_member(p_match uuid, uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.matches where id = p_match and uid in (user_a, user_b));
$$;

create or replace function public.daily_like_limit(uid uuid) returns integer
language sql stable security definer set search_path = public as $$
  select case when public.is_premium(uid) then 300 else 30 end;
$$;

create or replace function public.likes_used_today(uid uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.likes
  where from_user = uid
    and created_at >= (date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo');
$$;

-- ---------------------------------------------------------------------
-- messages（テキスト・画像・既読）
-- ---------------------------------------------------------------------
create table public.messages (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  body text check (char_length(body) between 1 and 2000),
  image_path text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (body is not null or image_path is not null)
);
create index messages_match_idx on public.messages (match_id, created_at);
create index messages_unread_idx on public.messages (match_id, sender_id) where read_at is null;
create index messages_created_idx on public.messages (created_at);
alter table public.messages enable row level security;
create policy "messages: 当事者は閲覧" on public.messages for select using (public.is_match_member(match_id, auth.uid()));
create policy "messages: 管理者は閲覧（通報調査用）" on public.messages for select using (public.is_admin());
create policy "messages: 条件を満たす当事者が送信" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_match_member(match_id, auth.uid())
    and public.can_send_message(auth.uid())
    and (image_path is null or split_part(image_path, '/', 1) = match_id::text)
  );

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('like', 'match', 'message', 'system')),
  actor_id uuid references public.users (id) on delete cascade,
  match_id uuid references public.matches (id) on delete cascade,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;
create policy "notifications: 本人は閲覧" on public.notifications for select using (user_id = auth.uid());
create policy "notifications: 本人が削除" on public.notifications for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.users (id) on delete set null,
  reported_id uuid not null references public.users (id) on delete cascade,
  reason text not null check (reason in ('minor', 'money', 'spam', 'harassment', 'fake', 'inappropriate_image', 'other')),
  detail text not null default '' check (char_length(detail) <= 2000),
  message_id bigint references public.messages (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_note text,
  handled_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_reported_idx on public.reports (reported_id);
alter table public.reports enable row level security;
create policy "reports: 本人が通報" on public.reports for insert
  with check (reporter_id = auth.uid() and reporter_id <> reported_id and status = 'open' and admin_note is null and handled_by is null);
create policy "reports: 通報者は自分の通報を閲覧" on public.reports for select using (reporter_id = auth.uid());
create policy "reports: 管理者は閲覧" on public.reports for select using (public.is_admin());

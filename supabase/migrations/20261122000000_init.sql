-- =============================================================
-- こいまち 初期スキーマ
--   * profiles は本人しか直接 SELECT できない（生年月日などを守るため）
--   * 他人の情報は security definer 関数経由で「公開してよい項目だけ」返す
--   * 年齢確認・課金・BAN などの重要カラムはユーザーが自分で書き換えられない
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- 管理者
-- -------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
-- ポリシーなし = 一般ユーザーからは一切見えない

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- -------------------------------------------------------------
-- 禁止ワード（出会い系サイト規制法の「禁止誘引行為」対策）
-- 管理画面（Supabase Dashboard）から追加・削除できる
-- -------------------------------------------------------------
create table public.ng_words (
  word text primary key
);
alter table public.ng_words enable row level security;

insert into public.ng_words (word) values
  -- 児童・未成年を示す語
  ('jk'), ('jc'), ('中学生'), ('高校生'), ('小学生'), ('未成年'), ('18歳未満'), ('制服'),
  -- 対償（お金）を示す語
  ('援助'), ('援交'), ('円光'), ('パパ活'), ('ママ活'), ('p活'), ('お小遣い'), ('おこづかい'), ('ホ別'), ('ほべつ'),
  ('苺'), ('大人の関係'), ('割り切り'), ('サポ'),
  -- 外部連絡先への誘導（業者・勧誘対策）
  ('line id'), ('lineid'), ('ライン交換'), ('カカオ'), ('kakao'), ('telegram'), ('テレグラム'),
  -- 勧誘
  ('投資'), ('副業'), ('ネットワークビジネス'), ('マルチ'), ('仮想通貨');

create or replace function public.contains_ng_word(input text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(input, '') <> '' and exists (
    select 1 from public.ng_words
    where position(lower(word) in lower(translate(input, 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ　',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz '))) > 0
  )
  -- 電話番号らしき並び（090-1234-5678 / 09012345678 など）
  or coalesce(input, '') ~ '0[789]0[-\s]?[0-9]{4}[-\s]?[0-9]{4}'
  -- メールアドレス
  or coalesce(input, '') ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}';
$$;

-- -------------------------------------------------------------
-- プロフィール
-- -------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  gender text not null check (gender in ('male', 'female')),
  birthdate date not null,
  prefecture text not null,
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_path text,
  -- ここから下はユーザーが自分で変更できない（トリガーで保護）
  verification_status text not null default 'unsubmitted'
    check (verification_status in ('unsubmitted', 'pending', 'approved', 'rejected')),
  premium_until timestamptz,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "本人のみ閲覧" on public.profiles for select using (id = auth.uid());
create policy "本人のみ作成" on public.profiles for insert with check (id = auth.uid());
create policy "本人のみ更新" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.protect_profile_columns() returns trigger
language plpgsql as $$
begin
  -- 管理者・サービスロール・security definer 関数からの更新は素通し
  if current_user <> 'authenticated' then
    return new;
  end if;

  if date_part('year', age(new.birthdate)) < 18 then
    raise exception '18歳未満の方はご利用いただけません';
  end if;
  if public.contains_ng_word(new.nickname) or public.contains_ng_word(new.bio) then
    raise exception 'プロフィールに使用できない表現が含まれています';
  end if;

  if tg_op = 'INSERT' then
    new.verification_status := 'unsubmitted';
    new.premium_until := null;
    new.is_banned := false;
    new.created_at := now();
  else
    new.verification_status := old.verification_status;
    new.premium_until := old.premium_until;
    new.is_banned := old.is_banned;
    new.created_at := old.created_at;
    -- 性別は変更不可。生年月日は年齢確認の申請後は変更不可
    new.gender := old.gender;
    if old.verification_status <> 'unsubmitted' then
      new.birthdate := old.birthdate;
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_columns
  before insert or update on public.profiles
  for each row execute function public.protect_profile_columns();

create or replace function public.is_premium(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select premium_until > now() from public.profiles where id = uid), false);
$$;

create or replace function public.is_active_verified(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = uid and verification_status = 'approved' and not is_banned
  );
$$;

-- メッセージ送信の条件: 年齢確認済み・BANされていない・（女性 or 有料会員）
create or replace function public.can_send_message(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_verified(uid) and exists (
    select 1 from public.profiles
    where id = uid and (gender = 'female' or premium_until > now())
  );
$$;

-- -------------------------------------------------------------
-- 年齢確認（本人確認書類）
-- -------------------------------------------------------------
create table public.age_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.age_verifications enable row level security;
create policy "本人は自分の申請を閲覧" on public.age_verifications for select using (user_id = auth.uid());
create policy "管理者は全件閲覧" on public.age_verifications for select using (public.is_admin());

create or replace function public.submit_age_verification(p_document_path text) returns void
language plpgsql security definer set search_path = public as $$
declare
  st text;
begin
  select verification_status into st from public.profiles where id = auth.uid();
  if st is null then raise exception 'プロフィールを先に作成してください'; end if;
  if st in ('pending', 'approved') then raise exception 'すでに申請済みです'; end if;
  if split_part(p_document_path, '/', 1) <> auth.uid()::text then
    raise exception '不正なファイルです';
  end if;

  insert into public.age_verifications (user_id, document_path) values (auth.uid(), p_document_path);
  update public.profiles set verification_status = 'pending' where id = auth.uid();
end;
$$;

-- 管理者が書類を目視確認して承認/否認する
create or replace function public.review_age_verification(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;

  update public.age_verifications
    set status = case when p_approve then 'approved' else 'rejected' end,
        review_note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id and status = 'pending'
    returning user_id into uid;
  if uid is null then raise exception '申請が見つかりません'; end if;

  update public.profiles
    set verification_status = case when p_approve then 'approved' else 'rejected' end
    where id = uid;
end;
$$;

-- -------------------------------------------------------------
-- ブロック・通報
-- -------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
create policy "本人のブロックを閲覧" on public.blocks for select using (blocker_id = auth.uid());
create policy "本人がブロック" on public.blocks for insert with check (blocker_id = auth.uid());
create policy "本人がブロック解除" on public.blocks for delete using (blocker_id = auth.uid());

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('minor', 'money', 'spam', 'harassment', 'fake', 'other')),
  detail text not null default '' check (char_length(detail) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "本人が通報" on public.reports for insert with check (reporter_id = auth.uid());
create policy "管理者は全件閲覧" on public.reports for select using (public.is_admin());
create policy "管理者が対応状況を更新" on public.reports for update using (public.is_admin());

-- 管理者による利用停止（BAN）
create or replace function public.set_banned(p_user_id uuid, p_banned boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set is_banned = p_banned where id = p_user_id;
end;
$$;

-- -------------------------------------------------------------
-- いいね・マッチ
-- -------------------------------------------------------------
create table public.likes (
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
create index likes_to_id_idx on public.likes (to_id);
alter table public.likes enable row level security;
create policy "本人のいいねを閲覧" on public.likes for select using (from_id = auth.uid());
create policy "本人がいいね" on public.likes for insert with check (from_id = auth.uid());

create table public.skips (
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id)
);
alter table public.skips enable row level security;
create policy "本人のスキップ" on public.skips for all using (from_id = auth.uid()) with check (from_id = auth.uid());

-- 無料会員は1日10いいねまで（日本時間で日付が変わるとリセット）
create or replace function public.daily_like_limit(uid uuid) returns int
language sql stable as $$
  select case when public.is_premium(uid) then 100 else 10 end;
$$;

create or replace function public.likes_used_today(uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.likes
  where from_id = uid
    and created_at >= (date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo');
$$;

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null references public.profiles (id) on delete cascade,
  user2_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user1_id, user2_id),
  check (user1_id < user2_id)
);
alter table public.matches enable row level security;
create policy "当事者のみ閲覧" on public.matches for select using (auth.uid() in (user1_id, user2_id));
create policy "当事者がマッチ解除" on public.matches for delete using (auth.uid() in (user1_id, user2_id));

create or replace function public.before_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles;
  target public.profiles;
begin
  select * into me from public.profiles where id = new.from_id;
  select * into target from public.profiles where id = new.to_id;

  if me.id is null or target.id is null then raise exception 'ユーザーが見つかりません'; end if;
  if not public.is_active_verified(me.id) then raise exception 'いいねするには年齢確認が必要です'; end if;
  if not public.is_active_verified(target.id) then raise exception 'このユーザーにはいいねできません'; end if;
  if me.gender = target.gender then raise exception 'このユーザーにはいいねできません'; end if;
  if public.is_blocked_between(me.id, target.id) then raise exception 'このユーザーにはいいねできません'; end if;
  if public.likes_used_today(me.id) >= public.daily_like_limit(me.id) then
    raise exception '本日のいいね上限に達しました';
  end if;
  new.created_at := now();
  return new;
end;
$$;
create trigger before_like before insert on public.likes for each row execute function public.before_like();

create or replace function public.after_like() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.likes where from_id = new.to_id and to_id = new.from_id) then
    insert into public.matches (user1_id, user2_id)
    values (least(new.from_id, new.to_id), greatest(new.from_id, new.to_id))
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger after_like after insert on public.likes for each row execute function public.after_like();

-- ブロックしたらマッチも解除
create or replace function public.after_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.matches
  where user1_id = least(new.blocker_id, new.blocked_id) and user2_id = greatest(new.blocker_id, new.blocked_id);
  return new;
end;
$$;
create trigger after_block after insert on public.blocks for each row execute function public.after_block();

create or replace function public.is_match_member(p_match_id uuid, uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.matches where id = p_match_id and uid in (user1_id, user2_id));
$$;

-- -------------------------------------------------------------
-- メッセージ
-- -------------------------------------------------------------
create table public.messages (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index messages_match_idx on public.messages (match_id, created_at);
alter table public.messages enable row level security;

create policy "当事者のみ閲覧" on public.messages for select
  using (public.is_match_member(match_id, auth.uid()));
create policy "条件を満たす当事者のみ送信" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_match_member(match_id, auth.uid())
    and public.can_send_message(auth.uid())
  );

create or replace function public.before_message() returns trigger
language plpgsql as $$
begin
  if public.contains_ng_word(new.body) then
    raise exception '送信できない表現が含まれています（連絡先の交換・金銭のやりとり等は禁止です）';
  end if;
  new.created_at := now();
  return new;
end;
$$;
create trigger before_message before insert on public.messages for each row execute function public.before_message();

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.matches;

-- -------------------------------------------------------------
-- アプリから呼ぶ読み取り用関数（公開してよい項目だけ返す）
-- -------------------------------------------------------------
create or replace function public.get_candidates(p_limit int default 20)
returns table (id uuid, nickname text, age int, prefecture text, bio text, avatar_path text, last_active_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.nickname, date_part('year', age(p.birthdate))::int, p.prefecture, p.bio, p.avatar_path, p.last_active_at
  from public.profiles p, public.profiles me
  where me.id = auth.uid()
    and p.id <> me.id
    and p.gender <> me.gender
    and p.verification_status = 'approved'
    and not p.is_banned
    and not public.is_blocked_between(me.id, p.id)
    and not exists (select 1 from public.likes l where l.from_id = me.id and l.to_id = p.id)
    and not exists (select 1 from public.skips s where s.from_id = me.id and s.to_id = p.id)
  order by (p.prefecture = me.prefecture) desc, p.last_active_at desc
  limit least(p_limit, 50);
$$;

-- 自分に「いいね」してくれた人。人数は誰でも、相手の顔ぶれは有料会員のみ
create or replace function public.get_likes_received()
returns table (id uuid, nickname text, age int, prefecture text, bio text, avatar_path text, liked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id,
         case when public.is_premium(auth.uid()) then p.nickname else '？？？' end,
         date_part('year', age(p.birthdate))::int,
         p.prefecture,
         case when public.is_premium(auth.uid()) then p.bio else '' end,
         case when public.is_premium(auth.uid()) then p.avatar_path else null end,
         l.created_at
  from public.likes l
  join public.profiles p on p.id = l.from_id
  where l.to_id = auth.uid()
    and not p.is_banned
    and not public.is_blocked_between(auth.uid(), p.id)
    and not exists (select 1 from public.likes back where back.from_id = auth.uid() and back.to_id = p.id)
  order by l.created_at desc;
$$;

create or replace function public.get_my_matches()
returns table (match_id uuid, partner_id uuid, nickname text, age int, avatar_path text,
               last_message text, last_message_at timestamptz, matched_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, p.id, p.nickname, date_part('year', age(p.birthdate))::int, p.avatar_path,
         lm.body, lm.created_at, m.created_at
  from public.matches m
  join public.profiles p on p.id = case when m.user1_id = auth.uid() then m.user2_id else m.user1_id end
  left join lateral (
    select body, created_at from public.messages where match_id = m.id order by created_at desc limit 1
  ) lm on true
  where auth.uid() in (m.user1_id, m.user2_id)
    and not p.is_banned
  order by coalesce(lm.created_at, m.created_at) desc;
$$;

create or replace function public.get_my_status()
returns table (likes_used int, likes_limit int, is_premium boolean, can_send_message boolean)
language sql stable security definer set search_path = public as $$
  select public.likes_used_today(auth.uid()), public.daily_like_limit(auth.uid()),
         public.is_premium(auth.uid()), public.can_send_message(auth.uid());
$$;

create or replace function public.touch_last_active() returns void
language sql security definer set search_path = public as $$
  update public.profiles set last_active_at = now() where id = auth.uid();
$$;

-- アカウント削除（App Store 審査で必須）
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

-- 関数の実行権限: anon（未ログイン）には一切渡さない
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.get_candidates(int), public.get_likes_received(), public.get_my_matches(), public.get_my_status(),
  public.touch_last_active(), public.delete_my_account(), public.submit_age_verification(text),
  public.review_age_verification(uuid, boolean, text), public.set_banned(uuid, boolean), public.is_admin(),
  public.is_match_member(uuid, uuid), public.can_send_message(uuid), public.is_premium(uuid),
  public.is_active_verified(uuid), public.is_blocked_between(uuid, uuid), public.contains_ng_word(text),
  public.likes_used_today(uuid), public.daily_like_limit(uuid)
to authenticated;

-- -------------------------------------------------------------
-- ストレージ
--   avatars       : 公開。<user_id>/xxx.jpg に本人のみアップロード可
--   id-documents  : 非公開。本人がアップロードのみ可。閲覧は管理者（ダッシュボード）だけ
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('id-documents', 'id-documents', false) on conflict do nothing;

create policy "avatar upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "id doc upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);

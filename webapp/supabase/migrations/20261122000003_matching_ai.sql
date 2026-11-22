-- =====================================================================
-- AIマッチング（相性スコア）と、アプリが読む「公開用プロフィール」
-- =====================================================================

-- 2点間の距離（km, ハバーサイン）
create or replace function public.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select case when lat1 is null or lat2 is null then null else
    6371 * 2 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2)
      + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
    ))
  end;
$$;

-- 他人に見せる距離は「目安」だけ（正確な位置を推測されないよう段階的に丸める）
create or replace function public.distance_label(d double precision) returns text
language sql immutable as $$
  select case
    when d is null then null
    when d < 2 then '2km以内'
    when d < 10 then '約' || ceil(d)::int || 'km'
    when d < 50 then '約' || (round(d / 5) * 5)::int || 'km'
    when d < 100 then '約' || (round(d / 10) * 10)::int || 'km'
    else '100km以上'
  end;
$$;

create or replace function public.age_of(b date) returns integer
language sql stable as $$ select date_part('year', age(b))::int; $$;

-- アプリに返すプロフィールの形（生年月日・座標・メールは含まない）
create type public.profile_card as (
  user_id uuid,
  display_name text,
  age integer,
  gender text,
  prefecture text,
  city text,
  bio text,
  occupation text,
  height smallint,
  hobbies text[],
  love_type text,
  value_answers jsonb,
  verified boolean,
  distance text,
  last_active text,
  photos text[],
  score integer,
  reasons text[],
  liked boolean,
  match_id uuid
);

-- 「好みの傾向」: 自分がいいねした相手の診断軸の平均（3人以上いいねしたら有効）
create or replace function public.my_taste(uid uuid,
  out n integer, out passion double precision, out lead double precision, out together double precision, out tempo double precision)
language sql stable security definer set search_path = public as $$
  select count(*)::int, avg(p.axis_passion), avg(p.axis_lead), avg(p.axis_together), avg(p.axis_tempo)
  from public.likes l join public.profiles p on p.user_id = l.to_user
  where l.from_user = uid and p.axis_passion is not null;
$$;

-- ---------------------------------------------------------------------
-- 相性スコアの計算
--   恋愛タイプ診断 30% / 価値観 20% / 趣味 15% / 距離 15% / アクティブ度 10% / 好みの学習 10%
--   ※ 情報が足りない項目は 0.5（中立）として扱う
-- ---------------------------------------------------------------------
create or replace function public.build_card(
  me public.profiles, p public.profiles, p_last_seen timestamptz,
  t_n integer, t_passion double precision, t_lead double precision, t_together double precision, t_tempo double precision
) returns public.profile_card
language plpgsql stable security definer set search_path = public as $$
declare
  c public.profile_card;
  diag double precision := 0.5;
  vals double precision := 0.5;
  same_vals integer := 0;
  common_vals integer := 0;
  hob double precision := 0.5;
  common_hobbies text[];
  dist double precision;
  dist_s double precision := 0.5;
  act double precision;
  taste double precision := 0.5;
  total double precision;
  reasons text[] := '{}';
begin
  if me.axis_passion is not null and p.axis_passion is not null then
    -- 情熱・距離感・テンポは「近い」ほど、リード/寄り添いは「逆」ほど相性が良い
    diag := ((1 - abs(me.axis_passion - p.axis_passion) / 200.0)
           + (1 - abs(me.axis_lead + p.axis_lead) / 200.0)
           + (1 - abs(me.axis_together - p.axis_together) / 200.0)
           + (1 - abs(me.axis_tempo - p.axis_tempo) / 200.0)) / 4;
  end if;

  select count(*) filter (where a.value = b.value), count(*) into same_vals, common_vals
  from jsonb_each_text(me.value_answers) a join jsonb_each_text(p.value_answers) b using (key);
  if common_vals > 0 then vals := same_vals::double precision / common_vals; end if;

  common_hobbies := array(select unnest(me.hobbies) intersect select unnest(p.hobbies));
  if cardinality(me.hobbies) > 0 and cardinality(p.hobbies) > 0 then
    hob := least(1.0, 0.2 + cardinality(common_hobbies) / 3.0);
  end if;

  dist := public.distance_km(me.lat, me.lng, p.lat, p.lng);
  if dist is not null then dist_s := greatest(0, 1 - ln(1 + dist) / ln(201)); end if;

  act := case
    when p_last_seen > now() - interval '1 day' then 1.0
    when p_last_seen > now() - interval '7 days' then 0.7
    when p_last_seen > now() - interval '30 days' then 0.4
    else 0.1 end;

  if t_n >= 3 and p.axis_passion is not null then
    taste := 1 - (abs(p.axis_passion - t_passion) + abs(p.axis_lead - t_lead)
                + abs(p.axis_together - t_together) + abs(p.axis_tempo - t_tempo)) / 800.0;
  end if;

  total := 0.30 * diag + 0.20 * vals + 0.15 * hob + 0.15 * dist_s + 0.10 * act + 0.10 * taste;

  if diag >= 0.8 and me.axis_passion is not null and p.axis_passion is not null then reasons := reasons || '恋愛タイプの相性が◎'::text; end if;
  if same_vals >= 3 then reasons := reasons || ('価値観が' || same_vals || 'つ一致'); end if;
  if cardinality(common_hobbies) > 0 then
    reasons := reasons || ('共通の趣味：' || array_to_string(common_hobbies[1:2], '・'));
  end if;
  if dist is not null and dist < 10 then reasons := reasons || '近くに住んでいます'::text; end if;
  if t_n >= 3 and taste >= 0.85 then reasons := reasons || 'あなたの好みの傾向に近い'::text; end if;
  if p_last_seen > now() - interval '1 day' then reasons := reasons || '今日ログインしています'::text; end if;

  c.user_id := p.user_id;
  c.display_name := p.display_name;
  c.age := public.age_of(p.birthdate);
  c.gender := p.gender;
  c.prefecture := p.prefecture;
  c.city := p.city;
  c.bio := p.bio;
  c.occupation := p.occupation;
  c.height := p.height;
  c.hobbies := p.hobbies;
  c.love_type := p.love_type;
  c.value_answers := p.value_answers;
  c.verified := p.verification_status = 'approved';
  c.distance := public.distance_label(dist);
  c.last_active := case
    when p_last_seen > now() - interval '15 minutes' then 'online'
    when p_last_seen > now() - interval '1 day' then 'today'
    when p_last_seen > now() - interval '7 days' then 'week'
    else 'old' end;
  c.photos := array(
    select storage_path from public.profile_images
    where user_id = p.user_id and status = 'approved' order by position, created_at
  );
  c.score := greatest(1, least(99, round(total * 100)::int));
  c.reasons := reasons[1:3];
  c.liked := exists (select 1 from public.likes where from_user = me.user_id and to_user = p.user_id);
  c.match_id := (select id from public.matches
                 where user_a = least(me.user_id, p.user_id) and user_b = greatest(me.user_id, p.user_id));
  return c;
end;
$$;

-- 自分の profiles 行（なければエラー）
create or replace function public.require_my_profile() returns public.profiles
language plpgsql stable security definer set search_path = public as $$
declare
  me public.profiles;
begin
  if not public.is_active_user(auth.uid()) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into me from public.profiles where user_id = auth.uid();
  if me.user_id is null then raise exception 'プロフィールを作成してください' using errcode = 'P0001'; end if;
  return me;
end;
$$;

-- 一覧に出してよい相手か（自分以外・有効・非表示でない・ブロックなし・性別の希望が合う）
create or replace function public.is_discoverable(me public.profiles, p public.profiles) returns boolean
language sql stable security definer set search_path = public as $$
  select p.user_id <> me.user_id
    and not p.is_hidden
    and p.gender = any (me.seeking) and me.gender = any (p.seeking)
    and public.is_active_user(p.user_id)
    and not public.is_blocked_between(me.user_id, p.user_id);
$$;

-- ---------------------------------------------------------------------
-- おすすめ（スワイプ用）: まだいいね／スキップしていない相手をAI相性順に
-- ---------------------------------------------------------------------
create or replace function public.get_recommendations(p_limit integer default 20)
returns setof public.profile_card
language plpgsql stable security definer set search_path = public as $$
declare
  me public.profiles := public.require_my_profile();
  t record;
begin
  select * into t from public.my_taste(me.user_id);
  return query
  select c.*
  from public.profiles p
  join public.users u on u.id = p.user_id
  cross join lateral public.build_card(me, p, u.last_seen_at, t.n, t.passion, t.lead, t.together, t.tempo) c
  where public.is_discoverable(me, p)
    and public.age_of(p.birthdate) between me.pref_age_min and me.pref_age_max
    and (me.pref_max_distance_km is null or me.lat is null or p.lat is null
         or public.distance_km(me.lat, me.lng, p.lat, p.lng) <= me.pref_max_distance_km)
    and not exists (select 1 from public.likes l where l.from_user = me.user_id and l.to_user = p.user_id)
    and not exists (select 1 from public.passes s where s.from_user = me.user_id and s.to_user = p.user_id)
    and not exists (select 1 from public.matches m where m.user_a = least(me.user_id, p.user_id) and m.user_b = greatest(me.user_id, p.user_id))
  order by c.score desc, u.last_seen_at desc
  limit least(greatest(p_limit, 1), 50);
end;
$$;

-- ---------------------------------------------------------------------
-- 検索
-- ---------------------------------------------------------------------
create or replace function public.search_profiles(
  p_age_min integer default null,
  p_age_max integer default null,
  p_prefecture text default null,
  p_hobby text default null,
  p_max_distance_km integer default null,
  p_love_type text default null,
  p_verified_only boolean default false,
  p_sort text default 'score',
  p_limit integer default 30,
  p_offset integer default 0
) returns setof public.profile_card
language plpgsql stable security definer set search_path = public as $$
declare
  me public.profiles := public.require_my_profile();
  t record;
begin
  select * into t from public.my_taste(me.user_id);
  return query
  with base as (
    select p, u.last_seen_at, public.distance_km(me.lat, me.lng, p.lat, p.lng) as d
    from public.profiles p join public.users u on u.id = p.user_id
    where public.is_discoverable(me, p)
      and (p_age_min is null or public.age_of(p.birthdate) >= p_age_min)
      and (p_age_max is null or public.age_of(p.birthdate) <= p_age_max)
      and (p_prefecture is null or p.prefecture = p_prefecture)
      and (p_hobby is null or exists (select 1 from unnest(p.hobbies) h where h ilike '%' || p_hobby || '%'))
      and (p_love_type is null or p.love_type = p_love_type)
      and (not p_verified_only or p.verification_status = 'approved')
  ), filtered as (
    select * from base
    where p_max_distance_km is null or (d is not null and d <= p_max_distance_km)
  ), cards as (
    select c.*, f.d, (f.p).created_at as joined, f.last_seen_at as seen
    from filtered f
    cross join lateral public.build_card(me, f.p, f.last_seen_at, t.n, t.passion, t.lead, t.together, t.tempo) c
  )
  select user_id, display_name, age, gender, prefecture, city, bio, occupation, height, hobbies, love_type,
         value_answers, verified, distance, last_active, photos, score, reasons, liked, match_id
  from cards
  order by
    case when p_sort = 'new' then extract(epoch from joined) end desc nulls last,
    case when p_sort = 'distance' then d end asc nulls last,
    case when p_sort = 'active' then extract(epoch from seen) end desc nulls last,
    score desc
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
end;
$$;

-- ---------------------------------------------------------------------
-- ユーザー詳細
-- ---------------------------------------------------------------------
create or replace function public.get_profile_detail(p_user uuid)
returns setof public.profile_card
language plpgsql stable security definer set search_path = public as $$
declare
  me public.profiles := public.require_my_profile();
  t record;
begin
  if p_user <> me.user_id and not public.can_view_profile(p_user) then
    return;
  end if;
  select * into t from public.my_taste(me.user_id);
  return query
  select c.*
  from public.profiles p
  join public.users u on u.id = p.user_id
  cross join lateral public.build_card(me, p, u.last_seen_at, t.n, t.passion, t.lead, t.together, t.tempo) c
  where p.user_id = p_user;
end;
$$;

-- ---------------------------------------------------------------------
-- いいね一覧
-- ---------------------------------------------------------------------
create or replace function public.get_likes_sent()
returns table (card public.profile_card, liked_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  me public.profiles := public.require_my_profile();
  t record;
begin
  select * into t from public.my_taste(me.user_id);
  return query
  select public.build_card(me, p, u.last_seen_at, t.n, t.passion, t.lead, t.together, t.tempo), l.created_at
  from public.likes l
  join public.profiles p on p.user_id = l.to_user
  join public.users u on u.id = p.user_id
  where l.from_user = me.user_id and u.status = 'active' and not public.is_blocked_between(me.user_id, p.user_id)
  order by l.created_at desc;
end;
$$;

-- 受け取ったいいね（マッチ前）。無料会員には名前・写真・自己紹介を伏せて返す
create or replace function public.get_likes_received()
returns table (card public.profile_card, liked_at timestamptz, masked boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  me public.profiles := public.require_my_profile();
  premium boolean := public.is_premium(me.user_id);
  t record;
  c public.profile_card;
  r record;
begin
  select * into t from public.my_taste(me.user_id);
  for r in
    select p, u.last_seen_at, l.created_at
    from public.likes l
    join public.profiles p on p.user_id = l.from_user
    join public.users u on u.id = p.user_id
    where l.to_user = me.user_id and u.status = 'active' and not p.is_hidden
      and not public.is_blocked_between(me.user_id, p.user_id)
      and not exists (select 1 from public.likes back where back.from_user = me.user_id and back.to_user = p.user_id)
    order by l.created_at desc
  loop
    c := public.build_card(me, r.p, r.last_seen_at, t.n, t.passion, t.lead, t.together, t.tempo);
    if not premium then
      c.user_id := null;  -- 誰からかわからないようにIDも伏せる
      c.display_name := null;
      c.bio := '';
      c.occupation := '';
      c.city := '';
      c.photos := '{}';
      c.hobbies := '{}';
      c.reasons := '{}';
    end if;
    card := c;
    liked_at := r.created_at;
    masked := not premium;
    return next;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- マッチング一覧（最新メッセージ・未読数つき）
-- ---------------------------------------------------------------------
create or replace function public.get_matches()
returns table (match_id uuid, matched_at timestamptz, card public.profile_card,
               last_message text, last_message_at timestamptz, last_sender uuid, unread integer)
language plpgsql stable security definer set search_path = public as $$
declare
  me public.profiles := public.require_my_profile();
  t record;
begin
  select * into t from public.my_taste(me.user_id);
  return query
  select m.id, m.created_at,
         public.build_card(me, p, u.last_seen_at, t.n, t.passion, t.lead, t.together, t.tempo),
         coalesce(lm.body, case when lm.image_path is not null then '📷 画像' end),
         lm.created_at, lm.sender_id,
         (select count(*)::int from public.messages x where x.match_id = m.id and x.sender_id <> me.user_id and x.read_at is null)
  from public.matches m
  join public.profiles p on p.user_id = case when m.user_a = me.user_id then m.user_b else m.user_a end
  join public.users u on u.id = p.user_id
  left join lateral (
    select body, image_path, created_at, sender_id from public.messages
    where messages.match_id = m.id order by messages.id desc limit 1
  ) lm on true
  where me.user_id in (m.user_a, m.user_b) and u.status = 'active'
  order by coalesce(lm.created_at, m.created_at) desc;
end;
$$;

-- ---------------------------------------------------------------------
-- 自分の状態（ヘッダー・ナビのバッジなど）
-- ---------------------------------------------------------------------
create or replace function public.get_my_status()
returns table (has_profile boolean, status text, verification_status text, is_premium boolean, is_admin boolean,
               likes_used integer, likes_limit integer, can_send_message boolean,
               unread_notifications integer, unread_messages integer, likes_received integer)
language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from public.profiles where user_id = auth.uid()),
    (select status from public.users where id = auth.uid()),
    (select verification_status from public.profiles where user_id = auth.uid()),
    public.is_premium(auth.uid()),
    public.is_admin(),
    public.likes_used_today(auth.uid()),
    public.daily_like_limit(auth.uid()),
    public.can_send_message(auth.uid()),
    (select count(*)::int from public.notifications where user_id = auth.uid() and read_at is null),
    (select count(*)::int from public.messages x join public.matches m on m.id = x.match_id
      where auth.uid() in (m.user_a, m.user_b) and x.sender_id <> auth.uid() and x.read_at is null),
    (select count(*)::int from public.likes l
      where l.to_user = auth.uid()
        and not exists (select 1 from public.likes b where b.from_user = auth.uid() and b.to_user = l.from_user)
        and not public.is_blocked_between(auth.uid(), l.from_user));
$$;

-- 通知一覧（相手の名前・写真つき）
create or replace function public.get_notifications(p_limit integer default 50)
returns table (id bigint, type text, body text, read_at timestamptz, created_at timestamptz, match_id uuid,
               actor_id uuid, actor_name text, actor_photo text)
language sql stable security definer set search_path = public as $$
  select n.id, n.type, n.body, n.read_at, n.created_at, n.match_id,
         -- いいね通知の相手は有料会員にだけ見せる
         case when n.type = 'like' and not public.is_premium(auth.uid()) then null else n.actor_id end,
         case when n.type = 'like' and not public.is_premium(auth.uid()) then null else p.display_name end,
         case when n.type = 'like' and not public.is_premium(auth.uid()) then null else
           (select storage_path from public.profile_images i where i.user_id = n.actor_id and i.status = 'approved' order by position limit 1) end
  from public.notifications n
  left join public.profiles p on p.user_id = n.actor_id
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

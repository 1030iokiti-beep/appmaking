-- =============================================================
-- 価値観マッチング
--   * 恋愛タイプ診断（4軸 × 2 = 16タイプ）のスコアと価値観の回答を profiles に保存
--   * 相性スコア（%）を計算し、おすすめを相性順に並べる
--   * 対象を関東（1都6県）・20歳以上に限定
-- =============================================================

-- 診断の4軸。それぞれ -100〜100。0以上なら左側の文字
--   passion  : P 情熱 / C 穏やか
--   lead     : L リード / F 寄り添い
--   together : T 一緒 / I 自立
--   tempo    : S 直感 / D 計画
alter table public.profiles
  add column axis_passion smallint check (axis_passion between -100 and 100),
  add column axis_lead smallint check (axis_lead between -100 and 100),
  add column axis_together smallint check (axis_together between -100 and 100),
  add column axis_tempo smallint check (axis_tempo between -100 and 100),
  add column love_type text generated always as (
    case when axis_passion is null or axis_lead is null or axis_together is null or axis_tempo is null then null
    else (case when axis_passion >= 0 then 'P' else 'C' end)
      || (case when axis_lead >= 0 then 'L' else 'F' end)
      || (case when axis_together >= 0 then 'T' else 'I' end)
      || (case when axis_tempo >= 0 then 'S' else 'D' end)
    end
  ) stored,
  -- 価値観の回答 {"marriage": "soon", "kids": "want", ...}
  add column value_answers jsonb not null default '{}'::jsonb check (jsonb_typeof(value_answers) = 'object'),
  -- 検索条件（相手の年齢）
  add column pref_age_min smallint not null default 20 check (pref_age_min between 20 and 80),
  add column pref_age_max smallint not null default 50 check (pref_age_max between 20 and 80),
  add constraint pref_age_range check (pref_age_min <= pref_age_max),
  -- 提供エリア: 関東。拡大するときはこの制約を差し替える
  add constraint prefecture_service_area check (
    prefecture in ('東京都', '神奈川県', '埼玉県', '千葉県', '茨城県', '栃木県', '群馬県')
  );

-- 20歳以上に引き上げ（それ以外は init と同じ）
create or replace function public.protect_profile_columns() returns trigger
language plpgsql as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if date_part('year', age(new.birthdate)) < 20 then
    raise exception '20歳未満の方はご利用いただけません';
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
    new.gender := old.gender;
    if old.verification_status <> 'unsubmitted' then
      new.birthdate := old.birthdate;
    end if;
  end if;
  return new;
end;
$$;

-- -------------------------------------------------------------
-- 相性スコア（50〜99%）
--   診断 60% + 価値観 40%
--   情熱・距離感・テンポは「似ている」ほど相性◎
--   リード/寄り添いは「逆」ほど相性◎（引っ張る人と合わせる人）
-- -------------------------------------------------------------
create or replace function public.compatibility(x public.profiles, y public.profiles) returns int
language sql immutable as $$
  with axis as (
    select (
      (1 - abs(x.axis_passion - y.axis_passion) / 200.0)
      + (1 - abs(x.axis_lead + y.axis_lead) / 200.0)
      + (1 - abs(x.axis_together - y.axis_together) / 200.0)
      + (1 - abs(x.axis_tempo - y.axis_tempo) / 200.0)
    ) / 4 as s
  ),
  vals as (
    select count(*) filter (where a.value = b.value) as same, count(*) as common
    from jsonb_each_text(x.value_answers) a
    join jsonb_each_text(y.value_answers) b using (key)
  )
  select round(50 + 49 * (
    0.6 * coalesce(axis.s, 0.5)
    + 0.4 * case when vals.common = 0 then 0.5 else vals.same::numeric / vals.common end
  ))::int
  from axis, vals;
$$;

-- 戻り値が変わる関数は作り直す
drop function public.get_candidates(int);
drop function public.get_likes_received();
drop function public.get_my_matches();

create function public.get_candidates(p_limit int default 20)
returns table (id uuid, nickname text, age int, prefecture text, bio text, avatar_path text,
               last_active_at timestamptz, love_type text, value_answers jsonb, compatibility int)
language sql stable security definer set search_path = public as $$
  select p.id, p.nickname, date_part('year', age(p.birthdate))::int, p.prefecture, p.bio, p.avatar_path,
         p.last_active_at, p.love_type, p.value_answers, public.compatibility(me, p)
  from public.profiles p, public.profiles me
  where me.id = auth.uid()
    and p.id <> me.id
    and p.gender <> me.gender
    and p.verification_status = 'approved'
    and not p.is_banned
    and p.love_type is not null
    and date_part('year', age(p.birthdate)) between me.pref_age_min and me.pref_age_max
    and not public.is_blocked_between(me.id, p.id)
    and not exists (select 1 from public.likes l where l.from_id = me.id and l.to_id = p.id)
    and not exists (select 1 from public.skips s where s.from_id = me.id and s.to_id = p.id)
  -- 相性順。ただし最近ログインしていない人は少し下げる
  order by public.compatibility(me, p) - least(extract(epoch from now() - p.last_active_at) / 86400, 30) / 3 desc
  limit least(p_limit, 50);
$$;

create function public.get_likes_received()
returns table (id uuid, nickname text, age int, prefecture text, bio text, avatar_path text,
               liked_at timestamptz, love_type text, compatibility int)
language sql stable security definer set search_path = public as $$
  select p.id,
         case when public.is_premium(auth.uid()) then p.nickname else '？？？' end,
         date_part('year', age(p.birthdate))::int,
         p.prefecture,
         case when public.is_premium(auth.uid()) then p.bio else '' end,
         case when public.is_premium(auth.uid()) then p.avatar_path else null end,
         l.created_at,
         p.love_type,
         public.compatibility(me, p)
  from public.likes l
  join public.profiles p on p.id = l.from_id
  join public.profiles me on me.id = auth.uid()
  where l.to_id = auth.uid()
    and not p.is_banned
    and not public.is_blocked_between(auth.uid(), p.id)
    and not exists (select 1 from public.likes back where back.from_id = auth.uid() and back.to_id = p.id)
  order by l.created_at desc;
$$;

create function public.get_my_matches()
returns table (match_id uuid, partner_id uuid, nickname text, age int, avatar_path text,
               last_message text, last_message_at timestamptz, matched_at timestamptz,
               love_type text, compatibility int)
language sql stable security definer set search_path = public as $$
  select m.id, p.id, p.nickname, date_part('year', age(p.birthdate))::int, p.avatar_path,
         lm.body, lm.created_at, m.created_at, p.love_type, public.compatibility(me, p)
  from public.matches m
  join public.profiles me on me.id = auth.uid()
  join public.profiles p on p.id = case when m.user1_id = auth.uid() then m.user2_id else m.user1_id end
  left join lateral (
    select body, created_at from public.messages where match_id = m.id order by created_at desc limit 1
  ) lm on true
  where auth.uid() in (m.user1_id, m.user2_id)
    and not p.is_banned
  order by coalesce(lm.created_at, m.created_at) desc;
$$;

revoke execute on function public.get_candidates(int), public.get_likes_received(), public.get_my_matches(),
  public.compatibility(public.profiles, public.profiles) from public, anon;
grant execute on function public.get_candidates(int), public.get_likes_received(), public.get_my_matches()
  to authenticated;

-- =============================================================
-- 登録条件の変更
--   * 18〜100歳まで登録可（広告のターゲットは 20〜50 だが、登録は制限しない）
--   * 居住地の制限を撤廃（関東メインで運営するが全国から登録可）
--   * 検索の年齢範囲も 18〜100 に。初期値は 20〜50 のまま
-- =============================================================

alter table public.profiles drop constraint prefecture_service_area;

alter table public.profiles drop constraint if exists profiles_pref_age_min_check;
alter table public.profiles drop constraint if exists profiles_pref_age_max_check;
alter table public.profiles
  add constraint profiles_pref_age_min_check check (pref_age_min between 18 and 100),
  add constraint profiles_pref_age_max_check check (pref_age_max between 18 and 100);

create or replace function public.protect_profile_columns() returns trigger
language plpgsql as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if date_part('year', age(new.birthdate)) < 18 then
    raise exception '18歳未満の方はご利用いただけません';
  end if;
  if date_part('year', age(new.birthdate)) > 100 then
    raise exception '生年月日を正しく入力してください';
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

-- おすすめ順: 相性 + 同じ都道府県ならボーナス − しばらくログインしていない人
create or replace function public.get_candidates(p_limit int default 20)
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
  order by public.compatibility(me, p)
         + case when p.prefecture = me.prefecture then 8 else 0 end
         - least(extract(epoch from now() - p.last_active_at) / 86400, 30) / 3 desc
  limit least(p_limit, 50);
$$;

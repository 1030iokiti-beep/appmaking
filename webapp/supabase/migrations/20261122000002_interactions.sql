-- =====================================================================
-- いいね・マッチング・メッセージ・ブロックの業務ルールと通知
-- =====================================================================

create or replace function public.notify(p_user uuid, p_type text, p_actor uuid, p_match uuid, p_body text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, actor_id, match_id, body)
  values (p_user, p_type, p_actor, p_match, coalesce(p_body, ''));
$$;

-- 性別・探している性別がお互いに合うか
create or replace function public.is_compatible_pair(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles pa, public.profiles pb
    where pa.user_id = a and pb.user_id = b
      and pb.gender = any (pa.seeking) and pa.gender = any (pb.seeking)
  );
$$;

-- ---------------------------------------------------------------------
-- likes
-- ---------------------------------------------------------------------
create or replace function public.likes_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_user(new.from_user) then
    raise exception 'アカウントが利用停止中です' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where user_id = new.from_user) then
    raise exception 'プロフィールを作成してください' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.profiles p join public.users u on u.id = p.user_id
    where p.user_id = new.to_user and u.status = 'active' and not p.is_hidden
  ) or public.is_blocked_between(new.from_user, new.to_user) then
    raise exception 'このユーザーにはいいねできません' using errcode = 'P0001';
  end if;
  if not public.is_compatible_pair(new.from_user, new.to_user) then
    raise exception 'このユーザーにはいいねできません' using errcode = 'P0001';
  end if;
  if public.likes_used_today(new.from_user) >= public.daily_like_limit(new.from_user) then
    raise exception '本日のいいね上限に達しました' using errcode = 'P0001';
  end if;
  new.created_at := now();
  -- いいねしたらスキップ履歴からは消す
  delete from public.passes where from_user = new.from_user and to_user = new.to_user;
  return new;
end;
$$;
create trigger likes_before_insert before insert on public.likes
  for each row execute function public.likes_before_insert();

create or replace function public.likes_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m uuid;
  me_name text;
begin
  select display_name into me_name from public.profiles where user_id = new.from_user;
  if exists (select 1 from public.likes where from_user = new.to_user and to_user = new.from_user) then
    insert into public.matches (user_a, user_b)
    values (least(new.from_user, new.to_user), greatest(new.from_user, new.to_user))
    on conflict do nothing
    returning id into m;
    if m is not null then
      perform public.notify(new.to_user, 'match', new.from_user, m, me_name || 'さんとマッチングしました');
      perform public.notify(new.from_user, 'match', new.to_user, m,
        (select display_name from public.profiles where user_id = new.to_user) || 'さんとマッチングしました');
    end if;
  else
    -- 誰からのいいねかは通知本文に含めない（有料機能で確認できる）
    perform public.notify(new.to_user, 'like', new.from_user, null, '新しいいいねが届きました');
  end if;
  return new;
end;
$$;
create trigger likes_after_insert after insert on public.likes
  for each row execute function public.likes_after_insert();

-- マッチ済みの相手へのいいねは取り消せない（マッチ解除を使う）
create or replace function public.likes_before_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- security definer 内なので current_user ではなく JWT のロールで判定する。
  -- unmatch / ブロックでは先にマッチを消すため、この条件には当たらない
  if coalesce(auth.role(), '') = 'authenticated' and exists (
    select 1 from public.matches
    where user_a = least(old.from_user, old.to_user) and user_b = greatest(old.from_user, old.to_user)
  ) then
    raise exception 'マッチング済みの相手です。取り消す場合はマッチングを解除してください' using errcode = 'P0001';
  end if;
  -- 未読のいいね通知も消す
  delete from public.notifications
  where user_id = old.to_user and actor_id = old.from_user and type = 'like';
  return old;
end;
$$;
create trigger likes_before_delete before delete on public.likes
  for each row execute function public.likes_before_delete();

-- マッチ解除: マッチ・メッセージ・お互いのいいねを消し、今後おすすめに出ないようにする
create or replace function public.unmatch(p_match uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  a uuid;
  b uuid;
begin
  select user_a, user_b into a, b from public.matches where id = p_match and auth.uid() in (user_a, user_b);
  if a is null then raise exception 'マッチングが見つかりません' using errcode = 'P0001'; end if;
  delete from public.matches where id = p_match;
  delete from public.likes where (from_user = a and to_user = b) or (from_user = b and to_user = a);
  insert into public.passes (from_user, to_user) values (a, b), (b, a) on conflict do nothing;
  delete from public.notifications where (user_id = a and actor_id = b) or (user_id = b and actor_id = a);
end;
$$;

-- ---------------------------------------------------------------------
-- blocks: ブロックしたらマッチ・いいねも解消
-- ---------------------------------------------------------------------
create or replace function public.blocks_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  a uuid := least(new.blocker_id, new.blocked_id);
  b uuid := greatest(new.blocker_id, new.blocked_id);
begin
  delete from public.matches where user_a = a and user_b = b;
  delete from public.likes
  where (from_user = new.blocker_id and to_user = new.blocked_id) or (from_user = new.blocked_id and to_user = new.blocker_id);
  delete from public.notifications
  where (user_id = new.blocker_id and actor_id = new.blocked_id) or (user_id = new.blocked_id and actor_id = new.blocker_id);
  return new;
end;
$$;
create trigger blocks_after_insert after insert on public.blocks
  for each row execute function public.blocks_after_insert();

-- ---------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------
create or replace function public.messages_before_insert() returns trigger
language plpgsql as $$
begin
  if new.body is not null then
    new.body := btrim(new.body);
    if new.body = '' then new.body := null; end if;
  end if;
  if new.body is null and new.image_path is null then
    raise exception 'メッセージを入力してください' using errcode = 'P0001';
  end if;
  if public.contains_ng_word(new.body) then
    raise exception '送信できない表現が含まれています（連絡先の交換・金銭のやりとり等は禁止です）' using errcode = 'P0001';
  end if;
  new.created_at := now();
  new.read_at := null;
  return new;
end;
$$;
create trigger messages_before_insert before insert on public.messages
  for each row execute function public.messages_before_insert();

create or replace function public.messages_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  other uuid;
  sender_name text;
begin
  select case when user_a = new.sender_id then user_b else user_a end into other
  from public.matches where id = new.match_id;
  select display_name into sender_name from public.profiles where user_id = new.sender_id;
  perform public.notify(other, 'message', new.sender_id, new.match_id,
    sender_name || '：' || coalesce(left(new.body, 60), '📷 画像を送信しました'));
  return new;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.messages_after_insert();

-- 既読にする（相手から届いた未読メッセージ）
create or replace function public.mark_messages_read(p_match uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if not public.is_match_member(p_match, auth.uid()) then raise exception 'forbidden'; end if;
  update public.messages set read_at = now()
  where match_id = p_match and sender_id <> auth.uid() and read_at is null;
  get diagnostics n = row_count;
  update public.notifications set read_at = now()
  where user_id = auth.uid() and match_id = p_match and type = 'message' and read_at is null;
  return n;
end;
$$;

create or replace function public.mark_notifications_read(p_ids bigint[] default null) returns void
language sql security definer set search_path = public as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids));
$$;

create or replace function public.touch_last_seen() returns void
language sql security definer set search_path = public as $$
  update public.users set last_seen_at = now()
  where id = auth.uid() and last_seen_at < now() - interval '1 minute';
$$;

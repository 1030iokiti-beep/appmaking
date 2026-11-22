-- =====================================================================
-- 管理者機能・ストレージ・リアルタイム・権限
-- =====================================================================

-- ---------------------------------------------------------------------
-- 管理者用関数（すべて is_admin() を確認し、監査ログを残す）
-- ---------------------------------------------------------------------
create or replace function public.assert_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
end;
$$;

create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  today timestamptz := date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'users_total', (select count(*) from public.users),
    'users_suspended', (select count(*) from public.users where status = 'suspended'),
    'users_today', (select count(*) from public.users where created_at >= today),
    'active_today', (select count(*) from public.users where last_seen_at >= today),
    'active_7d', (select count(*) from public.users where last_seen_at >= now() - interval '7 days'),
    'profiles_total', (select count(*) from public.profiles),
    'matches_total', (select count(*) from public.matches),
    'matches_today', (select count(*) from public.matches where created_at >= today),
    'likes_today', (select count(*) from public.likes where created_at >= today),
    'messages_today', (select count(*) from public.messages where created_at >= today),
    'reports_open', (select count(*) from public.reports where status in ('open', 'reviewing')),
    'verifications_pending', (select count(*) from public.identity_verifications where status = 'pending'),
    'premium_active', (select count(*) from public.subscriptions where status in ('active', 'canceled') and current_period_end > now()),
    'gender', (select coalesce(jsonb_object_agg(gender, n), '{}'::jsonb) from (select gender, count(*) n from public.profiles group by gender) g),
    'age_groups', (select coalesce(jsonb_object_agg(grp, n), '{}'::jsonb) from (
        select case when a < 20 then '18-19' when a < 30 then '20代' when a < 40 then '30代' when a < 50 then '40代' else '50代以上' end grp, count(*) n
        from (select public.age_of(birthdate) a from public.profiles) x group by 1) ag),
    'top_prefectures', (select coalesce(jsonb_agg(jsonb_build_object('prefecture', prefecture, 'count', n) order by n desc), '[]'::jsonb)
        from (select prefecture, count(*) n from public.profiles group by prefecture order by n desc limit 5) tp)
  );
end;
$$;

-- 日別の推移（日本時間）
create or replace function public.admin_daily_stats(p_days integer default 30)
returns table (day date, signups integer, matches integer, likes integer, messages integer, active_users integer)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return query
  with days as (
    select generate_series((now() at time zone 'Asia/Tokyo')::date - (least(greatest(p_days, 1), 180) - 1),
                           (now() at time zone 'Asia/Tokyo')::date, interval '1 day')::date as d
  )
  select d,
    (select count(*)::int from public.users where (created_at at time zone 'Asia/Tokyo')::date = d),
    (select count(*)::int from public.matches where (created_at at time zone 'Asia/Tokyo')::date = d),
    (select count(*)::int from public.likes where (created_at at time zone 'Asia/Tokyo')::date = d),
    (select count(*)::int from public.messages where (created_at at time zone 'Asia/Tokyo')::date = d),
    -- その日にいいね・メッセージをしたユーザー数
    (select count(distinct uid)::int from (
      select from_user uid from public.likes where (created_at at time zone 'Asia/Tokyo')::date = d
      union select sender_id from public.messages where (created_at at time zone 'Asia/Tokyo')::date = d
    ) x)
  from days order by d;
end;
$$;

create or replace function public.admin_set_user_status(p_user uuid, p_status text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  if p_user = auth.uid() then raise exception '自分自身は停止できません' using errcode = 'P0001'; end if;
  if p_status not in ('active', 'suspended') then raise exception 'invalid status'; end if;
  update public.users set status = p_status, suspended_reason = case when p_status = 'suspended' then p_reason end
  where id = p_user;
  perform public.audit('user.' || p_status, p_user, jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.admin_set_image_status(p_image uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  perform public.assert_admin();
  if p_status not in ('approved', 'rejected') then raise exception 'invalid status'; end if;
  update public.profile_images set status = p_status where id = p_image returning user_id into uid;
  perform public.audit('image.' || p_status, uid, jsonb_build_object('image_id', p_image));
  if p_status = 'rejected' then
    perform public.notify(uid, 'system', null, null, 'ガイドラインに沿わない写真を非公開にしました');
  end if;
end;
$$;

create or replace function public.admin_update_report(p_report uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  if p_status not in ('open', 'reviewing', 'resolved', 'dismissed') then raise exception 'invalid status'; end if;
  update public.reports
    set status = p_status, admin_note = coalesce(p_note, admin_note), handled_by = auth.uid(),
        handled_at = case when p_status in ('resolved', 'dismissed') then now() else handled_at end
  where id = p_report;
  perform public.audit('report.' || p_status, p_report, jsonb_build_object('note', p_note));
end;
$$;

create or replace function public.admin_review_verification(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  perform public.assert_admin();
  update public.identity_verifications
    set status = case when p_approve then 'approved' else 'rejected' end,
        review_note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_id and status = 'pending'
  returning user_id into uid;
  if uid is null then raise exception '申請が見つかりません' using errcode = 'P0001'; end if;
  update public.profiles set verification_status = case when p_approve then 'approved' else 'rejected' end where user_id = uid;
  perform public.notify(uid, 'system', null, null,
    case when p_approve then '年齢確認が完了しました。メッセージを送れるようになりました'
    else '年齢確認ができませんでした。書類を確認して再提出してください' end);
  perform public.audit('verification.' || case when p_approve then 'approved' else 'rejected' end, uid, jsonb_build_object('note', p_note));
end;
$$;

-- 手動で有料会員を付与（キャンペーン・テスト用）
create or replace function public.admin_grant_premium(p_user uuid, p_days integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  insert into public.subscriptions (user_id, current_period_end, provider, status)
  values (p_user, now() + make_interval(days => p_days), 'manual', 'active')
  on conflict (user_id) do update
    set current_period_end = greatest(subscriptions.current_period_end, now()) + make_interval(days => p_days),
        status = 'active', updated_at = now();
  perform public.audit('premium.grant', p_user, jsonb_build_object('days', p_days));
end;
$$;

-- ---------------------------------------------------------------------
-- ストレージ（すべて非公開バケット。閲覧は署名付きURLのみ）
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('profile-images', 'profile-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('chat-images', 'chat-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-docs', 'verification-docs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.try_uuid(t text) returns uuid
language plpgsql immutable as $$
begin
  return t::uuid;
exception when others then
  return null;
end;
$$;

-- プロフィール写真: <user_id>/<file>
create policy "profile-images: 本人がアップロード" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active_user(auth.uid()));
create policy "profile-images: 本人が削除" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile-images: 閲覧できる相手のみ" on storage.objects for select to authenticated
  using (bucket_id = 'profile-images' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
    or exists (select 1 from public.profile_images i
               where i.storage_path = name and i.status = 'approved' and public.can_view_profile(i.user_id))
  ));

-- チャット画像: <match_id>/<file>
create policy "chat-images: 当事者が送信" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-images'
    and public.is_match_member(public.try_uuid((storage.foldername(name))[1]), auth.uid())
    and public.can_send_message(auth.uid()));
create policy "chat-images: 当事者と管理者が閲覧" on storage.objects for select to authenticated
  using (bucket_id = 'chat-images' and (
    public.is_match_member(public.try_uuid((storage.foldername(name))[1]), auth.uid()) or public.is_admin()
  ));

-- 本人確認書類: <user_id>/<file>。本人はアップロードのみ、閲覧は管理者だけ
create policy "verification-docs: 本人がアップロード" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "verification-docs: 管理者のみ閲覧" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and public.is_admin());

-- ---------------------------------------------------------------------
-- リアルタイム（RLS が適用されるので自分に関係する行だけ届く）
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.messages, public.notifications, public.matches;

-- ---------------------------------------------------------------------
-- 権限
--   anon（未ログイン）には何も許可しない。TRUNCATE などRLSを迂回できる権限も外す
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;

grant execute on function
  public.is_admin(), public.is_active_user(uuid), public.contains_ng_word(text), public.is_premium(uuid),
  public.is_blocked_between(uuid, uuid), public.can_view_profile(uuid), public.can_send_message(uuid),
  public.is_match_member(uuid, uuid), public.try_uuid(text),
  public.submit_identity_verification(text, text), public.unmatch(uuid),
  public.mark_messages_read(uuid), public.mark_notifications_read(bigint[]), public.touch_last_seen(),
  public.get_recommendations(integer),
  public.search_profiles(integer, integer, text, text, integer, text, boolean, text, integer, integer),
  public.get_profile_detail(uuid), public.get_likes_sent(), public.get_likes_received(), public.get_matches(),
  public.get_my_status(), public.get_notifications(integer),
  public.admin_stats(), public.admin_daily_stats(integer), public.admin_set_user_status(uuid, text, text),
  public.admin_set_image_status(uuid, text), public.admin_update_report(uuid, text, text),
  public.admin_review_verification(uuid, boolean, text), public.admin_grant_premium(uuid, integer)
to authenticated;

-- 内部用（他人のデータを組み立てる関数）は直接呼べないようにする
revoke execute on function
  public.build_card(public.profiles, public.profiles, timestamptz, integer, double precision, double precision, double precision, double precision),
  public.my_taste(uuid), public.notify(uuid, text, uuid, uuid, text), public.audit(text, uuid, jsonb),
  public.likes_used_today(uuid), public.daily_like_limit(uuid), public.is_compatible_pair(uuid, uuid),
  public.is_discoverable(public.profiles, public.profiles), public.require_my_profile(), public.assert_admin()
from authenticated;

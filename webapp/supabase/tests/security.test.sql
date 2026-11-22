-- RLS・業務ルールのテスト
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/security.test.sql
-- すべてトランザクション内で実行し、最後にロールバックする（データは残らない）
begin;

create temp table _results (name text, ok boolean);
grant all on _results to authenticated, anon;

create or replace function pg_temp.login(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
create or replace function pg_temp.check(name text, ok boolean) returns void language sql as $$
  insert into _results values (name, coalesce(ok, false));
$$;
-- エラーになることを確認する
create or replace function pg_temp.fails(sql text) returns boolean language plpgsql as $$
begin
  execute sql;
  return false;
exception when others then
  return true;
end;
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- ---------------- テストデータ ----------------
-- A: 男性(東京)  B: 女性(東京近く)  C: 女性(大阪)  D: 男性  ADMIN: 管理者
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000d', 'd@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

select pg_temp.check('auth.users 作成で public.users が作られる', (select count(*) = 5 from public.users where email like '%@test.local'));
create temp table _total as select count(*)::int n from public.users;
grant select on _total to authenticated;

set local role authenticated;

select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.check('18歳未満は登録できない', pg_temp.fails($$
  insert into profiles (user_id, display_name, birthdate, gender, seeking, prefecture)
  values ('00000000-0000-0000-0000-00000000000a', 'テストたろう', current_date - interval '17 years', 'male', '{female}', '東京都')$$));
select pg_temp.check('他人のプロフィールは作れない', pg_temp.fails($$
  insert into profiles (user_id, display_name, birthdate, gender, seeking, prefecture)
  values ('00000000-0000-0000-0000-00000000000b', 'なりすまし', '1995-01-01', 'female', '{male}', '東京都')$$));
select pg_temp.check('禁止ワードは登録できない', pg_temp.fails($$
  insert into profiles (user_id, display_name, birthdate, gender, seeking, prefecture, bio)
  values ('00000000-0000-0000-0000-00000000000a', 'テストたろう', '1995-01-01', 'male', '{female}', '東京都', 'ＬＩＮＥ ＩＤ教えて')$$));
insert into profiles (user_id, display_name, birthdate, gender, seeking, prefecture, hobbies, lat, lng,
  axis_passion, axis_lead, axis_together, axis_tempo, value_answers, verification_status)
values ('00000000-0000-0000-0000-00000000000a', 'テストたろう', '1995-01-01', 'male', '{female}', '東京都', '{カフェ,映画,旅行}',
  35.681236, 139.767125, 60, 70, 40, 20, '{"marriage":"few_years","kids":"want","alcohol":"sometimes"}', 'approved');
select pg_temp.check('位置情報は約1km単位に丸められる', (select lat = 35.68 and lng = 139.77 from profiles where user_id = auth.uid()));
select pg_temp.check('年齢確認ステータスは自分で設定できない', (select verification_status = 'unverified' from profiles where user_id = auth.uid()));
update profiles set verification_status = 'approved', gender = 'female' where user_id = auth.uid();
select pg_temp.check('年齢確認・性別は自分で変更できない',
  (select verification_status = 'unverified' and gender = 'male' from profiles where user_id = auth.uid()));

select pg_temp.login('00000000-0000-0000-0000-00000000000b');
insert into profiles (user_id, display_name, birthdate, gender, seeking, prefecture, hobbies, lat, lng,
  axis_passion, axis_lead, axis_together, axis_tempo, value_answers)
values ('00000000-0000-0000-0000-00000000000b', 'テストはなこ', '1997-05-05', 'female', '{male}', '東京都', '{カフェ,ヨガ,映画}',
  35.6895, 139.6917, 50, -60, 50, 10, '{"marriage":"few_years","kids":"want","alcohol":"sometimes"}');
select pg_temp.check('他人の profiles 行は直接読めない',
  (select count(*) = 0 from profiles where user_id = '00000000-0000-0000-0000-00000000000a'));

select pg_temp.login('00000000-0000-0000-0000-00000000000c');
insert into profiles (user_id, display_name, birthdate, gender, seeking, prefecture, lat, lng,
  axis_passion, axis_lead, axis_together, axis_tempo)
values ('00000000-0000-0000-0000-00000000000c', 'テストさくら', '1990-01-01', 'female', '{male}', '大阪府', 34.69, 135.50, -80, 90, -60, -80);

select pg_temp.login('00000000-0000-0000-0000-00000000000d');
insert into profiles (user_id, display_name, birthdate, gender, seeking, prefecture)
values ('00000000-0000-0000-0000-00000000000d', 'テストじろう', '1992-01-01', 'male', '{female}', '東京都');

-- ---------------- おすすめ・AIスコア ----------------
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.check('おすすめは異性のみ（男性Dは出ない）',
  (select count(*) = 2 and bool_and(display_name in ('テストはなこ', 'テストさくら')) from get_recommendations(50) where display_name in ('テストたろう', 'テストはなこ', 'テストさくら', 'テストじろう')));
select pg_temp.check('AIスコアは相性の良い はなこ が上位',
  (select (select score from get_recommendations(50) where display_name = 'テストはなこ') > (select score from get_recommendations(50) where display_name = 'テストさくら')));
select pg_temp.check('距離は目安のみ（座標は返さない）',
  (select distance like '約%km' from get_recommendations(50) where display_name = 'テストはなこ'));
select pg_temp.check('おすすめ理由に共通の趣味が入る',
  (select exists (select 1 from unnest(reasons) r where r like '共通の趣味%') from get_recommendations(50) where display_name = 'テストはなこ'));
select pg_temp.check('検索: 都道府県で絞れる',
  (select count(*) = 1 from search_profiles(p_prefecture => '大阪府', p_limit => 60) where display_name in ('テストたろう', 'テストはなこ', 'テストさくら', 'テストじろう'))
  and (select bool_and(prefecture = '大阪府') from search_profiles(p_prefecture => '大阪府', p_limit => 60)));
select pg_temp.check('検索: 距離で絞れる（50km以内に大阪は入らない）',
  (select count(*) = 1 from search_profiles(p_max_distance_km => 50, p_limit => 60) where display_name in ('テストたろう', 'テストはなこ', 'テストさくら', 'テストじろう')));
select pg_temp.check('検索: 趣味で絞れる',
  (select count(*) = 1 from search_profiles(p_hobby => 'ヨガ', p_limit => 60) where display_name in ('テストたろう', 'テストはなこ', 'テストさくら', 'テストじろう'))
  and (select bool_and('ヨガ' = any (hobbies)) from search_profiles(p_hobby => 'ヨガ', p_limit => 60)));
select pg_temp.check('内部関数 build_card は直接呼べない',
  pg_temp.fails($$select public.my_taste('00000000-0000-0000-0000-00000000000b')$$));

-- ---------------- いいね・マッチ ----------------
insert into likes (from_user, to_user) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
select pg_temp.check('他人になりすましていいねできない', pg_temp.fails($$
  insert into likes (from_user, to_user) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c')$$));
select pg_temp.check('同性にはいいねできない（探している性別外）', pg_temp.fails($$
  insert into likes (from_user, to_user) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d')$$));
select pg_temp.check('いいね後はおすすめから消える',
  (select count(*) = 0 from get_recommendations(50) where display_name = 'テストはなこ'));
delete from likes where to_user = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check('マッチ前のいいねは取り消せる', (select count(*) = 0 from likes));
insert into likes (from_user, to_user) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');

select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.check('いいね通知が届く', (select count(*) = 1 from notifications where type = 'like'));
select pg_temp.check('無料会員は受け取ったいいねの相手が伏せられる',
  (select masked and (card).display_name is null and (card).user_id is null from get_likes_received()));
select pg_temp.check('無料会員は通知でも相手が伏せられる',
  (select actor_id is null and actor_name is null from get_notifications() where type = 'like'));
insert into likes (from_user, to_user) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');
select pg_temp.check('相互いいねでマッチ成立', (select count(*) = 1 from matches));
select pg_temp.check('マッチ通知が届く', (select count(*) = 1 from notifications where type = 'match'));
select pg_temp.check('マッチ一覧に相手が出る', (select (card).display_name = 'テストたろう' from get_matches()));

select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.check('マッチ済みのいいねは取り消せない', pg_temp.fails($$
  delete from likes where to_user = '00000000-0000-0000-0000-00000000000b'$$));

-- ---------------- メッセージ ----------------
select pg_temp.check('年齢確認前はメッセージを送れない', pg_temp.fails($$
  insert into messages (match_id, sender_id, body) select id, auth.uid(), 'こんにちは' from matches$$));
reset role;
update profiles set verification_status = 'approved';
set local role authenticated;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
insert into messages (match_id, sender_id, body) select id, auth.uid(), 'はじめまして！' from matches;
select pg_temp.check('禁止ワードを含むメッセージは送れない', pg_temp.fails($$
  insert into messages (match_id, sender_id, body) select id, auth.uid(), '09012345678に連絡して' from matches$$));
select pg_temp.check('他のマッチのフォルダの画像パスは使えない', pg_temp.fails($$
  insert into messages (match_id, sender_id, image_path) select id, auth.uid(), 'other-match/x.jpg' from matches$$));

select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select pg_temp.check('第三者はメッセージを読めない', (select count(*) = 0 from messages));
select pg_temp.check('第三者はマッチを読めない', (select count(*) = 0 from matches));
select pg_temp.check('第三者は他人の通知を読めない', (select count(*) = 0 from notifications));

select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.check('未読数が数えられる', (select unread_messages = 1 from get_my_status()));
select pg_temp.check('既読にできる', (select mark_messages_read(id) = 1 from matches));
select pg_temp.check('既読時刻が入る', (select read_at is not null from messages));
select pg_temp.check('メッセージ本文は書き換えられない', pg_temp.fails($$update messages set body = '改ざん'$$)
  or (select body = 'はじめまして！' from messages));

-- ---------------- 通報・ブロック ----------------
insert into reports (reporter_id, reported_id, reason, detail)
values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'harassment', 'テスト');
select pg_temp.check('通報の対応状況は通報者が設定できない', pg_temp.fails($$
  insert into reports (reporter_id, reported_id, reason, status)
  values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'spam', 'resolved')$$));
insert into blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');
select pg_temp.check('ブロックでマッチが解除される', (select count(*) = 0 from matches));

select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.check('ブロックされた相手は詳細を見られない',
  (select count(*) = 0 from get_profile_detail('00000000-0000-0000-0000-00000000000b')));
select pg_temp.check('ブロックされた相手は検索に出ない',
  (select count(*) = 0 from search_profiles(p_limit => 60) where display_name = 'テストはなこ'));

-- ---------------- 管理者 ----------------
select pg_temp.check('一般ユーザーは管理者統計を見られない', pg_temp.fails($$select admin_stats()$$));
select pg_temp.check('一般ユーザーはユーザーを停止できない', pg_temp.fails($$
  select admin_set_user_status('00000000-0000-0000-0000-00000000000b', 'suspended')$$));
select pg_temp.check('一般ユーザーは他人の users 行を読めない', (select count(*) = 1 from users));
select pg_temp.check('一般ユーザーは通報一覧を読めない（自分の通報以外）', (select count(*) = 0 from reports));
select pg_temp.check('一般ユーザーは管理者を名乗れない', pg_temp.fails($$
  insert into admin_users (user_id) values ('00000000-0000-0000-0000-00000000000a')$$));

reset role;
insert into admin_users (user_id) values ('00000000-0000-0000-0000-0000000000ad');
set local role authenticated;
select pg_temp.login('00000000-0000-0000-0000-0000000000ad');
select pg_temp.check('管理者は統計を見られる', (select (admin_stats() ->> 'users_total')::int = (select n from _total)));
select pg_temp.check('管理者は日別統計を見られる', (select count(*) = 7 from admin_daily_stats(7)));
select pg_temp.check('管理者は全ユーザーを見られる', (select count(*) = (select n from _total) from users));
select pg_temp.check('管理者は通報を見られる', (select count(*) >= 1 from reports where detail = 'テスト'));
select admin_set_user_status('00000000-0000-0000-0000-00000000000c', 'suspended', 'テスト');
select pg_temp.check('停止操作が監査ログに残る', (select count(*) = 1 from admin_audit_logs where action = 'user.suspended' and target_id = '00000000-0000-0000-0000-00000000000c'));

select pg_temp.login('00000000-0000-0000-0000-00000000000d');
select pg_temp.check('停止中のユーザーはおすすめに出ない',
  (select count(*) = 0 from get_recommendations(50) where display_name = 'テストさくら'));
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select pg_temp.check('停止中のユーザーはいいねできない', pg_temp.fails($$
  insert into likes (from_user, to_user) values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')$$));

-- ---------------- 未ログイン ----------------
reset role;
set local role anon;
select pg_temp.check('未ログインはプロフィールを読めない', pg_temp.fails($$select count(*) from profiles$$));
select pg_temp.check('未ログインは関数を呼べない', pg_temp.fails($$select * from get_recommendations()$$));

reset role;
select case when ok then '✓ ' else '✗ ' end || name as result from _results;
select count(*) filter (where ok) || ' / ' || count(*) || ' passed' as summary,
       case when bool_and(ok) then 'ALL PASSED' else 'FAILURES' end as status
from _results;
rollback;

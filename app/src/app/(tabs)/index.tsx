import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { Button, Loading, Screen, styles } from '../../components/ui';
import { VerifyBanner } from '../../components/VerifyBanner';
import { useAuth } from '../../lib/auth';
import { avatarUrl, errorMessage, supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import type { Candidate, MyStatus } from '../../lib/types';

function lastActiveLabel(iso: string) {
  const h = (Date.now() - new Date(iso).getTime()) / 36e5;
  if (h < 1) return '🟢 オンライン';
  if (h < 24) return '🟡 24時間以内';
  if (h < 72) return '3日以内';
  return '1週間以上';
}

export default function Discover() {
  const { session, profile } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [status, setStatus] = useState<MyStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([supabase.rpc('get_candidates', { p_limit: 20 }), supabase.rpc('get_my_status').single()]);
    setCandidates((c.data as Candidate[]) ?? []);
    setStatus((s.data as MyStatus) ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const current = candidates?.[0];

  async function act(kind: 'like' | 'skip') {
    if (!current || !session) return;
    if (kind === 'like' && profile?.verification_status !== 'approved') {
      return Alert.alert('年齢確認が必要です', 'いいねをするには年齢確認を完了してください。', [
        { text: 'あとで' },
        { text: '提出する', onPress: () => router.push('/verify') },
      ]);
    }
    setBusy(true);
    const me = session.user.id;
    const { error } = await supabase.from(kind === 'like' ? 'likes' : 'skips').insert({ from_id: me, to_id: current.id });
    setBusy(false);

    if (error) {
      if (error.message.includes('上限')) {
        return Alert.alert('本日のいいねを使い切りました', 'プレミアム会員なら1日100回までいいねできます。', [
          { text: '閉じる' },
          { text: 'くわしく見る', onPress: () => router.push('/premium') },
        ]);
      }
      return Alert.alert('エラー', errorMessage(error));
    }

    if (kind === 'like') {
      const [a, b] = [me, current.id].sort();
      const { data: match } = await supabase.from('matches').select('id').eq('user1_id', a).eq('user2_id', b).maybeSingle();
      if (match) {
        Alert.alert('🎉 マッチングしました！', `${current.nickname}さんとメッセージできるようになりました。`, [
          { text: 'あとで' },
          { text: 'メッセージを送る', onPress: () => router.push(`/chat/${match.id}`) },
        ]);
      }
      setStatus((s) => (s ? { ...s, likes_used: s.likes_used + 1 } : s));
    }
    setCandidates((list) => list?.slice(1) ?? null);
    if ((candidates?.length ?? 0) <= 2) load();
  }

  if (!candidates) return <Loading />;

  return (
    <Screen>
      <VerifyBanner />
      {status && (
        <Text style={[styles.sub, { textAlign: 'right' }]}>
          今日のいいね残り {Math.max(0, status.likes_limit - status.likes_used)} / {status.likes_limit}
        </Text>
      )}

      {!current ? (
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 40 }]}>
          <Text style={{ fontSize: 40 }}>🌙</Text>
          <Text style={styles.h2}>今日のおすすめは以上です</Text>
          <Text style={styles.sub}>新しいお相手が登録されたらここに表示されます</Text>
          <Button title="再読み込み" variant="outline" onPress={load} style={{ alignSelf: 'stretch', marginTop: 12 }} />
        </View>
      ) : (
        <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
          {avatarUrl(current.avatar_path) ? (
            <Image source={{ uri: avatarUrl(current.avatar_path)! }} style={{ width: '100%', aspectRatio: 1 }} />
          ) : (
            <View style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.theirs, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 80 }}>👤</Text>
            </View>
          )}
          <View style={{ padding: 16, gap: 6 }}>
            <Text style={styles.h1}>
              {current.nickname} <Text style={{ fontSize: 20, fontWeight: '400' }}>{current.age}歳</Text>
            </Text>
            <Text style={styles.sub}>
              {current.prefecture}・{lastActiveLabel(current.last_active_at)}
            </Text>
            {!!current.bio && <Text style={styles.body}>{current.bio}</Text>}
            <Pressable onPress={() => router.push({ pathname: '/report', params: { userId: current.id, nickname: current.nickname } })}>
              <Text style={[styles.sub, { textAlign: 'right', marginTop: 8 }]}>通報する</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, padding: 16, paddingTop: 0 }}>
            <Button title="スキップ" variant="outline" onPress={() => act('skip')} disabled={busy} style={{ flex: 1 }} />
            <Button title="💗 いいね" onPress={() => act('like')} loading={busy} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </Screen>
  );
}

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { ActionButtons, CandidateCard } from '../../components/CandidateCard';
import { MatchModal, type MatchInfo } from '../../components/MatchModal';
import { Button, Loading, Screen, styles } from '../../components/ui';
import { VerifyBanner } from '../../components/VerifyBanner';
import { useAuth } from '../../lib/auth';
import { errorMessage, supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import type { Candidate, MyStatus } from '../../lib/types';

export default function Discover() {
  const { session, profile } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [status, setStatus] = useState<MyStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [matched, setMatched] = useState<MatchInfo | null>(null);

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
        setMatched({
          matchId: match.id,
          partnerId: current.id,
          nickname: current.nickname,
          partnerAvatar: current.avatar_path,
          myAvatar: profile?.avatar_path ?? null,
          compatibility: current.compatibility,
        });
      }
      setStatus((s) => (s ? { ...s, likes_used: s.likes_used + 1 } : s));
    }
    setCandidates((list) => list?.slice(1) ?? null);
    if ((candidates?.length ?? 0) <= 2) load();
  }

  if (!candidates) return <Loading />;

  const remaining = status ? Math.max(0, status.likes_limit - status.likes_used) : null;

  return (
    <Screen>
      <VerifyBanner />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable onPress={() => router.push('/search-settings')} style={[styles.chip, { flexDirection: 'row', gap: 4 }]}>
          <Text style={{ fontSize: 13, color: colors.text, fontWeight: '700' }}>
            ⚙️ {profile?.pref_age_min}〜{profile?.pref_age_max}歳
          </Text>
        </Pressable>
        {remaining != null && (
          <View style={{ backgroundColor: colors.soft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
            <Text style={{ fontSize: 13, color: colors.primaryDark, fontWeight: '800' }}>♥ 残り {remaining}</Text>
          </View>
        )}
      </View>

      {!current ? (
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 48, gap: 10 }]}>
          <Text style={{ fontSize: 56 }}>🌙</Text>
          <Text style={styles.h2}>今日のおすすめは以上です</Text>
          <Text style={[styles.sub, { textAlign: 'center' }]}>
            新しいお相手が登録されたらここに表示されます。{'\n'}検索条件の年齢を広げると見つかりやすくなります。
          </Text>
          <Button title="もう一度さがす" variant="outline" onPress={load} style={{ alignSelf: 'stretch', marginTop: 12 }} />
        </View>
      ) : (
        <>
          <CandidateCard
            candidate={current}
            myValues={profile?.value_answers ?? {}}
            onReport={() => router.push({ pathname: '/report', params: { userId: current.id, nickname: current.nickname } })}
          />
          <ActionButtons onSkip={() => act('skip')} onLike={() => act('like')} disabled={busy} />
        </>
      )}

      <MatchModal
        match={matched}
        onClose={() => setMatched(null)}
        onMessage={() => {
          const m = matched;
          setMatched(null);
          if (m) router.push({ pathname: '/chat/[matchId]', params: { matchId: m.matchId, name: m.nickname, partnerId: m.partnerId } });
        }}
      />
    </Screen>
  );
}

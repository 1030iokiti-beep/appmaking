import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar, Loading, Screen, styles } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { MatchSummary } from '../../lib/types';

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    : `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function Matches() {
  const { session } = useAuth();
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_my_matches');
    setMatches((data as MatchSummary[]) ?? []);
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // 新着メッセージ・新しいマッチで一覧を更新（RLS により自分宛てのものだけ届く）
  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel('matches-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [session, load]);

  if (!matches) return <Loading />;

  return (
    <Screen>
      {matches.length === 0 && (
        <Text style={styles.sub}>まだマッチングした相手がいません。「さがす」からいいねを送ってみましょう。</Text>
      )}
      {matches.map((m) => (
        <Pressable
          key={m.match_id}
          onPress={() => router.push({ pathname: '/chat/[matchId]', params: { matchId: m.match_id, name: m.nickname, partnerId: m.partner_id } })}
          style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}
        >
          <Avatar path={m.avatar_path} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.h2}>
              {m.nickname} <Text style={styles.sub}>{m.age}歳</Text>
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {m.last_message ?? '🎉 マッチングしました！メッセージを送ってみましょう'}
            </Text>
          </View>
          <Text style={styles.sub}>{timeLabel(m.last_message_at ?? m.matched_at)}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

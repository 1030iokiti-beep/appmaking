import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { TypeBadge } from '../../components/LoveTypeCard';
import { Avatar, Loading, Screen, styles } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { typeGradient } from '../../lib/diagnosis';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
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

  const fresh = matches.filter((m) => !m.last_message);
  const talks = matches.filter((m) => m.last_message);
  const open = (m: MatchSummary) =>
    router.push({ pathname: '/chat/[matchId]', params: { matchId: m.match_id, name: m.nickname, partnerId: m.partner_id } });

  return (
    <Screen>
      {matches.length === 0 && (
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 40, gap: 8 }]}>
          <Text style={{ fontSize: 48 }}>💬</Text>
          <Text style={styles.h2}>まだマッチングした相手がいません</Text>
          <Text style={[styles.sub, { textAlign: 'center' }]}>「さがす」から相性のいい人にいいねを送ってみましょう。</Text>
        </View>
      )}

      {fresh.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={styles.h2}>✨ 新しいマッチ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 4 }}>
            {fresh.map((m) => (
              <Pressable key={m.match_id} onPress={() => open(m)} style={{ alignItems: 'center', gap: 4, width: 84 }}>
                <Avatar path={m.avatar_path} size={72} ring={typeGradient(m.love_type)} />
                <Text style={[styles.label, { fontSize: 13 }]} numberOfLines={1}>
                  {m.nickname}
                </Text>
                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '800' }}>相性 {m.compatibility}%</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {talks.length > 0 && <Text style={styles.h2}>メッセージ</Text>}
      {talks.map((m) => (
        <Pressable
          key={m.match_id}
          onPress={() => open(m)}
          style={({ pressed }) => [styles.card, { flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.8 : 1 }]}
        >
          <Avatar path={m.avatar_path} size={60} ring={typeGradient(m.love_type)} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.h2}>
                {m.nickname} <Text style={styles.sub}>{m.age}歳</Text>
              </Text>
              <Text style={styles.sub}>{timeLabel(m.last_message_at ?? m.matched_at)}</Text>
            </View>
            <Text style={[styles.body, { color: colors.sub }]} numberOfLines={1}>
              {m.last_message}
            </Text>
            <TypeBadge code={m.love_type} compatibility={m.compatibility} />
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Avatar, Button, Loading, Screen, styles } from '../../components/ui';
import { VerifyBanner } from '../../components/VerifyBanner';
import { useAuth } from '../../lib/auth';
import { errorMessage, supabase } from '../../lib/supabase';

type Liker = { id: string; nickname: string; age: number; prefecture: string; bio: string; avatar_path: string | null };

export default function Likes() {
  const { session, profile } = useAuth();
  const [likers, setLikers] = useState<Liker[] | null>(null);
  const [premium, setPremium] = useState(false);

  const load = useCallback(async () => {
    const [l, s] = await Promise.all([supabase.rpc('get_likes_received'), supabase.rpc('get_my_status').single()]);
    setLikers((l.data as Liker[]) ?? []);
    setPremium(!!(s.data as { is_premium?: boolean } | null)?.is_premium);
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function likeBack(l: Liker) {
    if (!session) return;
    if (profile?.verification_status !== 'approved') return router.push('/verify');
    const { error } = await supabase.from('likes').insert({ from_id: session.user.id, to_id: l.id });
    if (error) return Alert.alert('エラー', errorMessage(error));
    Alert.alert('🎉 マッチングしました！', 'トーク画面からメッセージを送ってみましょう。');
    load();
  }

  if (!likers) return <Loading />;

  return (
    <Screen>
      <VerifyBanner />
      <Text style={styles.h2}>あなたにいいねした人：{likers.length}人</Text>

      {!premium && likers.length > 0 && (
        <View style={[styles.card, { alignItems: 'center' }]}>
          <Text style={[styles.body, { textAlign: 'center' }]}>
            プレミアム会員になると、誰がいいねしてくれたか確認して、すぐにマッチングできます。
          </Text>
          <Button title="いいねした人を見る" onPress={() => router.push('/premium')} style={{ alignSelf: 'stretch' }} />
        </View>
      )}

      {likers.map((l) => (
        <View key={l.id} style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Avatar path={l.avatar_path} size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.h2}>
              {l.nickname} {l.age}歳
            </Text>
            <Text style={styles.sub}>{l.prefecture}</Text>
            {!!l.bio && (
              <Text style={styles.sub} numberOfLines={2}>
                {l.bio}
              </Text>
            )}
          </View>
          {premium && <Button title="いいね" onPress={() => likeBack(l)} style={{ paddingHorizontal: 16 }} />}
        </View>
      ))}

      {likers.length === 0 && <Text style={styles.sub}>まだいいねはありません。プロフィール写真と自己紹介を充実させましょう。</Text>}
    </Screen>
  );
}

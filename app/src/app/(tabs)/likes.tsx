import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { Button, Hero, Loading, Screen, styles } from '../../components/ui';
import { VerifyBanner } from '../../components/VerifyBanner';
import { useAuth } from '../../lib/auth';
import { loveType, typeGradient } from '../../lib/diagnosis';
import { avatarUrl, errorMessage, supabase } from '../../lib/supabase';
import { shadow } from '../../lib/theme';

type Liker = {
  id: string;
  nickname: string;
  age: number;
  prefecture: string;
  bio: string;
  avatar_path: string | null;
  love_type: string | null;
  compatibility: number;
};

function LikerTile({ l, locked, onPress }: { l: Liker; locked: boolean; onPress: () => void }) {
  const photo = avatarUrl(l.avatar_path);
  const t = loveType(l.love_type);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width: '48%', transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <View style={[{ borderRadius: 20, overflow: 'hidden', aspectRatio: 3 / 4, backgroundColor: '#fff' }, shadow]}>
        {photo && !locked ? (
          <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <LinearGradient colors={typeGradient(l.love_type)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 56, opacity: locked ? 0.9 : 1 }}>{t?.emoji ?? '👤'}</Text>
            {locked && <Text style={{ fontSize: 22, marginTop: 6 }}>🔒</Text>}
          </LinearGradient>
        )}
        <LinearGradient colors={['transparent', 'rgba(20,8,20,0.7)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' }} />
        <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 12, fontWeight: '900', color: '#E23B69' }}>{l.compatibility}%</Text>
        </View>
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>
            {l.nickname} <Text style={{ fontSize: 14, fontWeight: '600' }}>{l.age}</Text>
          </Text>
          <Text style={{ color: '#fff', fontSize: 11, opacity: 0.9 }}>
            {t ? `${t.emoji} ${t.name}` : l.prefecture}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

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

  function open(l: Liker) {
    if (!premium) return router.push('/premium');
    Alert.alert(`${l.nickname}さん（${l.age}歳・${l.prefecture}）`, l.bio || '自己紹介はまだありません', [
      { text: '閉じる', style: 'cancel' },
      { text: '♥ いいねを返してマッチ', onPress: () => likeBack(l) },
    ]);
  }

  async function likeBack(l: Liker) {
    if (!session) return;
    if (profile?.verification_status !== 'approved') return router.push('/verify');
    const { error } = await supabase.from('likes').insert({ from_id: session.user.id, to_id: l.id });
    if (error) return Alert.alert('エラー', errorMessage(error));
    Alert.alert('🎉 マッチングしました！', 'トーク画面からメッセージを送ってみましょう。');
    load();
  }

  if (!likers) return <Loading />;
  const best = likers.reduce((m, l) => Math.max(m, l.compatibility), 0);

  return (
    <Screen>
      <VerifyBanner />
      {likers.length > 0 && (
        <Hero style={{ gap: 6 }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', opacity: 0.9 }}>あなたにいいねした人</Text>
          <Text style={{ color: '#fff', fontSize: 34, fontWeight: '900' }}>
            {likers.length}
            <Text style={{ fontSize: 18 }}> 人</Text>
          </Text>
          <Text style={{ color: '#fff', fontSize: 14 }}>最高 相性 {best}% のお相手からも届いています 💞</Text>
          {!premium && (
            <Button title="誰からか見てみる" variant="white" onPress={() => router.push('/premium')} style={{ marginTop: 10 }} />
          )}
        </Hero>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 }}>
        {likers.map((l) => (
          <LikerTile key={l.id} l={l} locked={!premium} onPress={() => open(l)} />
        ))}
      </View>

      {likers.length === 0 && (
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 40, gap: 8 }]}>
          <Text style={{ fontSize: 48 }}>💌</Text>
          <Text style={styles.h2}>まだいいねは届いていません</Text>
          <Text style={[styles.sub, { textAlign: 'center' }]}>
            写真と自己紹介を充実させると、いいねが届きやすくなります。
          </Text>
          <Button title="プロフィールを編集" variant="outline" onPress={() => router.push('/edit-profile')} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        </View>
      )}
    </Screen>
  );
}

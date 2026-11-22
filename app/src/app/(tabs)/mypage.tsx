import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Hero, Screen, styles } from '../../components/ui';
import { loveType, typeGradient } from '../../lib/diagnosis';
import { useAuth } from '../../lib/auth';
import { errorMessage, supabase } from '../../lib/supabase';
import { colors, shadow } from '../../lib/theme';

const VERIFY_LABEL = { unsubmitted: '未提出', pending: '審査中', approved: '確認済み ✅', rejected: '要再提出' } as const;

function Row({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
      <Text style={styles.body}>{label}</Text>
      <Text style={styles.sub}>{value ?? '›'}</Text>
    </Pressable>
  );
}

export default function MyPage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [premium, setPremium] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      supabase
        .rpc('get_my_status')
        .single()
        .then(({ data }) => setPremium(!!(data as { is_premium?: boolean } | null)?.is_premium));
    }, []),
  );

  if (!profile) return null;

  function confirmDelete() {
    Alert.alert('退会しますか？', 'プロフィール・マッチ・メッセージはすべて削除され、元に戻せません。有料プランの自動更新はストアの設定から解約してください。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '退会する',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('delete_my_account');
          if (error) return Alert.alert('エラー', errorMessage(error));
          await signOut();
        },
      },
    ]);
  }

  const t = loveType(profile.love_type);
  return (
    <Screen>
      <Hero colors={typeGradient(profile.love_type)} style={{ alignItems: 'center', gap: 8, paddingVertical: 28 }}>
        <Avatar path={profile.avatar_path} size={104} ring={['#fff', '#fff']} />
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>{profile.nickname}</Text>
        <Text style={{ color: '#fff', opacity: 0.9 }}>📍 {profile.prefecture}</Text>
        {t && (
          <Pressable onPress={() => router.push('/my-type')} style={{ backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>
              {t.emoji} {t.name} ›
            </Text>
          </Pressable>
        )}
      </Hero>

      {!premium && (
        <Pressable onPress={() => router.push('/premium')}>
          <LinearGradient colors={['#2B1B3A', '#5B2A86']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: 20, padding: 18, gap: 4 }, shadow]}>
            <Text style={{ color: '#FFD36E', fontSize: 17, fontWeight: '900' }}>👑 プレミアムで出会いを加速</Text>
            <Text style={{ color: '#fff', opacity: 0.9, fontSize: 13 }}>メッセージ送り放題・いいねした人がわかる・いいね1日100回</Text>
          </LinearGradient>
        </Pressable>
      )}

      <View style={[styles.card, { paddingVertical: 4 }]}>
        <Row label="プロフィール編集" onPress={() => router.push('/edit-profile')} />
        <Row label="恋愛タイプ・価値観" onPress={() => router.push('/my-type')} />
        <Row label="検索条件" value={`${profile.pref_age_min}〜${profile.pref_age_max}歳`} onPress={() => router.push('/search-settings')} />
        <Row label="年齢確認" value={VERIFY_LABEL[profile.verification_status]} onPress={() => router.push('/verify')} />
        <Row label="会員ステータス" value={premium ? 'プレミアム 👑' : '無料会員'} onPress={() => router.push('/premium')} />
        <Row label="安全に使うためのガイド" onPress={() => router.push('/legal/guidelines')} />
        <Row label="利用規約" onPress={() => router.push('/legal/terms')} />
        <Row label="プライバシーポリシー" onPress={() => router.push('/legal/privacy')} />
        <Row label="特定商取引法に基づく表記" onPress={() => router.push('/legal/tokushoho')} />
      </View>

      <Button title="ログアウト" variant="outline" onPress={signOut} />
      <Pressable onPress={confirmDelete}>
        <Text style={[styles.sub, { textAlign: 'center', padding: 8 }]}>退会する</Text>
      </Pressable>
    </Screen>
  );
}

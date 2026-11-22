import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, Text, View } from 'react-native';
import { loveType, sharedValues, typeGradient } from '../lib/diagnosis';
import { avatarUrl } from '../lib/supabase';
import { colors, shadow } from '../lib/theme';
import type { Candidate } from '../lib/types';
import { CompatCircle, TypeBadge } from './LoveTypeCard';
import { styles } from './ui';

function lastActiveLabel(iso: string) {
  const h = (Date.now() - new Date(iso).getTime()) / 36e5;
  if (h < 1) return '🟢 オンライン';
  if (h < 24) return '🟡 24時間以内';
  if (h < 72) return '3日以内';
  return '1週間以上';
}

export function CandidateCard({
  candidate: c,
  myValues,
  onReport,
}: {
  candidate: Candidate;
  myValues: Record<string, string>;
  onReport?: () => void;
}) {
  const photo = avatarUrl(c.avatar_path);
  const t = loveType(c.love_type);
  const shared = sharedValues(myValues, c.value_answers);
  return (
    <View style={[{ backgroundColor: '#fff', borderRadius: 28, overflow: 'hidden' }, shadow]}>
      <View style={{ width: '100%', aspectRatio: 4 / 5 }}>
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <LinearGradient colors={typeGradient(c.love_type)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 120 }}>{t?.emoji ?? '👤'}</Text>
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(20,8,20,0.75)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' }}
        />
        <View style={{ position: 'absolute', top: 16, right: 16 }}>
          <CompatCircle value={c.compatibility} />
        </View>
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20, gap: 6 }}>
          <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900' }}>
            {c.nickname} <Text style={{ fontSize: 22, fontWeight: '600' }}>{c.age}</Text>
          </Text>
          <Text style={{ color: '#fff', opacity: 0.9, fontSize: 13 }}>
            📍 {c.prefecture}　{lastActiveLabel(c.last_active_at)}
          </Text>
          <TypeBadge code={c.love_type} light />
        </View>
      </View>

      <View style={{ padding: 20, gap: 12 }}>
        {t && (
          <Text style={{ fontSize: 15, fontWeight: '800', color: typeGradient(c.love_type)[1] }}>
            {t.emoji} 「{t.catch}」
          </Text>
        )}
        {shared.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={styles.label}>🤝 あなたと同じ価値観 {shared.length}個</Text>
            <View style={styles.chips}>
              {shared.map((v) => (
                <View key={v} style={{ backgroundColor: colors.soft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 12, color: colors.primaryDark, fontWeight: '700' }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {!!c.bio && <Text style={styles.body}>{c.bio}</Text>}
        {onReport && (
          <Pressable onPress={onReport} hitSlop={8}>
            <Text style={[styles.sub, { textAlign: 'right', fontSize: 12 }]}>⚠️ 通報する</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** ✕ / ♥ の丸ボタン */
export function ActionButtons({ onSkip, onLike, disabled }: { onSkip: () => void; onLike: () => void; disabled?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 36, marginTop: -4 }}>
      <Pressable onPress={onSkip} disabled={disabled} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.9 : 1 }] }]}>
        <View style={[{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, shadow]}>
          <Text style={{ fontSize: 30, color: '#A898A6' }}>✕</Text>
        </View>
      </Pressable>
      <Pressable onPress={onLike} disabled={disabled} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.9 : 1 }] }]}>
        <LinearGradient
          colors={['#FF4F7E', '#FF8A5C']}
          style={[{ width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }, shadow]}
        >
          <Text style={{ fontSize: 38, color: '#fff' }}>♥</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

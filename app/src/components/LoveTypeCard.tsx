import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { AXES, bestMatchCode, loveType, TYPE_GROUPS, typeGradient, type Axis, type AxisScores } from '../lib/diagnosis';
import { colors } from '../lib/theme';
import { StoryCard, STORY_H, STORY_W } from './StoryCard';
import { Button, Hero, styles } from './ui';

/** 「🔥 全力ヒーロー型」のタイプ色ピル */
export function TypeBadge({ code, compatibility, light }: { code: string | null; compatibility?: number | null; light?: boolean }) {
  const t = loveType(code);
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {t &&
        (light ? (
          <View style={[pill, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>
              {t.emoji} {t.name}
            </Text>
          </View>
        ) : (
          <LinearGradient colors={typeGradient(code)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pill}>
            <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>
              {t.emoji} {t.name}
            </Text>
          </LinearGradient>
        ))}
      {compatibility != null && <CompatPill value={compatibility} />}
    </View>
  );
}
const pill = { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 };

export function CompatPill({ value }: { value: number }) {
  return (
    <View style={[pill, { backgroundColor: colors.soft }]}>
      <Text style={{ fontSize: 12, color: colors.primaryDark, fontWeight: '800' }}>💞 相性 {value}%</Text>
    </View>
  );
}

/** 写真の上に重ねる丸い相性バッジ */
export function CompatCircle({ value, size = 68 }: { value: number; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.primary }}>
      <Text style={{ fontSize: 9, color: colors.sub, fontWeight: '700' }}>相性</Text>
      <Text style={{ fontSize: size * 0.3, color: colors.primary, fontWeight: '900', marginTop: -2 }}>
        {value}
        <Text style={{ fontSize: size * 0.16 }}>%</Text>
      </Text>
    </View>
  );
}

function AxisBar({ axis, score, gradient }: { axis: Axis; score: number; gradient: readonly [string, string] }) {
  const a = AXES[axis];
  const leftPct = Math.round((score + 100) / 2);
  const leftWins = score >= 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[styles.sub, leftWins && { color: gradient[1], fontWeight: '800' }]}>
          {a.left} {leftPct}%
        </Text>
        <Text style={[styles.sub, !leftWins && { color: gradient[1], fontWeight: '800' }]}>
          {100 - leftPct}% {a.right}
        </Text>
      </View>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: '#F3ECF1', overflow: 'hidden' }}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${leftPct}%`, height: 10, borderRadius: 5 }} />
      </View>
    </View>
  );
}

/** ストーリーズ用画像のプレビューと共有 */
function StoryShareModal({ code, scores, visible, onClose }: { code: string; scores?: AxisScores | null; visible: boolean; onClose: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1, width: 1080, height: 1920 });
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: '診断結果をシェア' });
      } else {
        Alert.alert('この端末では画像の共有ができません');
      }
    } catch (e) {
      Alert.alert('画像を作成できませんでした', String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.screen, { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20 }]}>
        <View style={{ borderRadius: 20, overflow: 'hidden', transform: [{ scale: 0.9 }] }}>
          <StoryCard captureRef={ref} code={code} scores={scores} />
        </View>
        <Text style={styles.sub}>Instagram のストーリーズにそのまま投稿できます</Text>
        <Button title="画像をシェア・保存" onPress={share} loading={busy} style={{ alignSelf: 'stretch' }} />
        <Text style={styles.link} onPress={onClose}>
          閉じる
        </Text>
      </SafeAreaView>
    </Modal>
  );
}
export { STORY_H, STORY_W };

/** 診断結果。scores があれば各軸のバーも表示 */
export function LoveTypeResult({ code, scores }: { code: string; scores?: AxisScores | null }) {
  const [storyOpen, setStoryOpen] = useState(false);
  const t = loveType(code);
  const bestCode = bestMatchCode(code);
  const best = loveType(bestCode);
  const gradient = typeGradient(code);
  if (!t) return null;

  return (
    <View style={{ gap: 16 }}>
      <Hero colors={gradient} style={{ alignItems: 'center', paddingVertical: 32, gap: 4 }}>
        <Text style={{ color: '#fff', opacity: 0.9, fontWeight: '600' }}>あなたの恋愛タイプは…</Text>
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginVertical: 8 }}>
          <Text style={{ fontSize: 68 }}>{t.emoji}</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900' }}>{t.name}</Text>
        <Text style={{ color: '#fff', opacity: 0.85, fontWeight: '600' }}>
          <Text style={{ letterSpacing: 4 }}>{code}</Text>　{TYPE_GROUPS[code.slice(0, 2)]?.label}グループ
        </Text>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 10, textAlign: 'center' }}>「{t.catch}」</Text>
        <Text style={{ color: '#fff', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 6, opacity: 0.95 }}>{t.description}</Text>
      </Hero>

      {scores && (
        <View style={[styles.card, { gap: 14 }]}>
          <Text style={styles.h2}>あなたの恋愛バランス</Text>
          {(Object.keys(AXES) as Axis[]).map((a) => (
            <AxisBar key={a} axis={a} score={scores[a]} gradient={gradient} />
          ))}
        </View>
      )}

      {best && (
        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
          <LinearGradient colors={typeGradient(bestCode)} style={{ width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 30 }}>{best.emoji}</Text>
          </LinearGradient>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.sub}>💘 相性のいいタイプ</Text>
            <Text style={styles.h2}>{best.name}</Text>
            <Text style={styles.sub}>恋愛のテンポや距離感が近く、リードと寄り添いでバランスが取れる二人。</Text>
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="📸 ストーリーズ用画像" variant="outline" onPress={() => setStoryOpen(true)} style={{ flex: 1 }} />
        <Pressable
          onPress={() => Share.share({ message: `私の恋愛タイプは「${t.emoji}${t.name}」でした！\n${t.catch}\n#こいまち診断 #恋愛タイプ診断` })}
          style={{ width: 54, borderRadius: 27, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}
        >
          <Text style={{ fontSize: 20 }}>↗︎</Text>
        </Pressable>
      </View>
      <StoryShareModal code={code} scores={scores} visible={storyOpen} onClose={() => setStoryOpen(false)} />
    </View>
  );
}

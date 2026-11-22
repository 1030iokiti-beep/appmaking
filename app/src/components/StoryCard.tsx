import { LinearGradient } from 'expo-linear-gradient';
import type { RefObject } from 'react';
import { Text, View } from 'react-native';
import { AXES, bestMatchCode, loveType, typeGradient, type Axis, type AxisScores } from '../lib/diagnosis';

export const STORY_W = 360;
export const STORY_H = 640;

/**
 * Instagram ストーリーズ用（9:16）の診断結果カード。
 * 360×640 で描画し、captureRef で 1080×1920 に書き出す
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function StoryCard({ code, scores, captureRef: ref }: { code: string; scores?: AxisScores | null; captureRef?: RefObject<any> }) {
  const t = loveType(code)!;
  const best = loveType(bestMatchCode(code));
  return (
    <View ref={ref} collapsable={false} style={{ width: STORY_W, height: STORY_H }}>
      <LinearGradient colors={typeGradient(code)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 28, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 3, opacity: 0.9 }}>LOVE TYPE CHECK</Text>
          <Text style={{ color: '#fff', fontSize: 15, opacity: 0.95 }}>わたしの恋愛タイプは…</Text>
        </View>

        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 84 }}>{t.emoji}</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 34, fontWeight: '900', marginTop: 8 }}>{t.name}</Text>
          <Text style={{ color: '#fff', fontSize: 14, letterSpacing: 6, opacity: 0.85 }}>{code}</Text>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 6 }}>「{t.catch}」</Text>
        </View>

        {scores && (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, padding: 14, gap: 9 }}>
            {(Object.keys(AXES) as Axis[]).map((a) => {
              const pct = Math.round((scores[a] + 100) / 2);
              return (
                <View key={a} style={{ gap: 3 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: pct >= 50 ? '800' : '400' }}>{AXES[a].left}</Text>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: pct < 50 ? '800' : '400' }}>{AXES[a].right}</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' }}>
                    <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ alignItems: 'center', gap: 4 }}>
          {best && (
            <Text style={{ color: '#fff', fontSize: 13 }}>
              相性のいいタイプ：{best.emoji} {best.name}
            </Text>
          )}
          <View style={{ backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8, marginTop: 6 }}>
            <Text style={{ color: typeGradient(code)[1], fontWeight: '800', fontSize: 13 }}>💞 こいまち で恋愛タイプ診断</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 11, opacity: 0.85 }}>#こいまち診断 #恋愛タイプ診断</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

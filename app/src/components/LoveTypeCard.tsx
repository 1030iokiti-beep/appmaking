import { Share, Text, View } from 'react-native';
import { AXES, bestMatchCode, loveType, type Axis, type AxisScores } from '../lib/diagnosis';
import { colors } from '../lib/theme';
import { Button, styles } from './ui';

export function TypeBadge({ code, compatibility }: { code: string | null; compatibility?: number | null }) {
  const t = loveType(code);
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
      {t && (
        <View style={[badge, { backgroundColor: '#FFEFF3' }]}>
          <Text style={{ fontSize: 12, color: colors.primaryDark, fontWeight: '600' }}>
            {t.emoji} {t.name}
          </Text>
        </View>
      )}
      {compatibility != null && (
        <View style={[badge, { backgroundColor: colors.primary }]}>
          <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>相性 {compatibility}%</Text>
        </View>
      )}
    </View>
  );
}
const badge = { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 };

function AxisBar({ axis, score }: { axis: Axis; score: number }) {
  const a = AXES[axis];
  const leftPct = Math.round((score + 100) / 2); // 左側の割合
  const leftWins = score >= 0;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[styles.sub, leftWins && { color: colors.primaryDark, fontWeight: '700' }]}>
          {a.left} {leftPct}%
        </Text>
        <Text style={[styles.sub, !leftWins && { color: colors.primaryDark, fontWeight: '700' }]}>
          {100 - leftPct}% {a.right}
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.theirs, overflow: 'hidden' }}>
        <View style={{ width: `${leftPct}%`, height: 8, backgroundColor: colors.primary }} />
      </View>
    </View>
  );
}

/** 診断結果カード。scores があれば各軸のバーも表示 */
export function LoveTypeResult({ code, scores }: { code: string; scores?: AxisScores | null }) {
  const t = loveType(code);
  const best = loveType(bestMatchCode(code));
  if (!t) return null;

  async function share() {
    await Share.share({
      message: `私の恋愛タイプは「${t!.emoji}${t!.name}」でした！\n${t!.catch}\n\n#こいまち診断 #恋愛タイプ診断`,
    });
  }

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.card, { alignItems: 'center', paddingVertical: 28 }]}>
        <Text style={styles.sub}>あなたの恋愛タイプは…</Text>
        <Text style={{ fontSize: 64 }}>{t.emoji}</Text>
        <Text style={[styles.h1, { color: colors.primary }]}>{t.name}</Text>
        <Text style={[styles.sub, { letterSpacing: 2 }]}>{code}</Text>
        <Text style={[styles.h2, { textAlign: 'center' }]}>「{t.catch}」</Text>
        <Text style={[styles.body, { textAlign: 'center' }]}>{t.description}</Text>
      </View>

      {scores && (
        <View style={[styles.card, { gap: 12 }]}>
          {(Object.keys(AXES) as Axis[]).map((a) => (
            <AxisBar key={a} axis={a} score={scores[a]} />
          ))}
        </View>
      )}

      {best && (
        <View style={styles.card}>
          <Text style={styles.sub}>相性のいいタイプ</Text>
          <Text style={styles.h2}>
            {best.emoji} {best.name}
          </Text>
          <Text style={styles.sub}>恋愛のテンション・距離感・ペースが近く、リードする側と合わせる側でバランスが取れる組み合わせです。</Text>
        </View>
      )}

      <Button title="結果をシェアする" variant="outline" onPress={share} />
    </View>
  );
}

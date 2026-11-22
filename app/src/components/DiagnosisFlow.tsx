import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { LIKERT, LOVE_TYPES, QUESTIONS, scoreAnswers, typeCode, VALUE_QUESTIONS, type ValueAnswers } from '../lib/diagnosis';
import { errorMessage, supabase } from '../lib/supabase';
import { brandGradient, colors } from '../lib/theme';
import { LoveTypeResult } from './LoveTypeCard';
import { Button, Chips, Hero, Screen, styles } from './ui';

type Phase = 'intro' | 'questions' | 'values' | 'result';

/**
 * 恋愛タイプ診断（20問）→ 価値観（7問）→ 結果表示 → 保存
 * onDone は保存後に呼ばれる
 */
export function DiagnosisFlow({ onDone, firstTime }: { onDone: () => void; firstTime: boolean }) {
  const { session, profile, refreshProfile } = useAuth();
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [values, setValues] = useState<ValueAnswers>((profile?.value_answers as ValueAnswers) ?? {});
  const [busy, setBusy] = useState(false);

  const scores = scoreAnswers(answers);
  const code = typeCode(scores);

  function answer(v: number) {
    const next = [...answers];
    next[index] = v;
    setAnswers(next);
    // 選んだ丸が一瞬光ってから次へ
    setTimeout(() => {
      if (index + 1 < QUESTIONS.length) setIndex(index + 1);
      else setPhase('values');
    }, 180);
  }

  async function save() {
    if (!session) return;
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        axis_passion: scores.passion,
        axis_lead: scores.lead,
        axis_together: scores.together,
        axis_tempo: scores.tempo,
        value_answers: values,
      })
      .eq('id', session.user.id);
    if (error) {
      setBusy(false);
      return Alert.alert('保存できませんでした', errorMessage(error));
    }
    await refreshProfile();
    setBusy(false);
    onDone();
  }

  if (phase === 'intro') {
    return (
      <Screen>
        <Hero style={{ alignItems: 'center', paddingVertical: 28, gap: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '700', letterSpacing: 2, opacity: 0.9 }}>LOVE TYPE CHECK</Text>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>恋愛タイプ診断</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginVertical: 8, maxWidth: 260 }}>
            {Object.entries(LOVE_TYPES).map(([code, t]) => (
              <View key={code} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 26 }}>{t.emoji}</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: '#fff', fontSize: 15, lineHeight: 23, textAlign: 'center' }}>
            20の質問で、あなたは16タイプのどれ？{'\n'}結果と価値観から、相性のいい人を紹介します。
          </Text>
        </Hero>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
          <Text style={styles.sub}>⏱ 約3分</Text>
          <Text style={styles.sub}>📝 20問＋価値観7問</Text>
        </View>
        <Button title="診断をはじめる" onPress={() => setPhase('questions')} />
      </Screen>
    );
  }

  if (phase === 'questions') {
    const q = QUESTIONS[index];
    const SIZES = [54, 44, 34, 44, 54];
    return (
      <Screen>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#F3E6EB', overflow: 'hidden' }}>
            <LinearGradient
              colors={brandGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: `${((index + 1) / QUESTIONS.length) * 100}%`, height: 8 }}
            />
          </View>
          <Text style={[styles.sub, { fontWeight: '700' }]}>
            {index + 1}/{QUESTIONS.length}
          </Text>
        </View>

        <View style={[styles.card, { minHeight: 200, justifyContent: 'center', alignItems: 'center', paddingVertical: 32 }]}>
          <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 14, letterSpacing: 2 }}>Q{index + 1}</Text>
          <Text style={{ fontSize: 22, lineHeight: 34, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 8 }}>{q.text}</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginTop: 8 }}>
          {LIKERT.map((o, i) => {
            const selected = answers[index] === o.value;
            const agree = o.value > 3;
            const tint = o.value === 3 ? '#C9BCC6' : agree ? colors.primary : '#8A7CF0';
            return (
              <Pressable key={o.value} onPress={() => answer(o.value)} hitSlop={6} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.88 : 1 }] })}>
                <View
                  style={{
                    width: SIZES[i], height: SIZES[i], borderRadius: SIZES[i] / 2, borderWidth: 3, borderColor: tint,
                    backgroundColor: selected ? tint : '#fff', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {selected && <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>あてはまる</Text>
          <Text style={{ color: '#8A7CF0', fontWeight: '800' }}>あてはまらない</Text>
        </View>

        {index > 0 && (
          <Text style={[styles.link, { marginTop: 16 }]} onPress={() => setIndex(index - 1)}>
            ← ひとつ前に戻る
          </Text>
        )}
      </Screen>
    );
  }

  if (phase === 'values') {
    const complete = VALUE_QUESTIONS.every((q) => values[q.key]);
    return (
      <Screen>
        <Text style={styles.h1}>あと少し！</Text>
        <Text style={styles.sub}>価値観が同じ人ほど相性％が高くなります。プロフィールにも表示されます。</Text>
        {VALUE_QUESTIONS.map((q) => (
          <View key={q.key} style={[styles.card, { gap: 10 }]}>
            <Text style={styles.label}>{q.label}</Text>
            <Chips options={q.options} value={values[q.key] ?? null} onChange={(v) => setValues({ ...values, [q.key]: v })} />
          </View>
        ))}
        <Button title="診断結果を見る" onPress={() => setPhase('result')} disabled={!complete} />
      </Screen>
    );
  }

  return (
    <Screen>
      <LoveTypeResult code={code} scores={scores} />
      <Button title={firstTime ? '相性のいいお相手を見る' : 'この結果で保存する'} onPress={save} loading={busy} />
      {!firstTime && <Text style={styles.link} onPress={onDone}>保存せずに戻る</Text>}
    </Screen>
  );
}

import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { LIKERT, QUESTIONS, scoreAnswers, typeCode, VALUE_QUESTIONS, type ValueAnswers } from '../lib/diagnosis';
import { errorMessage, supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { LoveTypeResult } from './LoveTypeCard';
import { Button, Chips, Screen, styles } from './ui';

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
    if (index + 1 < QUESTIONS.length) setIndex(index + 1);
    else setPhase('values');
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
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
          <Text style={{ fontSize: 56 }}>💞</Text>
          <Text style={[styles.h1, { textAlign: 'center' }]}>恋愛タイプ診断</Text>
          <Text style={[styles.body, { textAlign: 'center' }]}>
            20の質問で、あなたの恋愛タイプを16タイプから診断します。{'\n'}
            結果と価値観をもとに、相性のいいお相手を紹介します。
          </Text>
          <Text style={styles.sub}>所要時間：約3分</Text>
        </View>
        <Button title="診断をはじめる" onPress={() => setPhase('questions')} />
      </Screen>
    );
  }

  if (phase === 'questions') {
    const q = QUESTIONS[index];
    return (
      <Screen>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.theirs }}>
          <View style={{ width: `${(index / QUESTIONS.length) * 100}%`, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
        </View>
        <Text style={styles.sub}>
          Q{index + 1} / {QUESTIONS.length}
        </Text>
        <Text style={[styles.h2, { fontSize: 20, lineHeight: 30, minHeight: 90 }]}>{q.text}</Text>
        <View style={{ gap: 10 }}>
          {LIKERT.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => answer(o.value)}
              style={({ pressed }) => [
                styles.card,
                { paddingVertical: 14, alignItems: 'center' },
                (pressed || answers[index] === o.value) && { borderColor: colors.primary, backgroundColor: '#FFEFF3' },
              ]}
            >
              <Text style={styles.body}>{o.label.replace('\n', '')}</Text>
            </Pressable>
          ))}
        </View>
        {index > 0 && <Text style={styles.link} onPress={() => setIndex(index - 1)}>← ひとつ前に戻る</Text>}
      </Screen>
    );
  }

  if (phase === 'values') {
    const complete = VALUE_QUESTIONS.every((q) => values[q.key]);
    return (
      <Screen>
        <Text style={styles.h2}>あなたの価値観を教えてください</Text>
        <Text style={styles.sub}>同じ価値観の人ほど相性スコアが高くなります。プロフィールにも表示されます。</Text>
        {VALUE_QUESTIONS.map((q) => (
          <View key={q.key} style={{ gap: 8 }}>
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

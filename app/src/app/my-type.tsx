import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { LoveTypeResult } from '../components/LoveTypeCard';
import { Button, Screen, styles } from '../components/ui';
import { useAuth } from '../lib/auth';
import { valueLabel, VALUE_QUESTIONS } from '../lib/diagnosis';

export default function MyType() {
  const { profile } = useAuth();
  if (!profile?.love_type) return null;
  const scores = {
    passion: profile.axis_passion ?? 0,
    lead: profile.axis_lead ?? 0,
    together: profile.axis_together ?? 0,
    tempo: profile.axis_tempo ?? 0,
  };
  return (
    <Screen>
      <LoveTypeResult code={profile.love_type} scores={scores} />
      <View style={styles.card}>
        <Text style={styles.h2}>あなたの価値観</Text>
        {VALUE_QUESTIONS.map((q) => (
          <Text key={q.key} style={styles.body}>
            {q.label}：{valueLabel(q.key, profile.value_answers[q.key]) ?? '未回答'}
          </Text>
        ))}
      </View>
      <Button title="診断をやり直す" variant="outline" onPress={() => router.push('/retake')} />
    </Screen>
  );
}

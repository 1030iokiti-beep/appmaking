import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Button, Chips, Field, Screen, styles } from '../components/ui';
import { useAuth } from '../lib/auth';
import { errorMessage, supabase } from '../lib/supabase';
import { REPORT_REASONS } from '../lib/types';

type Reason = (typeof REPORT_REASONS)[number]['value'];

export default function Report() {
  const { userId, nickname } = useLocalSearchParams<{ userId: string; nickname?: string }>();
  const { session } = useAuth();
  const [reason, setReason] = useState<Reason | null>(null);
  const [detail, setDetail] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!session || !reason) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('reports').insert({ reporter_id: session.user.id, reported_id: userId, reason, detail: detail.trim() });
      if (error) throw error;
      if (alsoBlock) await supabase.from('blocks').insert({ blocker_id: session.user.id, blocked_id: userId });
      Alert.alert('通報を受け付けました', '運営が内容を確認し、規約違反があれば対応します。ご協力ありがとうございます。');
      router.dismissAll();
    } catch (e) {
      Alert.alert('送信できませんでした', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.h2}>{nickname ? `${nickname}さんを通報` : '通報'}</Text>
      <Text style={styles.label}>理由</Text>
      <Chips options={REPORT_REASONS} value={reason} onChange={setReason} />
      <Field label="詳細（任意）" value={detail} onChangeText={setDetail} multiline maxLength={1000} />
      <Chips
        options={[
          { value: 'yes', label: 'この人をブロックする' },
          { value: 'no', label: 'ブロックしない' },
        ]}
        value={alsoBlock ? 'yes' : 'no'}
        onChange={(v) => setAlsoBlock(v === 'yes')}
      />
      <Text style={styles.sub}>通報したことは相手に通知されません。</Text>
      <Button title="通報する" variant="danger" onPress={submit} loading={busy} disabled={!reason} />
    </Screen>
  );
}

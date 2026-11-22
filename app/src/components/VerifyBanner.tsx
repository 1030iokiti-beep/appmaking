import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useAuth } from '../lib/auth';
import { styles } from './ui';

/** 年齢確認が済んでいないときに表示する案内 */
export function VerifyBanner() {
  const { profile } = useAuth();
  const status = profile?.verification_status;
  if (!status || status === 'approved') return null;
  const text =
    status === 'pending'
      ? '年齢確認を審査中です。完了するといいね・メッセージができるようになります。'
      : status === 'rejected'
        ? '年齢確認が否認されました。タップして再提出してください。'
        : '年齢確認をすると、いいね・メッセージができるようになります。タップして提出 →';
  return (
    <Pressable onPress={() => router.push('/verify')} style={[styles.notice, { backgroundColor: '#FFF4E5', borderColor: '#F5C27A' }]}>
      <Text style={styles.noticeText}>{text}</Text>
    </Pressable>
  );
}

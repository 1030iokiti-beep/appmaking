import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, styles } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function Banned() {
  const { signOut } = useAuth();
  return (
    <SafeAreaView style={[styles.screen, { padding: 24, gap: 16, justifyContent: 'center' }]}>
      <Text style={styles.h1}>ご利用を停止しています</Text>
      <Text style={styles.body}>
        利用規約に違反する行為が確認されたため、アカウントの利用を停止しました。お問い合わせはサポート窓口までご連絡ください。
      </Text>
      <Button title="ログアウト" variant="outline" onPress={signOut} />
    </SafeAreaView>
  );
}

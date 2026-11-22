import { Link, router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Notice, styles } from '../../components/ui';
import { colors } from '../../lib/theme';

export default function Welcome() {
  return (
    <SafeAreaView style={[styles.screen, { justifyContent: 'space-between', padding: 24 }]}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Text style={{ fontSize: 64 }}>💞</Text>
        <Text style={[styles.h1, { fontSize: 34, color: colors.primary }]}>こいまち</Text>
        <Text style={[styles.body, { textAlign: 'center' }]}>
          恋愛タイプ診断と価値観で{'\n'}相性のいい人と出会える
        </Text>
      </View>
      <View style={{ gap: 12 }}>
        <Notice>
          本サービスは20歳以上の方のみご利用いただけます。現在は関東エリア限定です。
          メッセージのやりとりには公的書類による年齢確認が必要です。
        </Notice>
        <Button title="はじめる（無料）" onPress={() => router.push('/signup')} />
        <Button title="ログイン" variant="outline" onPress={() => router.push('/login')} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          <Link href="/legal/terms" style={styles.sub}>利用規約</Link>
          <Link href="/legal/privacy" style={styles.sub}>プライバシーポリシー</Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

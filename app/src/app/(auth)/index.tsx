import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui';
import { LOVE_TYPES, typeGradient } from '../../lib/diagnosis';
import { brandGradient } from '../../lib/theme';

// 背景に浮かべるタイプのアイコン（位置は固定で散らす）
const BUBBLES: { code: string; top: string; left: string; size: number; rotate: string }[] = [
  { code: 'PLTS', top: '4%', left: '6%', size: 76, rotate: '-8deg' },
  { code: 'CFIS', top: '2%', left: '64%', size: 88, rotate: '10deg' },
  { code: 'PFTD', top: '26%', left: '36%', size: 70, rotate: '4deg' },
  { code: 'CLTD', top: '40%', left: '74%', size: 62, rotate: '-6deg' },
  { code: 'PFIS', top: '48%', left: '2%', size: 66, rotate: '12deg' },
  { code: 'CLIS', top: '62%', left: '46%', size: 50, rotate: '-10deg' },
  { code: 'PLID', top: '72%', left: '82%', size: 44, rotate: '6deg' },
]

export default function Welcome() {
  return (
    <LinearGradient colors={[brandGradient[0], '#FF6F6F', brandGradient[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          {BUBBLES.map((b) => (
            <LinearGradient
              key={b.code}
              colors={typeGradient(b.code)}
              style={{
                position: 'absolute', top: b.top as `${number}%`, left: b.left as `${number}%`, width: b.size, height: b.size, borderRadius: b.size / 2,
                alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.7)', transform: [{ rotate: b.rotate }],
              }}
            >
              <Text style={{ fontSize: b.size * 0.48 }}>{LOVE_TYPES[b.code].emoji}</Text>
            </LinearGradient>
          ))}
        </View>

        <View style={{ gap: 14, marginTop: 12 }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 2 }}>💞 こいまち</Text>
          <Text style={{ color: '#fff', fontSize: 38, fontWeight: '900', lineHeight: 50 }}>
            相性で選ぶ、{'\n'}新しい恋。
          </Text>
          <Text style={{ color: '#fff', fontSize: 16, lineHeight: 25, opacity: 0.95 }}>
            3分の恋愛タイプ診断で、{'\n'}価値観の合う人と出会える。
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {['16タイプ診断', '相性％でわかる', '全員 年齢確認済み'].map((t) => (
              <View key={t} style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓ {t}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ gap: 12, marginTop: 28 }}>
          <Button title="無料で診断をはじめる" variant="white" onPress={() => router.push('/signup')} />
          <Button title="ログイン" variant="ghost" onPress={() => router.push('/login')} />
          <Text style={{ color: '#fff', fontSize: 11, textAlign: 'center', opacity: 0.9, lineHeight: 17 }}>
            18歳未満・高校生の方はご利用いただけません{'\n'}
            <Link href="/legal/terms" style={{ textDecorationLine: 'underline', color: '#fff' }}>利用規約</Link>
            {'　'}
            <Link href="/legal/privacy" style={{ textDecorationLine: 'underline', color: '#fff' }}>プライバシーポリシー</Link>
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

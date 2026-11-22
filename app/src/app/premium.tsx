import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { Button, Loading, Notice, Screen, styles } from '../components/ui';
import { useAuth } from '../lib/auth';
import { buy, getPremiumPackages, purchasesEnabled, restore } from '../lib/purchases';
import { errorMessage, supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

const BENEFITS = [
  ['💬', 'メッセージが送り放題'],
  ['💗', 'いいねしてくれた人がわかる'],
  ['🚀', 'いいねが1日10回 → 100回に'],
];

/** 購入後、Webhook がサーバーに反映するまで少し待ってから確認する */
async function waitForPremium() {
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase.rpc('get_my_status').single();
    if ((data as { is_premium?: boolean } | null)?.is_premium) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

export default function Premium() {
  const { profile } = useAuth();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getPremiumPackages()
      .then(setPackages)
      .catch(() => setPackages([]));
  }, []);

  async function purchase(pkg: PurchasesPackage) {
    setBusy(pkg.identifier);
    try {
      await buy(pkg);
      const ok = await waitForPremium();
      Alert.alert(ok ? 'ご登録ありがとうございます！' : '購入を処理中です', ok ? 'プレミアム機能が使えるようになりました。' : '反映まで数分かかる場合があります。');
      router.back();
    } catch (e) {
      if ((e as { userCancelled?: boolean }).userCancelled) return;
      Alert.alert('購入できませんでした', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (!packages) return <Loading />;

  return (
    <Screen>
      <LinearGradient colors={['#2B1B3A', '#5B2A86', '#C2407A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 24, alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 48 }}>👑</Text>
        <Text style={{ color: '#FFD36E', fontSize: 26, fontWeight: '900' }}>こいまち プレミアム</Text>
        <Text style={{ color: '#fff', textAlign: 'center', opacity: 0.9 }}>相性のいい人と、もっと早く出会える</Text>
      </LinearGradient>
      {profile?.gender === 'female' && <Notice>女性はメッセージ機能を無料でご利用いただけます。プレミアムでは「いいねした人がわかる」などの機能が追加されます。</Notice>}
      <View style={[styles.card, { gap: 14 }]}>
        {BENEFITS.map(([icon, text]) => (
          <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>{icon}</Text>
            </View>
            <Text style={[styles.body, { fontSize: 16, fontWeight: '700' }]}>{text}</Text>
          </View>
        ))}
      </View>

      {!purchasesEnabled && <Notice tone="warn">課金設定（RevenueCat のAPIキー）が未設定です。docs/SETUP.md を参照してください。</Notice>}

      {packages.map((p) => (
        <View key={p.identifier} style={[styles.card, { borderColor: colors.primary }]}>
          <Text style={styles.h2}>{p.product.title}</Text>
          <Text style={[styles.h1, { color: colors.primary }]}>{p.product.priceString}</Text>
          {!!p.product.description && <Text style={styles.sub}>{p.product.description}</Text>}
          <Button title="このプランで登録" onPress={() => purchase(p)} loading={busy === p.identifier} disabled={!!busy} />
        </View>
      ))}

      <Button
        title="購入を復元する"
        variant="outline"
        onPress={async () => {
          try {
            await restore();
            const ok = await waitForPremium();
            Alert.alert(ok ? '復元しました' : '有効な購入が見つかりませんでした');
          } catch (e) {
            Alert.alert('エラー', errorMessage(e));
          }
        }}
      />

      <Text style={styles.sub}>
        ・お支払いは購入確定時に App Store / Google Play アカウントに請求されます。{'\n'}
        ・期間終了の24時間以上前に自動更新をオフにしない限り、契約は自動で更新されます。{'\n'}
        ・解約は App Store / Google Play のサブスクリプション設定から行えます。アプリを削除・退会しても自動では解約されません。
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
        <Text style={styles.link} onPress={() => router.push('/legal/terms')}>利用規約</Text>
        <Text style={styles.link} onPress={() => router.push('/legal/privacy')}>プライバシー</Text>
        <Text style={styles.link} onPress={() => router.push('/legal/tokushoho')}>特商法表記</Text>
      </View>
    </Screen>
  );
}

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Loading } from '../components/ui';
import { AuthProvider, useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

function RootNavigator() {
  const { loading, session, profile } = useAuth();
  if (loading) return <Loading />;

  const signedIn = !!session;
  const hasProfile = !!profile;
  const banned = !!profile?.is_banned;
  const diagnosed = !!profile?.love_type;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !hasProfile}>
        <Stack.Screen name="onboarding" options={{ title: 'プロフィール作成', headerBackVisible: false }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && banned}>
        <Stack.Screen name="banned" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && hasProfile && !banned && !diagnosed}>
        <Stack.Screen name="diagnosis" options={{ title: '恋愛タイプ診断', headerBackVisible: false }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && hasProfile && !banned && diagnosed}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="my-type" options={{ title: 'あなたの恋愛タイプ' }} />
        <Stack.Screen name="retake" options={{ title: '恋愛タイプ診断' }} />
        <Stack.Screen name="search-settings" options={{ title: '検索条件' }} />
        <Stack.Screen name="chat/[matchId]" options={{ title: 'トーク' }} />
        <Stack.Screen name="verify" options={{ title: '年齢確認' }} />
        <Stack.Screen name="premium" options={{ title: 'プレミアム会員', presentation: 'modal' }} />
        <Stack.Screen name="edit-profile" options={{ title: 'プロフィール編集' }} />
        <Stack.Screen name="report" options={{ title: '通報する', presentation: 'modal' }} />
      </Stack.Protected>

      <Stack.Screen name="legal/[doc]" options={{ title: '' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}

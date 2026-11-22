import { Stack } from 'expo-router';
import { colors } from '../../lib/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '800' },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'ログイン' }} />
      <Stack.Screen name="signup" options={{ title: '新規登録' }} />
    </Stack>
  );
}

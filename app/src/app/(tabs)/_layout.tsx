import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../lib/theme';

function icon(emoji: string) {
  return ({ focused }: { focused: boolean }) => <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'さがす', tabBarIcon: icon('🔍') }} />
      <Tabs.Screen name="likes" options={{ title: 'いいね', tabBarIcon: icon('💗') }} />
      <Tabs.Screen name="matches" options={{ title: 'トーク', tabBarIcon: icon('💬') }} />
      <Tabs.Screen name="mypage" options={{ title: 'マイページ', tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}

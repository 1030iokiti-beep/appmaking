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
        tabBarInactiveTintColor: '#B3A6B1',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: { borderTopWidth: 0, backgroundColor: '#fff', shadowColor: '#C2185B', shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 },
        headerTitleStyle: { color: colors.text, fontWeight: '800' },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'さがす', headerTitle: '💞 相性のいいお相手', tabBarIcon: icon('🔍') }} />
      <Tabs.Screen name="likes" options={{ title: 'いいね', tabBarIcon: icon('💗') }} />
      <Tabs.Screen name="matches" options={{ title: 'トーク', tabBarIcon: icon('💬') }} />
      <Tabs.Screen name="mypage" options={{ title: 'マイページ', tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}

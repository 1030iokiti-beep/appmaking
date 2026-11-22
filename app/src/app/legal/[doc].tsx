import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Screen, styles } from '../../components/ui';
import { LEGAL } from '../../lib/legal';

export default function LegalDoc() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const content = LEGAL[doc ?? ''];
  return (
    <Screen>
      <Stack.Screen options={{ title: content?.title ?? '' }} />
      <Text style={[styles.body, { lineHeight: 24 }]}>{content?.body ?? 'ページが見つかりません'}</Text>
    </Screen>
  );
}

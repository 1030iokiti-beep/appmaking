import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { avatarUrl } from '../lib/supabase';
import { brandGradient, colors, shadow } from '../lib/theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'white' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  const textColor = variant === 'outline' || variant === 'white' ? colors.primary : '#fff'; // ghost は白文字
  const inner = loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        { borderRadius: 999, opacity: isDisabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        variant === 'primary' && shadow,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.button,
            variant === 'outline' && styles.buttonOutline,
            variant === 'danger' && { backgroundColor: colors.danger },
            variant === 'white' && { backgroundColor: '#fff' },
            variant === 'ghost' && { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)' },
          ]}
        >
          {inner}
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#B9AEB9" {...props} style={[styles.input, props.multiline && { minHeight: 110 }]} />
    </View>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
            {on ? (
              <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.chip, { borderColor: 'transparent' }]}>
                <Text style={[styles.chipText, { color: '#fff', fontWeight: '700' }]}>{o.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{o.label}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** プロフィール写真。ring を指定するとグラデーションの縁取り */
export function Avatar({ path, uri, size = 56, ring }: { path?: string | null; uri?: string | null; size?: number; ring?: readonly [string, string] }) {
  const src = uri ?? avatarUrl(path);
  const style = { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.soft };
  const img = src ? (
    <Image source={{ uri: src }} style={style} />
  ) : (
    <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: size * 0.42 }}>👤</Text>
    </View>
  );
  if (!ring) return img;
  return (
    <LinearGradient colors={ring} style={{ padding: 3, borderRadius: size }}>
      <View style={{ padding: 2, borderRadius: size, backgroundColor: '#fff' }}>{img}</View>
    </LinearGradient>
  );
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <View style={[styles.notice, tone === 'warn' && { backgroundColor: '#FFF5E6', borderColor: '#FFD9A0' }]}>
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

/** グラデーション背景のヒーロー領域 */
export function Hero({ colors: c = brandGradient, children, style }: { colors?: readonly [string, string]; children: ReactNode; style?: ViewStyle }) {
  return (
    <LinearGradient colors={c} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: 24, padding: 20 }, shadow, style]}>
      {children}
    </LinearGradient>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16 },
  h1: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: 0.3 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 23, color: colors.text },
  sub: { fontSize: 13, lineHeight: 19, color: colors.sub },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
  },
  button: { borderRadius: 999, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  buttonOutline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primary },
  buttonText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  chipText: { color: colors.text, fontSize: 14 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 18, gap: 8, ...shadow, shadowOpacity: 0.06 },
  notice: { backgroundColor: colors.soft, borderColor: '#FFCFDC', borderWidth: 1, borderRadius: 14, padding: 12 },
  noticeText: { fontSize: 13, lineHeight: 19, color: colors.text },
  link: { color: colors.primary, fontWeight: '700', textAlign: 'center', padding: 8 },
});

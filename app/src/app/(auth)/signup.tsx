import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Button, Field, Screen, styles } from '../../components/ui';
import { errorMessage, supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

function Check({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onToggle} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.primary,
          backgroundColor: checked ? colors.primary : '#fff', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {checked && <Text style={{ color: '#fff', fontWeight: '700' }}>✓</Text>}
      </View>
      <Text style={[styles.body, { flex: 1 }]}>{children}</Text>
    </Pressable>
  );
}

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adult, setAdult] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password.length < 8) return Alert.alert('パスワードは8文字以上にしてください');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) return Alert.alert('登録できませんでした', errorMessage(error));
    if (!data.session) {
      Alert.alert('確認メールを送信しました', 'メール内のリンクを開いて登録を完了し、ログインしてください。');
    }
  }

  return (
    <Screen>
      <Field label="メールアドレス" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="パスワード（8文字以上）" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <Check checked={adult} onToggle={() => setAdult(!adult)}>
        私は20歳以上です
      </Check>
      <Check checked={agree} onToggle={() => setAgree(!agree)}>
        <Link href="/legal/terms" style={{ color: colors.primary }}>利用規約</Link>と
        <Link href="/legal/privacy" style={{ color: colors.primary }}>プライバシーポリシー</Link>に同意します
      </Check>
      <Button title="登録する" onPress={submit} loading={busy} disabled={!email || !password || !adult || !agree} />
    </Screen>
  );
}

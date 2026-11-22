import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, Field, Screen } from '../../components/ui';
import { errorMessage, supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) Alert.alert('ログインできませんでした', error.message === 'Invalid login credentials' ? 'メールアドレスまたはパスワードが違います' : errorMessage(error));
  }

  async function forgot() {
    if (!email.trim()) return Alert.alert('メールアドレスを入力してください');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    Alert.alert(error ? 'エラー' : '送信しました', error ? errorMessage(error) : 'パスワード再設定のメールを送信しました');
  }

  return (
    <Screen>
      <Field label="メールアドレス" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="パスワード" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <Button title="ログイン" onPress={submit} loading={busy} disabled={!email || !password} />
      <Button title="パスワードを忘れた方" variant="outline" onPress={forgot} />
    </Screen>
  );
}

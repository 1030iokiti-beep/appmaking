import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Button, Screen, styles } from '../components/ui';
import { useAuth } from '../lib/auth';
import { errorMessage, supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  const btn = (text: string, next: number) => (
    <Pressable
      onPress={() => onChange(Math.min(max, Math.max(min, next)))}
      style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontSize: 22, color: colors.primary }}>{text}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={styles.label}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {btn('−', value - 1)}
        <Text style={[styles.h2, { width: 56, textAlign: 'center' }]}>{value}歳</Text>
        {btn('＋', value + 1)}
      </View>
    </View>
  );
}

export default function SearchSettings() {
  const { profile, refreshProfile } = useAuth();
  const [min, setMin] = useState(profile?.pref_age_min ?? 20);
  const [max, setMax] = useState(profile?.pref_age_max ?? 50);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ pref_age_min: min, pref_age_max: max }).eq('id', profile.id);
    setBusy(false);
    if (error) return Alert.alert('保存できませんでした', errorMessage(error));
    await refreshProfile();
    router.back();
  }

  return (
    <Screen>
      <Text style={styles.h2}>お相手の年齢</Text>
      <View style={[styles.card, { gap: 16 }]}>
        <Stepper label="下限" value={min} min={20} max={max} onChange={setMin} />
        <Stepper label="上限" value={max} min={min} max={80} onChange={setMax} />
      </View>
      <Text style={styles.sub}>現在のサービス提供エリアは関東（東京・神奈川・埼玉・千葉・茨城・栃木・群馬）です。</Text>
      <Button title="保存する" onPress={save} loading={busy} />
    </Screen>
  );
}

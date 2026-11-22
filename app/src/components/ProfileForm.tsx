import type { ImagePickerAsset } from 'expo-image-picker';
import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { errorMessage, supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { MIN_AGE, PREFECTURES, type Gender, type Profile } from '../lib/types';
import { pickImage, uploadImage } from '../lib/upload';
import { Avatar, Button, Chips, Field, Notice, Screen, styles } from './ui';

const GENDERS = [
  { value: 'male' as const, label: '男性' },
  { value: 'female' as const, label: '女性' },
];

function ageOf(birthdate: string) {
  const b = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age--;
  return age;
}

export function ProfileForm({ existing, onSaved }: { existing?: Profile | null; onSaved?: () => void }) {
  const { session, refreshProfile } = useAuth();
  const [nickname, setNickname] = useState(existing?.nickname ?? '');
  const [gender, setGender] = useState<Gender | null>(existing?.gender ?? null);
  const [birthdate, setBirthdate] = useState(existing?.birthdate ?? '');
  const [prefecture, setPrefecture] = useState(existing?.prefecture ?? '');
  const [bio, setBio] = useState(existing?.bio ?? '');
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  const birthdateLocked = !!existing && existing.verification_status !== 'unsubmitted';

  async function save() {
    if (!session) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate) || isNaN(Date.parse(birthdate))) {
      return Alert.alert('生年月日を 1995-04-01 の形式で入力してください');
    }
    if (ageOf(birthdate) < MIN_AGE) return Alert.alert(`${MIN_AGE}歳未満の方はご利用いただけません`);
    if (!gender || !prefecture || !nickname.trim()) return Alert.alert('未入力の項目があります');

    setBusy(true);
    try {
      let avatar_path = existing?.avatar_path ?? null;
      if (photo) avatar_path = await uploadImage('avatars', session.user.id, photo);
      const row = { id: session.user.id, nickname: nickname.trim(), gender, birthdate, prefecture, bio: bio.trim(), avatar_path };
      const { error } = existing
        ? await supabase.from('profiles').update(row).eq('id', session.user.id)
        : await supabase.from('profiles').insert(row);
      if (error) throw error;
      await refreshProfile();
      onSaved?.();
    } catch (e) {
      Alert.alert('保存できませんでした', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Pressable
        style={{ alignItems: 'center', gap: 8 }}
        onPress={async () => {
          const asset = await pickImage('library');
          if (asset) setPhoto(asset);
        }}
      >
        <Avatar uri={photo?.uri} path={existing?.avatar_path} size={110} />
        <Text style={styles.link}>写真を選ぶ</Text>
      </Pressable>
      <Notice>顔がはっきり写った写真はマッチ率が大きく上がります。他人の写真・芸能人の写真は禁止です。</Notice>

      <Field label="ニックネーム" value={nickname} onChangeText={setNickname} maxLength={20} />
      {!existing && (
        <View style={{ gap: 6 }}>
          <Text style={styles.label}>性別（登録後は変更できません）</Text>
          <Chips options={GENDERS} value={gender} onChange={setGender} />
        </View>
      )}
      <Field
        label={birthdateLocked ? '生年月日（年齢確認申請後は変更できません）' : '生年月日'}
        value={birthdate}
        onChangeText={setBirthdate}
        placeholder="1995-04-01"
        keyboardType="numbers-and-punctuation"
        editable={!birthdateLocked}
        maxLength={10}
      />
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>居住地（現在は関東エリアのみ）</Text>
        <Pressable style={styles.input} onPress={() => setPicking(true)}>
          <Text style={{ fontSize: 16, color: prefecture ? colors.text : colors.sub }}>{prefecture || '選択してください'}</Text>
        </Pressable>
      </View>
      <Field
        label="自己紹介"
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={500}
        placeholder="趣味や休日の過ごし方、どんな人と出会いたいかなど"
      />
      <Text style={styles.sub}>連絡先（LINE ID・電話番号・メールアドレス）や金銭に関する記載は禁止されています。</Text>
      <Button title="保存する" onPress={save} loading={busy} />

      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <SafeAreaView style={styles.screen}>
          <FlatList
            data={PREFECTURES}
            keyExtractor={(p) => p}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setPrefecture(item);
                  setPicking(false);
                }}
                style={{ padding: 16, borderBottomWidth: 1, borderColor: colors.border }}
              >
                <Text style={styles.body}>{item}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </Screen>
  );
}

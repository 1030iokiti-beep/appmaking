import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Notice, Screen, styles } from '../components/ui';
import { useAuth } from '../lib/auth';
import { errorMessage, supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { pickImage, uploadImage } from '../lib/upload';

const STATUS_TEXT = {
  unsubmitted: '未提出',
  pending: '審査中（通常24時間以内に完了します）',
  approved: '年齢確認済み ✅',
  rejected: '否認されました。書類を確認して再提出してください',
} as const;

export default function Verify() {
  const { session, profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const status = profile?.verification_status ?? 'unsubmitted';
  const canSubmit = status === 'unsubmitted' || status === 'rejected';

  async function submit(source: 'camera' | 'library') {
    if (!session) return;
    const asset = await pickImage(source);
    if (!asset) return;
    setBusy(true);
    try {
      const path = await uploadImage('id-documents', session.user.id, asset);
      const { error } = await supabase.rpc('submit_age_verification', { p_document_path: path });
      if (error) throw error;
      await refreshProfile();
      Alert.alert('提出しました', '審査が完了するまでしばらくお待ちください。');
      router.back();
    } catch (e) {
      Alert.alert('提出できませんでした', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.sub}>現在の状態</Text>
        <Text style={[styles.h2, { color: status === 'approved' ? colors.success : colors.text }]}>{STATUS_TEXT[status]}</Text>
      </View>

      <Text style={styles.body}>
        法律（出会い系サイト規制法）により、メッセージのやりとりやいいねの前に年齢の確認が義務付けられています。本サービスは20歳以上の方が対象です。
      </Text>

      <View style={styles.card}>
        <Text style={styles.h2}>提出できる書類</Text>
        <Text style={styles.body}>・運転免許証{'\n'}・パスポート{'\n'}・マイナンバーカード（表面のみ）{'\n'}・健康保険証</Text>
        <Text style={styles.sub}>
          「生年月日」「書類の名称」「発行者」が読み取れるように撮影してください。それ以外の情報（住所・顔写真・番号など）は隠していただいて構いません。
          マイナンバー（裏面の個人番号）は絶対に写さないでください。
        </Text>
      </View>

      <Notice>
        提出された書類は年齢確認の目的にのみ使用し、他のユーザーに公開されることはありません。
      </Notice>

      {canSubmit && (
        <>
          <Button title="カメラで撮影する" onPress={() => submit('camera')} loading={busy} />
          <Button title="写真から選ぶ" variant="outline" onPress={() => submit('library')} disabled={busy} />
        </>
      )}
    </Screen>
  );
}

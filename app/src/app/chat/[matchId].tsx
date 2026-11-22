import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, styles } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { errorMessage, supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import type { Message, MyStatus } from '../../lib/types';

export default function Chat() {
  const { matchId, name, partnerId } = useLocalSearchParams<{ matchId: string; name?: string; partnerId?: string }>();
  const { session, profile } = useAuth();
  const me = session?.user.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<MyStatus | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    const [m, s] = await Promise.all([
      supabase.from('messages').select('*').eq('match_id', matchId).order('created_at', { ascending: true }).limit(500),
      supabase.rpc('get_my_status').single(),
    ]);
    setMessages((m.data as Message[]) ?? []);
    setStatus((s.data as MyStatus) ?? null);
  }, [matchId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`chat-${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => (prev.some((p) => p.id === msg.id) ? prev : [...prev, msg]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [matchId, load]);

  async function send() {
    const body = text.trim();
    if (!body || !me) return;
    setSending(true);
    const { data, error } = await supabase.from('messages').insert({ match_id: matchId, sender_id: me, body }).select().single();
    setSending(false);
    if (error) {
      if (error.code === '42501') return; // RLS: 送信条件を満たしていない（下部の案内を表示済み）
      return Alert.alert('送信できませんでした', errorMessage(error));
    }
    setText('');
    setMessages((prev) => (prev.some((p) => p.id === data.id) ? prev : [...prev, data as Message]));
  }

  function openMenu() {
    const actions = [
      { label: '通報する', run: () => router.push({ pathname: '/report', params: { userId: partnerId, nickname: name } }) },
      {
        label: 'ブロックする',
        run: () =>
          Alert.alert('ブロックしますか？', 'お互いに表示されなくなり、マッチも解除されます。', [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: 'ブロック',
              style: 'destructive',
              onPress: async () => {
                const { error } = await supabase.from('blocks').insert({ blocker_id: me, blocked_id: partnerId });
                if (error) return Alert.alert('エラー', errorMessage(error));
                router.back();
              },
            },
          ]),
      },
      {
        label: 'マッチを解除する',
        run: async () => {
          const { error } = await supabase.from('matches').delete().eq('id', matchId);
          if (error) return Alert.alert('エラー', errorMessage(error));
          router.back();
        },
      },
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...actions.map((a) => a.label), 'キャンセル'], cancelButtonIndex: actions.length, destructiveButtonIndex: 1 },
        (i) => actions[i]?.run(),
      );
    } else {
      Alert.alert('メニュー', undefined, [...actions.map((a) => ({ text: a.label, onPress: a.run })), { text: 'キャンセル', style: 'cancel' as const }]);
    }
  }

  const blockedReason =
    status && !status.can_send_message
      ? profile?.verification_status !== 'approved'
        ? 'verify'
        : 'premium'
      : null;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: name ?? 'トーク',
          headerRight: () => (
            <Pressable onPress={openMenu} hitSlop={12}>
              <Text style={{ fontSize: 22, color: colors.primary }}>⋯</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <Text style={[styles.sub, { textAlign: 'center', marginBottom: 8 }]}>
              🔒 連絡先の交換・金銭の要求・外部サイトへの誘導は禁止です。困ったら右上の「⋯」から通報してください。
            </Text>
          }
          renderItem={({ item }) => {
            const mine = item.sender_id === me;
            return (
              <View
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '78%',
                  backgroundColor: mine ? colors.mine : colors.theirs,
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: mine ? '#fff' : colors.text, fontSize: 15, lineHeight: 21 }}>{item.body}</Text>
              </View>
            );
          }}
        />

        {blockedReason ? (
          <View style={{ padding: 16, gap: 8, borderTopWidth: 1, borderColor: colors.border, backgroundColor: '#fff' }}>
            <Text style={styles.body}>
              {blockedReason === 'verify'
                ? 'メッセージを送るには年齢確認が必要です。'
                : 'メッセージを送るにはプレミアム会員への登録が必要です。'}
            </Text>
            <Button
              title={blockedReason === 'verify' ? '年齢確認をする' : 'プレミアム会員になる'}
              onPress={() => router.push(blockedReason === 'verify' ? '/verify' : '/premium')}
            />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderColor: colors.border, backgroundColor: '#fff' }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="メッセージを入力"
              placeholderTextColor={colors.sub}
              multiline
              maxLength={1000}
              style={[styles.input, { flex: 1, maxHeight: 120, paddingVertical: 10 }]}
            />
            <Button title="送信" onPress={send} loading={sending} disabled={!text.trim()} style={{ paddingHorizontal: 18, alignSelf: 'flex-end' }} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

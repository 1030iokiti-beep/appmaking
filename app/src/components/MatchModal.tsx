import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { brandGradient } from '../lib/theme';
import { Avatar, Button } from './ui';

export type MatchInfo = {
  matchId: string;
  partnerId: string;
  nickname: string;
  partnerAvatar: string | null;
  myAvatar: string | null;
  compatibility: number;
};

export function MatchModal({ match, onClose, onMessage }: { match: MatchInfo | null; onClose: () => void; onMessage: () => void }) {
  return (
    <Modal visible={!!match} animationType="fade" transparent onRequestClose={onClose}>
      <LinearGradient colors={[brandGradient[0], '#C2407A', '#5B2A86']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, padding: 28, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 4 }}>IT'S A MATCH</Text>
          <Text style={{ color: '#fff', fontSize: 34, fontWeight: '900' }}>マッチング成立！</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
            <View style={{ transform: [{ rotate: '-8deg' }] }}>
              <Avatar path={match?.myAvatar} size={120} ring={['#fff', '#fff']} />
            </View>
            <View style={{ marginHorizontal: -18, zIndex: 1, backgroundColor: '#fff', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 10, color: '#C2407A', fontWeight: '800' }}>相性</Text>
              <Text style={{ fontSize: 20, color: '#C2407A', fontWeight: '900', marginTop: -2 }}>{match?.compatibility}%</Text>
            </View>
            <View style={{ transform: [{ rotate: '8deg' }] }}>
              <Avatar path={match?.partnerAvatar} size={120} ring={['#fff', '#fff']} />
            </View>
          </View>
          <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
            {match?.nickname}さんもあなたにいいねしていました。{'\n'}さっそくメッセージを送ってみましょう！
          </Text>
          <View style={{ alignSelf: 'stretch', gap: 12, marginTop: 12 }}>
            <Button title="メッセージを送る" variant="white" onPress={onMessage} />
            <Text style={{ color: '#fff', textAlign: 'center', padding: 8, fontWeight: '700' }} onPress={onClose}>
              あとで
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

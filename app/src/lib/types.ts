export type Gender = 'male' | 'female';
export type VerificationStatus = 'unsubmitted' | 'pending' | 'approved' | 'rejected';

export type Profile = {
  id: string;
  nickname: string;
  gender: Gender;
  birthdate: string;
  prefecture: string;
  bio: string;
  avatar_path: string | null;
  verification_status: VerificationStatus;
  premium_until: string | null;
  is_banned: boolean;
};

export type Candidate = {
  id: string;
  nickname: string;
  age: number;
  prefecture: string;
  bio: string;
  avatar_path: string | null;
  last_active_at: string;
};

export type MatchSummary = {
  match_id: string;
  partner_id: string;
  nickname: string;
  age: number;
  avatar_path: string | null;
  last_message: string | null;
  last_message_at: string | null;
  matched_at: string;
};

export type Message = {
  id: number;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type MyStatus = {
  likes_used: number;
  likes_limit: number;
  is_premium: boolean;
  can_send_message: boolean;
};

export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県',
  '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県',
  '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
] as const;

export const REPORT_REASONS = [
  { value: 'minor', label: '18歳未満の疑いがある' },
  { value: 'money', label: '金銭・援助の要求' },
  { value: 'spam', label: '業者・勧誘・外部サイトへの誘導' },
  { value: 'harassment', label: '嫌がらせ・不快な言動' },
  { value: 'fake', label: 'なりすまし・プロフィール詐称' },
  { value: 'other', label: 'その他' },
] as const;

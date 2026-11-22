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
  axis_passion: number | null;
  axis_lead: number | null;
  axis_together: number | null;
  axis_tempo: number | null;
  love_type: string | null;
  value_answers: Record<string, string>;
  pref_age_min: number;
  pref_age_max: number;
};

export type Candidate = {
  id: string;
  nickname: string;
  age: number;
  prefecture: string;
  bio: string;
  avatar_path: string | null;
  last_active_at: string;
  love_type: string | null;
  value_answers: Record<string, string>;
  compatibility: number;
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
  love_type: string | null;
  compatibility: number;
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

// サービス提供エリア（関東）。広げるときは DB の prefecture_service_area 制約も変更する
export const PREFECTURES = ['東京都', '神奈川県', '埼玉県', '千葉県', '茨城県', '栃木県', '群馬県'] as const;

export const MIN_AGE = 20;

export const REPORT_REASONS = [
  { value: 'minor', label: '未成年の疑いがある' },
  { value: 'money', label: '金銭・援助の要求' },
  { value: 'spam', label: '業者・勧誘・外部サイトへの誘導' },
  { value: 'harassment', label: '嫌がらせ・不快な言動' },
  { value: 'fake', label: 'なりすまし・プロフィール詐称' },
  { value: 'other', label: 'その他' },
] as const;

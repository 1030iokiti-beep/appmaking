export const SITE_NAME = "こいまち";

export const PREFECTURES = [
  "東京都", "神奈川県", "埼玉県", "千葉県", "茨城県", "栃木県", "群馬県",
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
] as const;

export const GENDERS = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
] as const;
export type Gender = (typeof GENDERS)[number]["value"];
export const genderLabel = (g: string | null | undefined) => GENDERS.find((x) => x.value === g)?.label ?? "";

export const HOBBY_SUGGESTIONS = [
  "カフェ", "映画", "旅行", "グルメ", "お酒", "音楽", "ライブ", "読書", "アニメ", "ゲーム",
  "筋トレ", "ヨガ", "ランニング", "サウナ", "キャンプ", "登山", "温泉", "料理", "写真", "ファッション",
  "美術館", "ドライブ", "スポーツ観戦", "ペット", "ダンス",
];

export const REPORT_REASONS = [
  { value: "minor", label: "18歳未満の疑い" },
  { value: "money", label: "金銭・援助の要求" },
  { value: "spam", label: "業者・勧誘・外部への誘導" },
  { value: "harassment", label: "嫌がらせ・不快な言動" },
  { value: "fake", label: "なりすまし・虚偽のプロフィール" },
  { value: "inappropriate_image", label: "不適切な画像" },
  { value: "other", label: "その他" },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
export const reportReasonLabel = (r: string) => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

export const DOCUMENT_TYPES = [
  { value: "drivers_license", label: "運転免許証" },
  { value: "passport", label: "パスポート" },
  { value: "my_number", label: "マイナンバーカード（表面のみ）" },
  { value: "health_insurance", label: "健康保険証" },
  { value: "other", label: "その他の公的書類" },
] as const;

export const LAST_ACTIVE_LABEL: Record<string, string> = {
  online: "オンライン",
  today: "24時間以内",
  week: "1週間以内",
  old: "1週間以上前",
};

export const MAX_PHOTOS = 6;

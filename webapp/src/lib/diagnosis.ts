// オリジナルの恋愛タイプ診断（4軸 × 2 = 16タイプ）
// ※ Expo アプリ（app/src/lib/diagnosis.ts）と同じ内容。変更するときは両方を揃えること
// 軸のスコアは -100〜100。0以上なら左側（P / L / T / S）

export type Axis = 'passion' | 'lead' | 'together' | 'tempo';

export const AXES: Record<Axis, { left: string; right: string; leftCode: string; rightCode: string }> = {
  passion: { left: '情熱', right: '穏やか', leftCode: 'P', rightCode: 'C' },
  lead: { left: 'リード', right: '寄り添い', leftCode: 'L', rightCode: 'F' },
  together: { left: 'いつも一緒', right: '自分時間', leftCode: 'T', rightCode: 'I' },
  tempo: { left: '直感', right: '計画', leftCode: 'S', rightCode: 'D' },
};

type Question = { text: string; axis: Axis; sign: 1 | -1 };

// 各軸5問。sign=1 なら「あてはまる」ほど左側
export const QUESTIONS: Question[] = [
  { text: '好きになると、相手のことで頭がいっぱいになる', axis: 'passion', sign: 1 },
  { text: 'デートの行き先は自分で決めたい', axis: 'lead', sign: 1 },
  { text: '恋人とは毎日連絡を取り合いたい', axis: 'together', sign: 1 },
  { text: 'デートはその場のノリで決めることが多い', axis: 'tempo', sign: 1 },
  { text: '気持ちはストレートに言葉で伝えたい', axis: 'passion', sign: 1 },
  { text: '告白は自分からすることが多い', axis: 'lead', sign: 1 },
  { text: '休日はできるだけ恋人と一緒に過ごしたい', axis: 'together', sign: 1 },
  { text: '旅行は細かく計画を立てたい', axis: 'tempo', sign: -1 },
  { text: '記念日やサプライズは全力で準備したい', axis: 'passion', sign: 1 },
  { text: '迷ったときは相手に決めてもらう方が楽', axis: 'lead', sign: -1 },
  { text: '一人の時間がないと疲れてしまう', axis: 'together', sign: -1 },
  { text: '将来のことは付き合う前から考えておきたい', axis: 'tempo', sign: -1 },
  { text: '恋愛は落ち着いた関係がいちばんだと思う', axis: 'passion', sign: -1 },
  { text: '相手の希望に合わせるのが好き', axis: 'lead', sign: -1 },
  { text: '恋人とは趣味を共有したい', axis: 'together', sign: 1 },
  { text: '直感で「この人だ」と思うことがある', axis: 'tempo', sign: 1 },
  { text: '感情の浮き沈みはあまり表に出さない', axis: 'passion', sign: -1 },
  { text: 'ケンカをしたら自分から話し合いを持ちかける', axis: 'lead', sign: 1 },
  { text: 'お互いの予定に干渉しすぎない関係が理想', axis: 'together', sign: -1 },
  { text: '予定が急に変わってもあまり気にならない', axis: 'tempo', sign: 1 },
];

export const LIKERT = [
  { value: 5, label: 'とても\nあてはまる' },
  { value: 4, label: 'やや\nあてはまる' },
  { value: 3, label: 'どちらとも\nいえない' },
  { value: 2, label: 'あまり\nあてはまらない' },
  { value: 1, label: 'まったく\nあてはまらない' },
] as const;

export type AxisScores = Record<Axis, number>;

/** answers[i] は QUESTIONS[i] への回答（1〜5） */
export function scoreAnswers(answers: number[]): AxisScores {
  const raw: AxisScores = { passion: 0, lead: 0, together: 0, tempo: 0 };
  QUESTIONS.forEach((q, i) => {
    raw[q.axis] += q.sign * ((answers[i] ?? 3) - 3); // 1問 -2〜+2、1軸5問で -10〜+10
  });
  return {
    passion: raw.passion * 10,
    lead: raw.lead * 10,
    together: raw.together * 10,
    tempo: raw.tempo * 10,
  };
}

export function typeCode(s: AxisScores): string {
  return (Object.keys(AXES) as Axis[]).map((a) => (s[a] >= 0 ? AXES[a].leftCode : AXES[a].rightCode)).join('');
}

export type LoveType = { name: string; emoji: string; catch: string; description: string };

export const LOVE_TYPES: Record<string, LoveType> = {
  PLTS: { name: '全力ヒーロー型', emoji: '🔥', catch: '好きな人のためなら一直線', description: '情熱的で行動力があり、二人の時間をとことん楽しませてくれるタイプ。思い立ったらすぐ会いに行く熱さが魅力です。' },
  PLTD: { name: '頼れるプロデューサー型', emoji: '🎬', catch: '最高のデートを演出したい', description: '恋人を喜ばせる計画を立てるのが得意。記念日もデートも抜かりなく、安心して身をまかせられる存在です。' },
  PLIS: { name: '冒険キャプテン型', emoji: '🧭', catch: '一緒に新しい景色を見に行こう', description: '刺激と自由を愛するリーダー。お互いの世界を大切にしながら、会うたびに新しい体験へ連れ出してくれます。' },
  PLID: { name: '情熱ストラテジスト型', emoji: '♟️', catch: '本気の恋は戦略的に', description: '内に熱い想いを秘めつつ、将来まで見据えて関係を築く努力家。自立した大人の恋愛を好みます。' },
  PFTS: { name: 'ときめきロマンス型', emoji: '💘', catch: '毎日がドラマのような恋を', description: '感情豊かで甘え上手。好きな人と一緒にいるだけで幸せを感じ、その気持ちを素直に表現できます。' },
  PFTD: { name: '一途な献身型', emoji: '💐', catch: 'あなたのためにできることを', description: '相手を深く想い、尽くすことに喜びを感じるタイプ。誠実で、長く続く関係を大切にします。' },
  PFIS: { name: '自由なアーティスト型', emoji: '🎨', catch: '心が動く瞬間を大切に', description: '感受性が強く、恋にも自分らしさを求めるタイプ。ほどよい距離感の中で、深い共感を分かち合えます。' },
  PFID: { name: '秘めた情熱型', emoji: '🌙', catch: '静かに、でも深く愛したい', description: '表には出さないけれど心の中は情熱的。信頼できる相手にだけ見せる一面が魅力です。' },
  CLTS: { name: 'おおらか包容型', emoji: '🌻', catch: '細かいことは気にしない', description: '落ち着いた器の大きさで相手を包み込むタイプ。一緒にいると自然体でいられる安心感があります。' },
  CLTD: { name: '安心のお守り型', emoji: '🛡️', catch: 'ずっと隣で支えたい', description: '穏やかで頼りがいがあり、将来を真剣に考えるタイプ。結婚相手として信頼される存在です。' },
  CLIS: { name: 'さりげないリード型', emoji: '🍃', catch: '押しつけないやさしさ', description: '相手のペースを尊重しながら、ここぞという時に自然とリードできる大人なタイプです。' },
  CLID: { name: '堅実パートナー型', emoji: '🏡', catch: '着実に、二人の未来を', description: '冷静で計画的。お互いの自立を尊重し、無理のない形で長く続く関係を築きます。' },
  CFTS: { name: 'ほっこり癒し型', emoji: '☕', catch: 'となりにいるだけで和む', description: 'やわらかな雰囲気で周りを癒すタイプ。一緒にのんびり過ごす時間を何より大切にします。' },
  CFTD: { name: '穏やか寄り添い型', emoji: '🕊️', catch: '同じ歩幅で歩きたい', description: '相手の気持ちに敏感で、さりげなく寄り添える優しさの持ち主。安定した関係を望みます。' },
  CFIS: { name: '気まぐれ猫型', emoji: '🐈', catch: 'マイペースだけど、好きは本物', description: '自分の時間も恋人も大切にするマイペースさが魅力。ふとした時に見せる甘えにドキッとさせられます。' },
  CFID: { name: 'じっくり信頼型', emoji: '🌳', catch: '時間をかけて育てる恋', description: '慎重で誠実。すぐには心を開かないぶん、信頼関係ができると深く長く愛するタイプです。' },
};

/** タイプのグループ（最初の2文字）ごとのテーマカラー */
export const TYPE_GROUPS: Record<string, { label: string; gradient: readonly [string, string] }> = {
  PL: { label: '情熱リーダー', gradient: ['#FF5A4E', '#FF3D7F'] },
  PF: { label: '情熱ロマンス', gradient: ['#FF7EB3', '#E0569E'] },
  CL: { label: '包容リーダー', gradient: ['#2CC5A0', '#2B8FD8'] },
  CF: { label: '癒しサポーター', gradient: ['#A98BFA', '#6F8CFF'] },
};

export function typeGradient(code: string | null | undefined): readonly [string, string] {
  return TYPE_GROUPS[code?.slice(0, 2) ?? '']?.gradient ?? ['#FF4F7E', '#FF8A5C'];
}

export function loveType(code: string | null | undefined): LoveType | null {
  return code ? (LOVE_TYPES[code] ?? null) : null;
}

/** 相性がいいとされるタイプ（情熱・距離感・テンポが同じで、リード/寄り添いが逆） */
export function bestMatchCode(code: string): string {
  return code[0] + (code[1] === 'L' ? 'F' : 'L') + code[2] + code[3];
}

// ---------------------------------------------------------------
// 価値観の質問（同じ回答が多いほど相性スコアが上がる）
// ---------------------------------------------------------------
export const VALUE_QUESTIONS = [
  { key: 'marriage', label: '結婚について', options: [
    { value: 'soon', label: 'すぐにでもしたい' },
    { value: 'few_years', label: '2〜3年以内に' },
    { value: 'someday', label: 'いい人がいれば' },
    { value: 'not_now', label: '今は考えていない' },
  ] },
  { key: 'kids', label: '子どもについて', options: [
    { value: 'want', label: 'ほしい' },
    { value: 'discuss', label: '相手と相談したい' },
    { value: 'no', label: 'ほしくない' },
  ] },
  { key: 'weekend', label: '休日の過ごし方', options: [
    { value: 'outdoor', label: 'アクティブに外出' },
    { value: 'indoor', label: '家でのんびり' },
    { value: 'both', label: 'その時の気分' },
  ] },
  { key: 'contact', label: '連絡の頻度', options: [
    { value: 'daily', label: '毎日したい' },
    { value: 'sometimes', label: '2〜3日に1回' },
    { value: 'as_needed', label: '用事があるとき' },
  ] },
  { key: 'money', label: 'お金の使い方', options: [
    { value: 'saver', label: '貯金重視' },
    { value: 'balance', label: 'バランス型' },
    { value: 'spender', label: '使って楽しむ' },
  ] },
  { key: 'alcohol', label: 'お酒', options: [
    { value: 'often', label: 'よく飲む' },
    { value: 'sometimes', label: 'たまに飲む' },
    { value: 'never', label: '飲まない' },
  ] },
  { key: 'smoking', label: 'タバコ', options: [
    { value: 'no', label: '吸わない' },
    { value: 'yes', label: '吸う（電子含む）' },
  ] },
] as const;

export type ValueAnswers = Record<string, string>;

export function valueLabel(key: string, value: string | undefined): string | null {
  const q = VALUE_QUESTIONS.find((q) => q.key === key);
  return (q?.options as readonly { value: string; label: string }[] | undefined)?.find((o) => o.value === value)?.label ?? null;
}

/** 二人で同じ回答をしている価値観の一覧（「結婚：すぐにでもしたい」など） */
export function sharedValues(a: ValueAnswers, b: ValueAnswers): string[] {
  return VALUE_QUESTIONS.filter((q) => a[q.key] && a[q.key] === b[q.key]).map(
    (q) => `${q.label.replace('について', '')}：${valueLabel(q.key, a[q.key])}`,
  );
}

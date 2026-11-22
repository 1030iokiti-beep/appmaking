// ローカル開発用のデモデータ投入スクリプト（本番環境では絶対に実行しないこと）
//   npm run seed
// 作成されるアカウント
//   demo@example.com  / Demo12345   一般ユーザー（男性・年齢確認済み）
//   admin@example.com / Admin12345  管理者
//   その他デモユーザー 36人（パスワードはすべて Demo12345）
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

// .env.local を読む
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url?.includes("127.0.0.1") && !url?.includes("localhost")) {
  console.error("安全のため、このスクリプトはローカル環境（127.0.0.1 / localhost）でのみ実行できます");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// ---------------- プレースホルダー写真（PNG を自前でエンコード） ----------------
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function portrait(c1, c2, seed) {
  const W = 480, H = 640;
  const [a, b] = [hex(c1), hex(c2)];
  const raw = Buffer.alloc((W * 3 + 1) * H);
  const hx = W / 2 + ((seed % 7) - 3) * 8, hy = H * 0.4, hr = 78 + (seed % 5) * 4;
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const t = (x / W + y / H) / 2;
      let px = a.map((v, i) => Math.round(v + (b[i] - v) * t));
      const inHead = (x - hx) ** 2 + (y - hy) ** 2 < hr ** 2;
      const inBody = ((x - hx) / 170) ** 2 + ((y - H * 0.95) / 190) ** 2 < 1;
      if (inHead || inBody) px = px.map((v) => Math.round(v + (255 - v) * 0.55));
      const o = y * (W * 3 + 1) + 1 + x * 3;
      raw[o] = px[0]; raw[o + 1] = px[1]; raw[o + 2] = px[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// ---------------- デモユーザー ----------------
const PALETTES = [["#f4b6c2", "#c86b85"], ["#a8c5e6", "#5b7db1"], ["#f7d9a8", "#d18f52"], ["#b8e0d2", "#4f9d8a"], ["#d7c0f0", "#8a6cc2"], ["#f2c4b3", "#b5654a"]];
const FEMALE = ["はるか", "みお", "さくら", "ゆい", "あやか", "めい", "りな", "なつみ", "かな", "ほのか", "まい", "えみ", "あおい", "ちひろ", "ゆか", "まどか", "しおり", "ことね", "あかり", "りさ"];
const MALE = ["けんた", "しょう", "だいき", "ゆうと", "りょう", "たくや", "こうき", "はると", "そうた", "ゆうき", "しゅん", "たかし", "まさと", "かずき", "れん", "ひろき"];
const HOBBIES = ["カフェ", "映画", "旅行", "グルメ", "お酒", "音楽", "ライブ", "読書", "アニメ", "ゲーム", "筋トレ", "ヨガ", "ランニング", "サウナ", "キャンプ", "登山", "温泉", "料理", "写真", "美術館", "ドライブ"];
const JOBS = ["会社員", "エンジニア", "デザイナー", "看護師", "公務員", "営業", "保育士", "メーカー勤務", "薬剤師", "経営者", "教員", "販売"];
const BIOS = [
  "休日はカフェ巡りと映画鑑賞をしています。一緒にのんびり笑える人と出会えたら嬉しいです☕",
  "最近サウナにハマってます。週末は温泉やドライブに出かけることが多いです。まずはお茶からでも！",
  "仕事はほどほどに、趣味の時間も大切にしたいタイプ。美味しいお店を一緒に開拓しませんか？",
  "旅行が好きで年に数回は遠出します。次は北海道に行きたい。価値観の合う方とゆっくり知り合いたいです。",
  "インドア派ですが、誘われたらどこへでも行きます笑 ゲームとアニメが好きです。",
  "朝ランニングが日課です。健康的な生活を一緒に楽しめる方がいいな。",
];
const PREFS = [["東京都", 35.68, 139.76, ["渋谷区", "新宿区", "港区", "世田谷区", "品川区", "目黒区"]], ["神奈川県", 35.45, 139.63, ["横浜市", "川崎市"]], ["埼玉県", 35.86, 139.65, ["さいたま市", "川口市"]], ["千葉県", 35.6, 140.12, ["千葉市", "船橋市"]], ["大阪府", 34.69, 135.5, ["大阪市"]]];
const VALUES = { marriage: ["soon", "few_years", "someday", "not_now"], kids: ["want", "discuss", "no"], weekend: ["outdoor", "indoor", "both"], contact: ["daily", "sometimes", "as_needed"], money: ["saver", "balance", "spender"], alcohol: ["often", "sometimes", "never"], smoking: ["no", "no", "no", "yes"] };

let s = 42;
const rand = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickN = (arr, n) => [...arr].sort(() => rand() - 0.5).slice(0, n);
const axis = () => Math.round((rand() * 2 - 1) * 10) * 10;
const birth = (age) => { const d = new Date(); d.setFullYear(d.getFullYear() - age); d.setDate(d.getDate() - Math.floor(rand() * 300)); return d.toISOString().slice(0, 10); };

async function ensureUser(email, password) {
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (data?.user) return data.user.id;
  if (error && !/already/i.test(error.message)) throw error;
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const id = list.users.find((u) => u.email === email).id;
  // 再実行時はパスワードと利用状態を初期化する
  await db.auth.admin.updateUserById(id, { password });
  await db.from("users").update({ status: "active", suspended_reason: null }).eq("id", id);
  return id;
}

async function createProfile(id, p, photos) {
  const { error } = await db.from("profiles").upsert({ user_id: id, ...p });
  if (error) throw new Error(`${p.display_name}: ${error.message}`);
  await db.from("profile_images").delete().eq("user_id", id);
  for (let i = 0; i < photos; i++) {
    const path = `${id}/seed-${i}.png`;
    const [c1, c2] = PALETTES[(p.display_name.length + i) % PALETTES.length];
    await db.storage.from("profile-images").upload(path, portrait(c1, c2, i + p.display_name.length), { contentType: "image/png", upsert: true });
    await db.from("profile_images").insert({ user_id: id, storage_path: path, position: i });
  }
}

function randomProfile(name, gender) {
  const [pref, lat, lng, cities] = rand() < 0.85 ? pick(PREFS.slice(0, 4)) : PREFS[4];
  return {
    display_name: name,
    birthdate: birth(22 + Math.floor(rand() * 22)),
    gender,
    seeking: [gender === "female" ? "male" : "female"],
    prefecture: pref,
    city: pick(cities),
    bio: pick(BIOS),
    occupation: pick(JOBS),
    height: gender === "female" ? 150 + Math.floor(rand() * 20) : 165 + Math.floor(rand() * 20),
    hobbies: pickN(HOBBIES, 3 + Math.floor(rand() * 3)),
    axis_passion: axis(), axis_lead: axis(), axis_together: axis(), axis_tempo: axis(),
    value_answers: Object.fromEntries(Object.entries(VALUES).map(([k, v]) => [k, pick(v)])),
    lat: lat + (rand() - 0.5) * 0.3,
    lng: lng + (rand() - 0.5) * 0.3,
    verification_status: rand() < 0.8 ? "approved" : "unverified",
    pref_age_min: 20,
    pref_age_max: 50,
  };
}

console.log("デモデータを作成しています…");
const demoId = await ensureUser("demo@example.com", "Demo12345");
await createProfile(demoId, {
  display_name: "たくみ", birthdate: birth(30), gender: "male", seeking: ["female"], prefecture: "東京都", city: "渋谷区",
  bio: "都内でエンジニアをしています。週末はカフェで読書したり、サウナでととのったり。一緒に美味しいものを食べに行ける人と出会いたいです。",
  occupation: "エンジニア", height: 174, hobbies: ["カフェ", "サウナ", "読書", "旅行", "グルメ"],
  axis_passion: 40, axis_lead: 50, axis_together: 20, axis_tempo: -10,
  value_answers: { marriage: "few_years", kids: "want", weekend: "both", contact: "daily", money: "balance", alcohol: "sometimes", smoking: "no" },
  lat: 35.66, lng: 139.70, verification_status: "approved", pref_age_min: 20, pref_age_max: 45,
}, 2);

const adminId = await ensureUser("admin@example.com", "Admin12345");
await db.from("admin_users").upsert({ user_id: adminId, role: "admin" });

const ids = [];
for (const [i, name] of FEMALE.entries()) {
  const id = await ensureUser(`f${i + 1}@example.com`, "Demo12345");
  await createProfile(id, randomProfile(name, "female"), 1 + (i % 3));
  ids.push({ id, name, gender: "female" });
}
for (const [i, name] of MALE.entries()) {
  const id = await ensureUser(`m${i + 1}@example.com`, "Demo12345");
  await createProfile(id, randomProfile(name, "male"), 1 + (i % 2));
  ids.push({ id, name, gender: "male" });
}

// デモユーザー（たくみ）へのいいね・マッチ・メッセージ
const women = ids.filter((x) => x.gender === "female");
await db.from("likes").delete().or(`from_user.eq.${demoId},to_user.eq.${demoId}`);
await db.from("matches").delete().or(`user_a.eq.${demoId},user_b.eq.${demoId}`);
await db.from("passes").delete().or(`from_user.eq.${demoId},to_user.eq.${demoId}`);
await db.from("blocks").delete().or(`blocker_id.eq.${demoId},blocked_id.eq.${demoId}`);
await db.from("notifications").delete().eq("user_id", demoId);
await db.from("reports").delete().neq("id", "00000000-0000-0000-0000-000000000000");
await db.from("identity_verifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
for (const w of women.slice(0, 5)) {
  await db.from("likes").insert({ from_user: w.id, to_user: demoId });
}
// 2人とはマッチ済み
for (const w of women.slice(0, 2)) {
  await db.from("likes").insert({ from_user: demoId, to_user: w.id });
}
const { data: matches } = await db.from("matches").select("id, user_a, user_b").or(`user_a.eq.${demoId},user_b.eq.${demoId}`);
const first = matches?.find((m) => m.user_a === women[0].id || m.user_b === women[0].id);
if (first) {
  await db.from("messages").delete().eq("match_id", first.id);
  await db.from("messages").insert([
    { match_id: first.id, sender_id: women[0].id, body: "はじめまして！マッチありがとうございます😊 カフェ巡りがお好きなんですね" },
    { match_id: first.id, sender_id: demoId, body: "はじめまして！ありがとうございます。最近は代官山のカフェによく行きます☕" },
    { match_id: first.id, sender_id: women[0].id, body: "代官山いいですね！おすすめのお店があったら教えてください" },
  ]);
}

// 通報・本人確認の申請（管理画面の確認用）
await db.from("reports").insert({ reporter_id: women[3].id, reported_id: ids.find((x) => x.gender === "male").id, reason: "spam", detail: "外部サイトへの誘導がありました（デモデータ）" });
const pending = women[6];
await db.from("profiles").update({ verification_status: "pending" }).eq("user_id", pending.id);
await db.storage.from("verification-docs").upload(`${pending.id}/seed-doc.png`, portrait("#e6e6e6", "#9a9a9a", 1), { contentType: "image/png", upsert: true });
await db.from("identity_verifications").insert({ user_id: pending.id, document_type: "drivers_license", document_path: `${pending.id}/seed-doc.png` });

console.log("完了しました");
console.log("  一般ユーザー: demo@example.com / Demo12345");
console.log("  管理者　　　: admin@example.com / Admin12345（/admin/login）");

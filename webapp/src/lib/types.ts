import type { Database } from "./database.types";

type Fn = Database["public"]["Functions"];

/** 他人のプロフィール（DB の profile_card。生年月日・座標・メールは含まれない） */
export type ProfileCard = {
  user_id: string | null; // 無料会員が見る「受け取ったいいね」では伏せられる
  display_name: string | null;
  age: number;
  gender: string;
  prefecture: string;
  city: string;
  bio: string;
  occupation: string;
  height: number | null;
  hobbies: string[];
  love_type: string | null;
  value_answers: Record<string, string>;
  verified: boolean;
  distance: string | null;
  last_active: "online" | "today" | "week" | "old";
  photos: string[];
  score: number;
  reasons: string[];
  liked: boolean;
  match_id: string | null;
};

export type MyStatus = Fn["get_my_status"]["Returns"][number];
export type MatchRow = {
  match_id: string;
  matched_at: string;
  card: ProfileCard;
  last_message: string | null;
  last_message_at: string | null;
  last_sender: string | null;
  unread: number;
};
export type LikeRow = { card: ProfileCard; liked_at: string; masked?: boolean };
export type NotificationRow = Fn["get_notifications"]["Returns"][number];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileImage = Database["public"]["Tables"]["profile_images"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];

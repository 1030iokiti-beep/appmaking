"use client";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_INPUT = 20 * 1024 * 1024;

/**
 * 画像を縮小して JPEG に再エンコードする。
 * 再エンコードで EXIF（撮影場所の GPS 情報など）がすべて削除されるため、個人情報の漏えいを防げる
 */
export async function processImage(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
  if (!ALLOWED.includes(file.type)) throw new Error("JPEG・PNG・WebP 形式の画像を選んでください");
  if (file.size > MAX_INPUT) throw new Error("画像サイズが大きすぎます（20MBまで）");

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("この画像は読み込めませんでした。別の画像をお試しください");
  });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  if (w < 200 || h < 200) throw new Error("画像が小さすぎます（200px以上の画像を選んでください）");

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("画像の変換に失敗しました"))), "image/jpeg", quality),
  );
}

export function randomName(ext = "jpg") {
  return `${crypto.randomUUID()}.${ext}`;
}

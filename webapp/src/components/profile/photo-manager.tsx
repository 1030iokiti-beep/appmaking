"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconCamera, IconTrash } from "@/components/icons";
import { Photo } from "@/components/photo";
import { Alert, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { MAX_PHOTOS } from "@/lib/constants";
import { processImage, randomName } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import type { ProfileImage } from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";

/** 複数写真の登録・メイン写真の変更・削除 */
export function PhotoManager({ userId, onChange }: { userId: string; onChange?: (count: number) => void }) {
  const [images, setImages] = useState<ProfileImage[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    const { data, error } = await createClient()
      .from("profile_images").select("*").eq("user_id", userId).order("position").order("created_at");
    if (error) return setError(errorMessage(error));
    setImages(data);
    onChange?.(data.length);
  }, [userId, onChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(files: FileList | null) {
    if (!files?.length || !images) return;
    setError(null);
    setUploading(true);
    const supabase = createClient();
    try {
      const room = MAX_PHOTOS - images.length;
      const list = Array.from(files).slice(0, room);
      if (files.length > room) toast(`写真は${MAX_PHOTOS}枚まで登録できます`);
      let pos = images.length;
      for (const file of list) {
        const blob = await processImage(file); // 位置情報などのメタデータを削除
        const path = `${userId}/${randomName()}`;
        const up = await supabase.storage.from("profile-images").upload(path, blob, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
        const ins = await supabase.from("profile_images").insert({ user_id: userId, storage_path: path, position: pos++ });
        if (ins.error) {
          await supabase.storage.from("profile-images").remove([path]);
          throw ins.error;
        }
      }
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(img: ProfileImage) {
    if (!confirm("この写真を削除しますか？")) return;
    const supabase = createClient();
    const { error } = await supabase.from("profile_images").delete().eq("id", img.id);
    if (error) return setError(errorMessage(error));
    await supabase.storage.from("profile-images").remove([img.storage_path]);
    await normalize(images!.filter((i) => i.id !== img.id));
  }

  async function makeMain(img: ProfileImage) {
    await normalize([img, ...images!.filter((i) => i.id !== img.id)]);
  }

  async function normalize(list: ProfileImage[]) {
    const supabase = createClient();
    await Promise.all(list.map((img, i) => (img.position === i ? null : supabase.from("profile_images").update({ position: i }).eq("id", img.id))));
    await load();
  }

  if (!images) return <div className="grid grid-cols-3 gap-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />)}</div>;

  return (
    <div className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid grid-cols-3 gap-3">
        {images.map((img, i) => (
          <div key={img.id} className="group relative aspect-[3/4] overflow-hidden rounded-2xl">
            <Photo path={img.storage_path} alt={`写真${i + 1}`} className="size-full" />
            {i === 0 && <span className="absolute top-2 left-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-bold text-white">メイン</span>}
            {img.status === "rejected" && (
              <span className="absolute inset-x-2 top-2 rounded-lg bg-danger px-2 py-1 text-center text-[10px] font-bold text-white">非公開（審査NG）</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-2">
              {i > 0 ? (
                <button type="button" onClick={() => makeMain(img)} className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-ink">メインにする</button>
              ) : <span />}
              <button type="button" onClick={() => remove(img)} aria-label="削除" className="grid size-7 place-items-center rounded-full bg-white/90 text-danger">
                <IconTrash />
              </button>
            </div>
          </div>
        ))}
        {images.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={uploading}
            className={cn("flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-sub transition hover:border-brand hover:text-brand", uploading && "opacity-60")}
          >
            {uploading ? <Spinner /> : <IconCamera className="text-2xl" />}
            <span className="text-xs font-bold">{uploading ? "アップロード中" : "写真を追加"}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
      <p className="text-xs leading-relaxed text-mute">
        最大{MAX_PHOTOS}枚。顔がわかる写真がおすすめです。撮影場所などの位置情報は自動で削除されます。他人の写真・露出の多い写真は非公開になります。
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Bucket = "profile-images" | "chat-images" | "verification-docs";

// 署名付きURLのキャッシュ（バケット/パス → URL, 有効期限）
const cache = new Map<string, { url: string; exp: number }>();
const pending = new Map<string, Promise<void>>();
const TTL = 60 * 60; // 1時間

async function fetchSigned(bucket: Bucket, paths: string[]) {
  const missing = paths.filter((p) => {
    const c = cache.get(`${bucket}/${p}`);
    return !c || c.exp < Date.now() + 60_000;
  });
  if (missing.length === 0) return;
  const key = `${bucket}:${missing.join(",")}`;
  if (!pending.has(key)) {
    pending.set(
      key,
      (async () => {
        const { data } = await createClient().storage.from(bucket).createSignedUrls(missing, TTL);
        data?.forEach((d) => {
          if (d.signedUrl && d.path) cache.set(`${bucket}/${d.path}`, { url: d.signedUrl, exp: Date.now() + TTL * 1000 });
        });
      })().finally(() => pending.delete(key)),
    );
  }
  await pending.get(key);
}

/** 非公開バケットの画像を署名付きURLに変換する（閲覧権限は Storage の RLS で判定） */
export function useSignedUrls(bucket: Bucket, paths: string[]) {
  const joined = paths.join("|");
  const read = () => paths.map((p) => cache.get(`${bucket}/${p}`)?.url ?? null);
  const [urls, setUrls] = useState<(string | null)[]>(read);
  useEffect(() => {
    let alive = true;
    const list = joined ? joined.split("|") : [];
    if (list.length === 0) {
      setUrls([]);
      return;
    }
    fetchSigned(bucket, list).then(() => {
      if (alive) setUrls(list.map((p) => cache.get(`${bucket}/${p}`)?.url ?? null));
    });
    return () => {
      alive = false;
    };
  }, [bucket, joined]);
  return urls;
}

export function useSignedUrl(bucket: Bucket, path: string | null | undefined) {
  return useSignedUrls(bucket, path ? [path] : [])[0] ?? null;
}

/** プロフィール写真（なければイニシャルのプレースホルダー） */
export function Photo({ path, alt, className, name }: { path: string | null | undefined; alt: string; className?: string; name?: string | null }) {
  const url = useSignedUrl("profile-images", path);
  const [loaded, setLoaded] = useState(false);
  if (!path) {
    return (
      <div className={cn("flex items-center justify-center bg-gradient-to-br from-brand-soft via-soft to-gold-soft font-display text-brand-deep/70", className)} aria-label={alt}>
        <span className="text-[length:inherit]">{name?.slice(0, 1) ?? "?"}</span>
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden bg-soft", className)}>
      {!loaded && <div className="skeleton absolute inset-0" />}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- 署名付きURLのため next/image は使わない
        <img
          src={url}
          alt={alt}
          draggable={false}
          onLoad={() => setLoaded(true)}
          className={cn("size-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
        />
      )}
    </div>
  );
}

export function Avatar({ path, name, size = 48, ring, className }: { path: string | null | undefined; name?: string | null; size?: number; ring?: boolean; className?: string }) {
  return (
    <div className={cn("shrink-0 rounded-full", ring && "brand-gradient p-[2.5px]", className)} style={{ width: size, height: size }}>
      <Photo
        path={path}
        name={name}
        alt={name ? `${name}さんの写真` : "写真"}
        className={cn("size-full rounded-full", ring && "ring-2 ring-white")}
      />
    </div>
  );
}

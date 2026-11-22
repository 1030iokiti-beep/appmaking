"use client";

import { useState } from "react";
import { IconPin } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/utils";

/** 現在地を取得して保存（サーバー側で約1km単位に丸められる） */
export function LocationButton({ userId, onSaved, hasLocation }: { userId: string; onSaved?: () => void; hasLocation?: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(hasLocation ? "done" : "idle");
  const [msg, setMsg] = useState<string | null>(null);

  function locate() {
    if (!("geolocation" in navigator)) {
      setState("error");
      return setMsg("この端末では位置情報を利用できません");
    }
    setState("busy");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { error } = await createClient()
          .from("profiles")
          .update({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          .eq("user_id", userId);
        if (error) {
          setState("error");
          return setMsg(errorMessage(error));
        }
        setState("done");
        setMsg(null);
        onSaved?.();
      },
      (err) => {
        setState("error");
        setMsg(err.code === err.PERMISSION_DENIED ? "位置情報の利用が許可されていません。ブラウザの設定から許可してください" : "現在地を取得できませんでした");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  }

  async function clear() {
    await createClient().from("profiles").update({ lat: null, lng: null }).eq("user_id", userId);
    setState("idle");
    onSaved?.();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={state === "done" ? "secondary" : "primary"} onClick={locate} loading={state === "busy"}>
          <IconPin /> {state === "done" ? "現在地を更新する" : "現在地を使う"}
        </Button>
        {state === "done" && (
          <Button type="button" variant="ghost" onClick={clear}>位置情報を削除</Button>
        )}
      </div>
      {state === "done" && <p className="text-xs text-success">✓ 位置情報を設定済みです（他の人には「約3km」のような目安だけが表示されます）</p>}
      {msg && <p className="text-xs text-danger">{msg}</p>}
    </div>
  );
}

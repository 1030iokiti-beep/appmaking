"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { VerifyBadge } from "@/components/admin/verify-badge";
import { Badge, Chip, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/feedback";
import { genderLabel } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { ageOf, errorMessage, relativeTime } from "@/lib/utils";

type Row = {
  id: string; email: string; status: string; created_at: string; last_seen_at: string;
  profiles: { display_name: string; gender: string; birthdate: string; prefecture: string; verification_status: string } | null;
};
const PAGE = 50;
const SELECT = "id, email, status, created_at, last_seen_at, profiles(display_name, gender, birthdate, prefecture, verification_status)";

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const like = `%${query.replace(/[%_\\]/g, (c) => "\\" + c)}%`;
    const base = () => {
      let b = supabase.from("users").select(SELECT).order("created_at", { ascending: false });
      if (status !== "all") b = b.eq("status", status);
      return b;
    };
    try {
      let list: Row[];
      if (query) {
        // メールアドレス・ニックネームの両方で検索
        const [byEmail, byName] = await Promise.all([
          base().ilike("email", like).limit(PAGE),
          supabase.from("users").select(SELECT.replace("profiles(", "profiles!inner(")).ilike("profiles.display_name", like)
            .order("created_at", { ascending: false }).limit(PAGE),
        ]);
        if (byEmail.error) throw byEmail.error;
        if (byName.error) throw byName.error;
        const map = new Map<string, Row>();
        [...(byEmail.data as unknown as Row[]), ...(byName.data as unknown as Row[])].forEach((r) => (status === "all" || r.status === status) && map.set(r.id, r));
        list = [...map.values()];
        setHasMore(false);
      } else {
        const { data, error } = await base().range(page * PAGE, page * PAGE + PAGE);
        if (error) throw error;
        list = (data as unknown as Row[]).slice(0, PAGE);
        setHasMore((data?.length ?? 0) > PAGE);
      }
      setRows(list);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [query, status, page]);
  useEffect(() => {
    load();
  }, [load]);


  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="font-display text-2xl font-bold">ユーザー</h1>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setPage(0); setQuery(q.trim()); }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="メールアドレス・ニックネームで検索" className="h-11 max-w-sm" />
        <Button type="submit" variant="gold">検索</Button>
        <div className="flex gap-2">
          {(["all", "active", "suspended"] as const).map((s) => (
            <Chip key={s} selected={status === s} onClick={() => { setPage(0); setStatus(s); }}>{{ all: "すべて", active: "利用中", suspended: "停止中" }[s]}</Chip>
          ))}
        </div>
      </form>

      {error ? <ErrorState message={error} onRetry={load} /> : !rows ? <PageLoading /> : rows.length === 0 ? (
        <EmptyState icon="🔍" title="該当するユーザーがいません" />
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-sub">
              <tr>{["ユーザー", "属性", "年齢確認", "状態", "登録", "最終アクセス"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="transition hover:bg-soft/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${r.id}`} className="font-bold text-ink hover:text-brand">{r.profiles?.display_name ?? "（プロフィール未作成）"}</Link>
                    <p className="text-xs text-sub">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-sub">{r.profiles ? `${genderLabel(r.profiles.gender)}・${ageOf(r.profiles.birthdate)}歳・${r.profiles.prefecture}` : "—"}</td>
                  <td className="px-4 py-3"><VerifyBadge v={r.profiles?.verification_status} /></td>
                  <td className="px-4 py-3">{r.status === "active" ? <Badge tone="success">利用中</Badge> : <Badge tone="ink">停止中</Badge>}</td>
                  <td className="px-4 py-3 text-xs text-sub">{new Date(r.created_at).toLocaleDateString("ja-JP")}</td>
                  <td className="px-4 py-3 text-xs text-sub">{relativeTime(r.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!query && (page > 0 || hasMore) && (
        <div className="flex justify-center gap-3">
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>前へ</Button>
          <Button variant="secondary" size="sm" disabled={!hasMore} onClick={() => setPage(page + 1)}>次へ</Button>
        </div>
      )}
    </div>
  );
}

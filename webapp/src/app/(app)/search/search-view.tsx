"use client";

import { useCallback, useEffect, useState } from "react";
import { GridCard, GridSkeleton } from "@/components/discover/grid-card";
import { IconFilter } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { Chip, Field, Input, Select, Switch } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { PREFECTURES } from "@/lib/constants";
import { LOVE_TYPES } from "@/lib/diagnosis";
import { createClient } from "@/lib/supabase/client";
import type { ProfileCard } from "@/lib/types";
import { errorMessage } from "@/lib/utils";

type Filters = {
  ageMin: number; ageMax: number; prefecture: string; hobby: string; distance: number | null;
  loveType: string; verifiedOnly: boolean; sort: "score" | "new" | "distance" | "active";
};
const DEFAULT: Filters = { ageMin: 18, ageMax: 60, prefecture: "", hobby: "", distance: null, loveType: "", verifiedOnly: false, sort: "score" };
const PAGE = 30;
const SORTS = [
  { value: "score", label: "AI相性順" },
  { value: "active", label: "ログイン順" },
  { value: "new", label: "新着順" },
  { value: "distance", label: "近い順" },
] as const;
const DISTANCES = [null, 5, 10, 30, 50, 100];

function loadFilters(): Filters {
  try {
    return { ...DEFAULT, ...JSON.parse(sessionStorage.getItem("search-filters") ?? "{}") };
  } catch {
    return DEFAULT;
  }
}

export function SearchView() {
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const [draft, setDraft] = useState<Filters>(DEFAULT);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ProfileCard[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const f = loadFilters();
    setFilters(f);
    setDraft(f);
  }, []);

  const fetchPage = useCallback(async (f: Filters, offset: number) => {
    const { data, error } = await createClient().rpc("search_profiles", {
      p_age_min: f.ageMin, p_age_max: f.ageMax,
      p_prefecture: f.prefecture || undefined, p_hobby: f.hobby.trim() || undefined,
      p_max_distance_km: f.distance ?? undefined, p_love_type: f.loveType || undefined,
      p_verified_only: f.verifiedOnly, p_sort: f.sort, p_limit: PAGE, p_offset: offset,
    });
    if (error) throw error;
    return data as unknown as ProfileCard[];
  }, []);

  const search = useCallback(async (f: Filters) => {
    setError(null);
    setResults(null);
    try {
      const rows = await fetchPage(f, 0);
      setResults(rows);
      setHasMore(rows.length === PAGE);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [fetchPage]);

  useEffect(() => {
    search(filters);
    try { sessionStorage.setItem("search-filters", JSON.stringify(filters)); } catch {}
  }, [filters, search]);

  async function more() {
    setLoadingMore(true);
    try {
      const rows = await fetchPage(filters, results?.length ?? 0);
      setResults((r) => [...(r ?? []), ...rows]);
      setHasMore(rows.length === PAGE);
    } catch (e) {
      setError(errorMessage(e));
    }
    setLoadingMore(false);
  }

  const activeCount = (Object.keys(DEFAULT) as (keyof Filters)[]).filter((k) => k !== "sort" && filters[k] !== DEFAULT[k]).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">さがす</h1>
        <Button variant="secondary" size="sm" onClick={() => { setDraft(filters); setOpen(true); }}>
          <IconFilter /> 絞り込み{activeCount > 0 && <span className="rounded-full bg-brand px-1.5 text-[10px] text-white">{activeCount}</span>}
        </Button>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {SORTS.map((s) => (
          <Chip key={s.value} selected={filters.sort === s.value} onClick={() => setFilters({ ...filters, sort: s.value })} className="shrink-0">{s.label}</Chip>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => search(filters)} />
      ) : !results ? (
        <GridSkeleton />
      ) : results.length === 0 ? (
        <EmptyState icon="🔍" title="条件に合う人が見つかりません" action={<Button variant="secondary" block onClick={() => setFilters({ ...DEFAULT, sort: filters.sort })}>条件をリセット</Button>}>
          年齢や距離の条件を広げてみてください。
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {results.map((c) => <GridCard key={c.user_id} card={c} href={`/users/${c.user_id}`} />)}
          </div>
          {hasMore && <Button variant="secondary" block onClick={more} loading={loadingMore}>もっと見る</Button>}
        </>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="絞り込み">
        <div className="space-y-5">
          <Field label={`年齢：${draft.ageMin}〜${draft.ageMax}歳`}>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" min={18} max={draft.ageMax} value={draft.ageMin} onChange={(e) => setDraft({ ...draft, ageMin: Math.max(18, Number(e.target.value) || 18) })} aria-label="下限" />
              <Input type="number" min={draft.ageMin} max={100} value={draft.ageMax} onChange={(e) => setDraft({ ...draft, ageMax: Math.min(100, Number(e.target.value) || 100) })} aria-label="上限" />
            </div>
          </Field>
          <Field label="居住地" htmlFor="f-pref">
            <Select id="f-pref" value={draft.prefecture} onChange={(e) => setDraft({ ...draft, prefecture: e.target.value })}>
              <option value="">指定しない</option>
              {PREFECTURES.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="距離（現在地を設定している人のみ）">
            <div className="flex flex-wrap gap-2">
              {DISTANCES.map((d) => (
                <Chip key={String(d)} selected={draft.distance === d} onClick={() => setDraft({ ...draft, distance: d })}>{d ? `${d}km以内` : "指定しない"}</Chip>
              ))}
            </div>
          </Field>
          <Field label="趣味" htmlFor="f-hobby">
            <Input id="f-hobby" value={draft.hobby} onChange={(e) => setDraft({ ...draft, hobby: e.target.value })} placeholder="例：カフェ" maxLength={20} />
          </Field>
          <Field label="恋愛タイプ" htmlFor="f-type">
            <Select id="f-type" value={draft.loveType} onChange={(e) => setDraft({ ...draft, loveType: e.target.value })}>
              <option value="">指定しない</option>
              {Object.entries(LOVE_TYPES).map(([code, t]) => <option key={code} value={code}>{t.emoji} {t.name}</option>)}
            </Select>
          </Field>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">本人確認済みの人のみ</span>
            <Switch checked={draft.verifiedOnly} onChange={(v) => setDraft({ ...draft, verifiedOnly: v })} label="本人確認済みの人のみ" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDraft({ ...DEFAULT, sort: draft.sort })}>リセット</Button>
            <Button onClick={() => { setFilters(draft); setOpen(false); }}>この条件で探す</Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

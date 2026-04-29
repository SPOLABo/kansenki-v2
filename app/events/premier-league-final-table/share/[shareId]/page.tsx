'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { premierLeagueClubs } from '@/lib/clubMaster';
import { db } from '@/lib/firebase';

type ClubRow = {
  id: string;
  nameJa: string;
  logoSrc: string;
};

const DISPLAY_RANK_COUNT = 7;
const AGGREGATE_SAMPLE_LIMIT = 200;

type RankVoteRow = {
  clubId: string;
  count: number;
};

export default function PremierLeagueFinalTableSharePage() {
  const params = useParams<{ shareId: string }>();
  const shareId = typeof params?.shareId === 'string' ? params.shareId : '';

  const clubs = useMemo<ClubRow[]>(() => {
    return Object.values(premierLeagueClubs)
      .map((c) => ({ id: c.id, nameJa: c.nameJa, logoSrc: c.logoSrc }))
      .sort((a, b) => a.nameJa.localeCompare(b.nameJa, 'ja'));
  }, []);

  const clubById = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedByRank, setSelectedByRank] = useState<(string | null)[]>(() => Array.from({ length: DISPLAY_RANK_COUNT }, () => null));

  const [aggregateLoading, setAggregateLoading] = useState(true);
  const [rankTopVotes, setRankTopVotes] = useState<RankVoteRow[][]>(() => Array.from({ length: DISPLAY_RANK_COUNT }, () => []));
  const [aggregateParticipantCount, setAggregateParticipantCount] = useState<number>(0);

  useEffect(() => {
    if (!shareId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'plFinalTablePredictionShares', shareId));
        if (!snap.exists()) {
          if (!cancelled) setError('共有ページが見つかりません');
          return;
        }

        const data = snap.data() as any;
        const raw = typeof data?.snapshotJson === 'string' ? data.snapshotJson : '';
        const parsed = raw ? JSON.parse(raw) : null;
        const arr = Array.isArray(parsed?.selectedByRank) ? parsed.selectedByRank : [];

        const known = new Set(clubs.map((c) => c.id));
        const normalized = arr
          .slice(0, DISPLAY_RANK_COUNT)
          .map((x: unknown) => (typeof x === 'string' && known.has(x) ? x : null));
        const padded = [
          ...normalized,
          ...Array.from({ length: Math.max(0, DISPLAY_RANK_COUNT - normalized.length) }, () => null),
        ];

        if (!cancelled) setSelectedByRank(padded);
      } catch {
        if (!cancelled) setError('読み込みに失敗しました');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clubs, shareId]);

  useEffect(() => {
    let cancelled = false;
    setAggregateLoading(true);

    (async () => {
      try {
        const known = new Set(clubs.map((c) => c.id));
        const q = query(collection(db, 'plFinalTablePredictionShares'), orderBy('createdAt', 'desc'), limit(AGGREGATE_SAMPLE_LIMIT));
        const snaps = await getDocs(q);

        const userIds = new Set<string>();

        const countsByRank: Map<string, number>[] = Array.from({ length: DISPLAY_RANK_COUNT }, () => new Map());

        snaps.forEach((snap) => {
          const data = snap.data() as any;

          const createdByUid = typeof data?.createdByUid === 'string' ? data.createdByUid : '';
          if (createdByUid) userIds.add(createdByUid);

          const raw = typeof data?.snapshotJson === 'string' ? data.snapshotJson : '';
          if (!raw) return;
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            return;
          }
          const arr = Array.isArray(parsed?.selectedByRank) ? parsed.selectedByRank : [];
          for (let i = 0; i < DISPLAY_RANK_COUNT; i += 1) {
            const clubId = arr?.[i];
            if (typeof clubId !== 'string') continue;
            if (!known.has(clubId)) continue;
            const m = countsByRank[i];
            m.set(clubId, (m.get(clubId) ?? 0) + 1);
          }
        });

        const topVotes: RankVoteRow[][] = countsByRank.map((m) => {
          return Array.from(m.entries())
            .map(([clubId, count]) => ({ clubId, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        });

        if (!cancelled) {
          setRankTopVotes(topVotes);
          setAggregateParticipantCount(userIds.size);
        }
      } catch {
        if (!cancelled) {
          setRankTopVotes(Array.from({ length: DISPLAY_RANK_COUNT }, () => []));
          setAggregateParticipantCount(0);
        }
      } finally {
        if (!cancelled) setAggregateLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clubs]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-sky-100 to-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5">
          <div className="text-xs font-semibold tracking-widest text-slate-500">SHARE</div>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Premier League 最終順位予想</h1>
        </div>

        {loading ? <div className="text-sm font-semibold text-slate-500">読み込み中…</div> : null}
        {error ? <div className="text-sm font-semibold text-red-600">{error}</div> : null}

        {!loading && !error ? (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/80">
              {selectedByRank.map((clubId, index) => {
                const rank = index + 1;
                const club = clubId ? clubById.get(clubId) : null;
                return (
                  <div
                    key={`${index}-${clubId ?? 'empty'}`}
                    className={'flex items-center gap-3 px-4 py-3 ' + (index === 0 ? '' : 'border-t border-black/10')}
                  >
                    <div className="w-9 shrink-0 text-center text-sm font-bold text-slate-600">{rank}</div>
                    {club ? (
                      <>
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white">
                          <Image src={club.logoSrc} alt={club.nameJa} fill className="object-contain p-1" sizes="32px" />
                        </div>
                        <div className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{club.nameJa}</div>
                      </>
                    ) : (
                      <div className="text-sm font-semibold text-slate-400">未選択</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/80">
              <div className="border-b border-black/10 px-4 py-3">
                <div className="text-sm font-bold text-slate-900">みんなの予想（直近{AGGREGATE_SAMPLE_LIMIT}件）</div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-slate-500">各順位で多く選ばれているクラブ</div>
                  {!aggregateLoading ? (
                    <div className="text-xs font-semibold text-slate-700">{aggregateParticipantCount}名のユーザーが参加中</div>
                  ) : null}
                </div>
              </div>

              {aggregateLoading ? <div className="px-4 py-4 text-sm font-semibold text-slate-500">集計中…</div> : null}

              {!aggregateLoading ? (
                <div className="divide-y divide-black/10">
                  {rankTopVotes.map((rows, rankIndex) => {
                    const rank = rankIndex + 1;
                    const max = rows.length ? Math.max(...rows.map((r) => r.count)) : 0;
                    return (
                      <div key={`rank-agg-${rank}`} className="px-4 py-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="text-sm font-bold text-slate-900">{rank}位</div>
                          <div className="text-xs font-semibold text-slate-500">票数</div>
                        </div>

                        {rows.length ? (
                          <div className="space-y-2">
                            {rows.map((r) => {
                              const club = clubById.get(r.clubId);
                              const pct = max > 0 ? Math.round((r.count / max) * 100) : 0;
                              return (
                                <div key={`${rank}-${r.clubId}`} className="flex items-center gap-3">
                                  {club ? (
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white">
                                        <Image src={club.logoSrc} alt={club.nameJa} fill className="object-contain p-1" sizes="28px" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="truncate text-sm font-semibold text-slate-900">{club.nameJa}</div>
                                          <div className="shrink-0 text-xs font-bold text-slate-700">{r.count}</div>
                                        </div>
                                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-black/10">
                                          <div className="h-full rounded-full bg-slate-900/50" style={{ width: `${pct}%` }} />
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex-1 text-sm font-semibold text-slate-500">{r.clubId}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm font-semibold text-slate-500">データがありません</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

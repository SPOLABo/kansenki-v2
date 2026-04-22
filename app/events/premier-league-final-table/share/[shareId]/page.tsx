'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { premierLeagueClubs } from '@/lib/clubMaster';
import { db } from '@/lib/firebase';

type ClubRow = {
  id: string;
  nameJa: string;
  logoSrc: string;
};

const DISPLAY_RANK_COUNT = 7;

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

  return (
    <main className="min-h-screen bg-black">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5">
          <div className="text-xs font-semibold tracking-widest text-white/60">SHARE</div>
          <h1 className="mt-1 text-xl font-bold text-white">Premier League 最終順位予想</h1>
          <p className="mt-2 text-sm text-white/70">共有された予想です。</p>
        </div>

        {loading ? <div className="text-sm font-semibold text-white/60">読み込み中…</div> : null}
        {error ? <div className="text-sm font-semibold text-red-300">{error}</div> : null}

        {!loading && !error ? (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {selectedByRank.map((clubId, index) => {
              const rank = index + 1;
              const club = clubId ? clubById.get(clubId) : null;
              return (
                <div
                  key={`${index}-${clubId ?? 'empty'}`}
                  className={'flex items-center gap-3 px-4 py-3 ' + (index === 0 ? '' : 'border-t border-white/10')}
                >
                  <div className="w-9 text-center text-sm font-bold text-white/80">{rank}</div>
                  {club ? (
                    <>
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white">
                        <Image src={club.logoSrc} alt={club.nameJa} fill className="object-contain p-1" sizes="32px" />
                      </div>
                      <div className="truncate text-sm font-semibold text-white">{club.nameJa}</div>
                    </>
                  ) : (
                    <div className="text-sm font-semibold text-white/40">未選択</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}

'use client';

import Image from 'next/image';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { premierLeagueClubs } from '@/lib/clubMaster';
import { manualFixtures } from '@/lib/fixtures/manualFixtures';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

type ClubRow = {
  id: string;
  nameJa: string;
  logoSrc: string;
};

const STORAGE_KEY = 'pl_final_table_prediction_v1';
const DISPLAY_RANK_COUNT = 7;

function randomShareId() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += chars[bytes[i] % chars.length];
  return out;
}

function serializeSelection(selectedByRank: (string | null)[]) {
  const payload = selectedByRank.slice(0, DISPLAY_RANK_COUNT).map((x) => (typeof x === 'string' ? x : '-')).join(',');
  return payload;
}

function deserializeSelection(raw: string, clubs: ClubRow[]) {
  const known = new Set(clubs.map((c) => c.id));
  const parts = raw.split(',').slice(0, DISPLAY_RANK_COUNT);
  const normalized = parts.map((x) => (typeof x === 'string' && known.has(x) ? x : null));
  return [
    ...normalized,
    ...Array.from({ length: Math.max(0, DISPLAY_RANK_COUNT - normalized.length) }, () => null),
  ];
}

function SearchParamRestore({ clubs, onRestore }: { clubs: ClubRow[]; onRestore: (next: (string | null)[]) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      const s = searchParams?.get('s');
      if (!s) return;
      const restored = deserializeSelection(s, clubs);
      onRestore(restored);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
    } catch {
      // ignore
    }
  }, [clubs, onRestore, searchParams]);

  return null;
}

const CUT_OFF_ISO = '2026-04-22T00:00:00+09:00';

const contenderClubIds = [
  'ars',
  'mc',
  'mu',
  'avl',
  'liv',
  'bha',
  'che',
  'bre',
  'bou',
  'eve',
  'sun',
  'ful',
  'cry',
  'new',
  'lee',
  'nfo',
] as const;

const pointsByClubId: Record<string, number> = {
  ars: 70,
  mc: 70,
  mu: 58,
  avl: 58,
  liv: 55,
  bha: 50,
  che: 48,
  bre: 48,
  bou: 49,
  eve: 47,
  sun: 46,
  ful: 45,
  cry: 43,
  new: 42,
  lee: 40,
  nfo: 36,
};

const fixtureClubIdAliases: Record<string, string> = {
  mci: 'mc',
  mun: 'mu',
};

const tiebreakRankByClubId: Record<string, number> = {
  mc: 1,
  ars: 2,
  mu: 3,
  avl: 4,
};

function normalizeFixtureClubId(id: string) {
  return fixtureClubIdAliases[id] ?? id;
}

export default function PremierLeagueFinalTableEventPage() {
  const { user } = useAuth();

  const clubs = useMemo<ClubRow[]>(() => {
    return Object.values(premierLeagueClubs)
      .map((c) => ({ id: c.id, nameJa: c.nameJa, logoSrc: c.logoSrc }))
      .sort((a, b) => a.nameJa.localeCompare(b.nameJa, 'ja'));
  }, []);

  const [selectedByRank, setSelectedByRank] = useState<(string | null)[]>(() => Array.from({ length: DISPLAY_RANK_COUNT }, () => null));
  const [activeRankIndex, setActiveRankIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const known = new Set(clubs.map((c) => c.id));
      const normalized = parsed
        .slice(0, DISPLAY_RANK_COUNT)
        .map((x) => (typeof x === 'string' && known.has(x) ? x : null));
      const padded = [
        ...normalized,
        ...Array.from({ length: Math.max(0, DISPLAY_RANK_COUNT - normalized.length) }, () => null),
      ];
      setSelectedByRank(padded);
    } catch {
      return;
    }
  }, [clubs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedByRank));
    } catch {
      return;
    }
  }, [selectedByRank]);

  const clubById = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs]);

  const contendersSet = useMemo(() => {
    return new Set<string>(contenderClubIds as unknown as string[]);
  }, []);

  const upcomingOpponentsByClubId = useMemo(() => {
    const cutoff = new Date(CUT_OFF_ISO).getTime();

    const upcomingPl = manualFixtures
      .filter((f) => f.competitionId === 'PL')
      .map((f) => {
        const kickoffAt = f.kickoffAt ? new Date(f.kickoffAt).getTime() : Number.POSITIVE_INFINITY;
        return {
          kickoffAt,
          homeClubId: normalizeFixtureClubId(f.homeClubId),
          awayClubId: normalizeFixtureClubId(f.awayClubId),
        };
      })
      .filter((f) => f.kickoffAt >= cutoff);

    upcomingPl.sort((a, b) => a.kickoffAt - b.kickoffAt);

    const map = new Map<string, string[]>();
    for (const f of upcomingPl) {
      const home = f.homeClubId;
      const away = f.awayClubId;
      if (!clubById.has(home) || !clubById.has(away)) continue;

      if (contendersSet.has(home)) {
        map.set(home, [...(map.get(home) ?? []), away]);
      }
      if (contendersSet.has(away)) {
        map.set(away, [...(map.get(away) ?? []), home]);
      }
    }
    return map;
  }, [clubById, contendersSet]);

  const selectableClubs = useMemo(() => {
    return clubs
      .filter((c) => contendersSet.has(c.id))
      .map((c) => ({
        ...c,
        points: pointsByClubId[c.id] ?? null,
        upcomingOpponentIds: upcomingOpponentsByClubId.get(c.id) ?? [],
      }))
      .sort((a, b) => {
        const ap = typeof a.points === 'number' ? a.points : -1;
        const bp = typeof b.points === 'number' ? b.points : -1;
        if (bp !== ap) return bp - ap;

        const at = tiebreakRankByClubId[a.id] ?? Number.POSITIVE_INFINITY;
        const bt = tiebreakRankByClubId[b.id] ?? Number.POSITIVE_INFINITY;
        if (at !== bt) return at - bt;

        return a.nameJa.localeCompare(b.nameJa, 'ja');
      });
  }, [clubs, contendersSet, upcomingOpponentsByClubId]);

  const reset = () => {
    setSelectedByRank(Array.from({ length: DISPLAY_RANK_COUNT }, () => null));
  };

  const sharePrediction = async () => {
    if (typeof window === 'undefined') return;
    if (!user?.uid) {
      window.location.href = `/login?redirect=${encodeURIComponent('/events/premier-league-final-table')}`;
      return;
    }
    try {
      const origin = window.location.origin;
      const shareId = randomShareId();

      const title = 'Premier League 最終順位予想';
      const rawHashtags = 'プレミアリーグ,PL,スポカレ';

      const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
      const popup = canNativeShare ? null : window.open('about:blank', '_blank');

      const url = `${origin}/events/premier-league-final-table/share/${encodeURIComponent(shareId)}`;
      const hashtags = encodeURIComponent(rawHashtags);
      const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;

      const savePromise = setDoc(
        doc(db, 'plFinalTablePredictionShares', shareId),
        {
          schemaVersion: 1,
          eventId: 'premier-league-final-table',
          snapshotJson: JSON.stringify({ selectedByRank }),
          ogImageUrl: null,
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
        },
        { merge: false }
      );

      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const isIOS = /iP(hone|od|ad)/.test(ua);
      const hashtagText = rawHashtags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => `#${t}`)
        .join(' ');
      const appUrl = `twitter://post?message=${encodeURIComponent(`${title}\n${url}\n\n${hashtagText}`)}`;

      if (isIOS) {
        void savePromise.catch(() => {
          return;
        });

        const startedAt = Date.now();
        window.location.href = appUrl;
        window.setTimeout(() => {
          const stillHere = document.visibilityState === 'visible' && Date.now() - startedAt >= 700;
          if (!stillHere) return;
          if (popup) {
            popup.location.href = shareUrl;
          } else {
            const opened = window.open(shareUrl, '_blank');
            if (!opened) window.location.href = shareUrl;
          }
        }, 800);
        return;
      }

      await savePromise;

      if (canNativeShare) {
        try {
          await (navigator as any).share({ title, text: title, url });
          return;
        } catch {
          // fallback
        }
      }

      if (popup) {
        popup.location.href = shareUrl;
      } else {
        const opened = window.open(shareUrl, '_blank');
        if (!opened) window.location.href = shareUrl;
      }
    } catch {
      // ignore
    }
  };

  const europeLabelForRank = (rank: number) => {
    if (rank >= 1 && rank <= 5) {
      return {
        shortLabel: 'CL',
        barClassName: 'bg-blue-500',
        pillClassName: 'bg-blue-500/15 text-blue-200 border-blue-500/30',
      };
    }
    if (rank === 6) {
      return {
        shortLabel: 'EL',
        barClassName: 'bg-orange-500',
        pillClassName: 'bg-orange-500/15 text-orange-200 border-orange-500/30',
      };
    }
    if (rank === 7) {
      return {
        shortLabel: 'ECL',
        barClassName: 'bg-emerald-500',
        pillClassName: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
      };
    }
    return null;
  };

  return (
    <main
      className="min-h-screen"
      style={{
        backgroundColor: '#030014',
        backgroundImage:
          'radial-gradient(1000px circle at 50% -10%, rgba(168,85,247,0.32), transparent 55%), radial-gradient(900px circle at 50% 45%, rgba(168,85,247,0.20), transparent 60%), radial-gradient(800px circle at 80% 20%, rgba(236,72,153,0.18), transparent 55%), radial-gradient(1200px circle at 50% 120%, rgba(99,102,241,0.26), transparent 65%), linear-gradient(180deg, rgba(3,0,20,1) 0%, rgba(10,7,26,1) 55%, rgba(3,0,20,1) 100%)',
      }}
    >
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Suspense fallback={null}>
          <SearchParamRestore clubs={clubs} onRestore={setSelectedByRank} />
        </Suspense>
        <div className="mb-5">
          <div className="text-xs font-semibold tracking-widest text-white/60">EVENT</div>
          <h1 className="mt-1 text-xl font-bold text-white">Premier League 最終順位予想</h1>
          <p className="mt-2 text-sm text-white/70">順位をタップしてクラブを選び、最終順位を予想してください。</p>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-white/60">並べ替え</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={sharePrediction}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              予想をシェアする
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              リセット
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {selectedByRank.map((clubId, index) => {
            const rank = index + 1;
            const europe = europeLabelForRank(rank);
            const club = clubId ? clubById.get(clubId) : null;
            return (
              <div
                key={`${index}-${clubId ?? 'empty'}`}
                className={
                  'flex items-center gap-3 px-4 py-3 ' +
                  (index === 0 ? '' : 'border-t border-white/10')
                }
              >
                <div className="flex items-center gap-2">
                  <div className={"h-9 w-1.5 rounded-full " + (europe ? europe.barClassName : 'bg-white/5')} />
                  {europe ? (
                    <div
                      className={
                        'rounded-full border px-2 py-1 text-[10px] font-bold leading-none ' +
                        europe.pillClassName
                      }
                    >
                      {europe.shortLabel}
                    </div>
                  ) : (
                    <div className="w-10" />
                  )}
                </div>

                <div className="w-9 text-center text-sm font-bold text-white/80">{rank}</div>

                <button
                  type="button"
                  onClick={() => setActiveRankIndex(index)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/5"
                  aria-label={`${rank}位を選択`}
                >
                  {club ? (
                    <>
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white">
                        <Image src={club.logoSrc} alt={club.nameJa} fill className="object-contain p-1" sizes="32px" />
                      </div>
                      <div className="truncate text-sm font-semibold text-white">{club.nameJa}</div>
                    </>
                  ) : (
                    <>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-white/30 text-[10px] font-bold text-white/60">
                        TAP
                      </div>
                      <div className="text-sm font-semibold text-white/50">未選択</div>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedByRank((prev) => {
                      const next = [...prev];
                      next[index] = null;
                      return next;
                    });
                  }}
                  disabled={!clubId}
                  className={
                    'shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ' +
                    (clubId ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white/5 text-white/20')
                  }
                >
                  クリア
                </button>
              </div>
            );
          })}
        </div>

        {activeRankIndex !== null ? (
          <div className="fixed inset-0 z-[10000]">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              onClick={() => setActiveRankIndex(null)}
              aria-label="閉じる"
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-hidden rounded-t-3xl border-t border-white/10 bg-black">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="text-sm font-bold text-white">クラブを選択（4/24時点）</div>
                <button
                  type="button"
                  onClick={() => setActiveRankIndex(null)}
                  className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  閉じる
                </button>
              </div>

              <div className="max-h-[calc(80vh-64px)] overflow-y-auto px-4 pb-6">
                <div className="grid grid-cols-1 gap-2">
                  {selectableClubs.map((c) => {
                    const alreadySelectedIndex = selectedByRank.findIndex((id) => id === c.id);
                    const disabled = alreadySelectedIndex !== -1 && alreadySelectedIndex !== activeRankIndex;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSelectedByRank((prev) => {
                            const next = [...prev];
                            next[activeRankIndex] = c.id;
                            return next;
                          });
                          setActiveRankIndex(null);
                        }}
                        className={
                          'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ' +
                          (disabled
                            ? 'border-white/5 bg-white/5 text-white/30'
                            : 'border-white/10 bg-white/5 text-white hover:bg-white/10')
                        }
                      >
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white">
                          <Image src={c.logoSrc} alt={c.nameJa} fill className="object-contain p-1" sizes="32px" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="truncate text-sm font-semibold">{c.nameJa}</div>

                            <div className="flex items-center gap-2">
                              <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-white/80">
                                {typeof c.points === 'number' ? c.points : '-'}
                              </div>

                              <div className="flex max-w-[45vw] items-center gap-1 overflow-x-auto">
                                {c.upcomingOpponentIds.slice(0, 8).map((oppId) => {
                                  const opp = clubById.get(oppId);
                                  if (!opp) return null;
                                  return (
                                    <div
                                      key={`${c.id}-${oppId}`}
                                      className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white"
                                      title={opp.nameJa}
                                      aria-label={opp.nameJa}
                                    >
                                      <Image src={opp.logoSrc} alt={opp.nameJa} fill className="object-contain p-0.5" sizes="24px" />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          {disabled ? (
                            <div className="mt-1 text-xs text-white/40">選択済み（{alreadySelectedIndex + 1}位）</div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 text-xs text-white/50">※ チームの成績は更新状況により最新の成績と異なる場合があります。</div>
      </div>
    </main>
  );
}

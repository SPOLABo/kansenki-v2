'use client';

import Image from 'next/image';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { toPng } from 'html-to-image';
import { premierLeagueClubs } from '@/lib/clubMaster';
import { manualFixtures } from '@/lib/fixtures/manualFixtures';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { BottomActionBar } from './components/BottomActionBar';
import { ClubPickerModal } from './components/ClubPickerModal';
import { OgpCapturePlFinalTable } from './components/OgpCapturePlFinalTable';
import { PremierLeagueFinalTableHeader } from './components/PremierLeagueFinalTableHeader';
import { RankSelectionList } from './components/RankSelectionList';

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
  const router = useRouter();

  const clubs = useMemo<ClubRow[]>(() => {
    return Object.values(premierLeagueClubs)
      .map((c) => ({ id: c.id, nameJa: c.nameJa, logoSrc: c.logoSrc }))
      .sort((a, b) => a.nameJa.localeCompare(b.nameJa, 'ja'));
  }, []);

  const [selectedByRank, setSelectedByRank] = useState<(string | null)[]>(() => Array.from({ length: DISPLAY_RANK_COUNT }, () => null));
  const [activeRankIndex, setActiveRankIndex] = useState<number | null>(null);

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

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
    if (!user?.uid) return;

    let cancelled = false;

    (async () => {
      try {
        const ref = doc(db, 'users', user.uid, 'plFinalTablePredictions', 'premier-league-final-table');
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const data: any = snap.data();
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

        const nextSavedAt = (() => {
          const t = data?.updatedAt;
          if (!t) return null;
          if (t instanceof Date) return t;
          if (typeof t?.toDate === 'function') return t.toDate();
          if (typeof t?.seconds === 'number') return new Timestamp(t.seconds, t.nanoseconds).toDate();
          return null;
        })();

        if (!cancelled) {
          setSelectedByRank(padded);
          setSaveState('saved');
          setSavedAt(nextSavedAt);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(padded));
          } catch {
            // ignore
          }
        }
      } catch {
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clubs, user?.uid]);

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
      const hashtagsText = ['#プレミアリーグ', '#スポカレ', '#順位予想', '#欧州圏争い'].join(' ');

      const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
      const popup = canNativeShare ? null : window.open('about:blank', '_blank');

      const url = `${origin}/events/premier-league-final-table/share/${encodeURIComponent(shareId)}`;
      const shareText = `${title}\n\n${hashtagsText}`;
      const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;

      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const isIOS = /iP(hone|od|ad)/.test(ua);

      let ogImageUrl: string | null = null;
      try {
        const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        if (!isLocalhost && !isIOS) {
          const el = document.getElementById('pl-final-table-ogp-capture');
          if (el) {
            const dataUrl = await toPng(el, {
              cacheBust: true,
              pixelRatio: 1,
              width: 1200,
              height: 630,
              backgroundColor: '#000000',
              style: {
                opacity: '1',
                transform: 'none',
              },
              onClone: (doc: Document) => {
                try {
                  const cloned = doc.getElementById('pl-final-table-ogp-capture') as HTMLElement | null;
                  if (!cloned) return;
                  cloned.style.opacity = '1';
                  cloned.style.transform = 'none';
                  cloned.style.left = '0px';
                  cloned.style.top = '0px';
                  cloned.style.zIndex = '0';
                } catch {
                  return;
                }
              },
            } as any);
            const objectRef = ref(storage, `plFinalTablePredictionShareOgp/${shareId}.png`);
            await uploadString(objectRef, dataUrl, 'data_url');
            ogImageUrl = await getDownloadURL(objectRef);
          }
        }
      } catch {
        ogImageUrl = null;
      }

      const savePromise = setDoc(
        doc(db, 'plFinalTablePredictionShares', shareId),
        {
          schemaVersion: 1,
          eventId: 'premier-league-final-table',
          snapshotJson: JSON.stringify({ selectedByRank }),
          ogImageUrl,
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
        },
        { merge: false }
      );

      const appUrl = `twitter://post?message=${encodeURIComponent(`${title}\n${url}\n\n${hashtagsText}`)}`;

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
          await (navigator as any).share({ title, text: shareText, url });
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

  const savePrediction = async () => {
    if (!user?.uid) {
      router.push(`/login?redirect=${encodeURIComponent('/events/premier-league-final-table')}`);
      return;
    }

    try {
      setSaveState('saving');
      await setDoc(
        doc(db, 'users', user.uid, 'plFinalTablePredictions', 'premier-league-final-table'),
        {
          schemaVersion: 1,
          eventId: 'premier-league-final-table',
          snapshotJson: JSON.stringify({ selectedByRank }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, 'plFinalTablePredictionShares', `premier-league-final-table_${user.uid}`),
        {
          schemaVersion: 1,
          eventId: 'premier-league-final-table',
          snapshotJson: JSON.stringify({ selectedByRank }),
          ogImageUrl: null,
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSaveState('saved');
      setSavedAt(new Date());
    } catch (e) {
      console.error('[PremierLeagueFinalTableEventPage] savePrediction failed', e);
      setSaveState('idle');
      alert('保存に失敗しました。もう一度お試しください。');
    }
  };

  const formatSavedAt = (d: Date | null) => {
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
  };

  const europeLabelForRank = (rank: number) => {
    if (rank >= 1 && rank <= 5) {
      return {
        shortLabel: 'CL',
        barClassName: 'bg-blue-500',
        pillClassName: 'bg-blue-500/10 text-blue-700 border-blue-600/20',
      };
    }
    if (rank === 6) {
      return {
        shortLabel: 'EL',
        barClassName: 'bg-orange-500',
        pillClassName: 'bg-orange-500/10 text-orange-700 border-orange-600/20',
      };
    }
    if (rank === 7) {
      return {
        shortLabel: 'ECL',
        barClassName: 'bg-emerald-500',
        pillClassName: 'bg-emerald-500/10 text-emerald-700 border-emerald-600/20',
      };
    }
    return null;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-sky-100 to-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <OgpCapturePlFinalTable selectedByRank={selectedByRank} />
        <Suspense fallback={null}>
          <SearchParamRestore clubs={clubs} onRestore={setSelectedByRank} />
        </Suspense>

        <PremierLeagueFinalTableHeader />
        <RankSelectionList
          selectedByRank={selectedByRank}
          clubById={clubById}
          europeLabelForRank={europeLabelForRank}
          onOpenRank={(rankIndex) => setActiveRankIndex(rankIndex)}
          onClearRank={(rankIndex) => {
            setSelectedByRank((prev) => {
              const next = [...prev];
              next[rankIndex] = null;
              return next;
            });
          }}
        />

        {activeRankIndex !== null ? (
          <ClubPickerModal
            activeRankIndex={activeRankIndex}
            onClose={() => setActiveRankIndex(null)}
            selectableClubs={selectableClubs}
            selectedByRank={selectedByRank}
            clubById={clubById}
            onPickClub={(clubId) => {
              setSelectedByRank((prev) => {
                const next = [...prev];
                next[activeRankIndex] = clubId;
                return next;
              });
              setActiveRankIndex(null);
            }}
          />
        ) : null}

        <div className="mt-6 text-xs text-slate-500">※ チームの成績は更新状況により最新の成績と異なる場合があります。</div>
      </div>

      <BottomActionBar
        saveState={saveState}
        savedAtText={formatSavedAt(savedAt)}
        isLoggedIn={Boolean(user?.uid)}
        onSave={savePrediction}
        onShare={sharePrediction}
        onReset={reset}
      />
    </main>
  );
}

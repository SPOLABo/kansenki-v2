'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserPosts } from '@/hooks/useUserPosts';
import { UserProfileCard } from '@/components/user/UserProfileCard';
import { UserPostsTabs } from '@/components/user/UserPostsTabs';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toPng } from 'html-to-image';
import type { SquadPlayerPrediction } from '@/types/worldcup';
import {
  type FormationSlotKey,
  groupByPosition,
  pickTop,
  statusMark,
  statusMarkClassName,
} from '@/app/worldcup/2026/[country]/wc2026PredictionUtils';
import { Wc2026PitchOgpCapture } from '@/app/worldcup/2026/[country]/_components/Wc2026PitchOgpCapture';

function MyPageContent({ user }: { user: User }) {
  const router = useRouter();
  const userProfileProps = useUserProfile(user);

  const [myWc2026Shares, setMyWc2026Shares] = useState<
    { id: string; countrySlug: string; countryNameJa: string; updatedAt: Date | null; comment: string }[]
  >([]);
  const [myPlShares, setMyPlShares] = useState<{ id: string; createdAt: Date | null }[]>([]);
  const [mySharesLoading, setMySharesLoading] = useState(false);

  const [wc2026Saved, setWc2026Saved] = useState<
    { countrySlug: string; updatedAt: Date | null; comment?: string; players: SquadPlayerPrediction[]; pitchOverrideBySlot: Record<string, string> }[]
  >([]);
  const [wc2026Loading, setWc2026Loading] = useState(false);
  const [wc2026ThumbBySlug, setWc2026ThumbBySlug] = useState<Record<string, string>>({});

  const [openImageUrl, setOpenImageUrl] = useState<string | null>(null);

  // プロフィール情報が読み込まれた後に投稿を取得する
  const { userPosts, bookmarkedPosts, loading, error, handleDelete, refetch } = useUserPosts(user, userProfileProps.profile);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setWc2026Loading(true);
      try {
        const q = query(collection(db, 'users', user.uid, 'wc2026SquadPredictions'), orderBy('updatedAt', 'desc'));
        const snap = await getDocs(q);
        const next = snap.docs
          .map((d) => {
            const data: any = d.data();
            const updatedAt = data?.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null;
            const comment = typeof data?.comment === 'string' ? data.comment : undefined;
            const players = (Array.isArray(data?.players) ? data.players : []) as any[];
            const litePlayers: SquadPlayerPrediction[] = players
              .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
              .map((p) => ({
                id: String(p.id),
                name: String(p.name),
                position: p.position as any,
                status: p.status as any,
              }));
            const pitchOverrideBySlot =
              data?.pitchOverrideBySlot && typeof data.pitchOverrideBySlot === 'object' ? (data.pitchOverrideBySlot as Record<string, string>) : {};
            return { countrySlug: d.id, updatedAt, comment, players: litePlayers, pitchOverrideBySlot };
          })
          .filter((x) => Boolean(x.countrySlug));
        if (!cancelled) setWc2026Saved(next);
      } catch {
        if (!cancelled) setWc2026Saved([]);
      } finally {
        if (!cancelled) setWc2026Loading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setMySharesLoading(true);
      try {
        const [wcSnap, plSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, 'wc2026PredictionShares'),
              where('createdByUid', '==', user.uid),
              orderBy('updatedAt', 'desc'),
              limit(20)
            )
          ),
          getDocs(
            query(
              collection(db, 'plFinalTablePredictionShares'),
              where('createdByUid', '==', user.uid),
              orderBy('createdAt', 'desc'),
              limit(20)
            )
          ),
        ]);

        const wcItems = wcSnap.docs.map((d) => {
          const data: any = d.data();
          const countrySlug = typeof data?.countrySlug === 'string' ? data.countrySlug : '';
          const countryNameJa = typeof data?.countryNameJa === 'string' ? data.countryNameJa : countrySlug;
          const updatedAt = data?.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null;
          const comment = typeof data?.comment === 'string' ? data.comment : '';
          return { id: d.id, countrySlug, countryNameJa, updatedAt, comment };
        });

        const plItems = plSnap.docs.map((d) => {
          const data: any = d.data();
          const createdAt = data?.createdAt instanceof Timestamp ? data.createdAt.toDate() : null;
          return { id: d.id, createdAt };
        });

        if (!cancelled) {
          setMyWc2026Shares(wcItems);
          setMyPlShares(plItems);
        }
      } catch {
        if (!cancelled) {
          setMyWc2026Shares([]);
          setMyPlShares([]);
        }
      } finally {
        if (!cancelled) setMySharesLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  const pitchDataBySlug = useMemo(() => {
    const out: Record<string, { assigned: Partial<Record<FormationSlotKey, SquadPlayerPrediction>> }> = {};
    for (const item of wc2026Saved) {
      const players = item.players;
      const pitchOverrideBySlot = item.pitchOverrideBySlot;
      const grouped = groupByPosition(players);

      const gk = pickTop(grouped.GK, 1);
      const cbs = pickTop(grouped.DF, 3);
      const mids = pickTop(grouped.MF, 4);

      const used = new Set<string>([...gk, ...cbs, ...mids].map((p) => p.id));

      const remainingAttackPool = [...players]
        .filter((p) => !used.has(p.id))
        .filter((p) => p.position === 'FW' || p.position === 'MF');

      const shadows = pickTop(remainingAttackPool, 2);
      for (const p of shadows) used.add(p.id);

      const remainingTopPool = [...players]
        .filter((p) => !used.has(p.id))
        .filter((p) => p.position === 'FW' || p.position === 'MF');
      const top = pickTop(remainingTopPool, 1);

      const assigned: Partial<Record<FormationSlotKey, SquadPlayerPrediction>> = {
        GK: gk[0],
        LCB: cbs[0],
        CB: cbs[1],
        RCB: cbs[2],
        LM: mids[0],
        LCM: mids[1],
        RCM: mids[2],
        RM: mids[3],
        SS_L: shadows[0],
        SS_R: shadows[1],
        ST: top[0],
      };

      for (const slot of Object.keys(pitchOverrideBySlot) as FormationSlotKey[]) {
        const pid = pitchOverrideBySlot[slot];
        if (!pid) continue;
        const p = players.find((x) => x.id === pid) ?? null;
        if (p) assigned[slot] = p;
      }

      out[item.countrySlug] = { assigned };
    }
    return out;
  }, [wc2026Saved]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const targets = wc2026Saved
        .filter((x) => x.countrySlug === 'japan')
        .slice(0, 1)
        .filter((x) => !wc2026ThumbBySlug[x.countrySlug]);
      for (const t of targets) {
        const el = document.getElementById(`wc2026-mypage-ogp-${t.countrySlug}`);
        if (!el) continue;
        try {
          await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
          const dataUrl = await toPng(el as HTMLElement, {
            pixelRatio: 1,
            cacheBust: true,
            width: 1200,
            height: 630,
            style: {
              transform: 'none',
              position: 'relative',
              left: '0',
              top: '0',
              pointerEvents: 'none',
            },
          });
          if (!cancelled) {
            setWc2026ThumbBySlug((prev) => ({ ...prev, [t.countrySlug]: dataUrl }));
          }
        } catch {
          // ignore
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [wc2026Saved, wc2026ThumbBySlug]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('ログアウトエラー', error);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-4xl">
      <UserProfileCard {...userProfileProps} />

      {openImageUrl ? (
        <div
          className="fixed inset-0 z-[9999] bg-black/80"
          onClick={() => setOpenImageUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute top-4 right-4">
            <button
              type="button"
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white border border-white/10 hover:bg-white/15 transition-colors"
              onClick={() => setOpenImageUrl(null)}
            >
              閉じる
            </button>
          </div>
          <div className="h-full w-full overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="min-h-full min-w-full flex items-center justify-center p-6">
              <img
                src={openImageUrl}
                alt="スタメン予想"
                className="rounded-xl border border-white/10"
                style={{ width: 1200, height: 630, maxWidth: 'none' }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <div className="text-base font-bold">保存した予想</div>
        {wc2026Loading ? (
          <div className="mt-2 text-sm text-gray-500">読み込み中...</div>
        ) : wc2026Saved.length === 0 ? (
          <div className="mt-2 text-sm text-gray-500">まだ保存した予想がありません</div>
        ) : (
          <div className="mt-3 space-y-2">
            {wc2026Saved.map((p) => (
              <button
                key={p.countrySlug}
                type="button"
                onClick={() => router.push(`/worldcup/2026/${p.countrySlug}`)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:bg-gray-50 transition-colors dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
              >
                {p.countrySlug === 'japan' ? (
                  <div className="mb-2">
                    {wc2026ThumbBySlug[p.countrySlug] ? (
                      <img
                        src={wc2026ThumbBySlug[p.countrySlug]}
                        alt="スタメン予想"
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-800"
                        loading="lazy"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenImageUrl(wc2026ThumbBySlug[p.countrySlug]);
                        }}
                      />
                    ) : (
                      <div className="w-full aspect-[1200/630] rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900" />
                    )}
                    {pitchDataBySlug[p.countrySlug] ? (
                      <Wc2026PitchOgpCapture
                        id={`wc2026-mypage-ogp-${p.countrySlug}`}
                        countryNameJa="日本"
                        pitchData={pitchDataBySlug[p.countrySlug]}
                        statusMark={statusMark}
                        statusMarkClassName={statusMarkClassName}
                      />
                    ) : null}
                  </div>
                ) : null}
                <div className="text-sm font-bold">W杯2026：{p.countrySlug === 'japan' ? '日本代表' : p.countrySlug}</div>
                {p.comment ? <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{p.comment}</div> : null}
                <div className="mt-1 text-[11px] text-gray-500">{p.updatedAt ? `更新：${p.updatedAt.toLocaleString('ja-JP')}` : ''}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="text-base font-bold">共有した予想</div>
        {mySharesLoading ? (
          <div className="mt-2 text-sm text-gray-500">読み込み中...</div>
        ) : myWc2026Shares.length === 0 && myPlShares.length === 0 ? (
          <div className="mt-2 text-sm text-gray-500">まだ共有がありません</div>
        ) : (
          <div className="mt-3 space-y-2">
            {myWc2026Shares.map((s) => (
              <div
                key={`my-share-wc-${s.id}`}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm dark:border-gray-800 dark:bg-gray-950"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-sm font-bold text-gray-900 truncate dark:text-gray-100 hover:underline"
                    onClick={() => router.push(`/worldcup/2026/${encodeURIComponent(s.countrySlug)}/share/${encodeURIComponent(s.id)}`)}
                  >
                    W杯2026：{s.countryNameJa}
                  </button>
                  <button
                    type="button"
                    className="text-[11px] font-bold text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                    onClick={() => {
                      const ok = window.confirm('この共有を削除しますか？');
                      if (!ok) return;
                      void (async () => {
                        try {
                          await deleteDoc(doc(db, 'wc2026PredictionShares', s.id));
                          setMyWc2026Shares((prev) => prev.filter((x) => x.id !== s.id));
                        } catch (err) {
                          console.error('[mypage] delete wc2026 share failed', err);
                          alert('削除に失敗しました。もう一度お試しください。');
                        }
                      })();
                    }}
                  >
                    削除
                  </button>
                </div>
                {s.comment ? <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{s.comment}</div> : null}
                <div className="mt-1 text-[11px] text-gray-500">更新：{s.updatedAt ? s.updatedAt.toLocaleString('ja-JP') : ''}</div>
              </div>
            ))}

            {myPlShares.map((s) => (
              <div
                key={`my-share-pl-${s.id}`}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm dark:border-gray-800 dark:bg-gray-950"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-sm font-bold text-gray-900 truncate dark:text-gray-100 hover:underline"
                    onClick={() => router.push(`/events/premier-league-final-table/share/${encodeURIComponent(s.id)}`)}
                  >
                    Premier League 最終順位予想
                  </button>
                  <button
                    type="button"
                    className="text-[11px] font-bold text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                    onClick={() => {
                      const ok = window.confirm('この共有を削除しますか？');
                      if (!ok) return;
                      void (async () => {
                        try {
                          await deleteDoc(doc(db, 'plFinalTablePredictionShares', s.id));
                          setMyPlShares((prev) => prev.filter((x) => x.id !== s.id));
                        } catch (err) {
                          console.error('[mypage] delete pl share failed', err);
                          alert('削除に失敗しました。もう一度お試しください。');
                        }
                      })();
                    }}
                  >
                    削除
                  </button>
                </div>
                <div className="mt-1 text-[11px] text-gray-500">作成：{s.createdAt ? s.createdAt.toLocaleString('ja-JP') : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* プロフィールの読み込みが完了してから投稿セクションを表示 */}
      <div className="mt-8">
        {!userProfileProps.loading && (
          <UserPostsTabs 
            userPosts={userPosts} 
            bookmarkedPosts={bookmarkedPosts} 
            handleDelete={handleDelete} 
            refetchPosts={refetch}
          />
        )}
        {(userProfileProps.loading || loading) && <div className="text-center p-4">情報を読み込んでいます...</div>}
        {error && <div className="text-center p-4 text-red-500">エラー: {error}</div>}
      </div>

      <div className="mt-8 text-center">
        <Button onClick={handleLogout} variant="outline">ログアウト</Button>
      </div>
    </div>
  );
}

// 認証状態のチェックとリダイレクトを担うメインコンポーネント
export default function MyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 認証状態のチェックが完了し、かつユーザーが存在しない場合のみリダイレクト
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // 認証状態が確認できるまでローディング表示
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">読み込み中...</div>;
  }

  // ユーザーが存在する場合のみコンテンツを表示
  if (user) {
    return <MyPageContent user={user} />;
  }

  // リダイレクトが実行されるまでの間、何も表示しない
  return null;
}

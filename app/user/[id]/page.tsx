'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy, Timestamp } from 'firebase/firestore';
export const dynamic = 'force-dynamic';

import { db } from '@/lib/firebase';
import Link from 'next/link';
import Image from 'next/image';
import { FaInstagram, FaYoutube, FaXTwitter } from 'react-icons/fa6';
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

import { useTheme } from 'next-themes';
import PostCard from '@/components/PostCard';
import SpotCard, { SpotData } from '@/components/SpotCard';
import { UnifiedPost } from '@/types/post';
import { SimplePost } from '@/types/match';
import { travelFrequencyOptions, countryOptions, overseasMatchCountOptions } from '@/components/data';

type UserInfo = {
  nickname: string;
  id: string;
  xLink?: string;
  noteLink?: string;
  youtubeUrl?: string;
  instagramLink?: string;
  avatarUrl?: string;
  bio?: string;
  travelFrequency?: string;
  residence?: string;
  overseasMatchCount?: string;
  visitedCountries?: string[];
};

const toUnifiedPost = (
    item: any, 
    type: string, 
    authorProfile?: UserInfo | null
  ): UnifiedPost | null => {
  if (!item || !item.id) return null;

  // Prioritize authorProfile for consistent author info on the user page
  const post = item as any;
  const authorId = authorProfile?.id || post.author?.id || post.authorId || post.userId || '';
  const authorName = authorProfile?.nickname || post.author?.name || post.authorName || '名無し';
  const authorImage = authorProfile?.avatarUrl && authorProfile.avatarUrl !== '/default-avatar.svg' 
    ? authorProfile.avatarUrl 
    : post.author?.image || post.authorImage || authorProfile?.avatarUrl || '/default-avatar.svg';



  let subtext: string | null = null;
  if (post.match?.stadium?.name) {
    subtext = `${post.match.league} | ${post.match.stadium.name}`;
  } else if (post.spotName) {
    subtext = post.spotName;
  }

  let createdAt: Date | null = null;
  if (post.createdAt) {
    if (post.createdAt instanceof Timestamp) {
      createdAt = post.createdAt.toDate();
    } else if (typeof post.createdAt === 'string') {
      createdAt = new Date(post.createdAt);
    } else if (post.createdAt.seconds) {
      createdAt = new Timestamp(post.createdAt.seconds, post.createdAt.nanoseconds).toDate();
    }
  }

  const getTitle = () => {
    if (post.title) {
      return post.title;
    }
    const homeTeam = post.match?.homeTeam || post.homeTeam;
    const awayTeam = post.match?.awayTeam || post.awayTeam;
    if (homeTeam && awayTeam) {
      return `${homeTeam} vs ${awayTeam}`;
    }
    return post.spotName || '無題';
  };

  const unifiedPost: UnifiedPost = {
    id: post.id,
    postType: type as any,
    collectionName: type.endsWith('s') ? type : `${type}s`,
    title: getTitle(),
    subtext: post.match?.stadium?.name || post.stadium || null,
    imageUrls: post.imageUrls || post.images || (post.imageUrl ? [post.imageUrl] : []),
    authorId,
    authorName,
    authorImage,
    createdAt,
    league: post.match?.competition || post.match?.league || post.league || post.matches?.[0]?.competition || '',
    country: post.match?.country || post.country || '',
    href: `/${{
      'post': 'posts',
      'simple-post': 'simple-posts',
      'spot': 'spots',
      'simple-travel': 'simple-travels',
    }[type as 'post' | 'simple-post' | 'spot' | 'simple-travel'] || (type.endsWith('s') ? type : `${type}s`)}/${post.id}`,
    originalData: item,
  };

  return unifiedPost;
};

export default function UserPostsPage() {
  const { id } = useParams();
  useTheme();
  const [items, setItems] = useState<UnifiedPost[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [wc2026Saved, setWc2026Saved] = useState<
    { countrySlug: string; updatedAt: Date | null; comment?: string; players: SquadPlayerPrediction[]; pitchOverrideBySlot: Record<string, string> }[]
  >([]);
  const [wc2026Loading, setWc2026Loading] = useState(false);
  const [wc2026ThumbBySlug, setWc2026ThumbBySlug] = useState<Record<string, string>>({});
  const [openImageUrl, setOpenImageUrl] = useState<string | null>(null);

  const getMillis = (date: Date | Timestamp | null): number => {
    if (!date) return 0;
    if (date instanceof Timestamp) return date.toMillis();
    return date.getTime();
  };

  useEffect(() => {
    const fetchUserAndPosts = async (userId: string) => {
      console.log('Fetching data for user:', userId);
      setLoading(true);
      try {
        const usersCollection = collection(db, 'users');
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const userData = userDocSnap.data() as UserInfo;
        // Add fallback for avatarUrl from potential auth data if not in firestore
        const finalUserData = {
          ...userData,
          avatarUrl: userData.avatarUrl || (userDocSnap.data().photoURL) || '/default-avatar.svg'
        };
        setUserInfo(finalUserData);
        console.log('User info fetched:', userData);

        const fetchCollection = async (collectionName: string, postType: 'post' | 'simple-post' | 'spot' | 'simple-travel', authorProfile?: UserInfo | null) => {
          const collRef = collection(db, collectionName);
          
          // Query for both new data structure (authorId) and old data structure (author.id)
          const q1 = query(collRef, where('authorId', '==', userId), limit(50));
          const q2 = query(collRef, where('author.id', '==', userId), limit(50));

          const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

          const posts1 = snapshot1.docs.map(doc => toUnifiedPost({ ...doc.data(), id: doc.id }, postType, authorProfile));
          const posts2 = snapshot2.docs.map(doc => toUnifiedPost({ ...doc.data(), id: doc.id }, postType, authorProfile));

          // Combine, filter out nulls, and remove duplicates by ID
          const combined = [...posts1, ...posts2].filter((p): p is UnifiedPost => !!p);
          const uniquePosts = Array.from(new Map(combined.map(p => [p.id, p])).values());
          
          return uniquePosts;
        };

        const postCollections = ['posts', 'simple-posts', 'spots', 'simple-travels'];
        const postTypes: { [key: string]: 'post' | 'simple-post' | 'spot' | 'simple-travel' } = {
          'posts': 'post',
          'simple-posts': 'simple-post',
          'spots': 'spot',
          'simple-travels': 'simple-travel'
        };

        const allPostsPromises = postCollections.map(collectionName => 
          fetchCollection(collectionName, postTypes[collectionName] as 'post' | 'simple-post' | 'spot' | 'simple-travel', finalUserData)
        );
        const allPostsArrays = await Promise.all(allPostsPromises);
        const combinedPosts = allPostsArrays.flat();

        const allItems = combinedPosts.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
        setItems(allItems);

      } catch (err) {
        console.error('Error fetching data:', err);
        setNotFound(true);
      } finally {
        console.log('Finished fetching data.');
        setLoading(false);
      }
    };

    if (id && typeof id === 'string') {
      fetchUserAndPosts(id);
    } else {
      // URLにIDが含まれていない場合
      setNotFound(true);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const userId = typeof id === 'string' ? id : '';
    if (!userId) return;

    const run = async () => {
      setWc2026Loading(true);
      try {
        const q = query(
          collection(db, 'wc2026PredictionShares'),
          where('tournamentId', '==', 'wc2026'),
          where('createdByUid', '==', userId),
          orderBy('updatedAt', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);
        const next = snap.docs
          .map((d) => {
            const data: any = d.data();
            const updatedAt = data?.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null;
            const snapshotJson = typeof data?.snapshotJson === 'string' ? data.snapshotJson : '';
            let parsed: any = null;
            try {
              parsed = snapshotJson ? JSON.parse(snapshotJson) : null;
            } catch {
              parsed = null;
            }

            const countrySlug = typeof data?.countrySlug === 'string' ? data.countrySlug : typeof parsed?.countrySlug === 'string' ? parsed.countrySlug : '';
            const comment = typeof parsed?.comment === 'string' ? parsed.comment : undefined;
            const players = (Array.isArray(parsed?.players) ? parsed.players : []) as any[];
            const litePlayers: SquadPlayerPrediction[] = players
              .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
              .map((p) => ({
                id: String(p.id),
                name: String(p.name),
                position: p.position as any,
                status: p.status as any,
              }));
            const pitchOverrideBySlot =
              parsed?.pitchOverrideBySlot && typeof parsed.pitchOverrideBySlot === 'object'
                ? (parsed.pitchOverrideBySlot as Record<string, string>)
                : {};
            return { countrySlug, updatedAt, comment, players: litePlayers, pitchOverrideBySlot };
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
  }, [id]);

  const pitchDataBySlug = (() => {
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
  })();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const targets = wc2026Saved
        .filter((x) => x.countrySlug === 'japan')
        .slice(0, 1)
        .filter((x) => !wc2026ThumbBySlug[x.countrySlug]);

      for (const t of targets) {
        const el = document.getElementById(`wc2026-user-ogp-${t.countrySlug}`);
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

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
  }

  if (notFound) {
    return <div className="flex justify-center items-center h-screen"><p>ユーザーが見つかりません。</p></div>;
  }

  return (
    <div className="max-w-screen-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 sm:p-6">
        {/* User Info Display */}
        {userInfo && (
          <div key={userInfo.id} className="flex flex-col sm:flex-row items-center sm:items-start w-full">
            {/* Avatar */}
            <div className="flex-shrink-0 relative w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-300 dark:bg-gray-600 overflow-hidden border-4 border-white dark:border-gray-800 shadow-md">
              <Image
                src={userInfo.avatarUrl && userInfo.avatarUrl !== '/default-avatar.svg' ? userInfo.avatarUrl : items[0]?.authorImage || '/default-avatar.svg'}
                alt={userInfo.nickname || 'avatar'}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* User Info (Name, Links, Bio) */}
            <div className="mt-4 sm:mt-0 sm:ml-6 text-center sm:text-left flex-grow">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{userInfo.nickname}</h1>
              
              {/* Social Links */}
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-4">
                {userInfo.xLink && (
                  <a href={userInfo.xLink} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                    <FaXTwitter size={24} />
                  </a>
                )}
                {userInfo.instagramLink && (
                  <a href={userInfo.instagramLink} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                    <FaInstagram size={24} />
                  </a>
                )}
                {userInfo.youtubeUrl && (
                  <a href={userInfo.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                    <FaYoutube size={24} />
                  </a>
                )}
                {userInfo.noteLink && (
                  <a href={userInfo.noteLink} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                    <span className="font-bold text-xl">note</span>
                  </a>
                )}
              </div>

              {/* Bio */}
              {userInfo.bio && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 text-center sm:text-left whitespace-pre-wrap">
                  {userInfo.bio}
                </p>
              )}

              {/* Travel Info Section */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 w-full text-left">
                  <div className="space-y-3">
                      {userInfo.residence && userInfo.residence !== '未選択' && (
                          <div className="flex">
                              <span className="w-32 text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0">居住地</span>
                              <span className="text-sm text-gray-800 dark:text-gray-200">{countryOptions.find(o => o.value === userInfo.residence)?.label || userInfo.residence}</span>
                          </div>
                      )}
                      {userInfo.travelFrequency && userInfo.travelFrequency !== '0' && (
                          <div className="flex">
                              <span className="w-32 text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0">海外渡航回数</span>
                              <span className="text-sm text-gray-800 dark:text-gray-200">{travelFrequencyOptions.find(o => o.value === userInfo.travelFrequency)?.label || userInfo.travelFrequency}</span>
                          </div>
                      )}
                      {userInfo.overseasMatchCount && userInfo.overseasMatchCount !== '0' && (
                          <div className="flex">
                              <span className="w-32 text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0">海外観戦試合数</span>
                              <span className="text-sm text-gray-800 dark:text-gray-200">{overseasMatchCountOptions.find(o => o.value === userInfo.overseasMatchCount)?.label || userInfo.overseasMatchCount}</span>
                          </div>
                      )}
                      {userInfo.visitedCountries && userInfo.visitedCountries.length > 0 && (
                          <div className="flex items-start">
                              <span className="w-32 text-sm font-medium text-gray-500 dark:text-gray-400 pt-0.5 shrink-0">行ったことのある国</span>
                              <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{userInfo.visitedCountries.map(country => countryOptions.find(c => c.value === country)?.label || country).join(', ')}</span>
                          </div>
                      )}
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>

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

      <div className="px-4 mt-4 border-t dark:border-gray-700 pt-6">
        <div className="text-base font-bold">保存した予想</div>
        {wc2026Loading ? (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">読み込み中...</div>
        ) : wc2026Saved.length === 0 ? (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">まだ保存した予想がありません</div>
        ) : (
          <div className="mt-3 space-y-2">
            {wc2026Saved
              .filter((p) => p.countrySlug === 'japan')
              .slice(0, 1)
              .map((p) => (
                <Link
                  key={p.countrySlug}
                  href={`/worldcup/2026/${p.countrySlug}`}
                  className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:bg-gray-50 transition-colors dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
                >
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
                        id={`wc2026-user-ogp-${p.countrySlug}`}
                        countryNameJa="日本"
                        pitchData={pitchDataBySlug[p.countrySlug]}
                        statusMark={statusMark}
                        statusMarkClassName={statusMarkClassName}
                      />
                    ) : null}
                  </div>
                  <div className="text-sm font-bold">W杯2026：日本代表</div>
                  {p.comment ? <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{p.comment}</div> : null}
                  <div className="mt-1 text-[11px] text-gray-500">{p.updatedAt ? `更新：${p.updatedAt.toLocaleString('ja-JP')}` : ''}</div>
                </Link>
              ))}
          </div>
        )}
      </div>

      {/* 投稿一覧 */}
      <div className="px-4 pb-10 mt-4 border-t dark:border-gray-700 pt-6">
        {items.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">投稿がありません。</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {items.map((item) => {
              if (item.postType === 'spot') {
                return <SpotCard key={item.id} spot={item.originalData as SpotData} />;
              } else {
                return <PostCard key={item.id} post={item} />;
              }
            })}
          </div>
        )}

        {/* トップページに戻るボタン */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            トップページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

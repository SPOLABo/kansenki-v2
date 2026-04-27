 'use client';

 import Image from 'next/image';
 import Link from 'next/link';
 import { useMemo, useState, useEffect } from 'react';
 import {
   doc,
   setDoc,
   serverTimestamp,
   collection,
   onSnapshot,
   orderBy,
   limit,
   query,
   getCountFromServer,
   where,
 } from 'firebase/firestore';
 import { useAuth } from '@/contexts/AuthContext';
 import { db } from '@/lib/firebase';
 import { useRouter } from 'next/navigation';

 type Participant = {
   uid: string;
   displayName: string | null;
   avatarUrl: string | null;
 };

 const KANSENKI_AUTHOR_SAMPLE_LIMIT = 200;

export default function TopNextPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const events = useMemo(
    () => [
      {
        id: 'event-1',
        href: '/worldcup/2026',
        thumbnailSrc: '/選考予想OGP.png',
      },
      {
        id: 'event-2',
        href: '/events/premier-league-final-table',
        thumbnailSrc: '/小見出しを追加 (2).png',
      },
      {
        id: 'event-3',
        href: '/events',
        thumbnailSrc: '/小見出しを追加 (3).png',
      },
      {
        id: 'event-4',
        href: '/',
        thumbnailSrc: '/観戦記ポップ.png',
      },
    ],
    []
  );

  const [participantsByEventId, setParticipantsByEventId] = useState<Record<string, Participant[]>>({});
  const [participantCountByEventId, setParticipantCountByEventId] = useState<Record<string, number>>({});
  const [joinedByEventId, setJoinedByEventId] = useState<Record<string, boolean>>({});
  const [wcJapanVoteCount, setWcJapanVoteCount] = useState<number>(0);

  const refreshEventCount = async (eventId: string) => {
    try {
      const c = await getCountFromServer(collection(db, 'eventParticipants', eventId, 'users'));
      setParticipantCountByEventId((prev) => ({ ...prev, [eventId]: c.data().count }));
    } catch {
      setParticipantCountByEventId((prev) => ({ ...prev, [eventId]: 0 }));
    }
  };

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    const aborted = { value: false };

    const fetchCounts = async () => {
      try {
        const c = await getCountFromServer(
          query(collection(db, 'wc2026PublicSquadPredictions'), where('countrySlug', '==', 'japan'))
        );
        if (!aborted.value) setWcJapanVoteCount(c.data().count);
      } catch {
        if (!aborted.value) setWcJapanVoteCount(0);
      }

      for (const ev of events) {
        if (ev.id === 'event-4') continue;
        try {
          const c = await getCountFromServer(collection(db, 'eventParticipants', ev.id, 'users'));
          if (aborted.value) return;
          setParticipantCountByEventId((prev) => ({ ...prev, [ev.id]: c.data().count }));
        } catch {
          if (aborted.value) return;
          setParticipantCountByEventId((prev) => ({ ...prev, [ev.id]: 0 }));
        }
      }
    };

    fetchCounts();

    for (const ev of events) {
      if (ev.id === 'event-4') {
        const postQ = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(KANSENKI_AUTHOR_SAMPLE_LIMIT));
        const simplePostQ = query(collection(db, 'simple-posts'), orderBy('createdAt', 'desc'), limit(KANSENKI_AUTHOR_SAMPLE_LIMIT));

        let latestPostAuthors: Participant[] = [];
        let latestSimplePostAuthors: Participant[] = [];

        const recompute = () => {
          const seen = new Set<string>();
          const merged: Participant[] = [];
          for (const p of [...latestPostAuthors, ...latestSimplePostAuthors]) {
            if (!p.uid || seen.has(p.uid)) continue;
            seen.add(p.uid);
            merged.push(p);
            if (merged.length >= 5) break;
          }
          setParticipantsByEventId((prev) => ({ ...prev, [ev.id]: merged }));
          setParticipantCountByEventId((prev) => ({ ...prev, [ev.id]: seen.size }));
        };

        unsubs.push(
          onSnapshot(
            postQ,
            (snap) => {
              latestPostAuthors = snap.docs
                .map((d) => d.data() as any)
                .map((row) => ({
                  uid:
                    typeof row?.authorId === 'string'
                      ? row.authorId
                      : typeof row?.userId === 'string'
                        ? row.userId
                        : typeof row?.author?.id === 'string'
                          ? row.author.id
                          : '',
                  displayName: typeof row?.authorName === 'string' ? row.authorName : null,
                  avatarUrl: typeof row?.authorImage === 'string' ? row.authorImage : null,
                }))
                .filter((x) => Boolean(x.uid));
              recompute();
            },
            () => {
              latestPostAuthors = [];
              recompute();
            }
          )
        );

        unsubs.push(
          onSnapshot(
            simplePostQ,
            (snap) => {
              latestSimplePostAuthors = snap.docs
                .map((d) => d.data() as any)
                .map((row) => ({
                  uid:
                    typeof row?.authorId === 'string'
                      ? row.authorId
                      : typeof row?.userId === 'string'
                        ? row.userId
                        : typeof row?.author?.id === 'string'
                          ? row.author.id
                          : '',
                  displayName: typeof row?.authorName === 'string' ? row.authorName : null,
                  avatarUrl: typeof row?.authorImage === 'string' ? row.authorImage : null,
                }))
                .filter((x) => Boolean(x.uid));
              recompute();
            },
            () => {
              latestSimplePostAuthors = [];
              recompute();
            }
          )
        );
      } else {
        const q = query(collection(db, 'eventParticipants', ev.id, 'users'), orderBy('joinedAt', 'desc'), limit(5));

        unsubs.push(
          onSnapshot(
            q,
            (snap) => {
              const next = snap.docs
                .map((d) => d.data() as any)
                .map((row) => ({
                  uid: typeof row?.uid === 'string' ? row.uid : '',
                  displayName: typeof row?.displayName === 'string' ? row.displayName : null,
                  avatarUrl: typeof row?.avatarUrl === 'string' ? row.avatarUrl : null,
                }))
                .filter((x) => Boolean(x.uid));

              setParticipantsByEventId((prev) => ({ ...prev, [ev.id]: next }));
              refreshEventCount(ev.id);
            },
            () => {
              setParticipantsByEventId((prev) => ({ ...prev, [ev.id]: [] }));
              refreshEventCount(ev.id);
            }
          )
        );
      }

      if (user?.uid) {
        const myDocRef = doc(db, 'eventParticipants', ev.id, 'users', user.uid);
        unsubs.push(
          onSnapshot(
            myDocRef,
            (snap) => {
              setJoinedByEventId((prev) => ({ ...prev, [ev.id]: snap.exists() }));
            },
            () => {
              setJoinedByEventId((prev) => ({ ...prev, [ev.id]: false }));
            }
          )
        );
      } else {
        setJoinedByEventId((prev) => ({ ...prev, [ev.id]: false }));
      }
    }

    return () => {
      aborted.value = true;
      for (const u of unsubs) u();
    };
  }, [events, user?.uid]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col gap-4">
          {events.map((ev) => {
            const joined = Boolean(joinedByEventId[ev.id]);
            const participants = participantsByEventId[ev.id] ?? [];
            const participantCount = participantCountByEventId[ev.id] ?? 0;
            const displayParticipantCount = ev.id === 'event-4' ? 42 : participantCount;
            const participantCountText =
              `${ev.id === 'event-1' ? wcJapanVoteCount : displayParticipantCount}名のユーザーが参加中`;

            return (
              <div
                key={ev.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
              >
                <div className="relative">
                  <Link href={ev.href} className="block">
                    <div className="relative aspect-[16/9] w-full">
                      <Image
                        src={ev.thumbnailSrc}
                        alt="EVENT"
                        fill
                        priority={ev.id === 'event-1'}
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 960px"
                      />
                      <div className="absolute bottom-1 left-3 rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold text-white/90 backdrop-blur">
                        {participantCountText}
                      </div>
                      <div className="absolute bottom-1 right-3 flex -space-x-2">
                        {participants.slice(0, 5).map((p) => (
                          <div
                            key={p.uid}
                            className={
                              `flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-700 text-xs font-bold text-white shadow-sm dark:border-gray-950 `
                            }
                            aria-label={p.displayName ?? p.uid}
                            title={p.displayName ?? ''}
                          >
                            {p.avatarUrl ? <Image src={p.avatarUrl} alt={p.displayName ?? 'user'} width={36} height={36} className="h-9 w-9 object-cover" /> : (p.displayName?.slice(0, 1) ?? 'U')}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Link>

                  {joined ? (
                    <div className="absolute left-3 top-3 rounded-full bg-emerald-500/95 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      参加中
                    </div>
                  ) : null}
                </div>

                <div className="-mt-12 flex items-center justify-between gap-3 px-4 pb-4">
                  <div className="flex items-center">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {joined ? 'あなた含め参加中' : '参加者'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!user?.uid) {
                        router.push('/login');
                        return;
                      }
                      const myAvatarUrl = userProfile?.avatarUrl || user.photoURL || null;
                      const myDisplayName = userProfile?.nickname || user.displayName || null;
                      const myDocRef = doc(db, 'eventParticipants', ev.id, 'users', user.uid);
                      setDoc(
                        myDocRef,
                        {
                          uid: user.uid,
                          displayName: myDisplayName,
                          avatarUrl: myAvatarUrl,
                          joinedAt: serverTimestamp(),
                        },
                        { merge: true }
                      )
                        .then(() => {
                          if (ev.id !== 'event-4') {
                            refreshEventCount(ev.id);
                          }
                        })
                        .catch(() => {
                          return;
                        });
                    }}
                    className={
                      'pointer-events-auto rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ' +
                      (joined
                        ? 'bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600')
                    }
                  >
                    {joined ? '参加中' : '参加する'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6 text-center dark:border-gray-800">
          <Link
            href="/privacy"
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            プライバシーポリシー
          </Link>
        </div>
      </div>
    </main>
  );
}

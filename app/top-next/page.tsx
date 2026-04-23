 'use client';

 import Image from 'next/image';
 import Link from 'next/link';
 import { useMemo, useState } from 'react';
 import { useAuth } from '@/contexts/AuthContext';

export default function TopNextPage() {
  const { user, userProfile } = useAuth();

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

  const [joinedById, setJoinedById] = useState<Record<string, boolean>>({});

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col gap-4">
          {events.map((ev) => {
            const joined = Boolean(joinedById[ev.id]);

            const myAvatarUrl = userProfile?.avatarUrl || user?.photoURL || null;

            const participants = joined
              ? [
                  { id: 'me', label: 'You', bgClassName: 'bg-emerald-500', avatarUrl: myAvatarUrl },
                  { id: 'p-1', label: 'A', bgClassName: 'bg-blue-500' },
                  { id: 'p-2', label: 'B', bgClassName: 'bg-purple-500' },
                  { id: 'p-3', label: 'C', bgClassName: 'bg-amber-500' },
                ]
              : [
                  { id: 'p-1', label: 'A', bgClassName: 'bg-blue-500' },
                  { id: 'p-2', label: 'B', bgClassName: 'bg-purple-500' },
                  { id: 'p-3', label: 'C', bgClassName: 'bg-amber-500' },
                ];

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
                      <div className="absolute bottom-3 right-3 flex -space-x-2">
                        {participants.slice(0, 5).map((p) => (
                          <div
                            key={p.id}
                            className={
                              `flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-sm dark:border-gray-950 ` +
                              p.bgClassName
                            }
                            aria-label={p.label}
                            title={p.label}
                          >
                            {p.avatarUrl ? (
                              <div className="relative h-full w-full overflow-hidden rounded-full">
                                <Image src={p.avatarUrl} alt={p.label} fill className="object-cover" sizes="36px" />
                              </div>
                            ) : (
                              p.label
                            )}
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
                      setJoinedById((prev) => ({ ...prev, [ev.id]: !Boolean(prev[ev.id]) }));
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
      </div>
    </main>
  );
}

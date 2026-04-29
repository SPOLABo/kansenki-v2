'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PostCard from '@/components/PostCard';
import PostActions3 from '@/app/timeline/components/PostActions3';
import type { UnifiedPostWithDate } from '@/types/post';
import { getWc2026CountryBySlug } from '@/lib/worldcup/wc2026Countries';
import { premierLeagueClubs } from '@/lib/clubMaster';
import type { FormationSlotKey } from '@/app/worldcup/2026/[country]/wc2026PredictionUtils';
import type { SquadPlayerPrediction, SquadStatus } from '@/types/worldcup';
import {
  FORMATION_3421_SLOTS,
  groupByPosition,
  pickTop,
  statusMark,
} from '@/app/worldcup/2026/[country]/wc2026PredictionUtils';

type FeedItem =
  | {
      kind: 'post';
      id: string;
      date: Date | null;
      post: UnifiedPostWithDate;
    }
  | {
      kind: 'wc2026';
      id: string;
      date: Date | null;
      createdByUid: string;
      countryNameJa: string;
      href: string;
      imageUrl: string | null;
      comment: string;
    }
  | {
      kind: 'plFinalTable';
      id: string;
      date: Date | null;
      createdByUid: string;
      href: string;
      imageUrl: string | null;
      selectedByRank: (string | null)[];
      title: string;
    };

type TimelineAuthor = {
  name: string;
  avatarUrl: string;
};

function escapeXml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function surnameOnly(name: string) {
  const parts = name.split(/[\s　]+/).filter(Boolean);
  if (parts.length >= 2) return parts[0];
  return name;
}

function buildOgpLikePitchSvg(args: {
  countryNameJa: string;
  assigned: Partial<Record<FormationSlotKey, SquadPlayerPrediction>>;
}) {
  const { countryNameJa, assigned } = args;

  const W = 1200;
  const H = 630;

  const pillW = 520;
  const pillH = 56;
  const pillRx = 28;

  const nodes = FORMATION_3421_SLOTS.map((slot) => {
    const key = slot.key as FormationSlotKey;
    const p = assigned[key];
    const label = p ? surnameOnly(p.name) : slot.label;
    const mark = p ? statusMark(p.status as SquadStatus) : '';
    const x = Math.round((slot.leftPct / 100) * W);
    const y = Math.round((slot.topPct / 100) * (H - 64) + 64);
    const px = x - pillW / 2;
    const py = y - pillH / 2;

    const markColor = p && (p.status === 'S' || p.status === '!?') ? 'rgba(253, 230, 138, 0.95)' : 'rgba(255,255,255,0.65)';
    const nameX = x - pillW / 2 + (mark ? 76 : 34);

    const nameText = p
      ? `<text x="${nameX}" y="${y + 1}" text-anchor="start" dominant-baseline="middle" fill="rgba(255,255,255,0.92)" font-size="24" font-weight="800">${escapeXml(label)}</text>`
      : `<text x="${x}" y="${y + 1}" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,0.62)" font-size="22" font-weight="800">${escapeXml(label)}</text>`;

    const markText = mark
      ? `<text x="${x - pillW / 2 + 34}" y="${y + 1}" text-anchor="start" dominant-baseline="middle" fill="${markColor}" font-size="24" font-weight="900">${escapeXml(mark)}</text>`
      : '';

    return `<g>
      <rect x="${px}" y="${py}" width="${pillW}" height="${pillH}" rx="${pillRx}" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.14)" />
      ${nameText}
      ${markText}
    </g>`;
  }).join('\n');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0b1533" stop-opacity="0.92" />
          <stop offset="1" stop-color="#070d1f" stop-opacity="0.95" />
        </linearGradient>
        <linearGradient id="pitch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#34d399" stop-opacity="0.72" />
          <stop offset="0.52" stop-color="#10b981" stop-opacity="0.64" />
          <stop offset="1" stop-color="#064e3b" stop-opacity="0.64" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bg)" />
      <rect x="0" y="64" width="${W}" height="${H - 64}" fill="url(#pitch)" />

      <g opacity="0.18">
        <rect x="100" y="96" width="${W - 200}" height="${H - 160}" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2" />
        <line x1="${W / 2}" y1="96" x2="${W / 2}" y2="${H - 64}" stroke="rgba(255,255,255,0.5)" stroke-width="2" />
        <circle cx="${W / 2}" cy="${(96 + (H - 64)) / 2}" r="90" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2" />
      </g>

      <text x="28" y="42" fill="rgba(255,255,255,0.86)" font-size="18" font-weight="700">${escapeXml(
        `${countryNameJa}：W杯 2026 予想`
      )}</text>
      <text x="${W - 28}" y="42" fill="rgba(255,255,255,0.55)" font-size="16" font-weight="600" text-anchor="end">3-4-2-1</text>

      ${nodes}
    </svg>
  `;

  return svgDataUrl(svg);
}

function buildPlFinalTableSvg(args: { selectedByRank: (string | null)[] }) {
  const W = 1200;
  const H = 630;
  const rows = (args.selectedByRank ?? []).slice(0, 7);

  const items = rows
    .map((clubId, idx) => {
      const club = typeof clubId === 'string' ? (premierLeagueClubs as any)[clubId] : null;
      const name = club?.nameJa ? String(club.nameJa) : '未選択';
      const y = 170 + idx * 64;
      return `
        <g>
          <rect x="120" y="${y - 34}" width="960" height="56" rx="18" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.10)" />
          <text x="160" y="${y}" fill="rgba(255,255,255,0.72)" font-size="22" font-weight="900">${idx + 1}</text>
          <text x="210" y="${y}" fill="rgba(255,255,255,0.92)" font-size="26" font-weight="900">${escapeXml(name)}</text>
        </g>
      `;
    })
    .join('\n');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#111827" stop-opacity="1" />
          <stop offset="1" stop-color="#000000" stop-opacity="1" />
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#f97316" stop-opacity="0.9" />
          <stop offset="1" stop-color="#fb7185" stop-opacity="0.75" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bg)" />
      <rect x="0" y="0" width="${W}" height="88" fill="rgba(255,255,255,0.04)" />
      <rect x="0" y="86" width="${W}" height="2" fill="rgba(255,255,255,0.06)" />

      <rect x="36" y="30" width="10" height="28" rx="5" fill="url(#accent)" />
      <text x="60" y="54" fill="rgba(255,255,255,0.90)" font-size="20" font-weight="800">Premier League 最終順位予想</text>
      <text x="${W - 36}" y="54" fill="rgba(255,255,255,0.55)" font-size="16" font-weight="700" text-anchor="end">TOP 7</text>

      ${items}
    </svg>
  `;

  return svgDataUrl(svg);
}

function toDateMaybe(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (typeof v?.seconds === 'number') return new Timestamp(v.seconds, v.nanoseconds).toDate();
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function formatDate(d: Date | null) {
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

export default function MixedFeedSection() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorByUid, setAuthorByUid] = useState<Record<string, TimelineAuthor>>({});

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const [postItems, wcItems, plItems] = await Promise.all([
          (async () => {
            const collectionNames = ['posts', 'simple-posts'];
            const allItems: { data: any; type: string }[] = [];

            for (const collectionName of collectionNames) {
              const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'), limit(20));
              const querySnapshot = await getDocs(q);
              querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                allItems.push({ data: { ...data, id: docSnap.id }, type: collectionName });
              });
            }

            const unifiedItems: UnifiedPostWithDate[] = allItems.map(({ data, type }) => {
              const getTitle = () => {
                if (data.title) return data.title;
                const homeTeam = data.match?.homeTeam || data.homeTeam;
                const awayTeam = data.match?.awayTeam || data.awayTeam;
                if (homeTeam && awayTeam) return `${homeTeam} vs ${awayTeam}`;
                return '無題';
              };

              return {
                id: data.id,
                postType: type.replace(/s$/, '') as any,
                collectionName: type,
                title: getTitle(),
                subtext: data.match?.stadium?.name || data.stadium || null,
                imageUrls: data.imageUrls || data.images || (data.imageUrl ? [data.imageUrl] : []),
                authorId: data.authorId || data.userId || (data.author && data.author.id) || '',
                authorName:
                  data.authorName || (data.author && typeof data.author === 'object' ? data.author.name : null) || '名無し',
                authorImage:
                  (data.author && typeof data.author === 'object' ? data.author.image : null) ||
                  data.authorImage ||
                  '/default-avatar.svg',
                createdAt: toDateMaybe(data.createdAt),
                league: data.match?.competition || data.match?.league || data.league || '',
                country: data.match?.country || data.country || '',
                href: `/${type}/${data.id}`,
                originalData: data,
              };
            });

            const next: FeedItem[] = unifiedItems
              .filter((p) => (p.imageUrls?.length ?? 0) > 0)
              .map((p) => ({ kind: 'post', id: p.id, date: p.createdAt, post: p }));

            return next;
          })(),
          (async () => {
            const snap = await (async () => {
              try {
                const q1 = query(collection(db, 'wc2026PredictionShares'), orderBy('updatedAt', 'desc'), limit(80));
                return await getDocs(q1);
              } catch {
                const q2 = query(collection(db, 'wc2026PredictionShares'), orderBy('createdAt', 'desc'), limit(80));
                return await getDocs(q2);
              }
            })();

            const next: FeedItem[] = snap.docs
              .map((d) => {
                const data: any = d.data();
                const raw = typeof data?.snapshotJson === 'string' ? data.snapshotJson : '';
                const parsed = raw ? (JSON.parse(raw) as any) : null;
                const countrySlug = typeof parsed?.countrySlug === 'string' ? parsed.countrySlug : String(data?.countrySlug ?? '');
                const country = getWc2026CountryBySlug(countrySlug);

                const createdByUid = typeof data?.createdByUid === 'string' ? data.createdByUid : '';

                const date = toDateMaybe(data?.updatedAt ?? data?.createdAt);

                const playersRaw = Array.isArray(parsed?.players) ? parsed.players : [];
                const players: SquadPlayerPrediction[] = playersRaw
                  .filter((p: any) => p && typeof p.id === 'string' && typeof p.name === 'string')
                  .map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    position: p.position,
                    status: p.status,
                  }));

                const pitchOverrideBySlot: Partial<Record<FormationSlotKey, string>> =
                  parsed?.pitchOverrideBySlot && typeof parsed.pitchOverrideBySlot === 'object' ? parsed.pitchOverrideBySlot : {};

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

                const imageUrl = players.length > 0 ? buildOgpLikePitchSvg({ countryNameJa: country?.nameJa ?? 'W杯2026', assigned }) : null;

                const comment = typeof parsed?.comment === 'string' ? parsed.comment : '';
                const trimmedComment = comment.trim().slice(0, 120);

                return {
                  kind: 'wc2026' as const,
                  id: d.id,
                  date,
                  createdByUid,
                  countryNameJa: country?.nameJa ?? 'W杯2026',
                  href: `/worldcup/2026/${countrySlug}/share/${d.id}`,
                  imageUrl,
                  comment: trimmedComment,
                };
              })
              .filter((it) => Boolean((it as any).href));

            return next;
          })(),
          (async () => {
            const snap = await getDocs(query(collection(db, 'plFinalTablePredictionShares'), orderBy('createdAt', 'desc'), limit(80)));
            const next: FeedItem[] = snap.docs.map((d) => {
              const data: any = d.data();
              const date = toDateMaybe(data?.createdAt);
              const storedOg = typeof data?.ogImageUrl === 'string' && data.ogImageUrl.trim() ? data.ogImageUrl.trim() : null;
              const createdByUid = typeof data?.createdByUid === 'string' ? data.createdByUid : '';

              const raw = typeof data?.snapshotJson === 'string' ? data.snapshotJson : '';
              const parsed = raw ? (JSON.parse(raw) as any) : null;
              const selectedByRank = Array.isArray(parsed?.selectedByRank)
                ? parsed.selectedByRank.map((x: unknown) => (typeof x === 'string' ? x : null))
                : [];

              const imageUrl = storedOg ?? buildPlFinalTableSvg({ selectedByRank });
              return {
                kind: 'plFinalTable' as const,
                id: d.id,
                date,
                createdByUid,
                href: `/events/premier-league-final-table/share/${encodeURIComponent(d.id)}`,
                imageUrl,
                selectedByRank,
                title: 'Premier League 最終順位予想',
              };
            });
            return next;
          })(),
        ]);

        const merged = [...postItems, ...wcItems, ...plItems];
        merged.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

        if (!cancelled) setItems(merged);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const uids = Array.from(
          new Set(
            items
              .filter((it) => it.kind === 'wc2026' || it.kind === 'plFinalTable')
              .map((it) => (it as any).createdByUid as string)
              .filter(Boolean)
          )
        );
        if (uids.length === 0) return;

        const missing = uids.filter((uid) => !authorByUid[uid]);
        if (missing.length === 0) return;

        const next: Record<string, TimelineAuthor> = {};
        for (const uid of missing) {
          try {
            const snap = await getDoc(doc(db, 'users', uid));
            const data: any = snap.exists() ? snap.data() : null;
            const name = (data?.nickname || data?.displayName || '名無し') as string;
            const avatarUrl = (data?.avatarUrl || data?.photoURL || '/default-avatar.svg') as string;
            next[uid] = { name, avatarUrl };
          } catch {
            next[uid] = { name: '名無し', avatarUrl: '/default-avatar.svg' };
          }
        }

        if (!cancelled && Object.keys(next).length > 0) {
          setAuthorByUid((prev) => ({ ...prev, ...next }));
        }
      } catch {
        return;
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [authorByUid, items]);

  const shown = useMemo(() => items.slice(0, 40), [items]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 overflow-hidden mb-4">
      <div className="p-4">
        <div>
          <div className="text-sm text-gray-100">みんなの投稿</div>
          <div className="text-xs text-gray-300">観戦記 / 予想 など</div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="text-xs text-gray-300">読み込み中...</div>
          ) : shown.length === 0 ? (
            <div className="text-xs text-gray-300">まだ投稿がありません</div>
          ) : (
            <div className="space-y-3">
              {shown.map((it) => {
                if (it.kind === 'post') {
                  return (
                    <div key={`post-${it.id}`} className="rounded-2xl overflow-hidden">
                      <PostCard
                        post={it.post}
                        footer={
                          <PostActions3 postId={it.post.id} collectionName={it.post.collectionName} />
                        }
                      />
                    </div>
                  );
                }

                if (it.kind === 'wc2026') {
                  const author = it.createdByUid ? authorByUid[it.createdByUid] : undefined;
                  return (
                    <Link
                      key={`wc-${it.id}`}
                      href={it.href}
                      className="block w-full rounded-xl border border-gray-200 bg-white text-left shadow-sm hover:bg-gray-50 transition-colors overflow-hidden dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
                    >
                      {it.imageUrl ? (
                        <div className="px-4 pt-3">
                          <img
                            src={it.imageUrl}
                            alt="スタメン予想"
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-800"
                            loading="lazy"
                          />
                        </div>
                      ) : null}
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-bold text-gray-900 truncate dark:text-gray-100">W杯2026：{it.countryNameJa}</div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">更新：{formatDate(it.date)}</div>
                        </div>
                        {it.comment ? <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{it.comment}</div> : null}

                        {author && it.createdByUid ? (
                          <div className="mt-3 flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Link
                              href={`/user/${it.createdByUid}`}
                              className="flex items-center gap-2 truncate no-underline text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              <div className="relative w-5 h-5 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800">
                                <Image
                                  src={author.avatarUrl || '/default-avatar.svg'}
                                  alt={author.name}
                                  fill
                                  sizes="20px"
                                  className="object-cover"
                                />
                              </div>
                              <span className="truncate">{author.name}</span>
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  );
                }

                const author = it.createdByUid ? authorByUid[it.createdByUid] : undefined;
                return (
                  <Link
                    key={`pl-${it.id}`}
                    href={it.href}
                    className="block w-full rounded-xl border border-gray-200 bg-white text-left shadow-sm hover:bg-gray-50 transition-colors overflow-hidden dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
                  >
                    {it.imageUrl ? (
                      <div className="px-4 pt-3">
                        <img
                          src={it.imageUrl}
                          alt={it.title}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-800"
                          loading="lazy"
                        />
                      </div>
                    ) : null}
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-gray-900 truncate dark:text-gray-100">{it.title}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">更新：{formatDate(it.date)}</div>
                      </div>
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">25/26シーズンの最終順位予想</div>

                      {author && it.createdByUid ? (
                        <div className="mt-3 flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Link
                            href={`/user/${it.createdByUid}`}
                            className="flex items-center gap-2 truncate no-underline text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <div className="relative w-5 h-5 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800">
                              <Image
                                src={author.avatarUrl || '/default-avatar.svg'}
                                alt={author.name}
                                fill
                                sizes="20px"
                                className="object-cover"
                              />
                            </div>
                            <span className="truncate">{author.name}</span>
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

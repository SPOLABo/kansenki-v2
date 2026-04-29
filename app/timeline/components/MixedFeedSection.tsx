'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PostCard from '@/components/PostCard';
import PostActions3 from '@/app/timeline/components/PostActions3';
import type { UnifiedPostWithDate } from '@/types/post';
import { getWc2026CountryBySlug } from '@/lib/worldcup/wc2026Countries';
import { premierLeagueClubs } from '@/lib/clubMaster';
import type { FormationSlotKey } from '@/app/worldcup/2026/[country]/wc2026PredictionUtils';
import type { SquadPlayerPrediction, SquadStatus } from '@/types/worldcup';
import { toPng } from 'html-to-image';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FaRegComment, FaHeart, FaRegHeart } from 'react-icons/fa';
import {
  FORMATION_3421_SLOTS,
  groupByPosition,
  pickTop,
  statusMark,
  statusMarkClassName,
} from '@/app/worldcup/2026/[country]/wc2026PredictionUtils';
import { Wc2026PitchOgpCapture } from '@/app/worldcup/2026/[country]/_components/Wc2026PitchOgpCapture';

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
      fallbackImageUrl: string | null;
      pitchData: { assigned: Partial<Record<FormationSlotKey, SquadPlayerPrediction>> } | null;
      commentCount: number;
      likeCount: number;
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

async function deleteFeedDoc(args: { kind: 'wc2026' | 'plFinalTable'; id: string }) {
  const { kind, id } = args;
  const ref = doc(db, kind === 'wc2026' ? 'wc2026PredictionShares' : 'plFinalTablePredictionShares', id);
  await deleteDoc(ref);
}

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
  const trimmed = name.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return parts[0];
  return name;
}

function truncateLabel(s: string, max: number) {
  const t = s.trim();
  if (!t) return '';
  return t.length > max ? `${t.slice(0, Math.max(0, max - 1))}…` : t;
}

function buildOgpLikePitchSvg(args: {
  countryNameJa: string;
  assigned: Partial<Record<FormationSlotKey, SquadPlayerPrediction>>;
}) {
  const { countryNameJa, assigned } = args;

  const W = 1200;
  const H = 630;

  const pillW = 320;
  const pillH = 44;
  const pillRx = 22;

  const nodes = FORMATION_3421_SLOTS.map((slot) => {
    const key = slot.key as FormationSlotKey;
    const p = assigned[key];
    const labelRaw = p ? surnameOnly(p.name) : slot.label;
    const label = truncateLabel(labelRaw, 8);
    const mark = p ? statusMark(p.status as SquadStatus) : '';
    const x = Math.round((slot.leftPct / 100) * W);
    const y = Math.round((slot.topPct / 100) * (H - 64) + 64);
    const px = x - pillW / 2;
    const py = y - pillH / 2;

    const markColor = p && (p.status === 'S' || p.status === '!?') ? 'rgba(253, 230, 138, 0.95)' : 'rgba(255,255,255,0.65)';
    const nameX = x - pillW / 2 + (mark ? 58 : 24);

    const nameFontSize = label.length >= 8 ? 16 : label.length >= 7 ? 18 : 20;
    const emptyFontSize = label.length >= 8 ? 14 : 16;

    const nameText = p
      ? `<text x="${nameX}" y="${y + 1}" text-anchor="start" dominant-baseline="middle" fill="rgba(255,255,255,0.92)" font-size="${nameFontSize}" font-weight="800">${escapeXml(label)}</text>`
      : `<text x="${x}" y="${y + 1}" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,0.62)" font-size="${emptyFontSize}" font-weight="800">${escapeXml(label)}</text>`;

    const markText = mark
      ? `<text x="${x - pillW / 2 + 22}" y="${y + 1}" text-anchor="start" dominant-baseline="middle" fill="${markColor}" font-size="20" font-weight="900">${escapeXml(mark)}</text>`
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

function buildPlFinalTableSvg(args: { selectedByRank: (string | null)[]; crestByClubId?: Record<string, string> }) {
  const W = 1200;
  const H = 630;
  const rows = (args.selectedByRank ?? []).slice(0, 7);
  const crestByClubId = args.crestByClubId ?? {};

  const items = rows
    .map((clubId, idx) => {
      const club = typeof clubId === 'string' ? (premierLeagueClubs as any)[clubId] : null;
      const name = club?.nameJa ? String(club.nameJa) : '未選択';
      const logoUrl = typeof clubId === 'string' ? crestByClubId[clubId] : '';
      const y = 170 + idx * 64;
      const crestSize = 40;
      const crestX = 200;
      const crestY = Math.round(y - crestSize / 2);
      const nameX = 260;
      return `
        <g>
          <rect x="120" y="${y - 34}" width="960" height="56" rx="18" fill="rgba(255,255,255,0.86)" stroke="rgba(2, 6, 23, 0.10)" />
          <text x="160" y="${y}" fill="rgba(2, 6, 23, 0.65)" font-size="22" font-weight="900">${idx + 1}</text>
          ${logoUrl ? `<g>
            <rect x="${crestX}" y="${crestY}" width="${crestSize}" height="${crestSize}" rx="20" fill="rgba(255,255,255,0.95)" stroke="rgba(2, 6, 23, 0.10)" />
            <image href="${escapeXml(logoUrl)}" x="${crestX + 6}" y="${crestY + 6}" width="${crestSize - 12}" height="${crestSize - 12}" preserveAspectRatio="xMidYMid meet" />
          </g>` : ''}
          <text x="${nameX}" y="${y}" fill="rgba(2, 6, 23, 0.92)" font-size="26" font-weight="900">${escapeXml(name)}</text>
        </g>
      `;
    })
    .join('\n');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f0f9ff" stop-opacity="1" />
          <stop offset="0.55" stop-color="#e0f2fe" stop-opacity="1" />
          <stop offset="1" stop-color="#e2e8f0" stop-opacity="1" />
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#f97316" stop-opacity="0.9" />
          <stop offset="1" stop-color="#fb7185" stop-opacity="0.75" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bg)" />
      <rect x="0" y="0" width="${W}" height="88" fill="rgba(255,255,255,0.70)" />

      <g>
        <rect x="0" y="0" width="10" height="88" fill="url(#accent)" />
        <text x="28" y="52" fill="rgba(2, 6, 23, 0.92)" font-size="22" font-weight="900">Premier League 最終順位予想</text>
        <text x="${W - 28}" y="52" fill="rgba(2, 6, 23, 0.55)" font-size="18" font-weight="800" text-anchor="end">TOP 7</text>
      </g>

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

  const [plCrestByClubId, setPlCrestByClubId] = useState<Record<string, string>>({});
  const [wc2026ThumbByShareId, setWc2026ThumbByShareId] = useState<Record<string, string>>({});
  const [user, setUser] = useState<User | null>(null);
  const [likedWcShareIds, setLikedWcShareIds] = useState<Record<string, boolean>>({});
  const [likingWcShareIds, setLikingWcShareIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setLikedWcShareIds({});
        setLikingWcShareIds({});
      }
    });
    return () => unsub();
  }, [plCrestByClubId]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const clubIds = Array.from(
        new Set(
          items
            .filter((x) => x.kind === 'plFinalTable')
            .flatMap((x) => ((x as Extract<FeedItem, { kind: 'plFinalTable' }>).selectedByRank ?? []).slice(0, 7))
            .filter((x): x is string => typeof x === 'string' && Boolean(x))
        )
      );

      const missing = clubIds.filter((id) => !plCrestByClubId[id]);
      if (missing.length === 0) return;

      const next: Record<string, string> = {};
      for (const clubId of missing) {
        const club = (premierLeagueClubs as any)[clubId];
        const logoSrc = club?.logoSrc ? String(club.logoSrc) : '';
        if (!logoSrc) continue;
        try {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const url = logoSrc.startsWith('/') && origin ? `${origin}${logoSrc}` : logoSrc;
          const res = await fetch(url);
          if (!res.ok) continue;
          const blob = await res.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsDataURL(blob);
          });
          if (dataUrl) next[clubId] = dataUrl;
        } catch {
          continue;
        }
      }

      if (!cancelled && Object.keys(next).length > 0) {
        setPlCrestByClubId((prev) => ({ ...prev, ...next }));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [items, plCrestByClubId]);

  useEffect(() => {
    if (!items.some((x) => x.kind === 'plFinalTable')) return;
    if (Object.keys(plCrestByClubId).length === 0) return;

    setItems((prev) =>
      prev.map((it) => {
        if (it.kind !== 'plFinalTable') return it;
        if (typeof it.imageUrl === 'string' && it.imageUrl.startsWith('data:image/svg+xml')) {
          return { ...it, imageUrl: buildPlFinalTableSvg({ selectedByRank: it.selectedByRank, crestByClubId: plCrestByClubId }) };
        }
        return it;
      })
    );
  }, [plCrestByClubId]);

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

                const storedOg =
                  typeof data?.ogImageUrl === 'string' && data.ogImageUrl.trim() ? data.ogImageUrl.trim() : null;

                const apiImageUrl = countrySlug
                  ? `/api/wc2026-og/${encodeURIComponent(countrySlug)}/${encodeURIComponent(d.id)}?mode=pitch`
                  : null;

                const imageUrl = storedOg ?? apiImageUrl;

                const fallbackImageUrl = players.length > 0
                  ? buildOgpLikePitchSvg({ countryNameJa: country?.nameJa ?? 'W杯2026', assigned })
                  : null;

                const comment = typeof parsed?.comment === 'string' ? parsed.comment : '';
                const trimmedComment = comment.trim().slice(0, 120);

                const commentCount = typeof data?.commentCount === 'number' ? data.commentCount : 0;
                const likeCount = typeof data?.likeCount === 'number' ? data.likeCount : 0;

                return {
                  kind: 'wc2026' as const,
                  id: d.id,
                  date,
                  createdByUid,
                  countryNameJa: country?.nameJa ?? 'W杯2026',
                  href: `/worldcup/2026/${countrySlug}/share/${d.id}`,
                  imageUrl,
                  fallbackImageUrl,
                  pitchData: players.length > 0 ? ({ assigned } as any) : null,
                  commentCount,
                  likeCount,
                  comment: trimmedComment,
                };
              })
              .filter((it) => Boolean((it as any).href));

            return next;
          })(),
          (async () => {
            const plItems: FeedItem[] = await (async () => {
              try {
                const q = query(collection(db, 'plFinalTablePredictionShares'), orderBy('createdAt', 'desc'), limit(8));
                const snaps = await getDocs(q);
                const next = snaps.docs.map((d) => {
                  const data: any = d.data();
                  const date = toDateMaybe(data?.createdAt);
                  const storedOg = typeof data?.ogImageUrl === 'string' && data.ogImageUrl.trim() ? data.ogImageUrl.trim() : null;
                  const createdByUid = typeof data?.createdByUid === 'string' ? data.createdByUid : '';

                  const raw = typeof data?.snapshotJson === 'string' ? data.snapshotJson : '';
                  const parsed = raw ? (JSON.parse(raw) as any) : null;
                  const selectedByRank = Array.isArray(parsed?.selectedByRank)
                    ? parsed.selectedByRank.map((x: unknown) => (typeof x === 'string' ? x : null))
                    : [];

                  const imageUrl = storedOg ?? buildPlFinalTableSvg({ selectedByRank, crestByClubId: plCrestByClubId });
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
              } catch {
                return [];
              }
            })();
            return plItems;
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

  const wc2026CaptureTargets = useMemo(() => {
    return shown
      .filter((it) => it.kind === 'wc2026')
      .slice(0, 6)
      .map((it) => it as Extract<FeedItem, { kind: 'wc2026' }>);
  }, [shown]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) return;

    const run = async () => {
      const targets = wc2026CaptureTargets.map((t) => t.id).filter(Boolean);
      const missing = targets.filter((id) => likedWcShareIds[id] === undefined);
      if (missing.length === 0) return;

      const next: Record<string, boolean> = {};
      for (const shareId of missing) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid, 'wc2026Likes', shareId));
          next[shareId] = snap.exists();
        } catch {
          next[shareId] = false;
        }
      }

      if (!cancelled) {
        setLikedWcShareIds((prev) => ({ ...prev, ...next }));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [likedWcShareIds, user?.uid, wc2026CaptureTargets]);

  const toggleWc2026Like = async (shareId: string) => {
    if (!shareId) return;
    if (!user?.uid) {
      alert('いいねするにはログインが必要です。');
      return;
    }
    if (likingWcShareIds[shareId]) return;

    const currentlyLiked = Boolean(likedWcShareIds[shareId]);
    const nextLiked = !currentlyLiked;

    setLikingWcShareIds((prev) => ({ ...prev, [shareId]: true }));
    setLikedWcShareIds((prev) => ({ ...prev, [shareId]: nextLiked }));
    setItems((prev) =>
      prev.map((it) => {
        if (it.kind !== 'wc2026') return it;
        if (it.id !== shareId) return it;
        const base = typeof it.likeCount === 'number' ? it.likeCount : 0;
        const next = base + (nextLiked ? 1 : -1);
        return { ...it, likeCount: next < 0 ? 0 : next };
      })
    );

    try {
      const likeRef = doc(db, 'users', user.uid, 'wc2026Likes', shareId);
      const shareRef = doc(db, 'wc2026PredictionShares', shareId);
      if (nextLiked) {
        await setDoc(likeRef, { shareId, createdAt: serverTimestamp() });
        await updateDoc(shareRef, { likeCount: increment(1) });
      } else {
        await deleteDoc(likeRef);
        await updateDoc(shareRef, { likeCount: increment(-1) });
      }
    } catch (e: any) {
      const projectId = (db as any)?.app?.options?.projectId;
      console.error('[MixedFeedSection] toggleWc2026Like failed', {
        shareId,
        nextLiked,
        uid: user.uid,
        projectId,
        likePath: `users/${user.uid}/wc2026Likes/${shareId}`,
        sharePath: `wc2026PredictionShares/${shareId}`,
        code: typeof e?.code === 'string' ? e.code : undefined,
        message: typeof e?.message === 'string' ? e.message : undefined,
        raw: e,
      });
      setLikedWcShareIds((prev) => ({ ...prev, [shareId]: currentlyLiked }));
      setItems((prev) =>
        prev.map((it) => {
          if (it.kind !== 'wc2026') return it;
          if (it.id !== shareId) return it;
          const base = typeof it.likeCount === 'number' ? it.likeCount : 0;
          const next = base + (nextLiked ? -1 : 1);
          return { ...it, likeCount: next < 0 ? 0 : next };
        })
      );
      const code = typeof e?.code === 'string' ? e.code : '';
      const msg = typeof e?.message === 'string' ? e.message : '';
      alert(
        `エラーが発生しました。もう一度お試しください。${code || msg ? `\n${code || msg}` : ''}${projectId ? `\nprojectId: ${projectId}` : ''}`
      );
    } finally {
      setLikingWcShareIds((prev) => ({ ...prev, [shareId]: false }));
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      for (const t of wc2026CaptureTargets) {
        if (wc2026ThumbByShareId[t.id]) continue;
        if (!t.pitchData) continue;
        const el = document.getElementById(`wc2026-timeline-ogp-${t.id}`);
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
            setWc2026ThumbByShareId((prev) => ({ ...prev, [t.id]: dataUrl }));
          }
        } catch {
          // ignore
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [wc2026CaptureTargets, wc2026ThumbByShareId]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 overflow-hidden mb-4">
      <div className="p-4">
        {wc2026CaptureTargets.map((t) => {
          if (!t.pitchData) return null;
          return (
            <Wc2026PitchOgpCapture
              key={`wc2026-cap-${t.id}`}
              id={`wc2026-timeline-ogp-${t.id}`}
              countryNameJa={t.countryNameJa}
              pitchData={t.pitchData}
              statusMark={statusMark}
              statusMarkClassName={statusMarkClassName}
            />
          );
        })}
        {loading ? (
          <div className="mt-4 text-xs text-gray-300">読み込み中...</div>
        ) : shown.length === 0 ? (
          <div className="mt-4 text-xs text-gray-300">まだ投稿がありません</div>
        ) : (
          <div className="space-y-3">
            {shown.map((it) => {
              if (it.kind === 'post') {
                const canDelete = Boolean(user?.uid && it.post?.authorId && user.uid === it.post.authorId);
                return (
                  <div key={`post-${it.id}`} className="rounded-2xl overflow-hidden">
                    <PostCard
                      post={it.post}
                      footer={
                        <div>
                          {canDelete ? (
                            <div className="flex justify-end px-3 pt-2">
                              <button
                                type="button"
                                className="text-[11px] font-bold text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                                onClick={() => {
                                  const ok = window.confirm('この投稿を削除しますか？');
                                  if (!ok) return;
                                  void (async () => {
                                    try {
                                      await deleteDoc(doc(db, it.post.collectionName, it.post.id));
                                      setItems((prev) => prev.filter((x) => !(x.kind === 'post' && x.id === it.id)));
                                    } catch (err) {
                                      console.error('[MixedFeedSection] delete post failed', err);
                                      alert('削除に失敗しました。もう一度お試しください。');
                                    }
                                  })();
                                }}
                              >
                                削除
                              </button>
                            </div>
                          ) : null}
                          <PostActions3 postId={it.post.id} collectionName={it.post.collectionName} />
                        </div>
                      }
                    />
                  </div>
                );
              }

              if (it.kind === 'wc2026') {
                const author = it.createdByUid ? authorByUid[it.createdByUid] : undefined;
                const thumb = wc2026ThumbByShareId[it.id];
                const preferredImageUrl = thumb || it.imageUrl;
                const iconBase = 'w-4 h-4';
                const liked = Boolean(likedWcShareIds[it.id]);
                const likeBusy = Boolean(likingWcShareIds[it.id]);
                const canDelete = Boolean(user?.uid && it.createdByUid && user.uid === it.createdByUid);
                return (
                  <Link
                    key={`wc-${it.id}`}
                    href={it.href}
                    className="block w-full rounded-xl border border-gray-200 bg-white text-left shadow-sm hover:bg-gray-50 transition-colors overflow-hidden dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
                  >
                    {preferredImageUrl ? (
                      <div className="px-4 pt-3">
                        <img
                          src={preferredImageUrl}
                          alt="スタメン予想"
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-800"
                          loading="lazy"
                          onError={(e) => {
                            try {
                              if (it.fallbackImageUrl && e.currentTarget.src !== it.fallbackImageUrl) {
                                e.currentTarget.src = it.fallbackImageUrl;
                              }
                            } catch {
                              // ignore
                            }
                          }}
                        />
                      </div>
                    ) : null}
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-gray-900 truncate dark:text-gray-100">W杯2026：{it.countryNameJa}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">更新：{formatDate(it.date)}</div>
                      </div>
                      {it.comment ? <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{it.comment}</div> : null}

                      {canDelete ? (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            className="text-[11px] font-bold text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const ok = window.confirm('この投稿を削除しますか？');
                              if (!ok) return;
                              void (async () => {
                                try {
                                  await deleteFeedDoc({ kind: 'wc2026', id: it.id });
                                  setItems((prev) => prev.filter((x) => !(x.kind === 'wc2026' && x.id === it.id)));
                                } catch (err) {
                                  console.error('[MixedFeedSection] delete wc2026 share failed', err);
                                  alert('削除に失敗しました。もう一度お試しください。');
                                }
                              })();
                            }}
                          >
                            削除
                          </button>
                        </div>
                      ) : null}

                      <div className="mt-2 flex items-center gap-5 text-xs text-gray-500 dark:text-gray-400">
                        <div className="inline-flex items-center gap-2" aria-label="コメント数">
                          <FaRegComment className={iconBase} />
                          <span>{it.commentCount ?? 0}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void toggleWc2026Like(it.id);
                          }}
                          disabled={likeBusy}
                          className={
                            'inline-flex items-center gap-2 transition-colors ' +
                            (liked ? 'text-pink-500 hover:text-pink-400' : 'hover:text-gray-700 dark:hover:text-gray-200') +
                            (likeBusy ? ' opacity-60 cursor-not-allowed' : '')
                          }
                          aria-label="いいね"
                        >
                          {liked ? <FaHeart className={iconBase} /> : <FaRegHeart className={iconBase} />}
                          <span>{it.likeCount ?? 0}</span>
                        </button>
                      </div>

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
              const canDelete = Boolean(user?.uid && it.createdByUid && user.uid === it.createdByUid);
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

                    {canDelete ? (
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          className="text-[11px] font-bold text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const ok = window.confirm('この投稿を削除しますか？');
                            if (!ok) return;
                            void (async () => {
                              try {
                                await deleteFeedDoc({ kind: 'plFinalTable', id: it.id });
                                setItems((prev) => prev.filter((x) => !(x.kind === 'plFinalTable' && x.id === it.id)));
                              } catch (err) {
                                console.error('[MixedFeedSection] delete pl share failed', err);
                                alert('削除に失敗しました。もう一度お試しください。');
                              }
                            })();
                          }}
                        >
                          削除
                        </button>
                      </div>
                    ) : null}

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
  );
}

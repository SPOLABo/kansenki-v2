'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getWc2026CountryBySlug } from '@/lib/worldcup/wc2026Countries';
import type { SquadPlayerPrediction, SquadStatus } from '@/types/worldcup';
import type { FormationSlotKey } from '@/app/worldcup/2026/[country]/wc2026PredictionUtils';
import {
  FORMATION_3421_SLOTS,
  groupByPosition,
  pickTop,
  statusMark,
} from '@/app/worldcup/2026/[country]/wc2026PredictionUtils';

type Wc2026ShareListItem = {
  id: string;
  countrySlug: string;
  countryNameJa: string;
  comment: string;
  createdAt: Date | null;
  href: string;
  imageUrl: string | null;
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

export default function Wc2026SharesSection() {
  const [items, setItems] = useState<Wc2026ShareListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const snap = await (async () => {
          try {
            const q1 = query(collection(db, 'wc2026PredictionShares'), orderBy('updatedAt', 'desc'), limit(200));
            return await getDocs(q1);
          } catch (e) {
            console.error('[Wc2026SharesSection] updatedAt query failed. fallback to createdAt', e);
            const q2 = query(collection(db, 'wc2026PredictionShares'), orderBy('createdAt', 'desc'), limit(200));
            return await getDocs(q2);
          }
        })();

        const next: Wc2026ShareListItem[] = snap.docs
          .map((d) => {
            const data: any = d.data();
            const raw = typeof data?.snapshotJson === 'string' ? data.snapshotJson : '';
            const parsed = raw ? (JSON.parse(raw) as any) : null;
            const countrySlug = typeof parsed?.countrySlug === 'string' ? parsed.countrySlug : String(data?.countrySlug ?? '');
            const country = getWc2026CountryBySlug(countrySlug);
            const createdAt = (() => {
              const c = data?.updatedAt ?? data?.createdAt;
              if (!c) return null;
              if (c instanceof Date) return c;
              if (typeof c?.toDate === 'function') return c.toDate();
              if (typeof c?.seconds === 'number') return new Timestamp(c.seconds, c.nanoseconds).toDate();
              return null;
            })();

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
              id: d.id,
              countrySlug,
              countryNameJa: country?.nameJa ?? 'W杯2026',
              comment: trimmedComment,
              createdAt,
              href: `/worldcup/2026/${countrySlug}/share/${d.id}`,
              imageUrl,
            };
          })
          .filter((it) => Boolean(it.countrySlug));

        next.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
        if (!cancelled) setItems(next);
      } catch (e) {
        console.error('[Wc2026SharesSection] fetch failed', e);
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

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  };

  const shown = useMemo(() => items.slice(0, 20), [items]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 overflow-hidden mb-4">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-gray-100">W杯2026 予想シェア</div>
            <div className="text-xs text-gray-300">みんなのスタメン予想</div>
          </div>
          <Link
            href="/worldcup/2026"
            className="rounded-full px-3 py-2 text-xs bg-white/10 text-gray-100 border border-white/10 hover:bg-white/15 transition-colors shrink-0"
          >
            予想する
          </Link>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="text-xs text-gray-300">読み込み中...</div>
          ) : shown.length === 0 ? (
            <div className="text-xs text-gray-300">まだシェアがありません</div>
          ) : (
            <div className="space-y-3">
              {shown.map((it) => (
                <Link
                  key={it.id}
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
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">更新：{formatDate(it.createdAt)}</div>
                    </div>
                    {it.comment ? <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{it.comment}</div> : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getWc2026CountryBySlug } from '@/lib/worldcup/wc2026Countries';
import { WC2026_CANDIDATES_BY_COUNTRY } from '@/lib/worldcup/wc2026Candidates';

type Wc2026ShareListItem = {
  id: string;
  countrySlug: string;
  countryNameJa: string;
  comment: string;
  createdAt: Date | null;
  href: string;
};

type PlayerLite = { id: string; name: string; position: 'GK' | 'DF' | 'MF' | 'FW'; status: 'S' | 'A' | 'B' | '!?'; };
type FormationSlotKey = 'GK' | 'LCB' | 'CB' | 'RCB' | 'LM' | 'LCM' | 'RCM' | 'RM' | 'SS_L' | 'SS_R' | 'ST';

const SLOT_ORDER: FormationSlotKey[] = ['GK', 'LCB', 'CB', 'RCB', 'LM', 'LCM', 'RCM', 'RM', 'SS_L', 'SS_R', 'ST'];

const SLOT_LABEL: Record<FormationSlotKey, string> = {
  GK: 'GK',
  LCB: 'LCB',
  CB: 'CB',
  RCB: 'RCB',
  LM: 'LM',
  LCM: 'LCM',
  RCM: 'RCM',
  RM: 'RM',
  SS_L: 'SS',
  SS_R: 'SS',
  ST: 'CF',
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

function buildJapanPopularSvg(args: {
  popularBySlot: Partial<Record<FormationSlotKey, { id: string; name: string; votes: number }>>;
  sampleCount: number;
}) {
  const { popularBySlot, sampleCount } = args;

  const W = 1200;
  const H = 630;

  const pos: Record<FormationSlotKey, { x: number; y: number }> = {
    GK: { x: 120, y: 315 },
    LCB: { x: 300, y: 200 },
    CB: { x: 300, y: 315 },
    RCB: { x: 300, y: 430 },
    LM: { x: 520, y: 160 },
    LCM: { x: 520, y: 270 },
    RCM: { x: 520, y: 360 },
    RM: { x: 520, y: 470 },
    SS_L: { x: 760, y: 270 },
    SS_R: { x: 760, y: 360 },
    ST: { x: 970, y: 315 },
  };

  const nodes = SLOT_ORDER.map((slot) => {
    const p = popularBySlot[slot];
    if (!p) return '';
    const { x, y } = pos[slot];
    const name = escapeXml(surnameOnly(p.name));
    const votes = escapeXml(`${p.votes}票`);
    const label = escapeXml(SLOT_LABEL[slot]);

    return `
      <g>
        <circle cx="${x}" cy="${y}" r="44" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" stroke-width="2" />
        <text x="${x}" y="${y - 28}" text-anchor="middle" font-size="16" font-weight="700" fill="rgba(255,255,255,0.75)">${label}</text>
        <text x="${x}" y="${y + 6}" text-anchor="middle" font-size="20" font-weight="800" fill="rgba(255,255,255,0.95)">${name}</text>
        <text x="${x}" y="${y + 30}" text-anchor="middle" font-size="14" font-weight="700" fill="rgba(255,255,255,0.70)">${votes}</text>
      </g>
    `;
  }).join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#020617" />
        <stop offset="1" stop-color="#0b1533" />
      </linearGradient>
      <linearGradient id="pitch" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0ea5e9" stop-opacity="0.25" />
        <stop offset="1" stop-color="#22c55e" stop-opacity="0.18" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bg)" />

    <text x="60" y="74" font-size="34" font-weight="900" fill="rgba(255,255,255,0.95)">日本代表 人気スタメン予想</text>
    <text x="60" y="112" font-size="18" font-weight="700" fill="rgba(255,255,255,0.70)">直近${escapeXml(String(sampleCount))}件のシェアから集計（3-4-2-1）</text>

    <g>
      <rect x="40" y="140" width="1120" height="450" rx="28" fill="url(#pitch)" stroke="rgba(255,255,255,0.12)" />
      <line x1="200" y1="160" x2="200" y2="570" stroke="rgba(255,255,255,0.10)" stroke-width="3" />
      <line x1="420" y1="160" x2="420" y2="570" stroke="rgba(255,255,255,0.10)" stroke-width="3" />
      <line x1="640" y1="160" x2="640" y2="570" stroke="rgba(255,255,255,0.10)" stroke-width="3" />
      <line x1="860" y1="160" x2="860" y2="570" stroke="rgba(255,255,255,0.10)" stroke-width="3" />
    </g>

    ${nodes}

    <text x="1140" y="612" text-anchor="end" font-size="14" font-weight="700" fill="rgba(255,255,255,0.55)">spocale</text>
  </svg>`;

  return svgDataUrl(svg);
}

function statusRank(s: PlayerLite['status']) {
  return s === 'S' ? 0 : s === 'A' ? 1 : s === 'B' ? 2 : 3;
}

function pickTop(players: PlayerLite[], count: number) {
  return [...players]
    .sort((a, b) => {
      const r = statusRank(a.status) - statusRank(b.status);
      if (r !== 0) return r;
      return a.name.localeCompare(b.name, 'ja');
    })
    .slice(0, count);
}

function computePitchAssigned(
  players: PlayerLite[],
  pitchOverrideBySlot: Partial<Record<FormationSlotKey, string>>
): Partial<Record<FormationSlotKey, PlayerLite>> {
  const grouped = {
    GK: players.filter((p) => p.position === 'GK'),
    DF: players.filter((p) => p.position === 'DF'),
    MF: players.filter((p) => p.position === 'MF'),
    FW: players.filter((p) => p.position === 'FW'),
  };

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

  const assigned: Partial<Record<FormationSlotKey, PlayerLite>> = {
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

  return assigned;
}

export default function Wc2026SharesSection() {
  const [items, setItems] = useState<Wc2026ShareListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [japanPopularBySlot, setJapanPopularBySlot] = useState<Partial<Record<FormationSlotKey, { id: string; name: string; votes: number }>> | null>(null);
  const [japanPopularSampleCount, setJapanPopularSampleCount] = useState<number>(0);

  const japanPopularImageUrl = useMemo(() => {
    if (!japanPopularBySlot) return null;
    return buildJapanPopularSvg({ popularBySlot: japanPopularBySlot, sampleCount: japanPopularSampleCount });
  }, [japanPopularBySlot, japanPopularSampleCount]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'wc2026PredictionShares'), orderBy('createdAt', 'desc'), limit(200));
        const snap = await getDocs(q);

        const next: Wc2026ShareListItem[] = snap.docs
          .map((d) => {
            const data: any = d.data();
            const raw = typeof data?.snapshotJson === 'string' ? data.snapshotJson : '';
            const parsed = raw ? (JSON.parse(raw) as any) : null;
            const countrySlug = typeof parsed?.countrySlug === 'string' ? parsed.countrySlug : String(data?.countrySlug ?? '');
            const country = getWc2026CountryBySlug(countrySlug);
            const createdAt = (() => {
              const c = data?.createdAt;
              if (!c) return null;
              if (c instanceof Date) return c;
              if (typeof c?.toDate === 'function') return c.toDate();
              if (typeof c?.seconds === 'number') return new Timestamp(c.seconds, c.nanoseconds).toDate();
              return null;
            })();

            const comment = typeof parsed?.comment === 'string' ? parsed.comment : '';
            const trimmedComment = comment.trim().slice(0, 120);

            return {
              id: d.id,
              countrySlug,
              countryNameJa: country?.nameJa ?? 'W杯2026',
              comment: trimmedComment,
              createdAt,
              href: `/worldcup/2026/${countrySlug}/share/${d.id}`,
            };
          })
          .filter((it) => Boolean(it.countrySlug));

        const japanDocs = snap.docs
          .map((d) => ({ id: d.id, data: d.data() as any }))
          .filter((row) => row.data?.countrySlug === 'japan')
          .slice(0, 100);

        const candidates = WC2026_CANDIDATES_BY_COUNTRY['jpn'] ?? [];
        const nameById = new Map<string, string>(candidates.map((c) => [c.id, c.name] as const));

        const counts: Record<FormationSlotKey, Map<string, number>> = {
          GK: new Map(),
          LCB: new Map(),
          CB: new Map(),
          RCB: new Map(),
          LM: new Map(),
          LCM: new Map(),
          RCM: new Map(),
          RM: new Map(),
          SS_L: new Map(),
          SS_R: new Map(),
          ST: new Map(),
        };

        for (const row of japanDocs) {
          const raw = typeof row.data?.snapshotJson === 'string' ? row.data.snapshotJson : '';
          const parsed = raw ? (JSON.parse(raw) as any) : null;
          const players = (Array.isArray(parsed?.players) ? parsed.players : []) as any[];
          const pitchOverrideBySlot = (parsed?.pitchOverrideBySlot && typeof parsed.pitchOverrideBySlot === 'object'
            ? parsed.pitchOverrideBySlot
            : {}) as Partial<Record<FormationSlotKey, string>>;

          const lite: PlayerLite[] = players
            .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
            .map((p) => ({
              id: String(p.id),
              name: String(p.name),
              position: (p.position as any) as PlayerLite['position'],
              status: (p.status as any) as PlayerLite['status'],
            }))
            .filter((p) => p.id && p.name);

          const assigned = computePitchAssigned(lite, pitchOverrideBySlot);
          for (const slot of SLOT_ORDER) {
            const p = assigned[slot];
            if (!p?.id) continue;
            const m = counts[slot];
            m.set(p.id, (m.get(p.id) ?? 0) + 1);
          }
        }

        const popular: Partial<Record<FormationSlotKey, { id: string; name: string; votes: number }>> = {};
        for (const slot of SLOT_ORDER) {
          let best: { id: string; votes: number } | null = null;
          for (const [pid, v] of counts[slot].entries()) {
            if (!best || v > best.votes) best = { id: pid, votes: v };
          }
          if (best) {
            popular[slot] = {
              id: best.id,
              votes: best.votes,
              name: nameById.get(best.id) ?? best.id,
            };
          }
        }

        if (!cancelled) {
          setJapanPopularBySlot(Object.keys(popular).length > 0 ? popular : null);
          setJapanPopularSampleCount(japanDocs.length);
        }

        if (!cancelled) setItems(next);
      } catch {
        if (!cancelled) setItems([]);
        if (!cancelled) {
          setJapanPopularBySlot(null);
          setJapanPopularSampleCount(0);
        }
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

  const shown = useMemo(() => items.slice(0, 8), [items]);

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

        {japanPopularImageUrl ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-100">日本代表 人気スタメン予想</div>
                <div className="text-[10px] text-gray-300">直近{japanPopularSampleCount}件のシェアから集計</div>
              </div>
              <Link
                href="/worldcup/2026/japan"
                className="rounded-full px-3 py-2 text-xs bg-white/10 text-gray-100 border border-white/10 hover:bg-white/15 transition-colors shrink-0"
              >
                日本代表へ
              </Link>
            </div>

            <div className="mt-3">
              <img
                src={japanPopularImageUrl}
                alt="日本代表 人気スタメン予想"
                className="w-full rounded-xl border border-white/10"
                loading="lazy"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-3">
          {loading ? (
            <div className="text-xs text-gray-300">読み込み中...</div>
          ) : shown.length === 0 ? (
            <div className="text-xs text-gray-300">まだシェアがありません</div>
          ) : (
            <div className="space-y-2">
              {shown.map((it) => (
                <Link
                  key={it.id}
                  href={it.href}
                  className="block rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-100 truncate">{it.countryNameJa}代表 スタメン予想</div>
                        {it.comment ? (
                          <div className="mt-1 text-xs text-gray-200 leading-relaxed line-clamp-2">{it.comment}</div>
                        ) : (
                          <div className="mt-1 text-xs text-gray-300">コメントなし</div>
                        )}
                      </div>
                      <div className="shrink-0 text-[10px] text-gray-400">{formatDate(it.createdAt)}</div>
                    </div>
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

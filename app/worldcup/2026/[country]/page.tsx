'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { toPng } from 'html-to-image';
import { collection, getDocs, limit, orderBy, query, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { getWc2026CountryBySlug } from '@/lib/worldcup/wc2026Countries';
import { WC2026_CANDIDATES_BY_COUNTRY } from '@/lib/worldcup/wc2026Candidates';
import type { SquadPlayerPrediction, SquadPosition, SquadStatus } from '@/types/worldcup';
import {
  type FormationSlotKey,
  type PickStatus,
  groupByPosition,
  pickTop,
  statusMark,
  statusMarkClassName,
  statusRank,
} from './wc2026PredictionUtils';
import { Wc2026CandidatesCard } from './_components/Wc2026CandidatesCard';
import { Wc2026PitchSection } from './_components/Wc2026PitchSection';
import { Wc2026SquadTableSection } from './_components/Wc2026SquadTableSection';
import { Wc2026PitchOgpCapture } from './_components/Wc2026PitchOgpCapture';
import { useWc2026PredictionDoc } from './_hooks/useWc2026PredictionDoc';
import { useWc2026Share } from './_hooks/useWc2026Share';

type FormationSlotKeySimple = 'GK' | 'LCB' | 'CB' | 'RCB' | 'LM' | 'LCM' | 'RCM' | 'RM' | 'SS_L' | 'SS_R' | 'ST';
const SLOT_ORDER_SIMPLE: FormationSlotKeySimple[] = ['GK', 'LCB', 'CB', 'RCB', 'LM', 'LCM', 'RCM', 'RM', 'SS_L', 'SS_R', 'ST'];

const SLOT_LABEL_SIMPLE: Record<FormationSlotKeySimple, string> = {
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

function surnameOnly(name: string) {
  const parts = name.split(/[\s　]+/).filter(Boolean);
  if (parts.length >= 2) return parts[0];
  return name;
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildJapanPopularSvg(args: {
  popularBySlot: Partial<Record<FormationSlotKeySimple, { id: string; name: string; votes: number }>>;
  sampleCount: number;
}) {
  const { popularBySlot, sampleCount } = args;

  const W = 1200;
  const H = 630;

  const pos: Record<FormationSlotKeySimple, { x: number; y: number }> = {
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

  const nodes = SLOT_ORDER_SIMPLE.map((slot) => {
    const p = popularBySlot[slot];
    if (!p) return '';
    const { x, y } = pos[slot];
    const name = escapeXml(surnameOnly(p.name));
    const votes = escapeXml(`${p.votes}票`);
    const label = escapeXml(SLOT_LABEL_SIMPLE[slot]);

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

function computePitchAssigned(
  players: SquadPlayerPrediction[],
  pitchOverrideBySlot: Partial<Record<FormationSlotKeySimple, string>>
): Partial<Record<FormationSlotKeySimple, SquadPlayerPrediction>> {
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

  const assigned: Partial<Record<FormationSlotKeySimple, SquadPlayerPrediction>> = {
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

  for (const slot of Object.keys(pitchOverrideBySlot) as FormationSlotKeySimple[]) {
    const pid = pitchOverrideBySlot[slot];
    if (!pid) continue;
    const p = players.find((x) => x.id === pid) ?? null;
    if (p) assigned[slot] = p;
  }

  return assigned;
}

export default function Wc2026CountryPage() {
  const params = useParams<{ country: string }>();
  const countrySlug = params?.country ?? '';
  const country = getWc2026CountryBySlug(countrySlug);

  const { user, loading } = useAuth();

  const {
    players,
    setPlayers,
    predictionComment,
    setPredictionComment,
    pitchOverrideBySlot,
    setPitchOverrideBySlot,
    saving,
    save,
    statusMessage,
    setStatusMessage,
  } = useWc2026PredictionDoc({ userUid: user?.uid ?? null, countrySlug });

  const [pitchSelectedSlot, setPitchSelectedSlot] = useState<FormationSlotKey | null>(null);

  const [japanPopularBySlot, setJapanPopularBySlot] = useState<Partial<Record<FormationSlotKeySimple, { id: string; name: string; votes: number }>> | null>(null);
  const [japanPopularSampleCount, setJapanPopularSampleCount] = useState<number>(0);

  const { sharing, share, shareLink } = useWc2026Share({
    userUid: user?.uid ?? null,
    countrySlug,
    countryNameJa: country?.nameJa ?? '',
    players,
    pitchOverrideBySlot,
    predictionComment,
    setStatusMessage,
  });

  const [shareImageBusy, setShareImageBusy] = useState(false);

  const enableImageSaveButton = false;

  const japanPopularImageUrl = useMemo(() => {
    if (countrySlug !== 'japan') return null;
    if (!japanPopularBySlot) return null;
    return buildJapanPopularSvg({ popularBySlot: japanPopularBySlot, sampleCount: japanPopularSampleCount });
  }, [countrySlug, japanPopularBySlot, japanPopularSampleCount]);

  useEffect(() => {
    if (countrySlug !== 'japan') return;
    let cancelled = false;

    const run = async () => {
      try {
        const q = query(collection(db, 'wc2026PredictionShares'), orderBy('createdAt', 'desc'), limit(200));
        const snap = await getDocs(q);
        const docs = snap.docs
          .map((d) => ({ id: d.id, data: d.data() as any }))
          .filter((row) => row.data?.countrySlug === 'japan')
          .slice(0, 100);

        const candidates = WC2026_CANDIDATES_BY_COUNTRY['jpn'] ?? [];
        const nameById = new Map<string, string>(candidates.map((c) => [c.id, c.name] as const));

        const counts: Record<FormationSlotKeySimple, Map<string, number>> = {
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

        for (const row of docs) {
          const raw = typeof row.data?.snapshotJson === 'string' ? row.data.snapshotJson : '';
          const parsed = raw ? (JSON.parse(raw) as any) : null;
          const players = (Array.isArray(parsed?.players) ? parsed.players : []) as any[];
          const pitchOverrideBySlot = (parsed?.pitchOverrideBySlot && typeof parsed.pitchOverrideBySlot === 'object'
            ? parsed.pitchOverrideBySlot
            : {}) as Partial<Record<FormationSlotKeySimple, string>>;

          const lite: SquadPlayerPrediction[] = players
            .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
            .map((p) => ({
              id: String(p.id),
              name: String(p.name),
              position: p.position as SquadPosition,
              status: p.status as SquadStatus,
            }))
            .filter((p) => p.id && p.name);

          const assigned = computePitchAssigned(lite, pitchOverrideBySlot);
          for (const slot of SLOT_ORDER_SIMPLE) {
            const p = assigned[slot];
            if (!p?.id) continue;
            const m = counts[slot];
            m.set(p.id, (m.get(p.id) ?? 0) + 1);
          }
        }

        const popular: Partial<Record<FormationSlotKeySimple, { id: string; name: string; votes: number }>> = {};
        for (const slot of SLOT_ORDER_SIMPLE) {
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
          setJapanPopularSampleCount(docs.length);
        }
      } catch {
        if (!cancelled) {
          setJapanPopularBySlot(null);
          setJapanPopularSampleCount(0);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [countrySlug]);

  const [squadViewMode, setSquadViewMode] = useState<'list' | 'pitch'>('list');

  const [openSquadSectionByKey, setOpenSquadSectionByKey] = useState<Record<string, boolean>>({
    GK: true,
    DF: true,
    MF: true,
    FW: true,
    MFFW: true,
  });

  const [candidateStatusById, setCandidateStatusById] = useState<Record<string, PickStatus>>({});

  const canEdit = Boolean(user);

  const candidates = useMemo(() => {
    if (!country) return [];
    return WC2026_CANDIDATES_BY_COUNTRY[country.code] ?? [];
  }, [country]);

  const candidatesByPos = useMemo(() => {
    const out: Record<SquadPosition, typeof candidates> = { GK: [], DF: [], MF: [], FW: [] };
    for (const c of candidates) out[c.position].push(c);
    return out;
  }, [candidates]);

  const removePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const setPlayerStatus = (id: string, status: SquadStatus) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const upsertOrRemoveCandidate = (candidate: { id: string; name: string; position: SquadPosition }, pick: PickStatus) => {
    const picked = players.find((p) => p.id === candidate.id) ?? null;

    if (pick === 'none') {
      if (picked) removePlayer(candidate.id);
      return;
    }

    if (picked) {
      setPlayerStatus(candidate.id, pick);
      return;
    }

    const next: SquadPlayerPrediction = {
      id: candidate.id,
      name: candidate.name,
      position: candidate.position,
      status: pick,
    };
    setPlayers([next, ...players]);
  };


  if (!country) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-indigo-950">
        <div className="px-3 pt-4 pb-24">
          <div className="text-sm text-white">国が見つかりません</div>
          <div className="mt-3">
            <Link href="/worldcup/2026" className="text-sm text-white/80 underline">
              戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const grouped = groupByPosition(players);
  const pickedCount = players.length;
  const sureCount = players.filter((p) => p.status === 'S').length;

  const pitchData = useMemo(() => {
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
    for (const p of top) used.add(p.id);

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

    // Apply manual overrides (slot -> playerId)
    for (const slot of Object.keys(pitchOverrideBySlot) as FormationSlotKey[]) {
      const pid = pitchOverrideBySlot[slot];
      if (!pid) continue;
      const p = players.find((x) => x.id === pid) ?? null;
      if (p) assigned[slot] = p;
    }

    const startingIds = new Set(Object.values(assigned).filter(Boolean).map((p) => (p as SquadPlayerPrediction).id));
    const bench = [...players]
      .filter((p) => !startingIds.has(p.id))
      .sort((a, b) => {
        const r = statusRank(a.status) - statusRank(b.status);
        if (r !== 0) return r;
        return a.name.localeCompare(b.name, 'ja');
      });

    return { assigned, bench };
  }, [grouped.DF, grouped.GK, grouped.MF, pitchOverrideBySlot, players]);

  const squadRows = useMemo(() => {
    const byId = new Map<string, SquadPlayerPrediction>();
    for (const p of players) byId.set(p.id, p);

    const sortByStatus = (a: SquadPlayerPrediction, b: SquadPlayerPrediction) => {
      const rank = (s: SquadStatus) => (s === 'S' ? 0 : s === 'A' ? 1 : s === 'B' ? 2 : 3);
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return a.name.localeCompare(b.name, 'ja');
    };

    const gk = [...grouped.GK].sort(sortByStatus);
    const df = [...grouped.DF].sort(sortByStatus);
    const mf = [...grouped.MF].sort(sortByStatus);
    const fw = [...grouped.FW].sort(sortByStatus);

    const mfFw = [...mf, ...fw].sort(sortByStatus);

    const isJapan = countrySlug === 'japan';
    if (isJapan) {
      return [
        { title: '-GK-', key: 'GK', players: gk },
        { title: '-DF-', key: 'DF', players: df },
        { title: '-MF/FW-', key: 'MFFW', players: mfFw },
      ] as const;
    }

    return [
      { title: '-GK-', key: 'GK', players: gk },
      { title: '-DF-', key: 'DF', players: df },
      { title: '-MF-', key: 'MF', players: mf },
      { title: '-FW-', key: 'FW', players: fw },
    ] as const;
  }, [countrySlug, grouped.DF, grouped.FW, grouped.GK, grouped.MF, players]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-indigo-950">
      <div className="px-3 pt-4 pb-24">
        <div className="sticky top-0 z-40 -mx-3 px-3 py-3 bg-slate-950/80 backdrop-blur border-b border-white/10">
          <div className="relative flex items-center justify-center">
            <Link href="/worldcup/2026" className="absolute left-0 text-sm font-bold text-white/90 hover:text-white">
              ← 戻る
            </Link>
            <div className="text-sm font-bold text-white text-center">
              {countrySlug === 'japan' ? '日本代表メンバー予想' : `${country.nameJa}代表メンバー予想`}
            </div>
          </div>
          <div className="mt-1 text-xs text-white/60 text-center">選出：{pickedCount}人（当確◎：{sureCount}）</div>
        </div>

        <div className="h-4" />

        {japanPopularImageUrl ? (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/10 overflow-hidden">
            <div className="p-4">
              <div className="text-sm text-gray-100">日本代表 人気スタメン予想</div>
              <div className="mt-3">
                <img
                  src={japanPopularImageUrl}
                  alt="日本代表 人気スタメン予想"
                  className="w-full rounded-xl border border-white/10"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !user ? (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/80">
            編集・保存するにはログインしてください
          </div>
        ) : null}

        <div className="mb-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setSquadViewMode('list')}
            className={`rounded-full px-4 py-2 text-xs font-bold border transition-all shadow-sm ${
              squadViewMode === 'list'
                ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white border-white/20 shadow-lg shadow-sky-500/20 ring-2 ring-sky-400/40'
                : 'bg-white/10 text-white/85 border-white/15 hover:bg-white/15 hover:text-white'
            }`}
          >
            メンバー表
          </button>
          <button
            type="button"
            onClick={() => setSquadViewMode('pitch')}
            className={`rounded-full px-4 py-2 text-xs font-bold border transition-all shadow-sm ${
              squadViewMode === 'pitch'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-white/20 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                : 'bg-white/10 text-white/85 border-white/15 hover:bg-white/15 hover:text-white'
            }`}
          >
            スタメン予想
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0b1533]/90 to-[#070d1f]/90 overflow-hidden mb-4">
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xl font-black italic tracking-wide text-white">
                  {countrySlug === 'japan' ? 'SAMURAI BLUE' : `${country.nameEn.toUpperCase()} SQUAD`}
                </div>
              </div>
            </div>

            {squadViewMode === 'pitch' ? (
              <Wc2026PitchSection
                canEdit={canEdit}
                pitchData={pitchData}
                pitchSelectedSlot={pitchSelectedSlot}
                setPitchSelectedSlot={setPitchSelectedSlot}
                setPitchOverrideBySlot={setPitchOverrideBySlot}
                statusMark={statusMark}
                statusMarkClassName={statusMarkClassName}
              />
            ) : (
              <Wc2026SquadTableSection
                squadRows={squadRows as any}
                openSquadSectionByKey={openSquadSectionByKey}
                setOpenSquadSectionByKey={setOpenSquadSectionByKey}
                candidates={candidates}
                statusMark={statusMark}
                statusMarkClassName={statusMarkClassName}
              />
            )}

            <div className="mt-5">
              <div className="text-xs text-white/70">コメント</div>
              <textarea
                value={predictionComment}
                maxLength={500}
                disabled={!canEdit}
                onChange={(e) => setPredictionComment(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none disabled:opacity-50"
                rows={4}
              />
              <div className="mt-1 text-[11px] text-white/60 text-right">{predictionComment.length}/500</div>
            </div>

            <div className="mt-4">
              {!canEdit ? (
                <div className="flex items-center justify-center">
                  <Link
                    href={`/login?redirect=${encodeURIComponent(`/worldcup/2026/${countrySlug}`)}`}
                    className="rounded-2xl px-6 py-3 text-sm font-bold bg-orange-500 text-white border border-white/10 hover:bg-orange-400 transition-colors"
                  >
                    ログイン/新規登録
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={saving || sharing}
                      onClick={async () => {
                        const ok = await save();
                        if (!ok) return;
                        await share();
                      }}
                      className="rounded-2xl px-6 py-3 text-sm font-bold bg-sky-600 text-white border border-white/10 hover:bg-sky-500 transition-colors disabled:opacity-50"
                    >
                      {saving ? '保存中...' : sharing ? '作成中...' : '保存してXでシェア'}
                    </button>
                    {enableImageSaveButton ? (
                      <button
                        type="button"
                        disabled={shareImageBusy}
                        onClick={async () => {
                          try {
                            const el = document.getElementById(
                              squadViewMode === 'pitch' ? 'wc2026-pitch-ogp-capture' : 'wc2026-squad-table-capture'
                            );
                            if (!el) return;
                            setShareImageBusy(true);

                            const rect = el.getBoundingClientRect();
                            const width = Math.max(1, Math.ceil(rect.width));
                            const height = Math.max(
                              1,
                              Math.ceil((el as HTMLElement).scrollHeight || rect.height || 1)
                            );
                            const dataUrl = await toPng(el, {
                              cacheBust: true,
                              pixelRatio: 2,
                              width: squadViewMode === 'pitch' ? 1200 : width,
                              height: squadViewMode === 'pitch' ? 630 : height,
                              backgroundColor: '#020617',
                              style: {
                                opacity: '1',
                                transform: 'none',
                              },
                              onClone: (doc: Document) => {
                                try {
                                  const cloned = doc.getElementById(
                                    squadViewMode === 'pitch' ? 'wc2026-pitch-ogp-capture' : 'wc2026-squad-table-capture'
                                  ) as HTMLElement | null;
                                  if (!cloned) return;
                                  cloned.style.opacity = '1';
                                  cloned.style.transform = 'none';
                                  cloned.style.left = '0px';
                                  cloned.style.top = '0px';
                                  cloned.style.zIndex = '0';
                                  cloned.style.overflow = 'visible';
                                } catch {
                                  // ignore
                                }
                              },
                            } as any);

                            const filename = `wc2026-${countrySlug || 'squad'}-${squadViewMode === 'pitch' ? 'pitch' : 'table'}.png`;
                            const blob = await (await fetch(dataUrl)).blob();
                            const file = new File([blob], filename, { type: 'image/png' });

                            const canShareFiles =
                              typeof navigator !== 'undefined' &&
                              'share' in navigator &&
                              'canShare' in navigator &&
                              (navigator as any).canShare({ files: [file] });

                            if (canShareFiles) {
                              await (navigator as any).share({ files: [file], title: filename });
                              return;
                            }

                            const objectUrl = URL.createObjectURL(blob);
                            try {
                              const a = document.createElement('a');
                              a.href = objectUrl;
                              a.download = filename;
                              a.rel = 'noopener';
                              a.click();

                              window.setTimeout(() => {
                                try {
                                  window.open(objectUrl, '_blank', 'noopener,noreferrer');
                                } catch {
                                  // ignore
                                }
                              }, 150);
                            } finally {
                              window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
                            }
                          } catch {
                            // ignore
                          } finally {
                            setShareImageBusy(false);
                          }
                        }}
                        className="rounded-xl px-3 py-2 text-xs bg-white/10 text-gray-100 border border-white/10 hover:bg-white/15 transition-colors disabled:opacity-50"
                      >
                        {shareImageBusy ? '作成中...' : '画像を保存'}
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </div>

            {statusMessage ? (
              <div className="mt-2 text-xs text-white/70 text-center">{statusMessage}</div>
            ) : null}

            {shareLink ? (
              <div className="mt-3 flex items-center gap-2">
                <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/80 truncate">
                  {shareLink}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareLink);
                      setStatusMessage('共有リンクをコピーしました');
                    } catch {
                      setStatusMessage('コピーできませんでした');
                    }
                  }}
                  className="rounded-xl px-3 py-2 text-xs bg-white/10 text-gray-100 border border-white/10 hover:bg-white/15 transition-colors"
                >
                  コピー
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <Wc2026CandidatesCard
          candidates={candidates as any}
          candidatesByPos={candidatesByPos as any}
          canEdit={canEdit}
          players={players}
          candidateStatusById={candidateStatusById}
          setCandidateStatusById={setCandidateStatusById}
          upsertOrRemoveCandidate={upsertOrRemoveCandidate}
        />

        <Wc2026PitchOgpCapture
          countryNameJa={country.nameJa}
          pitchData={pitchData}
          statusMark={statusMark}
          statusMarkClassName={statusMarkClassName}
        />
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getWc2026CountryBySlug } from '@/lib/worldcup/wc2026Countries';
import { WC2026_CANDIDATES_BY_COUNTRY } from '@/lib/worldcup/wc2026Candidates';
import type {
  LegacySquadStatus,
  SquadPlayerPrediction,
  SquadPosition,
  SquadPredictionDoc,
  SquadStatus,
} from '@/types/worldcup';

function randomId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function groupByPosition(players: SquadPlayerPrediction[]) {
  const out: Record<SquadPosition, SquadPlayerPrediction[]> = { GK: [], DF: [], MF: [], FW: [] };
  for (const p of players) out[p.position].push(p);
  return out;
}

type PickStatus = SquadStatus | 'none';

function toNewStatus(status: SquadStatus | LegacySquadStatus): SquadStatus {
  if (status === 'S' || status === 'A' || status === 'B' || status === '!?') return status;
  if (status === 'selected') return 'S';
  if (status === 'bubble') return 'B';
  return '!?';
}

function statusLabel(status: SquadStatus) {
  if (status === 'S') return '当確◎';
  if (status === 'A') return '有力○';
  if (status === 'B') return '当落△';
  return 'サプライズ★';
}

function statusMark(status: SquadStatus) {
  if (status === 'S') return '◎';
  if (status === 'A') return '○';
  if (status === 'B') return '△';
  return '★';
}

function sanitizePlayersForFirestore(players: SquadPlayerPrediction[]): SquadPlayerPrediction[] {
  return players.map((p) => {
    const out: SquadPlayerPrediction = {
      id: p.id,
      name: p.name,
      position: p.position,
      status: p.status,
    };
    if (typeof p.note === 'string' && p.note.trim()) out.note = p.note;
    return out;
  });
}

export default function Wc2026CountryPage() {
  const params = useParams<{ country: string }>();
  const countrySlug = params?.country ?? '';
  const country = getWc2026CountryBySlug(countrySlug);

  const { user, loading } = useAuth();

  const [players, setPlayers] = useState<SquadPlayerPrediction[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const [predictionComment, setPredictionComment] = useState('');

  const [openSquadSectionByKey, setOpenSquadSectionByKey] = useState<Record<string, boolean>>({
    GK: true,
    DF: true,
    MF: true,
    FW: true,
    MFFW: true,
  });

  const [openCandidateSectionByPos, setOpenCandidateSectionByPos] = useState<Record<SquadPosition, boolean>>({
    GK: true,
    DF: true,
    MF: true,
    FW: true,
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

  const docRef = useMemo(() => {
    if (!user || !countrySlug) return null;
    return doc(db, 'users', user.uid, 'wc2026SquadPredictions', countrySlug);
  }, [countrySlug, user]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setStatusMessage(null);
      if (!user || !docRef) {
        setPlayers([]);
        setPredictionComment('');
        return;
      }
      try {
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          if (!cancelled) setPlayers([]);
          if (!cancelled) setPredictionComment('');
          return;
        }
        const data = snap.data() as SquadPredictionDoc;
        const loadedRaw = Array.isArray(data?.players) ? data.players : [];
        const loaded: SquadPlayerPrediction[] = loadedRaw
          .filter((p: any) => p && typeof p.id === 'string' && typeof p.name === 'string')
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            position: p.position as SquadPosition,
            status: toNewStatus(p.status as SquadStatus | LegacySquadStatus),
            note: typeof p.note === 'string' ? p.note : undefined,
          }));
        if (!cancelled) setPlayers(loaded);
        if (!cancelled) setPredictionComment(typeof data?.comment === 'string' ? data.comment : '');
      } catch {
        if (!cancelled) setStatusMessage('読み込みに失敗しました');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [docRef, user]);

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

  const save = async () => {
    if (!docRef) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const trimmedComment = predictionComment.trim().slice(0, 500);
      const sanitizedPlayers = sanitizePlayersForFirestore(players);
      const payload: SquadPredictionDoc = {
        schemaVersion: 1,
        countrySlug,
        tournamentId: 'wc2026',
        players: sanitizedPlayers,
        updatedAt: serverTimestamp(),
      };
      if (trimmedComment) payload.comment = trimmedComment;
      await setDoc(docRef, payload, { merge: true });
      setStatusMessage('保存しました');
    } catch (e: any) {
      const code = typeof e?.code === 'string' ? e.code : '';
      const msg = typeof e?.message === 'string' ? e.message : '';
      setStatusMessage(`保存に失敗しました${code || msg ? `：${code || msg}` : ''}`);
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    if (!user || !countrySlug || !country) return;
    setShareLink(null);

    const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
    const popup = canNativeShare ? null : window.open('about:blank', '_blank', 'noopener,noreferrer');

    setSharing(true);
    setStatusMessage(null);
    try {
      const shareId = randomId();
      const shareRef = doc(db, 'wc2026PredictionShares', shareId);
      const trimmedComment = predictionComment.trim().slice(0, 500);
      const sanitizedPlayers = sanitizePlayersForFirestore(players);
      const snapshotJson = JSON.stringify({ countrySlug, players: sanitizedPlayers, comment: trimmedComment || undefined });
      await setDoc(
        shareRef,
        {
          schemaVersion: 1,
          tournamentId: 'wc2026',
          countrySlug,
          snapshotJson,
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
        },
        { merge: false }
      );

      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kansenki.footballtop.net';
      const url = `${origin}/worldcup/2026/${countrySlug}/share/${shareId}`;
      const title = `${country.nameJa}：W杯2026 予想`;
      const text = encodeURIComponent(title);
      const hashtags = encodeURIComponent('みんなの現地観戦記,footballtop');
      const shareUrl = `https://x.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;

      if (canNativeShare) {
        try {
          await (navigator as any).share({ title, text: title, url });
          return;
        } catch {
          // fallback
        }
      }

      if (popup) {
        popup.location.href = shareUrl;
      } else {
        setShareLink(url);
        setStatusMessage('共有リンクをコピーしてXで貼り付けてください');
      }
    } catch {
      if (popup) popup.close();
      setStatusMessage('共有リンクの作成に失敗しました');
    } finally {
      setSharing(false);
    }
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
  const selectedCount = players.filter((p) => p.status === 'S').length;

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
        <div className="px-1 pb-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">{country.nameJa}：W杯 2026 予想</h1>
            <div className="mt-1 text-xs text-white/60">選出：{selectedCount}人（自分の予想）</div>
          </div>
          <Link href="/worldcup/2026" className="text-xs text-white/70 underline shrink-0">
            国一覧
          </Link>
        </div>

        {!loading && !user ? (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/80">
            編集・保存するにはログインしてください
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0b1533]/90 to-[#070d1f]/90 overflow-hidden mb-4">
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xl font-black italic tracking-wide text-white">
                  {countrySlug === 'japan' ? 'SAMURAI BLUE' : `${country.nameEn.toUpperCase()} SQUAD`}
                </div>
                <div className="mt-1 text-xs text-white/70">FIFA ワールドカップ 2026 予想メンバー（自分）</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={!canEdit || sharing}
                  onClick={share}
                  className="rounded-xl px-3 py-2 text-xs bg-black/70 text-white border border-white/10 hover:bg-black/80 transition-colors disabled:opacity-50"
                >
                  {sharing ? '作成中...' : 'Xで共有'}
                </button>
                <button
                  type="button"
                  disabled={!canEdit || saving}
                  onClick={save}
                  className="rounded-xl px-3 py-2 text-xs bg-white/10 text-gray-100 border border-white/10 hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>

            {statusMessage ? <div className="mt-2 text-xs text-white/70">{statusMessage}</div> : null}

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

            <div className="mt-4 space-y-5">
              {squadRows.map((row) => (
                <div key={row.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenSquadSectionByKey((prev) => ({ ...prev, [row.key]: !(prev[row.key] ?? true) }));
                    }}
                    aria-expanded={openSquadSectionByKey[row.key] ?? true}
                    className="w-full text-center py-2 -my-2"
                  >
                    <div className="text-xs font-bold tracking-[0.3em] text-yellow-200/90">
                      {row.title}
                      <span className="ml-2 text-[10px] tracking-normal text-white/70">({row.players.length})</span>
                      <span className="ml-2 text-[10px] tracking-normal text-white/60">
                        {openSquadSectionByKey[row.key] ?? true ? '閉じる' : '開く'}
                      </span>
                    </div>
                  </button>

                  {openSquadSectionByKey[row.key] ?? true ? (
                    <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3">
                      {row.players.length === 0 ? (
                        <div className="col-span-3 text-center text-xs text-white/50">未選出</div>
                      ) : (
                        row.players.map((p) => (
                          <div key={p.id} className="min-w-0 text-center">
                            {(() => {
                              const cand = candidates.find((c) => c.id === p.id);
                              const apps = cand?.stats?.appearances;
                              const goals = cand?.stats?.goals;
                              const statLine =
                                typeof apps === 'number' || typeof goals === 'number'
                                  ? `${typeof apps === 'number' ? `${apps} cap` : ''}${
                                      typeof apps === 'number' && typeof goals === 'number' ? ' / ' : ''
                                    }${typeof goals === 'number' ? `${goals}G` : ''}`
                                  : '';

                              return (
                                <>
                                  <div className="text-sm font-extrabold text-white truncate">
                                    {p.name}
                                    {typeof cand?.age === 'number' ? (
                                      <span className="ml-1 text-[11px] font-semibold text-white/75">({cand.age})</span>
                                    ) : null}
                                    <span className="ml-1 text-[10px] text-white/60">{statusMark(p.status)}</span>
                                  </div>
                                  <div className="mt-0.5 text-[10px] text-white/60 truncate">{cand?.club ?? ''}</div>
                                  {statLine ? (
                                    <div className="mt-0.5 text-[10px] text-white/55 truncate">{statLine}</div>
                                  ) : null}
                                </>
                              );
                            })()}
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-5">
              <div className="text-xs text-white/70">コメント（最大500文字）</div>
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
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/10 overflow-hidden mb-4">
          <div className="p-4">
            <div className="text-sm text-gray-100 font-semibold">成績一覧票（候補）</div>
            <div className="mt-1 text-xs text-white/60">プルダウンで当落を設定（未選択=未選出）</div>

            <div className="mt-3 space-y-2">
              {candidates.length === 0 ? (
                <div className="text-xs text-white/60">候補が未設定です</div>
              ) : (
                (['GK', 'DF', 'MF', 'FW'] as const).map((pos) => (
                  <div key={pos}>
                    <button
                      type="button"
                      onClick={() => setOpenCandidateSectionByPos((prev) => ({ ...prev, [pos]: !prev[pos] }))}
                      aria-expanded={openCandidateSectionByPos[pos]}
                      className="w-full text-left py-2"
                    >
                      <div className="text-xs font-bold tracking-[0.3em] text-yellow-200/90">
                        -{pos}-
                        <span className="ml-2 text-[10px] tracking-normal text-white/70">({candidatesByPos[pos].length})</span>
                        <span className="ml-2 text-[10px] tracking-normal text-white/60">
                          {openCandidateSectionByPos[pos] ? '閉じる' : '開く'}
                        </span>
                      </div>
                    </button>

                    {openCandidateSectionByPos[pos] ? (
                      <div className="space-y-2">
                        {candidatesByPos[pos].map((c) => {
                          const picked = players.find((p) => p.id === c.id) ?? null;
                          const rowStatus: PickStatus = picked?.status ?? candidateStatusById[c.id] ?? 'none';
                          const statsText = c.stats
                            ? [
                                typeof c.stats.appearances === 'number' ? `出場${c.stats.appearances}` : null,
                                typeof c.stats.goals === 'number' ? `G${c.stats.goals}` : null,
                                typeof c.stats.assists === 'number' ? `A${c.stats.assists}` : null,
                              ]
                                .filter(Boolean)
                                .join(' / ')
                            : '';

                          return (
                            <div
                              key={c.id}
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-100 truncate">
                                  {c.name}
                                  {typeof c.age === 'number' ? (
                                    <span className="ml-1 text-[11px] font-semibold text-white/75">({c.age})</span>
                                  ) : null}
                                </div>
                                <div className="mt-0.5 text-[11px] text-white/60 truncate">
                                  {c.position}
                                  {c.club ? ` / ${c.club}` : ''}
                                  {statsText ? ` / ${statsText}` : ''}
                                </div>
                              </div>

                              <select
                                value={rowStatus}
                                disabled={!canEdit}
                                onChange={(e) => {
                                  const next = e.target.value as PickStatus;
                                  setCandidateStatusById((prev) => ({ ...prev, [c.id]: next }));
                                  upsertOrRemoveCandidate(c, next);
                                }}
                                className="shrink-0 w-[80px] rounded-xl border border-white/10 bg-[#0b1533] px-1.5 py-2 text-[10px] text-white outline-none disabled:opacity-50"
                                style={{ colorScheme: 'dark' }}
                              >
                                <option value="none">未選出</option>
                                <option value="S">当確◎</option>
                                <option value="A">有力○</option>
                                <option value="B">当落△</option>
                                <option value="!?">サプライズ★</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

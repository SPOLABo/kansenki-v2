import Link from 'next/link';
import { headers } from 'next/headers';
import { doc, getDoc } from 'firebase/firestore';
import { getServerDb } from '@/lib/firebaseServer';
import { getWc2026CountryBySlug } from '@/lib/worldcup/wc2026Countries';
import { WC2026_CANDIDATES_BY_COUNTRY } from '@/lib/worldcup/wc2026Candidates';
import type { SquadPlayerPrediction, SquadPosition, SquadStatus } from '@/types/worldcup';
import { ShareComments } from './ShareComments';
import { SharePitch } from './SharePitch';

export const runtime = 'nodejs';

function getBaseUrlFromHeaders() {
  try {
    const h = headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'https';
    if (host) return `${proto}://${host}`;
  } catch {
    // ignore
  }
  return 'https://kansenki.footballtop.net';
}

type Props = {
  params: { country: string; shareId: string };
};

function statusMark(status: SquadStatus) {
  if (status === 'S') return '◎';
  if (status === 'A') return '○';
  if (status === 'B') return '△';
  return '★';
}

function statusMarkClassName(status: SquadStatus) {
  if (status === 'S' || status === '!?') return 'text-yellow-200/90';
  return 'text-white/60';
}

function groupByPosition(players: SquadPlayerPrediction[]) {
  const out: Record<SquadPosition, SquadPlayerPrediction[]> = { GK: [], DF: [], MF: [], FW: [] };
  for (const p of players) out[p.position].push(p);
  return out;
}

function pickTop(players: SquadPlayerPrediction[], count: number) {
  const rank = (s: SquadStatus) => (s === 'S' ? 0 : s === 'A' ? 1 : s === 'B' ? 2 : 3);
  return [...players]
    .sort((a, b) => {
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return a.name.localeCompare(b.name, 'ja');
    })
    .slice(0, count);
}

export default async function Wc2026SharePage({ params }: Props) {
  const { country: countrySlug, shareId } = params;
  const country = getWc2026CountryBySlug(countrySlug);

  const db = getServerDb();
  const baseUrl = getBaseUrlFromHeaders();

  const snap = db ? await getDoc(doc(db, 'wc2026PredictionShares', shareId)) : null;

  if (!snap || !snap.exists()) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-indigo-950">
        <div className="px-3 pt-4 pb-24">
          <div className="text-sm text-white">共有ページが見つかりません</div>
          <div className="mt-3">
            <Link href="/worldcup/2026" className="text-sm text-white/80 underline">
              国一覧へ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const data = snap.data() as any;
  const raw = typeof data?.snapshotJson === 'string' ? data.snapshotJson : '';
  const parsed = raw ? (JSON.parse(raw) as any) : null;
  const players = (Array.isArray(parsed?.players) ? parsed.players : []) as SquadPlayerPrediction[];
  const comment = typeof parsed?.comment === 'string' ? parsed.comment : '';
  const pitchOverrideBySlot = (parsed?.pitchOverrideBySlot && typeof parsed.pitchOverrideBySlot === 'object'
    ? parsed.pitchOverrideBySlot
    : {}) as Record<string, string>;
  const grouped = groupByPosition(players);

  const pitchAssigned = (() => {
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

    const assigned: Partial<Record<string, SquadPlayerPrediction>> = {
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

    for (const slot of Object.keys(pitchOverrideBySlot)) {
      const pid = pitchOverrideBySlot[slot];
      if (!pid) continue;
      const p = players.find((x) => x.id === pid) ?? null;
      if (p) assigned[slot] = p;
    }

    return assigned;
  })();

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

  const rows = countrySlug === 'japan'
    ? ([
        { title: '-GK-', key: 'GK', players: gk },
        { title: '-DF-', key: 'DF', players: df },
        { title: '-MF/FW-', key: 'MFFW', players: mfFw },
      ] as const)
    : ([
        { title: '-GK-', key: 'GK', players: gk },
        { title: '-DF-', key: 'DF', players: df },
        { title: '-MF-', key: 'MF', players: mf },
        { title: '-FW-', key: 'FW', players: fw },
      ] as const);

  const candidates = country?.code ? WC2026_CANDIDATES_BY_COUNTRY[country.code] : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-indigo-950">
      <div className="px-3 pt-4 pb-24">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0b1533]/90 to-[#070d1f]/90 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {countrySlug === 'japan' ? (
                  <div className="flex items-baseline gap-2 min-w-0">
                    <div className="text-xl font-black italic tracking-wide text-white shrink-0">SAMURAI BLUE</div>
                    <div className="text-[9px] font-bold text-white/85 truncate">FIFA ワールドカップ 2026 予想メンバー</div>
                  </div>
                ) : (
                  <div className="text-xl font-black italic tracking-wide text-white">
                    {country?.nameEn?.toUpperCase() ?? 'SQUAD'}
                  </div>
                )}
              </div>
              <a
                href={`${baseUrl}/api/wc2026-og/${countrySlug}/${shareId}?v=${shareId}`}
                className="text-[11px] text-white/70 underline shrink-0"
              >
                画像
              </a>
            </div>

            <SharePitch pitchAssigned={pitchAssigned} statusMark={statusMark} statusMarkClassName={statusMarkClassName} />

            <div className="mt-4 space-y-5">
              {rows.map((row) => (
                <div key={row.key}>
                  <div className="text-center text-xs font-bold tracking-[0.3em] text-yellow-200/90">{row.title}</div>
                  <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3">
                    {row.players.length === 0 ? (
                      <div className="col-span-3 text-center text-xs text-white/50">未選出</div>
                    ) : (
                      row.players.map((p) => {
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
                          <div key={p.id} className="min-w-0 text-center">
                            <div className="text-sm font-extrabold text-white truncate">
                              {p.name}
                              {typeof cand?.age === 'number' ? (
                                <span className="ml-1 text-[11px] font-semibold text-white/75">({cand.age})</span>
                              ) : null}
                              <span className={`ml-1 text-[10px] ${statusMarkClassName(p.status)}`}>{statusMark(p.status)}</span>
                            </div>
                            <div className="mt-0.5 text-[10px] text-white/60 truncate">{cand?.club ?? ''}</div>
                            {statLine ? <div className="mt-0.5 text-[10px] text-white/55 truncate">{statLine}</div> : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>

            {comment ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-white/80 whitespace-pre-wrap break-words">
                {comment}
              </div>
            ) : null}
          </div>
        </div>

        <ShareComments shareId={shareId} />

        <div className="mt-5 px-1">
          <Link
            href="/worldcup/2026"
            className="flex w-full items-center justify-center rounded-2xl px-4 py-4 text-base bg-orange-500 text-white font-semibold hover:bg-orange-400 transition-colors"
          >
            予想する
          </Link>
        </div>
      </div>
    </div>
  );
}

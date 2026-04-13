import { ImageResponse } from 'next/og';
import React from 'react';
import { getWc2026CountryBySlug } from '@/lib/worldcup/wc2026Countries';
import { WC2026_CANDIDATES_BY_COUNTRY } from '@/lib/worldcup/wc2026Candidates';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Context = {
  params: { country: string; shareId: string };
};

type SharePlayer = {
  id?: string;
  name?: string;
  position?: string;
  status?: string;
};

type Candidate = {
  id: string;
  name: string;
  position: 'GK' | 'DF' | 'MF' | 'FW';
  age?: number;
  club?: string;
  stats?: { appearances?: number; goals?: number };
};

type PickedPlayer = {
  id?: string;
  name: string;
  status?: string;
  position?: string;
};

function statusMark(status: string | undefined) {
  if (status === 'S') return '◎';
  if (status === 'A') return '○';
  if (status === 'B') return '△';
  return '★';
}

function statusMarkColor(status: string | undefined) {
  if (status === 'S' || status === '!?') return '#fde047';
  return 'rgba(255,255,255,0.7)';
}

function safeName(v: unknown) {
  return typeof v === 'string' ? v.trim() : '';
}

function statLineFromCandidate(c: Candidate | undefined) {
  const apps = c?.stats?.appearances;
  const goals = c?.stats?.goals;
  const hasApps = typeof apps === 'number';
  const hasGoals = typeof goals === 'number';
  if (!hasApps && !hasGoals) return '';
  const left = hasApps ? `${apps} cap` : '';
  const mid = hasApps && hasGoals ? ' / ' : '';
  const right = hasGoals ? `${goals}G` : '';
  return `${left}${mid}${right}`;
}

function groupByPosition(players: Array<{ id?: string; name: string; status?: string; position?: string }>) {
  const out = { GK: [] as typeof players, DF: [] as typeof players, MF: [] as typeof players, FW: [] as typeof players };
  for (const p of players) {
    const pos = p.position;
    if (pos === 'GK' || pos === 'DF' || pos === 'MF' || pos === 'FW') out[pos].push(p);
  }
  return out;
}

function rankStatus(s: string | undefined) {
  return s === 'S' ? 0 : s === 'A' ? 1 : s === 'B' ? 2 : 3;
}

function pickTop<T extends { status?: string; name: string }>(players: T[], count: number) {
  return [...players]
    .sort((a, b) => {
      const r = rankStatus(a.status) - rankStatus(b.status);
      if (r !== 0) return r;
      return a.name.localeCompare(b.name, 'ja');
    })
    .slice(0, count);
}

type PitchSlot = 'ST' | 'SS_L' | 'SS_R' | 'LM' | 'LCM' | 'RCM' | 'RM' | 'LCB' | 'CB' | 'RCB' | 'GK';
type PitchSlotPos = { key: PitchSlot; leftPct: number; topPct: number };

const PITCH_3421_SLOTS: PitchSlotPos[] = [
  { key: 'ST', leftPct: 50, topPct: 14 },
  { key: 'SS_L', leftPct: 35, topPct: 28 },
  { key: 'SS_R', leftPct: 65, topPct: 28 },
  { key: 'LM', leftPct: 18, topPct: 46 },
  { key: 'LCM', leftPct: 40, topPct: 48 },
  { key: 'RCM', leftPct: 60, topPct: 48 },
  { key: 'RM', leftPct: 82, topPct: 46 },
  { key: 'LCB', leftPct: 28, topPct: 68 },
  { key: 'CB', leftPct: 50, topPct: 72 },
  { key: 'RCB', leftPct: 72, topPct: 68 },
  { key: 'GK', leftPct: 50, topPct: 88 },
];

export async function GET(_req: Request, context: Context) {
  try {
    const { country: countrySlug, shareId } = context.params;
    const country = getWc2026CountryBySlug(countrySlug);
    const title = country ? `${country.nameEn.toUpperCase()} WC2026` : 'WC2026';
    const sub = `share:${shareId.slice(0, 8)}`;

    const urlObj = new URL(_req.url);
    const mode = urlObj.searchParams.get('mode') ?? 'list';

    const origin = (() => {
      try {
        return new URL(_req.url).origin;
      } catch {
        return 'https://www.footballtop.net';
      }
    })();

    let players: SharePlayer[] = [];
    try {
      const res = await fetch(`${origin}/api/wc2026-share/${encodeURIComponent(shareId)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as any;
        players = Array.isArray(data?.players) ? data.players : [];
      }
    } catch {
      players = [];
    }

    const picked: PickedPlayer[] = players
      .map((p) => ({
        id: typeof p?.id === 'string' ? p.id : undefined,
        name: safeName(p?.name),
        status: typeof p?.status === 'string' ? p.status : undefined,
        position: typeof p?.position === 'string' ? p.position : undefined,
      }))
      .filter((p) => p.name);

    const candidates = country?.code ? (WC2026_CANDIDATES_BY_COUNTRY[country.code] as Candidate[]) : ([] as Candidate[]);
    const candById = new Map<string, Candidate>();
    for (const c of candidates) candById.set(c.id, c);

    const renderPlayerCell = (p: PickedPlayer, idx: number) => {
      const c = p.id ? candById.get(p.id) : undefined;
      const statLine = statLineFromCandidate(c);

      const nameLineChildren: any[] = [p.name];
      if (typeof c?.age === 'number') {
        nameLineChildren.push(
          React.createElement('span', { style: { marginLeft: 6, fontSize: 16, fontWeight: 700, opacity: 0.8 } }, `(${c.age})`)
        );
      }
      nameLineChildren.push(
        React.createElement(
          'span',
          { style: { marginLeft: 6, fontSize: 16, opacity: 0.95, color: statusMarkColor(p.status) } },
          statusMark(p.status)
        )
      );

      return React.createElement(
        'div',
        {
          key: `${idx}-${p.id ?? p.name}`,
          style: {
            minWidth: 0,
            width: '33.3333%',
            boxSizing: 'border-box',
            padding: '2px 4px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              fontSize: 20,
              fontWeight: 900,
              opacity: 0.98,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              flexWrap: 'wrap',
              lineHeight: 1.2,
            },
          },
          ...nameLineChildren
        ),
        React.createElement(
          'div',
          { style: { marginTop: 2, fontSize: 12, opacity: 0.7, display: 'flex' } },
          c?.club ?? ''
        ),
        statLine
          ? React.createElement('div', { style: { marginTop: 2, fontSize: 12, opacity: 0.65, display: 'flex' } }, statLine)
          : null
      );
    };


    const root = (() => {
      if (mode === 'pitch') {
        const groupedAll = groupByPosition(picked);

        const gk = pickTop(groupedAll.GK, 1);
        const cbs = pickTop(groupedAll.DF, 3);
        const mids = pickTop(groupedAll.MF, 4);

        const used = new Set<string>([...gk, ...cbs, ...mids].map((p) => p.id ?? p.name));
        const remainingAttackPool = [...picked]
          .filter((p) => !used.has(p.id ?? p.name))
          .filter((p) => p.position === 'FW' || p.position === 'MF');
        const shadows = pickTop(remainingAttackPool, 2);
        for (const p of shadows) used.add(p.id ?? p.name);

        const remainingTopPool = [...picked]
          .filter((p) => !used.has(p.id ?? p.name))
          .filter((p) => p.position === 'FW' || p.position === 'MF');
        const top = pickTop(remainingTopPool, 1);

        const assigned: Partial<Record<PitchSlot, PickedPlayer>> = {
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

        const playerTag = (p: PickedPlayer | undefined) => {
          if (!p) return null;
          return React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(0,0,0,0.55)',
                color: 'rgba(255,255,255,0.92)',
                fontSize: 18,
                fontWeight: 800,
                maxWidth: 320,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            },
            React.createElement('span', { style: { color: statusMarkColor(p.status), fontSize: 18 } }, statusMark(p.status)),
            React.createElement('span', null, p.name)
          );
        };

        const pitch = React.createElement(
          'div',
          {
            style: {
              position: 'relative',
              width: '100%',
              height: 420,
              borderRadius: 26,
              overflow: 'hidden',
              background: 'linear-gradient(180deg, rgba(16,185,129,0.35) 0%, rgba(6,95,70,0.35) 100%)',
              border: '1px solid rgba(255,255,255,0.12)',
            },
          },
          React.createElement('div', {
            style: {
              position: 'absolute',
              inset: 0,
              opacity: 0.35,
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.0) 0px, rgba(255,255,255,0.0) 24px, rgba(0,0,0,0.18) 24px, rgba(0,0,0,0.18) 48px)',
            },
          }),
          React.createElement('div', {
            style: { position: 'absolute', left: '8%', right: '8%', top: '6%', bottom: '6%', border: '1px solid rgba(255,255,255,0.35)' },
          }),
          React.createElement('div', {
            style: {
              position: 'absolute',
              left: '8%',
              right: '8%',
              top: '50%',
              transform: 'translateY(-50%)',
              borderTop: '1px solid rgba(255,255,255,0.35)',
            },
          }),
          React.createElement('div', {
            style: {
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '34%',
              height: '34%',
              transform: 'translate(-50%, -50%)',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.35)',
            },
          }),
          React.createElement('div', {
            style: {
              position: 'absolute',
              left: '24%',
              right: '24%',
              bottom: '6%',
              height: '22%',
              border: '1px solid rgba(255,255,255,0.35)',
            },
          }),
          React.createElement('div', {
            style: {
              position: 'absolute',
              left: '24%',
              right: '24%',
              top: '6%',
              height: '22%',
              border: '1px solid rgba(255,255,255,0.35)',
            },
          }),
          ...PITCH_3421_SLOTS.map((slot) => {
            const p = assigned[slot.key];
            return React.createElement(
              'div',
              {
                key: slot.key,
                style: {
                  position: 'absolute',
                  left: `${slot.leftPct}%`,
                  top: `${slot.topPct}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                },
              },
              playerTag(p)
            );
          })
        );

        return React.createElement(
          'div',
          {
            style: {
              width: '100%',
              height: '100%',
              background: 'linear-gradient(180deg, #020617 0%, #0b1533 50%, #070d1f 100%)',
              color: 'white',
              padding: 34,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            },
          },
          React.createElement(
            'div',
            { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18 } },
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column' } },
              React.createElement('div', { style: { fontSize: 44, fontWeight: 800, letterSpacing: -0.5 } }, title),
              React.createElement('div', { style: { marginTop: 8, fontSize: 22, opacity: 0.85 } }, 'Pitch (3-4-2-1)'),
              React.createElement('div', { style: { marginTop: 6, fontSize: 18, opacity: 0.65 } }, sub)
            ),
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 } },
              React.createElement('div', { style: { fontSize: 16, opacity: 0.8, display: 'flex' } }, 'footballtop.net'),
              React.createElement('div', { style: { fontSize: 16, opacity: 0.8, display: 'flex' } }, 'S:◎ A:○ B:△ ?:★')
            )
          ),
          pitch
        );
      }

      const ordered = pickTop(picked, 18);
      const grouped = groupByPosition(ordered);
      const isJapan = countrySlug === 'japan';
      const rows = isJapan
        ? [
            { title: '-GK-', key: 'GK', players: grouped.GK },
            { title: '-DF-', key: 'DF', players: grouped.DF },
            { title: '-MF/FW-', key: 'MFFW', players: [...grouped.MF, ...grouped.FW] },
          ]
        : [
            { title: '-GK-', key: 'GK', players: grouped.GK },
            { title: '-DF-', key: 'DF', players: grouped.DF },
            { title: '-MF-', key: 'MF', players: grouped.MF },
            { title: '-FW-', key: 'FW', players: grouped.FW },
          ];

      return React.createElement(
        'div',
        {
          style: {
            width: '100%',
            height: '100%',
            background: 'linear-gradient(180deg, #020617 0%, #0b1533 50%, #070d1f 100%)',
            color: 'white',
            padding: 34,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
            },
          },
          React.createElement('div', { style: { fontSize: 46, fontWeight: 800, letterSpacing: -0.5 } }, title),
          React.createElement('div', { style: { marginTop: 8, fontSize: 22, opacity: 0.85 } }, 'Squad Prediction'),
          React.createElement('div', { style: { marginTop: 6, fontSize: 18, opacity: 0.65 } }, sub)
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 14,
              borderRadius: 24,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
            },
          },
          rows.length === 0
            ? React.createElement('div', { style: { fontSize: 28, opacity: 0.85, display: 'flex' } }, 'No picks yet')
            : rows.map((row) =>
                React.createElement(
                  'div',
                  {
                    key: row.key,
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 800,
                        letterSpacing: 4,
                        color: 'rgba(254, 240, 138, 0.92)',
                      },
                    },
                    row.title
                  ),
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'flex-start',
                        gap: 0,
                      },
                    },
                    row.players.length === 0
                      ? React.createElement(
                          'div',
                          { style: { display: 'flex', justifyContent: 'center', width: '100%', fontSize: 14, opacity: 0.55 } },
                          '未選出'
                        )
                      : row.players.map(renderPlayerCell)
                  )
                )
              )
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
          },
          React.createElement('div', { style: { fontSize: 16, opacity: 0.8, display: 'flex' } }, 'footballtop.net'),
          React.createElement('div', { style: { fontSize: 16, opacity: 0.8, display: 'flex' } }, 'S:◎ A:○ B:△ ?:★')
        )
      );
    })();

    return new ImageResponse(root, {
      width: 1200,
      height: 630,
    });
  } catch (e: any) {
    return new Response(typeof e?.stack === 'string' ? e.stack : 'failed', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
}

export async function HEAD(req: Request, context: Context) {
  return GET(req, context);
}

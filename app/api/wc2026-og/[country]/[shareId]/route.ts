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

export async function GET(_req: Request, context: Context) {
  try {
    const { country: countrySlug, shareId } = context.params;
    const country = getWc2026CountryBySlug(countrySlug);
    const title = country ? `${country.nameEn.toUpperCase()} WC2026` : 'WC2026';
    const sub = `share:${shareId.slice(0, 8)}`;

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

    const rank = (s: string | undefined) => (s === 'S' ? 0 : s === 'A' ? 1 : s === 'B' ? 2 : 3);
    const ordered = [...picked]
      .sort((a, b) => {
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return a.name.localeCompare(b.name, 'ja');
      })
      .slice(0, 18);

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

    const root = React.createElement(
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

    const image = new ImageResponse(root, {
      width: 1200,
      height: 630,
    });

    const buf = await image.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, max-age=0',
        'Content-Length': String(buf.byteLength),
      },
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

import { ImageResponse } from 'next/og';
import React from 'react';
import { premierLeagueClubs } from '@/lib/clubMaster';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Context = {
  params: { shareId: string };
};

type ClubRow = {
  id: string;
  nameJa: string;
  logoSrc: string;
};

function safeClub(id: unknown, clubById: Map<string, ClubRow>) {
  if (typeof id !== 'string') return null;
  const c = clubById.get(id);
  return c ?? null;
}

export async function GET(req: Request, context: Context) {
  try {
    const { shareId } = context.params;

    const origin = (() => {
      try {
        return new URL(req.url).origin;
      } catch {
        return 'https://kansenki.footballtop.net';
      }
    })();

    const clubById = new Map<string, ClubRow>(
      Object.values(premierLeagueClubs).map((c) => [c.id, { id: c.id, nameJa: c.nameJa, logoSrc: c.logoSrc }])
    );

    let selectedByRank: unknown[] = [];
    try {
      const res = await fetch(`${origin}/api/pl-final-table-share/${encodeURIComponent(shareId)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as any;
        selectedByRank = Array.isArray(data?.selectedByRank) ? data.selectedByRank : [];
      }
    } catch {
      selectedByRank = [];
    }

    const ranks = Array.from({ length: 7 }).map((_, i) => {
      const clubId = selectedByRank[i];
      const club = safeClub(clubId, clubById);
      return { rank: i + 1, club };
    });

    const bg = React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, #020617 0%, #0b1533 55%, #070d1f 100%)',
          color: 'white',
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        React.createElement('div', { style: { fontSize: 52, fontWeight: 900, letterSpacing: -1 } }, 'Premier League'),
        React.createElement('div', { style: { fontSize: 30, fontWeight: 800, opacity: 0.92 } }, '最終順位予想'),
        React.createElement('div', { style: { fontSize: 18, opacity: 0.7 } }, `share:${shareId.slice(0, 8)}`)
      ),
      React.createElement(
        'div',
        {
          style: {
            marginTop: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: 18,
            borderRadius: 26,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.06)',
          },
        },
        ...ranks.map(({ rank, club }) =>
          React.createElement(
            'div',
            { key: `r-${rank}`, style: { display: 'flex', alignItems: 'center', gap: 14 } },
            React.createElement(
              'div',
              {
                style: {
                  width: 44,
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: 900,
                  opacity: 0.9,
                },
              },
              `${rank}`
            ),
            club
              ? React.createElement(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: 12 } },
                  React.createElement('img', {
                    src: `${origin}${encodeURI(club.logoSrc)}`,
                    width: 44,
                    height: 44,
                    style: {
                      borderRadius: 999,
                      background: 'white',
                      objectFit: 'contain',
                      padding: 6,
                      border: '1px solid rgba(255,255,255,0.12)',
                    },
                  }),
                  React.createElement(
                    'div',
                    { style: { fontSize: 26, fontWeight: 900, letterSpacing: -0.5 } },
                    club.nameJa
                  )
                )
              : React.createElement('div', { style: { fontSize: 22, fontWeight: 800, opacity: 0.45 } }, '未選択')
          )
        )
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 } },
        React.createElement('div', { style: { fontSize: 18, opacity: 0.75, display: 'flex' } }, '#プレミアリーグ  #PL  #スポカレ'),
        React.createElement('div', { style: { fontSize: 18, opacity: 0.75, display: 'flex' } }, 'kansenki.footballtop.net')
      )
    );

    return new ImageResponse(bg, {
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

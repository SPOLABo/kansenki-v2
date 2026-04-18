import { NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getServerDb } from '@/lib/firebaseServer';
import type { SquadPlayerPrediction, SquadStatus } from '@/types/worldcup';

export const runtime = 'nodejs';

type PlayerAgg = {
  id: string;
  name: string;
  position: SquadPlayerPrediction['position'];
  counts: Record<SquadStatus, number>;
  total: number;
};

export async function GET(_req: Request, { params }: { params: { country: string } }) {
  const countrySlug = params?.country;
  if (!countrySlug) {
    return NextResponse.json({ error: 'country is required' }, { status: 400 });
  }

  const db = getServerDb();
  if (!db) {
    return NextResponse.json({ error: 'Firestore is not configured' }, { status: 500 });
  }

  let snap;
  try {
    const q = query(collection(db, 'wc2026PublicSquadPredictions'), where('countrySlug', '==', countrySlug));
    snap = await getDocs(q);
  } catch (e: any) {
    const code = typeof e?.code === 'string' ? e.code : '';
    const msg = typeof e?.message === 'string' ? e.message : '';
    return NextResponse.json({ error: 'failed', code, message: msg }, { status: 500 });
  }

  const byId = new Map<string, PlayerAgg>();

  snap.forEach((docSnap) => {
    const data = docSnap.data() as any;
    const players: any[] = Array.isArray(data?.players) ? data.players : [];

    for (const p of players) {
      if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') continue;
      const status = p.status as SquadStatus;
      if (status !== 'S' && status !== 'A' && status !== 'B' && status !== '!?') continue;

      const existing = byId.get(p.id);
      if (!existing) {
        byId.set(p.id, {
          id: p.id,
          name: p.name,
          position: p.position as SquadPlayerPrediction['position'],
          counts: { S: 0, A: 0, B: 0, '!?': 0 },
          total: 0,
        });
      }
      const agg = byId.get(p.id)!;
      agg.counts[status] += 1;
      agg.total += 1;

      if (!agg.position && p.position) agg.position = p.position;
      if (agg.name !== p.name && typeof p.name === 'string') {
        // keep first name; ignore
      }
    }
  });

  const players = Array.from(byId.values()).sort((a, b) => {
    const s = b.counts.S - a.counts.S;
    if (s !== 0) return s;
    const aCount = b.counts.A - a.counts.A;
    if (aCount !== 0) return aCount;
    const bCount = b.counts.B - a.counts.B;
    if (bCount !== 0) return bCount;
    return a.name.localeCompare(b.name, 'ja');
  });

  return NextResponse.json({ countrySlug, docs: snap.size, players });
}

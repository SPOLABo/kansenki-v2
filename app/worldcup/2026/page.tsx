import Link from 'next/link';
import { WC2026_COUNTRIES } from '@/lib/worldcup/wc2026Countries';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getServerDb } from '@/lib/firebaseServer';
import type { SquadPlayerPrediction, SquadStatus } from '@/types/worldcup';
import { Wc2026RankingTabs } from './_components/Wc2026RankingTabs';
import { WC2026_CANDIDATES_BY_COUNTRY } from '@/lib/worldcup/wc2026Candidates';
import { Wc2026LoginCta } from './_components/Wc2026LoginCta';

type PlayerAgg = {
  id: string;
  name: string;
  position: SquadPlayerPrediction['position'];
  counts: Record<SquadStatus, number>;
  total: number;
};

async function getCountryAggregates(countrySlug: string): Promise<PlayerAgg[]> {
  const db = getServerDb();
  if (!db) return [];

  const q = query(collection(db, 'wc2026PublicSquadPredictions'), where('countrySlug', '==', countrySlug));
  const snap = await getDocs(q);

  const byId = new Map<string, PlayerAgg>();
  snap.forEach((docSnap) => {
    const data = docSnap.data() as any;
    const players: any[] = Array.isArray(data?.players) ? data.players : [];

    for (const p of players) {
      if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') continue;
      const status = p.status as SquadStatus;
      if (status !== 'S' && status !== 'A' && status !== 'B' && status !== '!?') continue;

      if (!byId.has(p.id)) {
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
    }
  });

  return Array.from(byId.values());
}

export default async function Wc2026IndexPage() {
  const visibleCountries = WC2026_COUNTRIES.filter((c) => c.slug === 'japan' || c.slug === 'england');

  const flagSrcBySlug: Record<string, string> = {
    japan: 'https://flagcdn.com/w320/jp.png',
    england: 'https://flagcdn.com/w320/gb-eng.png',
  };

  const japanAgg = await getCountryAggregates('japan');
  const japanCandidates = WC2026_CANDIDATES_BY_COUNTRY.jpn ?? [];
  const candById = new Map<string, (typeof japanCandidates)[number]>();
  for (const c of japanCandidates) candById.set(c.id, c);

  const rankingByStatus = {
    S: [...japanAgg]
      .filter((p) => (p.counts.S ?? 0) > 0)
      .sort((a, b) => (b.counts.S ?? 0) - (a.counts.S ?? 0) || a.name.localeCompare(b.name, 'ja'))
      .slice(0, 30)
      .map((p) => {
        const c = candById.get(p.id);
        return { id: p.id, name: p.name, position: p.position, age: c?.age, club: c?.club, count: p.counts.S };
      }),
    A: [...japanAgg]
      .filter((p) => (p.counts.A ?? 0) > 0)
      .sort((a, b) => (b.counts.A ?? 0) - (a.counts.A ?? 0) || a.name.localeCompare(b.name, 'ja'))
      .slice(0, 30)
      .map((p) => {
        const c = candById.get(p.id);
        return { id: p.id, name: p.name, position: p.position, age: c?.age, club: c?.club, count: p.counts.A };
      }),
    B: [...japanAgg]
      .filter((p) => (p.counts.B ?? 0) > 0)
      .sort((a, b) => (b.counts.B ?? 0) - (a.counts.B ?? 0) || a.name.localeCompare(b.name, 'ja'))
      .slice(0, 30)
      .map((p) => {
        const c = candById.get(p.id);
        return { id: p.id, name: p.name, position: p.position, age: c?.age, club: c?.club, count: p.counts.B };
      }),
    '!?': [...japanAgg]
      .filter((p) => (p.counts['!?'] ?? 0) > 0)
      .sort((a, b) => (b.counts['!?'] ?? 0) - (a.counts['!?'] ?? 0) || a.name.localeCompare(b.name, 'ja'))
      .slice(0, 30)
      .map((p) => {
        const c = candById.get(p.id);
        return { id: p.id, name: p.name, position: p.position, age: c?.age, club: c?.club, count: p.counts['!?'] };
      }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-indigo-950">
      <div className="px-3 pt-4 pb-24">
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <img
            src="/選考予想OGP.png"
            alt="選考予想"
            className="w-full aspect-[1200/630] object-cover"
            loading="lazy"
          />
        </div>

        <div className="px-1 pb-3">
          <h1 className="text-lg font-bold text-white">W杯 2026 メンバー予想</h1>
          <div className="mt-1 text-xs text-white/60">ログインして国別に自分の予想を作成できます</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {visibleCountries.map((c) => (
            <Link
              key={c.slug}
              href={`/worldcup/2026/${c.slug}`}
              className="block"
            >
              <img
                src={flagSrcBySlug[c.slug]}
                alt={`${c.nameJa} 国旗`}
                className="w-full aspect-[3/2] rounded-2xl border border-white/10 object-cover hover:opacity-90 transition-opacity"
                loading="lazy"
              />
            </Link>
          ))}
        </div>

        <Wc2026LoginCta redirectTo="/worldcup/2026" />

        <Wc2026RankingTabs title="日本：みんなの予想ランキング" rankingByStatus={rankingByStatus} />
      </div>
    </div>
  );
}

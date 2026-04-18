import Link from 'next/link';
import { WC2026_COUNTRIES } from '@/lib/worldcup/wc2026Countries';

export default function Wc2026IndexPage() {
  const visibleCountries = WC2026_COUNTRIES.filter((c) => c.slug === 'japan' || c.slug === 'england');

  const flagSrcBySlug: Record<string, string> = {
    japan: 'https://flagcdn.com/w320/jp.png',
    england: 'https://flagcdn.com/w320/gb-eng.png',
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
      </div>
    </div>
  );
}

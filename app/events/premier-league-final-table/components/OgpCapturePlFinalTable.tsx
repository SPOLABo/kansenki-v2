import Image from 'next/image';
import { premierLeagueClubs } from '@/lib/clubMaster';

export function OgpCapturePlFinalTable({ selectedByRank }: { selectedByRank: (string | null)[] }) {
  return (
    <div className="fixed left-[-99999px] top-0 h-[630px] w-[1200px] overflow-hidden">
      <div id="pl-final-table-ogp-capture" className="h-[630px] w-[1200px] bg-black px-16 py-14">
        <div className="text-sm font-semibold tracking-widest text-white/60">SHARE</div>
        <div className="mt-3 text-5xl font-black text-white">25/26プレミアリーグ 最終順位予想</div>
        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          {selectedByRank.slice(0, 7).map((clubId, index) => {
            const club = typeof clubId === 'string' ? premierLeagueClubs[clubId as keyof typeof premierLeagueClubs] : null;
            return (
              <div
                key={`${index}-${clubId ?? 'empty'}`}
                className={'flex items-center gap-5 px-8 py-5 ' + (index === 0 ? '' : 'border-t border-white/10')}
              >
                <div className="w-14 text-center text-3xl font-black text-white/80">{index + 1}</div>
                {club ? (
                  <>
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white">
                      <Image src={club.logoSrc} alt={club.nameJa} fill className="object-contain p-2" sizes="64px" />
                    </div>
                    <div className="truncate text-3xl font-extrabold text-white">{club.nameJa}</div>
                  </>
                ) : (
                  <div className="text-3xl font-extrabold text-white/30">未選択</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-8 text-xl font-semibold text-white/70">kansenki.footballtop.net</div>
      </div>
    </div>
  );
}

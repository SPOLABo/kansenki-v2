import Image from 'next/image';

type ClubRow = {
  id: string;
  nameJa: string;
  logoSrc: string;
};

export function RankSelectionList({
  selectedByRank,
  clubById,
  onOpenRank,
  onClearRank,
  europeLabelForRank,
}: {
  selectedByRank: (string | null)[];
  clubById: Map<string, ClubRow>;
  onOpenRank: (rankIndex: number) => void;
  onClearRank: (rankIndex: number) => void;
  europeLabelForRank: (rank: number) => {
    shortLabel: string;
    barClassName: string;
    pillClassName: string;
  } | null;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/80">
      {selectedByRank.map((clubId, index) => {
        const rank = index + 1;
        const europe = europeLabelForRank(rank);
        const club = clubId ? clubById.get(clubId) : null;
        return (
          <div
            key={`${index}-${clubId ?? 'empty'}`}
            className={'flex items-center gap-3 px-4 py-3 ' + (index === 0 ? '' : 'border-t border-black/10')}
          >
            <div className="flex items-center gap-2">
              <div className={'h-9 w-1.5 rounded-full ' + (europe ? europe.barClassName : 'bg-black/10')} />
              {europe ? (
                <div className={'rounded-full border px-2 py-1 text-[10px] font-bold leading-none ' + europe.pillClassName}>
                  {europe.shortLabel}
                </div>
              ) : (
                <div className="w-10" />
              )}
            </div>

            <div className="w-9 text-center text-sm font-bold text-slate-600">{rank}</div>

            <button
              type="button"
              onClick={() => onOpenRank(index)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-black/5"
              aria-label={`${rank}位を選択`}
            >
              {club ? (
                <>
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white">
                    <Image src={club.logoSrc} alt={club.nameJa} fill className="object-contain p-1" sizes="32px" />
                  </div>
                  <div className="truncate text-sm font-semibold text-slate-900">{club.nameJa}</div>
                </>
              ) : (
                <>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-black/30 text-[10px] font-bold text-slate-500">
                    TAP
                  </div>
                  <div className="text-sm font-semibold text-slate-500">未選択</div>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onClearRank(index)}
              disabled={!clubId}
              className={
                'shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ' +
                (clubId ? 'bg-black/5 text-slate-700 hover:bg-black/10' : 'bg-black/5 text-slate-300')
              }
            >
              クリア
            </button>
          </div>
        );
      })}
    </div>
  );
}

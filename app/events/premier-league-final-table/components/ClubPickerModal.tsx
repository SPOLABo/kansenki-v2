import Image from 'next/image';

type ClubRow = {
  id: string;
  nameJa: string;
  logoSrc: string;
};

type SelectableClub = ClubRow & {
  points: number | null;
  upcomingOpponentIds: string[];
};

export function ClubPickerModal({
  activeRankIndex,
  onClose,
  selectableClubs,
  selectedByRank,
  clubById,
  onPickClub,
}: {
  activeRankIndex: number;
  onClose: () => void;
  selectableClubs: SelectableClub[];
  selectedByRank: (string | null)[];
  clubById: Map<string, ClubRow>;
  onPickClub: (clubId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[10000]">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="閉じる" />
      <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-hidden rounded-t-3xl border-t border-black/10 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="text-sm font-bold text-slate-900">クラブを選択（4/24時点）</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-black/5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-black/10"
          >
            閉じる
          </button>
        </div>

        <div className="max-h-[calc(80vh-64px)] overflow-y-auto px-4 pb-6">
          <div className="grid grid-cols-1 gap-2">
            {selectableClubs.map((c) => {
              const alreadySelectedIndex = selectedByRank.findIndex((id) => id === c.id);
              const disabled = alreadySelectedIndex !== -1 && alreadySelectedIndex !== activeRankIndex;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPickClub(c.id)}
                  className={
                    'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ' +
                    (disabled ? 'border-black/5 bg-black/5 text-slate-400' : 'border-black/10 bg-white/80 text-slate-900 hover:bg-white')
                  }
                >
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white">
                    <Image src={c.logoSrc} alt={c.nameJa} fill className="object-contain p-1" sizes="32px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-sm font-semibold">{c.nameJa}</div>

                      <div className="flex items-center gap-2">
                        <div className="rounded-full border border-black/10 bg-white px-2 py-1 text-[10px] font-bold text-slate-700">
                          {typeof c.points === 'number' ? c.points : '-'}
                        </div>

                        <div className="flex max-w-[45vw] items-center gap-1 overflow-x-auto">
                          {c.upcomingOpponentIds.slice(0, 8).map((oppId) => {
                            const opp = clubById.get(oppId);
                            if (!opp) return null;
                            return (
                              <div
                                key={`${c.id}-${oppId}`}
                                className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-black/10 bg-white"
                                title={opp.nameJa}
                                aria-label={opp.nameJa}
                              >
                                <Image src={opp.logoSrc} alt={opp.nameJa} fill className="object-contain p-0.5" sizes="24px" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    {disabled ? <div className="mt-1 text-xs text-slate-500">選択済み（{alreadySelectedIndex + 1}位）</div> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

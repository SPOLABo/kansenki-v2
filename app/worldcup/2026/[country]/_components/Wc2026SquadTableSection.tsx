'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { SquadPlayerPrediction, SquadStatus } from '@/types/worldcup';

type SquadRow = {
  title: string;
  key: string;
  players: SquadPlayerPrediction[];
};

export function Wc2026SquadTableSection(props: {
  squadRows: readonly SquadRow[];
  openSquadSectionByKey: Record<string, boolean>;
  setOpenSquadSectionByKey: Dispatch<SetStateAction<Record<string, boolean>>>;
  candidates: any[];
  statusMark: (status: SquadStatus) => string;
  statusMarkClassName: (status: SquadStatus) => string;
}) {
  const { squadRows, openSquadSectionByKey, setOpenSquadSectionByKey, candidates, statusMark, statusMarkClassName } = props;

  return (
    <div id="wc2026-squad-table-capture" className="mt-4 space-y-5">
      {squadRows.map((row) => (
        <div key={row.key}>
          <button
            type="button"
            onClick={() => {
              setOpenSquadSectionByKey((prev) => ({ ...prev, [row.key]: !(prev[row.key] ?? true) }));
            }}
            aria-expanded={openSquadSectionByKey[row.key] ?? true}
            className="w-full text-center py-2 -my-2"
          >
            <div className="text-xs font-bold tracking-[0.3em] text-yellow-200/90">
              {row.title}
              <span className="ml-2 text-[10px] tracking-normal text-white/70">({row.players.length})</span>
            </div>
          </button>

          {openSquadSectionByKey[row.key] ?? true ? (
            <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3">
              {row.players.length === 0 ? (
                <div className="col-span-3 text-center text-xs text-white/50">未選出</div>
              ) : (
                row.players.map((p) => (
                  <div key={p.id} className="min-w-0 text-center">
                    {(() => {
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
                        <>
                          <div className="text-sm font-extrabold text-white truncate">
                            {p.name}
                            {typeof cand?.age === 'number' ? (
                              <span className="ml-1 text-[11px] font-semibold text-white/75">({cand.age})</span>
                            ) : null}
                            <span className={`ml-1 text-[10px] ${statusMarkClassName(p.status)}`}>{statusMark(p.status)}</span>
                          </div>
                          <div className="mt-0.5 text-[10px] text-white/60 truncate">{cand?.club ?? ''}</div>
                          {statLine ? <div className="mt-0.5 text-[10px] text-white/55 truncate">{statLine}</div> : null}
                        </>
                      );
                    })()}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

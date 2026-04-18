'use client';

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { SquadPlayerPrediction, SquadPosition, SquadStatus } from '@/types/worldcup';
import type { PickStatus } from '../wc2026PredictionUtils';

type Candidate = {
  id: string;
  name: string;
  position: SquadPosition;
  club?: string;
  age?: number;
  stats?: {
    appearances?: number;
    goals?: number;
    assists?: number;
  };
};

export function Wc2026CandidatesCard(props: {
  candidates: Candidate[];
  candidatesByPos: Record<SquadPosition, Candidate[]>;
  canEdit: boolean;
  players: SquadPlayerPrediction[];
  candidateStatusById: Record<string, PickStatus>;
  setCandidateStatusById: Dispatch<SetStateAction<Record<string, PickStatus>>>;
  upsertOrRemoveCandidate: (candidate: { id: string; name: string; position: SquadPosition }, pick: PickStatus) => void;
}) {
  const {
    candidates,
    candidatesByPos,
    canEdit,
    players,
    candidateStatusById,
    setCandidateStatusById,
    upsertOrRemoveCandidate,
  } = props;

  const [selectedPos, setSelectedPos] = useState<SquadPosition>('GK');
  const selectedCandidates = candidatesByPos[selectedPos] ?? [];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 overflow-hidden mb-4">
      <div className="p-4">
        <div className="mt-3 flex gap-2 overflow-x-auto -mx-1 px-1">
          {(['GK', 'DF', 'MF', 'FW'] as const).map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => setSelectedPos(pos)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs border transition-colors ${
                selectedPos === pos
                  ? 'bg-white/15 text-white border-white/20'
                  : 'bg-transparent text-white/70 border-white/10 hover:bg-white/10'
              }`}
            >
              {pos}
              <span className="ml-1 text-[10px] text-white/60">({candidatesByPos[pos].length})</span>
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {candidates.length === 0 ? (
            <div className="text-xs text-white/60">候補が未設定です</div>
          ) : selectedCandidates.length === 0 ? (
            <div className="text-xs text-white/60">候補が未設定です</div>
          ) : (
            selectedCandidates.map((c) => {
              const picked = players.find((p) => p.id === c.id) ?? null;
              const rowStatus: PickStatus = picked?.status ?? candidateStatusById[c.id] ?? 'none';
              const statsText = c.stats
                ? [
                    typeof c.stats.appearances === 'number' ? `出場${c.stats.appearances}` : null,
                    typeof c.stats.goals === 'number' ? `G${c.stats.goals}` : null,
                    typeof c.stats.assists === 'number' ? `A${c.stats.assists}` : null,
                  ]
                    .filter(Boolean)
                    .join(' / ')
                : '';

              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-100 truncate">
                      {c.name}
                      {typeof c.age === 'number' ? (
                        <span className="ml-1 text-[11px] font-semibold text-white/75">({c.age})</span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/60 truncate">
                      {c.position}
                      {c.club ? ` / ${c.club}` : ''}
                      {statsText ? ` / ${statsText}` : ''}
                    </div>
                  </div>

                  <select
                    value={rowStatus}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const next = e.target.value as PickStatus;
                      setCandidateStatusById((prev) => ({ ...prev, [c.id]: next }));
                      upsertOrRemoveCandidate(c, next);
                    }}
                    className="shrink-0 w-[80px] rounded-xl border border-white/10 bg-[#0b1533] px-1.5 py-2 text-[10px] text-white outline-none disabled:opacity-50"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="none">未選出</option>
                    <option value="S">当確◎</option>
                    <option value="A">有力○</option>
                    <option value="B">当落△</option>
                    <option value="!?">サプライズ★</option>
                  </select>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

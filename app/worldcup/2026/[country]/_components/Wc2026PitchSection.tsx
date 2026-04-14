'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { SquadPlayerPrediction, SquadStatus } from '@/types/worldcup';
import { FORMATION_3421_SLOTS, type FormationSlotKey } from '../wc2026PredictionUtils';

type PitchData = {
  assigned: Partial<Record<FormationSlotKey, SquadPlayerPrediction>>;
  bench: SquadPlayerPrediction[];
};

export function Wc2026PitchSection(props: {
  canEdit: boolean;
  pitchData: PitchData;
  pitchSelectedSlot: FormationSlotKey | null;
  setPitchSelectedSlot: Dispatch<SetStateAction<FormationSlotKey | null>>;
  setPitchOverrideBySlot: Dispatch<SetStateAction<Partial<Record<FormationSlotKey, string>>>>;

  statusMark: (status: SquadStatus) => string;
  statusMarkClassName: (status: SquadStatus) => string;
}) {
  const {
    canEdit,
    pitchData,
    pitchSelectedSlot,
    setPitchSelectedSlot,
    setPitchOverrideBySlot,
    statusMark,
    statusMarkClassName,
  } = props;

  return (
    <>
      <div className="mt-4">
        <div
          className="rounded-2xl border border-white/10 overflow-hidden bg-black/20"
        >
          <div
            className="relative w-full bg-gradient-to-b from-emerald-700/40 to-emerald-900/40 aspect-[4/3]"
          >
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(255,255,255,0.0) 0px, rgba(255,255,255,0.0) 22px, rgba(0,0,0,0.14) 22px, rgba(0,0,0,0.14) 44px)',
              }}
            />
            <div className="absolute inset-0">
              <div className="absolute left-[8%] right-[8%] top-[6%] bottom-[6%] border border-white/35 rounded-sm" />
              <div className="absolute left-[8%] right-[8%] top-1/2 -translate-y-1/2 border-t border-white/35" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[28%] aspect-square rounded-full border border-white/35" />
              <div className="absolute left-[28%] right-[28%] bottom-[6%] h-[18%] border border-white/35" />
              <div className="absolute left-[28%] right-[28%] top-[6%] h-[18%] border border-white/35" />
            </div>

            {FORMATION_3421_SLOTS.map((slot) => {
              const p = pitchData.assigned[slot.key];
              const selected = pitchSelectedSlot === slot.key;
              return (
                <div
                  key={slot.key}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${slot.leftPct}%`, top: `${slot.topPct}%` }}
                >
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      setPitchSelectedSlot((prev) => (prev === slot.key ? null : slot.key));
                    }}
                    className={`rounded-full text-white/90 whitespace-nowrap truncate border transition-colors ${
                      selected ? 'bg-white/20 border-white/30' : 'bg-black/55 border-white/10 hover:bg-black/65'
                    } ${!canEdit ? 'cursor-default' : ''} ${
                      'px-2 py-1 text-[11px] max-w-[30vw]'
                    }`}
                  >
                    {p ? (
                      <>
                        <span className={statusMarkClassName(p.status)}>{statusMark(p.status)}</span>
                        <span className="ml-1 font-semibold">{p.name}</span>
                      </>
                    ) : (
                      <span className="text-white/60">{slot.label}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t border-white/10">
            <div className="text-xs text-white/70">ベンチ</div>
            {canEdit ? (
              <div className="mt-1 text-[11px] text-white/60">枠をタップして選択 → ベンチの選手をタップで入れ替え</div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {pitchData.bench.length === 0 ? (
                <div className="text-xs text-white/50">なし</div>
              ) : (
                pitchData.bench.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!canEdit || !pitchSelectedSlot}
                    onClick={() => {
                      const slot = pitchSelectedSlot;
                      if (!slot) return;
                      setPitchOverrideBySlot((prev) => {
                        const next: Partial<Record<FormationSlotKey, string>> = { ...prev, [slot]: p.id };
                        for (const k of Object.keys(next) as FormationSlotKey[]) {
                          if (k !== slot && next[k] === p.id) delete next[k];
                        }
                        return next;
                      });
                    }}
                    className={`px-2 py-1 rounded-full border text-[11px] transition-colors ${
                      pitchSelectedSlot && canEdit
                        ? 'bg-white/5 border-white/10 text-white/85 hover:bg-white/10'
                        : 'bg-white/5 border-white/10 text-white/50'
                    }`}
                  >
                    <span className={statusMarkClassName(p.status)}>{statusMark(p.status)}</span>
                    <span className="ml-1">{p.name}</span>
                  </button>
                ))
              )}
            </div>

            {canEdit && pitchSelectedSlot ? (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPitchOverrideBySlot((prev) => {
                      const next = { ...prev };
                      delete next[pitchSelectedSlot];
                      return next;
                    });
                  }}
                  className="rounded-full px-3 py-1 text-xs border border-white/10 bg-transparent text-white/70 hover:bg-white/10 transition-colors"
                >
                  選択枠の上書きを解除
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPitchSelectedSlot(null);
                  }}
                  className="rounded-full px-3 py-1 text-xs border border-white/10 bg-transparent text-white/70 hover:bg-white/10 transition-colors"
                >
                  選択解除
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

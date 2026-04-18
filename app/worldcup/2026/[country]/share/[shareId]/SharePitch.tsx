import type { SquadPlayerPrediction, SquadStatus } from '@/types/worldcup';
import { FORMATION_3421_SLOTS } from '../../wc2026PredictionUtils';

export function SharePitch(props: {
  pitchAssigned: Partial<Record<string, SquadPlayerPrediction>>;
  statusMark: (status: SquadStatus) => string;
  statusMarkClassName: (status: SquadStatus) => string;
}) {
  const { pitchAssigned, statusMark, statusMarkClassName } = props;

  return (
    <div className="mt-4">
      <div className="px-1 pb-4">
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-b from-emerald-700/40 to-emerald-900/40 border border-white/10">
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
            const p = pitchAssigned[slot.key as any];
            if (!p) return null;
            return (
              <div
                key={slot.key}
                className="absolute"
                style={{ left: `${slot.leftPct}%`, top: `${slot.topPct}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="flex flex-col items-center">
                  <div className="px-2 py-1 rounded-full bg-black/55 border border-white/10 text-[10px] font-bold text-white max-w-[120px] truncate">
                    {p.name}
                    <span className={`ml-1 ${statusMarkClassName(p.status)}`}>{statusMark(p.status)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';

import type { SquadPlayerPrediction, SquadStatus } from '@/types/worldcup';
import { FORMATION_3421_SLOTS } from '../wc2026PredictionUtils';

export function Wc2026PitchOgpCapture(props: {
  countryNameJa: string;
  pitchData: { assigned: Partial<Record<string, SquadPlayerPrediction>> };
  statusMark: (status: SquadStatus) => string;
  statusMarkClassName: (status: SquadStatus) => string;
}) {
  const { countryNameJa, pitchData, statusMark, statusMarkClassName } = props;

  return (
    <div
      id="wc2026-pitch-ogp-capture"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        transform: 'translate(-2000px, -2000px)',
        width: 1200,
        height: 630,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden
    >
      <div
        className="rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-b from-[#0b1533]/90 to-[#070d1f]/90"
        style={{ width: 1200, height: 630 }}
      >
        <div className="px-4 pt-3 pb-2 flex items-center justify-between" style={{ height: 44 }}>
          <div className="text-[14px] font-semibold text-white/85 truncate">{countryNameJa}：W杯 2026 予想</div>
          <div className="text-[13px] text-white/60">3-4-2-1</div>
        </div>

        <div style={{ height: 586, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="relative bg-gradient-to-b from-emerald-700/40 to-emerald-900/40"
            style={{
              width: 1200,
              height: 586,
              transform: 'scale(0.9)',
              transformOrigin: 'center',
            }}
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
              const p = pitchData.assigned[slot.key as any];
              return (
                <div
                  key={slot.key}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${slot.leftPct}%`, top: `${slot.topPct}%` }}
                >
                  <div
                    className="rounded-full text-white/90 whitespace-nowrap truncate border bg-black/55 border-white/10 px-4 py-2 text-[16px]"
                    style={{ maxWidth: 520 }}
                  >
                    {p ? (
                      <>
                        <span className={statusMarkClassName(p.status)}>{statusMark(p.status)}</span>
                        <span className="ml-1 font-semibold">{p.name}</span>
                      </>
                    ) : (
                      <span className="text-white/60">{slot.label}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';

type SquadStatusKey = 'S' | 'A' | 'B' | '!?';

type RankedPlayer = {
  id: string;
  name: string;
  position?: string;
  age?: number;
  club?: string;
  count: number;
};

export function Wc2026RankingTabs(props: {
  title: string;
  rankingByStatus: Record<SquadStatusKey, RankedPlayer[]>;
}) {
  const { title, rankingByStatus } = props;
  const [active, setActive] = useState<SquadStatusKey>('S');
  const [expandedByStatus, setExpandedByStatus] = useState<Record<SquadStatusKey, boolean>>({
    S: false,
    A: false,
    B: false,
    '!?': false,
  });

  const tabs = useMemo(
    () =>
      [
        { key: 'S' as const, label: '当確◎' },
        { key: 'A' as const, label: '有力○' },
        { key: 'B' as const, label: '当落△' },
        { key: '!?' as const, label: 'サプライズ★' },
      ],
    []
  );

  const list = rankingByStatus[active] ?? [];
  const top = list.slice(0, 5);
  const rest = list.slice(5);
  const expanded = expandedByStatus[active] ?? false;

  return (
    <div className="mt-6 px-1">
      <div className="text-sm font-bold text-white">{title}</div>
      <div className="mt-1 text-[11px] text-white/60">ユーザーの予想（当確/有力/当落/サプライズ）を集計したランキング</div>

      <div className="mt-3 flex gap-2 overflow-x-auto -mx-1 px-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs border transition-colors ${
              active === t.key
                ? 'bg-white/15 text-white border-white/20'
                : 'bg-transparent text-white/70 border-white/10 hover:bg-white/10'
            }`}
          >
            {t.label}
            <span className="ml-1 text-[10px] text-white/60">({rankingByStatus[t.key]?.length ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-bold text-yellow-200/90">{tabs.find((t) => t.key === active)?.label}</div>
          <div className="text-[11px] text-white/60">票数</div>
        </div>

        <div className="mt-2">
          {list.length === 0 ? (
            <div className="text-xs text-white/60">集計データがありません</div>
          ) : (
            <div className="divide-y divide-white/10">
              {top.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-white truncate">
                      <span className="text-white/60">{idx + 1}.</span> {p.name}
                      {p.position ? <span className="ml-2 text-[11px] font-medium text-white/50">{p.position}</span> : null}
                      {typeof p.age === 'number' ? (
                        <span className="ml-2 text-[11px] font-medium text-white/50">({p.age})</span>
                      ) : null}
                      {p.club ? <span className="ml-2 text-[11px] font-medium text-white/50">/ {p.club}</span> : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-[13px] font-extrabold text-white tabular-nums">{p.count}</div>
                </div>
              ))}

              {rest.length > 0 ? (
                <div className="py-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedByStatus((prev) => ({
                        ...prev,
                        [active]: !expanded,
                      }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[12px] font-semibold text-white/80 hover:bg-black/30"
                  >
                    {expanded ? '閉じる' : `6位以降を表示（${rest.length}人）`}
                  </button>
                </div>
              ) : null}

              {expanded
                ? rest.map((p, i) => {
                    const idx = i + 6;
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-white truncate">
                            <span className="text-white/60">{idx}.</span> {p.name}
                            {p.position ? <span className="ml-2 text-[11px] font-medium text-white/50">{p.position}</span> : null}
                            {typeof p.age === 'number' ? (
                              <span className="ml-2 text-[11px] font-medium text-white/50">({p.age})</span>
                            ) : null}
                            {p.club ? <span className="ml-2 text-[11px] font-medium text-white/50">/ {p.club}</span> : null}
                          </div>
                        </div>
                        <div className="shrink-0 text-[13px] font-extrabold text-white tabular-nums">{p.count}</div>
                      </div>
                    );
                  })
                : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

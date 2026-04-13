import type {
  LegacySquadStatus,
  SquadPlayerPrediction,
  SquadPosition,
  SquadStatus,
} from '@/types/worldcup';

export function randomId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function groupByPosition(players: SquadPlayerPrediction[]) {
  const out: Record<SquadPosition, SquadPlayerPrediction[]> = { GK: [], DF: [], MF: [], FW: [] };
  for (const p of players) out[p.position].push(p);
  return out;
}

export type PickStatus = SquadStatus | 'none';

export function toNewStatus(status: SquadStatus | LegacySquadStatus): SquadStatus {
  if (status === 'S' || status === 'A' || status === 'B' || status === '!?') return status;
  if (status === 'selected') return 'S';
  if (status === 'bubble') return 'B';
  return '!?';
}

export function statusLabel(status: SquadStatus) {
  if (status === 'S') return '当確◎';
  if (status === 'A') return '有力○';
  if (status === 'B') return '当落△';
  return 'サプライズ★';
}

export function statusMark(status: SquadStatus) {
  if (status === 'S') return '◎';
  if (status === 'A') return '○';
  if (status === 'B') return '△';
  return '★';
}

export function statusMarkClassName(status: SquadStatus) {
  if (status === 'S' || status === '!?') return 'text-yellow-200/90';
  return 'text-white/60';
}

export function statusRank(status: SquadStatus) {
  return status === 'S' ? 0 : status === 'A' ? 1 : status === 'B' ? 2 : 3;
}

export function pickTop(players: SquadPlayerPrediction[], count: number) {
  return [...players]
    .sort((a, b) => {
      const r = statusRank(a.status) - statusRank(b.status);
      if (r !== 0) return r;
      return a.name.localeCompare(b.name, 'ja');
    })
    .slice(0, count);
}

export type FormationSlotKey =
  | 'ST'
  | 'SS_L'
  | 'SS_R'
  | 'LM'
  | 'LCM'
  | 'RCM'
  | 'RM'
  | 'LCB'
  | 'CB'
  | 'RCB'
  | 'GK';

export type SlotPos = { key: FormationSlotKey; leftPct: number; topPct: number; label: string };

export const FORMATION_3421_SLOTS: SlotPos[] = [
  { key: 'ST', leftPct: 50, topPct: 10, label: 'TOP' },
  { key: 'SS_L', leftPct: 35, topPct: 22, label: 'SH' },
  { key: 'SS_R', leftPct: 65, topPct: 22, label: 'SH' },
  { key: 'LM', leftPct: 16, topPct: 40, label: 'MF' },
  { key: 'LCM', leftPct: 38, topPct: 42, label: 'MF' },
  { key: 'RCM', leftPct: 62, topPct: 42, label: 'MF' },
  { key: 'RM', leftPct: 84, topPct: 40, label: 'MF' },
  { key: 'LCB', leftPct: 28, topPct: 62, label: 'CB' },
  { key: 'CB', leftPct: 50, topPct: 66, label: 'CB' },
  { key: 'RCB', leftPct: 72, topPct: 62, label: 'CB' },
  { key: 'GK', leftPct: 50, topPct: 84, label: 'GK' },
];

export function sanitizePlayersForFirestore(players: SquadPlayerPrediction[]): SquadPlayerPrediction[] {
  return players.map((p) => {
    const out: SquadPlayerPrediction = {
      id: p.id,
      name: p.name,
      position: p.position,
      status: p.status,
    };
    if (typeof p.note === 'string' && p.note.trim()) out.note = p.note;
    return out;
  });
}

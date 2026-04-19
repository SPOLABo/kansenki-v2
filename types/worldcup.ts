export type SquadPosition = 'GK' | 'DF' | 'MF' | 'FW';

export type SquadStatus = 'S' | 'A' | 'B' | '!?';

export type LegacySquadStatus = 'selected' | 'bubble' | 'out';

export type SquadPlayerPrediction = {
  id: string;
  name: string;
  position: SquadPosition;
  status: SquadStatus;
  note?: string;
};

export type SquadPredictionDoc = {
  schemaVersion: 1;
  countrySlug: string;
  tournamentId: 'wc2026';
  players: SquadPlayerPrediction[];
  formation?: string;
  pitchOverrideBySlot?: Record<string, string>;
  comment?: string;
  updatedAt?: any;
};

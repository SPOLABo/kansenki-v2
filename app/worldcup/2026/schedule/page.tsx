'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';

type ScheduleItem = {
  id: string;
  kickoffAt: Timestamp;
  stage: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  note: string;
  homeScore?: number;
  awayScore?: number;
};

type SeedScheduleItem = {
  id: string;
  kickoffAtLocalIso: string;
  stage: string;
  homeTeam: string;
  awayTeam: string;
  venue?: string;
  note?: string;
  homeScore?: number;
  awayScore?: number;
};

const SEED_SCHEDULE: SeedScheduleItem[] = [
  {
    id: 'A_20260612_0400_MEX_RSA',
    kickoffAtLocalIso: '2026-06-12T04:00:00',
    stage: 'グループA',
    homeTeam: 'MEX',
    awayTeam: 'RSA',
    venue: 'メキシコシティ/メキシコシティスタジアム',
  },
  {
    id: 'A_20260612_1100_KOR_DENMKDCZEIRL',
    kickoffAtLocalIso: '2026-06-12T11:00:00',
    stage: 'グループA',
    homeTeam: 'KOR',
    awayTeam: 'CZE',
    venue: 'グアダラハラ/グアダラハラスタジアム',
  },
  {
    id: 'A_20260619_0100_DENMKDCZEIRL_RSA',
    kickoffAtLocalIso: '2026-06-19T01:00:00',
    stage: 'グループA',
    homeTeam: 'CZE',
    awayTeam: 'RSA',
  },
  {
    id: 'A_20260619_1000_MEX_KOR',
    kickoffAtLocalIso: '2026-06-19T10:00:00',
    stage: 'グループA',
    homeTeam: 'MEX',
    awayTeam: 'KOR',
  },
  {
    id: 'A_20260625_1000_RSA_KOR',
    kickoffAtLocalIso: '2026-06-25T10:00:00',
    stage: 'グループA',
    homeTeam: 'RSA',
    awayTeam: 'KOR',
  },
  {
    id: 'A_20260625_1000_DENMKDCZEIRL_MEX',
    kickoffAtLocalIso: '2026-06-25T10:00:00',
    stage: 'グループA',
    homeTeam: 'CZE',
    awayTeam: 'MEX',
  },

  {
    id: 'B_20260613_0400_CAN_ITANIRWALBIH',
    kickoffAtLocalIso: '2026-06-13T04:00:00',
    stage: 'グループB',
    homeTeam: 'CAN',
    awayTeam: 'BIH',
  },
  {
    id: 'B_20260614_0400_QAT_SUI',
    kickoffAtLocalIso: '2026-06-14T04:00:00',
    stage: 'グループB',
    homeTeam: 'QAT',
    awayTeam: 'SUI',
  },
  {
    id: 'B_20260619_0700_CAN_QAT',
    kickoffAtLocalIso: '2026-06-19T07:00:00',
    stage: 'グループB',
    homeTeam: 'CAN',
    awayTeam: 'QAT',
  },
  {
    id: 'B_20260625_0400_SUI_CAN',
    kickoffAtLocalIso: '2026-06-25T04:00:00',
    stage: 'グループB',
    homeTeam: 'SUI',
    awayTeam: 'CAN',
  },
  {
    id: 'B_20260625_0400_ITANIRWALBIH_QAT',
    kickoffAtLocalIso: '2026-06-25T04:00:00',
    stage: 'グループB',
    homeTeam: 'BIH',
    awayTeam: 'QAT',
  },

  {
    id: 'C_20260614_0700_BRA_MAR',
    kickoffAtLocalIso: '2026-06-14T07:00:00',
    stage: 'グループC',
    homeTeam: 'BRA',
    awayTeam: 'MAR',
  },
  {
    id: 'C_20260614_1000_HAI_SCO',
    kickoffAtLocalIso: '2026-06-14T10:00:00',
    stage: 'グループC',
    homeTeam: 'HAI',
    awayTeam: 'SCO',
  },
  {
    id: 'C_20260620_0700_SCO_MAR',
    kickoffAtLocalIso: '2026-06-20T07:00:00',
    stage: 'グループC',
    homeTeam: 'SCO',
    awayTeam: 'MAR',
  },
  {
    id: 'C_20260620_1000_BRA_HAI',
    kickoffAtLocalIso: '2026-06-20T10:00:00',
    stage: 'グループC',
    homeTeam: 'BRA',
    awayTeam: 'HAI',
  },
  {
    id: 'C_20260625_0700_SCO_BRA',
    kickoffAtLocalIso: '2026-06-25T07:00:00',
    stage: 'グループC',
    homeTeam: 'SCO',
    awayTeam: 'BRA',
  },
  {
    id: 'C_20260625_0700_MAR_HAI',
    kickoffAtLocalIso: '2026-06-25T07:00:00',
    stage: 'グループC',
    homeTeam: 'MAR',
    awayTeam: 'HAI',
  },

  {
    id: 'D_20260613_1000_USA_PAR',
    kickoffAtLocalIso: '2026-06-13T10:00:00',
    stage: 'グループD',
    homeTeam: 'USA',
    awayTeam: 'PAR',
  },
  {
    id: 'D_20260614_1300_AUS_TURROUSVKKOS',
    kickoffAtLocalIso: '2026-06-14T13:00:00',
    stage: 'グループD',
    homeTeam: 'AUS',
    awayTeam: 'TUR',
  },
  {
    id: 'D_20260620_0400_USA_AUS',
    kickoffAtLocalIso: '2026-06-20T04:00:00',
    stage: 'グループD',
    homeTeam: 'USA',
    awayTeam: 'AUS',
  },
  {
    id: 'D_20260620_1300_TURROUSVKKOS_PAR',
    kickoffAtLocalIso: '2026-06-20T13:00:00',
    stage: 'グループD',
    homeTeam: 'TUR',
    awayTeam: 'PAR',
  },
  {
    id: 'D_20260626_1100_PAR_AUS',
    kickoffAtLocalIso: '2026-06-26T11:00:00',
    stage: 'グループD',
    homeTeam: 'PAR',
    awayTeam: 'AUS',
  },
  {
    id: 'D_20260626_1100_TURROUSVKKOS_USA',
    kickoffAtLocalIso: '2026-06-26T11:00:00',
    stage: 'グループD',
    homeTeam: 'TUR',
    awayTeam: 'USA',
  },

  {
    id: 'E_20260615_0200_GER_CUW',
    kickoffAtLocalIso: '2026-06-15T02:00:00',
    stage: 'グループE',
    homeTeam: 'GER',
    awayTeam: 'CUW',
  },
  {
    id: 'E_20260615_0800_CIV_ECU',
    kickoffAtLocalIso: '2026-06-15T08:00:00',
    stage: 'グループE',
    homeTeam: 'CIV',
    awayTeam: 'ECU',
  },
  {
    id: 'E_20260621_0500_GER_CIV',
    kickoffAtLocalIso: '2026-06-21T05:00:00',
    stage: 'グループE',
    homeTeam: 'GER',
    awayTeam: 'CIV',
  },
  {
    id: 'E_20260621_0900_ECU_CUW',
    kickoffAtLocalIso: '2026-06-21T09:00:00',
    stage: 'グループE',
    homeTeam: 'ECU',
    awayTeam: 'CUW',
  },
  {
    id: 'E_20260626_0500_CUW_CIV',
    kickoffAtLocalIso: '2026-06-26T05:00:00',
    stage: 'グループE',
    homeTeam: 'CUW',
    awayTeam: 'CIV',
  },
  {
    id: 'E_20260626_0500_ECU_GER',
    kickoffAtLocalIso: '2026-06-26T05:00:00',
    stage: 'グループE',
    homeTeam: 'ECU',
    awayTeam: 'GER',
  },

  {
    id: 'F_20260615_0500_NED_JPN',
    kickoffAtLocalIso: '2026-06-15T05:00:00',
    stage: 'グループF',
    homeTeam: 'NED',
    awayTeam: 'JPN',
  },
  {
    id: 'F_20260615_1100_UKRSWEPOLALB_TUN',
    kickoffAtLocalIso: '2026-06-15T11:00:00',
    stage: 'グループF',
    homeTeam: 'SWE',
    awayTeam: 'TUN',
  },
  {
    id: 'F_20260620_0200_NED_UKRSWEPOLALB',
    kickoffAtLocalIso: '2026-06-20T02:00:00',
    stage: 'グループF',
    homeTeam: 'NED',
    awayTeam: 'SWE',
  },
  {
    id: 'F_20260621_1300_TUN_JPN',
    kickoffAtLocalIso: '2026-06-21T13:00:00',
    stage: 'グループF',
    homeTeam: 'TUN',
    awayTeam: 'JPN',
  },
  {
    id: 'F_20260626_0800_TUN_NED',
    kickoffAtLocalIso: '2026-06-26T08:00:00',
    stage: 'グループF',
    homeTeam: 'TUN',
    awayTeam: 'NED',
  },
  {
    id: 'F_20260626_0800_JPN_UKRSWEPOLALB',
    kickoffAtLocalIso: '2026-06-26T08:00:00',
    stage: 'グループF',
    homeTeam: 'JPN',
    awayTeam: 'SWE',
  },

  {
    id: 'G_20260616_0400_BEL_EGY',
    kickoffAtLocalIso: '2026-06-16T04:00:00',
    stage: 'グループG',
    homeTeam: 'BEL',
    awayTeam: 'EGY',
  },
  {
    id: 'G_20260616_1000_IRN_NZL',
    kickoffAtLocalIso: '2026-06-16T10:00:00',
    stage: 'グループG',
    homeTeam: 'IRN',
    awayTeam: 'NZL',
  },
  {
    id: 'G_20260622_0400_BEL_IRN',
    kickoffAtLocalIso: '2026-06-22T04:00:00',
    stage: 'グループG',
    homeTeam: 'BEL',
    awayTeam: 'IRN',
  },
  {
    id: 'G_20260622_1000_NZL_EGY',
    kickoffAtLocalIso: '2026-06-22T10:00:00',
    stage: 'グループG',
    homeTeam: 'NZL',
    awayTeam: 'EGY',
  },
  {
    id: 'G_20260627_1200_NZL_BEL',
    kickoffAtLocalIso: '2026-06-27T12:00:00',
    stage: 'グループG',
    homeTeam: 'NZL',
    awayTeam: 'BEL',
  },
  {
    id: 'G_20260627_1200_EGY_IRN',
    kickoffAtLocalIso: '2026-06-27T12:00:00',
    stage: 'グループG',
    homeTeam: 'EGY',
    awayTeam: 'IRN',
  },

  {
    id: 'H_20260616_0100_ESP_CPV',
    kickoffAtLocalIso: '2026-06-16T01:00:00',
    stage: 'グループH',
    homeTeam: 'ESP',
    awayTeam: 'CPV',
  },
  {
    id: 'H_20260616_0700_KSA_URU',
    kickoffAtLocalIso: '2026-06-16T07:00:00',
    stage: 'グループH',
    homeTeam: 'KSA',
    awayTeam: 'URU',
  },
  {
    id: 'H_20260622_0100_ESP_KSA',
    kickoffAtLocalIso: '2026-06-22T01:00:00',
    stage: 'グループH',
    homeTeam: 'ESP',
    awayTeam: 'KSA',
  },
  {
    id: 'H_20260622_0900_URU_CPV',
    kickoffAtLocalIso: '2026-06-22T09:00:00',
    stage: 'グループH',
    homeTeam: 'URU',
    awayTeam: 'CPV',
  },
  {
    id: 'H_20260627_0900_CPV_KSA',
    kickoffAtLocalIso: '2026-06-27T09:00:00',
    stage: 'グループH',
    homeTeam: 'CPV',
    awayTeam: 'KSA',
  },
  {
    id: 'H_20260627_0900_URU_ESP',
    kickoffAtLocalIso: '2026-06-27T09:00:00',
    stage: 'グループH',
    homeTeam: 'URU',
    awayTeam: 'ESP',
  },

  {
    id: 'I_20260617_0400_FRA_SEN',
    kickoffAtLocalIso: '2026-06-17T04:00:00',
    stage: 'グループI',
    homeTeam: 'FRA',
    awayTeam: 'SEN',
  },
  {
    id: 'I_20260617_0700_BOLSURIRQ_NOR',
    kickoffAtLocalIso: '2026-06-17T07:00:00',
    stage: 'グループI',
    homeTeam: 'IRQ',
    awayTeam: 'NOR',
  },
  {
    id: 'I_20260623_0000_FRA_BOLSURIRQ',
    kickoffAtLocalIso: '2026-06-23T00:00:00',
    stage: 'グループI',
    homeTeam: 'FRA',
    awayTeam: 'IRQ',
  },
  {
    id: 'I_20260623_0900_NOR_SEN',
    kickoffAtLocalIso: '2026-06-23T09:00:00',
    stage: 'グループI',
    homeTeam: 'NOR',
    awayTeam: 'SEN',
  },
  {
    id: 'I_20260627_0400_SEN_BOLSURIRQ',
    kickoffAtLocalIso: '2026-06-27T04:00:00',
    stage: 'グループI',
    homeTeam: 'SEN',
    awayTeam: 'IRQ',
  },
  {
    id: 'I_20260627_0400_NOR_FRA',
    kickoffAtLocalIso: '2026-06-27T04:00:00',
    stage: 'グループI',
    homeTeam: 'NOR',
    awayTeam: 'FRA',
  },

  {
    id: 'J_20260617_1000_ARG_ALG',
    kickoffAtLocalIso: '2026-06-17T10:00:00',
    stage: 'グループJ',
    homeTeam: 'ARG',
    awayTeam: 'ALG',
  },
  {
    id: 'J_20260617_1300_AUT_JOR',
    kickoffAtLocalIso: '2026-06-17T13:00:00',
    stage: 'グループJ',
    homeTeam: 'AUT',
    awayTeam: 'JOR',
  },
  {
    id: 'J_20260623_0200_ARG_AUT',
    kickoffAtLocalIso: '2026-06-23T02:00:00',
    stage: 'グループJ',
    homeTeam: 'ARG',
    awayTeam: 'AUT',
  },
  {
    id: 'J_20260623_1200_JOR_ALG',
    kickoffAtLocalIso: '2026-06-23T12:00:00',
    stage: 'グループJ',
    homeTeam: 'JOR',
    awayTeam: 'ALG',
  },
  {
    id: 'J_20260628_1100_ALG_AUT',
    kickoffAtLocalIso: '2026-06-28T11:00:00',
    stage: 'グループJ',
    homeTeam: 'ALG',
    awayTeam: 'AUT',
  },
  {
    id: 'J_20260628_1100_JOR_ARG',
    kickoffAtLocalIso: '2026-06-28T11:00:00',
    stage: 'グループJ',
    homeTeam: 'JOR',
    awayTeam: 'ARG',
  },

  {
    id: 'K_20260618_0200_POR_NCLJAMCOD',
    kickoffAtLocalIso: '2026-06-18T02:00:00',
    stage: 'グループK',
    homeTeam: 'POR',
    awayTeam: 'NCL/JAM/COD',
  },
  {
    id: 'K_20260618_1100_UZB_COL',
    kickoffAtLocalIso: '2026-06-18T11:00:00',
    stage: 'グループK',
    homeTeam: 'UZB',
    awayTeam: 'COL',
  },
  {
    id: 'K_20260624_0200_POR_UZB',
    kickoffAtLocalIso: '2026-06-24T02:00:00',
    stage: 'グループK',
    homeTeam: 'POR',
    awayTeam: 'UZB',
  },
  {
    id: 'K_20260624_1100_COL_NCLJAMCOD',
    kickoffAtLocalIso: '2026-06-24T11:00:00',
    stage: 'グループK',
    homeTeam: 'COL',
    awayTeam: 'NCL/JAM/COD',
  },
  {
    id: 'K_20260628_0830_COL_POR',
    kickoffAtLocalIso: '2026-06-28T08:30:00',
    stage: 'グループK',
    homeTeam: 'COL',
    awayTeam: 'POR',
  },
  {
    id: 'K_20260628_0830_NCLJAMCOD_UZB',
    kickoffAtLocalIso: '2026-06-28T08:30:00',
    stage: 'グループK',
    homeTeam: 'NCL/JAM/COD',
    awayTeam: 'UZB',
  },

  {
    id: 'L_20260618_0500_ENG_CRO',
    kickoffAtLocalIso: '2026-06-18T05:00:00',
    stage: 'グループL',
    homeTeam: 'ENG',
    awayTeam: 'CRO',
  },
  {
    id: 'L_20260618_0800_GHA_PAN',
    kickoffAtLocalIso: '2026-06-18T08:00:00',
    stage: 'グループL',
    homeTeam: 'GHA',
    awayTeam: 'PAN',
  },
  {
    id: 'L_20260624_0500_ENG_GHA',
    kickoffAtLocalIso: '2026-06-24T05:00:00',
    stage: 'グループL',
    homeTeam: 'ENG',
    awayTeam: 'GHA',
  },
  {
    id: 'L_20260624_0800_PAN_CRO',
    kickoffAtLocalIso: '2026-06-24T08:00:00',
    stage: 'グループL',
    homeTeam: 'PAN',
    awayTeam: 'CRO',
  },
  {
    id: 'L_20260628_0600_CRO_GHA',
    kickoffAtLocalIso: '2026-06-28T06:00:00',
    stage: 'グループL',
    homeTeam: 'CRO',
    awayTeam: 'GHA',
  },
  {
    id: 'L_20260628_0600_PAN_ENG',
    kickoffAtLocalIso: '2026-06-28T06:00:00',
    stage: 'グループL',
    homeTeam: 'PAN',
    awayTeam: 'ENG',
  },
];

const FLAG_CODE_BY_TEAM_NAME: Record<string, string> = {
  日本: 'JPN',
  韓国: 'KOR',
  メキシコ: 'MEX',
  南アフリカ: 'RSA',
  アメリカ: 'USA',
  米国: 'USA',
  ブラジル: 'BRA',
  アルゼンチン: 'ARG',
  フランス: 'FRA',
  ドイツ: 'GER',
  スペイン: 'ESP',
  イングランド: 'ENG',
  ポルトガル: 'POR',
  オランダ: 'NED',
  ウルグアイ: 'URU',
  コロンビア: 'COL',
  エクアドル: 'ECU',
  モロッコ: 'MAR',
  セネガル: 'SEN',
  チュニジア: 'TUN',
  ガーナ: 'GHA',
  コートジボワール: 'CIV',
  サウジアラビア: 'KSA',
  カタール: 'QAT',
  イラン: 'IRN',
  オーストラリア: 'AUS',
  カナダ: 'CAN',
  パナマ: 'PAN',
  パラグアイ: 'PAR',
  スイス: 'SUI',
  スウェーデン: 'SWE',
  ノルウェー: 'NOR',
  オーストリア: 'AUT',
  チェコ: 'CZE',
  クロアチア: 'CRO',
  ベルギー: 'BEL',
};

const FLAG_FILE_CODE_ALIAS: Record<string, string> = {
  TUR: 'TRU',
  IRQ: 'IRA',
};

function getFlagSrc(team: string) {
  const raw = (team ?? '').trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) {
    const fileCode = FLAG_FILE_CODE_ALIAS[upper] ?? upper;
    return `/国旗更新/${fileCode}.png`;
  }
  const code = FLAG_CODE_BY_TEAM_NAME[raw];
  if (!code) return null;
  const fileCode = FLAG_FILE_CODE_ALIAS[code] ?? code;
  return `/国旗更新/${fileCode}.png`;
}

function formatKickoffDate(ts: Timestamp) {
  const d = ts.toDate();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function formatKickoff(ts: Timestamp) {
  const d = ts.toDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function normalizeStage(stage: string) {
  const s = (stage ?? '').trim();
  if (!s) return 'その他';
  if (s.startsWith('グループ')) return s;
  if (/^[A-L]$/.test(s)) return `グループ${s}`;
  return s;
}

function stageSortKey(stage: string) {
  const s = normalizeStage(stage);
  const m = s.match(/^グループ([A-L])$/);
  if (!m) return 999;
  return m[1].charCodeAt(0) - 'A'.charCodeAt(0);
}

type TeamRow = {
  team: string;
  p: number;
  gf: number;
  ga: number;
  pts: number;
  form: Array<'W' | 'D' | 'L'>;
};

function resultMark(a: number, b: number): 'W' | 'D' | 'L' {
  if (a > b) return 'W';
  if (a < b) return 'L';
  return 'D';
}

function formBadgeClassName(x: 'W' | 'D' | 'L') {
  if (x === 'W') return 'bg-green-600 text-white';
  if (x === 'D') return 'bg-slate-400 text-white';
  return 'bg-red-600 text-white';
}

function teamLabel(team: string) {
  const raw = (team ?? '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  return raw;
}

const DEFAULT_STAGES = Array.from({ length: 12 }, (_, i) => `グループ${String.fromCharCode('A'.charCodeAt(0) + i)}`);

export default function Wc2026SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [brokenFlagSrcs, setBrokenFlagSrcs] = useState<Record<string, boolean>>({});
  const [openMatchesByStage, setOpenMatchesByStage] = useState<Record<string, boolean>>({});

  const seedItems = useMemo<ScheduleItem[]>(() => {
    return SEED_SCHEDULE.map((x) => ({
      id: x.id,
      kickoffAt: Timestamp.fromDate(new Date(x.kickoffAtLocalIso)),
      stage: x.stage,
      homeTeam: x.homeTeam,
      awayTeam: x.awayTeam,
      venue: x.venue ?? '',
      note: x.note ?? '',
      homeScore: x.homeScore,
      awayScore: x.awayScore,
    }));
  }, []);

  const effectiveItems = useMemo(() => {
    return items.length > 0 ? items : seedItems;
  }, [items, seedItems]);

  const isUsingSeed = items.length === 0 && seedItems.length > 0;

  useEffect(() => {
    const q = query(collection(db, 'wc2026Schedule'), orderBy('kickoffAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: ScheduleItem[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<ScheduleItem, 'id'>) }))
          .filter((x) => Boolean(x.kickoffAt));
        setItems(next);
      },
      (e) => {
        console.error(e);
        setError('日程の読み込みに失敗しました');
      },
    );
    return () => unsub();
  }, []);

  const itemsByStage = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const it of effectiveItems) {
      const key = normalizeStage(it.stage);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }

    if (map.size === 0) {
      for (const stage of DEFAULT_STAGES) {
        map.set(stage, []);
      }
    }

    const out = Array.from(map.entries())
      .map(([stage, xs]) => ({ stage, items: xs }))
      .sort((a, b) => stageSortKey(a.stage) - stageSortKey(b.stage));
    return out;
  }, [effectiveItems]);

  const tableByStage = useMemo(() => {
    const out: Record<string, TeamRow[]> = {};

    for (const block of itemsByStage) {
      const acc = new Map<string, TeamRow>();
      const completedMatches = block.items
        .filter(
          (m) =>
            typeof m.homeScore === 'number' &&
            typeof m.awayScore === 'number' &&
            Number.isFinite(m.homeScore) &&
            Number.isFinite(m.awayScore),
        )
        .sort((a, b) => a.kickoffAt.toMillis() - b.kickoffAt.toMillis());

      const ensure = (team: string) => {
        const key = teamLabel(team);
        if (!acc.has(key)) {
          acc.set(key, { team, p: 0, gf: 0, ga: 0, pts: 0, form: [] });
        }
        return acc.get(key)!;
      };

      for (const m of completedMatches) {
        const h = ensure(m.homeTeam);
        const a = ensure(m.awayTeam);
        const hs = m.homeScore as number;
        const as = m.awayScore as number;

        h.p += 1;
        a.p += 1;
        h.gf += hs;
        h.ga += as;
        a.gf += as;
        a.ga += hs;

        if (hs > as) {
          h.pts += 3;
        } else if (hs < as) {
          a.pts += 3;
        } else {
          h.pts += 1;
          a.pts += 1;
        }

        h.form.push(resultMark(hs, as));
        a.form.push(resultMark(as, hs));
      }

      for (const m of block.items) {
        ensure(m.homeTeam);
        ensure(m.awayTeam);
      }

      const rows = Array.from(acc.values()).map((r) => ({ ...r, form: r.form.slice(-3) }));
      rows.sort((x, y) => {
        if (y.pts !== x.pts) return y.pts - x.pts;
        const ygd = y.gf - y.ga;
        const xgd = x.gf - x.ga;
        if (ygd !== xgd) return ygd - xgd;
        return y.gf - x.gf;
      });
      out[block.stage] = rows;
    }

    return out;
  }, [itemsByStage]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-indigo-950">
      <div className="px-3 pt-4 pb-24">
        <div className="px-1 pb-3">
          <h1 className="text-lg font-bold text-white">日程</h1>
        </div>

        <div className="mt-4 px-1">
          <Link href="/worldcup/2026" className="text-sm text-white/80 underline">
            戻る
          </Link>
        </div>

        {error && <div className="mt-4 px-1 text-sm text-red-300">{error}</div>}

        {!isUsingSeed && items.length === 0 && (
          <div className="mt-4 px-1 text-sm text-white/70">データがありません</div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {itemsByStage.map((block) => {
            const stage = block.stage;
            const isOpen = openMatchesByStage[stage] ?? true;
            const rows = tableByStage[stage] ?? [];

            return (
              <div key={stage} className="rounded-2xl bg-white shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-2 text-sm font-bold text-slate-900">{stage}</div>

                <div className="px-4 pb-3">
                  <div className="grid grid-cols-[22px_1fr_28px_30px_48px_34px_60px] items-center gap-2 text-[10px] text-slate-500">
                    <div>順</div>
                    <div>チーム</div>
                    <div className="text-right">P</div>
                    <div className="text-right">GD</div>
                    <div className="text-right">+/-</div>
                    <div className="text-right">Pts</div>
                    <div className="text-right">form</div>
                  </div>
                  <div className="mt-1 divide-y divide-slate-200">
                    {rows.map((r, idx) => {
                      const gd = r.gf - r.ga;
                      const src = getFlagSrc(r.team);
                      const broken = src ? brokenFlagSrcs[src] : false;
                      return (
                        <div
                          key={teamLabel(r.team)}
                          className="grid grid-cols-[22px_1fr_28px_30px_48px_34px_60px] items-center gap-2 py-2 text-xs"
                        >
                          <div className="text-slate-700">{idx + 1}</div>
                          <div className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
                            {src && !broken ? (
                              <img
                                src={src}
                                alt=""
                                className="h-4 w-4 shrink-0 rounded-sm object-cover"
                                onError={() => setBrokenFlagSrcs((prev) => ({ ...prev, [src]: true }))}
                              />
                            ) : (
                              <span className="inline-flex h-4 w-4 shrink-0 rounded-sm bg-slate-200" />
                            )}
                            <span className="truncate">{teamLabel(r.team)}</span>
                          </div>
                          <div className="text-right text-slate-700">{r.p}</div>
                          <div className="text-right text-slate-700">{gd}</div>
                          <div className="text-right text-slate-700">
                            {r.gf}/{r.ga}
                          </div>
                          <div className="text-right font-bold text-slate-900">{r.pts}</div>
                          <div className="flex justify-end gap-1">
                            {r.form.map((f, i) => (
                              <span
                                key={`${teamLabel(r.team)}_${i}`}
                                className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${formBadgeClassName(
                                  f,
                                )}`}
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {rows.length === 0 && (
                      <div className="py-3 text-xs text-slate-400">-</div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setOpenMatchesByStage((prev) => ({ ...prev, [stage]: !(prev[stage] ?? true) }))}
                  className="w-full border-t border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900"
                >
                  {isOpen ? '▼' : '▶'} 対戦カード（タップで表示）
                </button>

                {isOpen && (
                  <div className="px-4 pb-4">
                    <div className="space-y-2">
                      {block.items.map((m) => {
                        const hSrc = getFlagSrc(m.homeTeam);
                        const aSrc = getFlagSrc(m.awayTeam);
                        const hBroken = hSrc ? brokenFlagSrcs[hSrc] : false;
                        const aBroken = aSrc ? brokenFlagSrcs[aSrc] : false;
                        const hasScore =
                          typeof m.homeScore === 'number' &&
                          typeof m.awayScore === 'number' &&
                          Number.isFinite(m.homeScore) &&
                          Number.isFinite(m.awayScore);

                        return (
                          <div key={m.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-[76px] text-[10px] text-slate-500">
                                  <div>{formatKickoffDate(m.kickoffAt)}</div>
                                  <div>{formatKickoff(m.kickoffAt)}</div>
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                    {hSrc && !hBroken ? (
                                      <img
                                        src={hSrc}
                                        alt=""
                                        className="h-4 w-4 shrink-0 rounded-sm object-cover"
                                        onError={() => setBrokenFlagSrcs((prev) => ({ ...prev, [hSrc]: true }))}
                                      />
                                    ) : (
                                      <span className="inline-flex h-4 w-4 shrink-0 rounded-sm bg-slate-200" />
                                    )}
                                    <span className="truncate">{m.homeTeam}</span>
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                    {aSrc && !aBroken ? (
                                      <img
                                        src={aSrc}
                                        alt=""
                                        className="h-4 w-4 shrink-0 rounded-sm object-cover"
                                        onError={() => setBrokenFlagSrcs((prev) => ({ ...prev, [aSrc]: true }))}
                                      />
                                    ) : (
                                      <span className="inline-flex h-4 w-4 shrink-0 rounded-sm bg-slate-200" />
                                    )}
                                    <span className="truncate">{m.awayTeam}</span>
                                  </div>
                                </div>
                              </div>

                              {hasScore ? (
                                <div className="flex items-center gap-2">
                                  <div className="text-lg font-bold text-slate-900">
                                    {m.homeScore}-{m.awayScore}
                                  </div>
                                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                                    0
                                  </div>
                                </div>
                              ) : (
                                <button className="rounded-full bg-orange-600 px-4 py-2 text-xs font-bold text-white">
                                  予想する
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {block.items.length === 0 && (
                        <div className="px-1 py-2 text-xs text-slate-400">データがありません</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

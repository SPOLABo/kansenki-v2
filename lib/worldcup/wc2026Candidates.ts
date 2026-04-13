import type { SquadPosition } from '@/types/worldcup';
import type { Wc2026CountryCode } from '@/lib/worldcup/wc2026Countries';

export type Wc2026Candidate = {
  id: string;
  name: string;
  position: SquadPosition;
  age?: number;
  club?: string;
  stats?: {
    appearances?: number;
    goals?: number;
    assists?: number;
    minutes?: number;
  };
};

export const WC2026_CANDIDATES_BY_COUNTRY: Record<Wc2026CountryCode, Wc2026Candidate[]> = {
  jpn: [
    {
      id: "jpn-suzuki-zion",
      name: "鈴木彩艶",
      position: "GK" as SquadPosition,
    age: 23,
    club: "パルマ・カルチョ1913",
    stats: {
      appearances: 23,
      goals: 0,
    },
    },
    {
      id: "jpn-osako-keisuke",
      name: "大迫敬介",
      position: "GK" as SquadPosition,
    age: 26,
    club: "サンフレッチェ広島",
    stats: {
      appearances: 11,
      goals: 0,
    },
    },
    {
      id: "jpn-hayakawa-yuki",
      name: "早川友基",
      position: "GK" as SquadPosition,
    age: 27,
    club: "鹿島アントラーズ",
    stats: {
      appearances: 3,
      goals: 0,
    },
    },
    {
      id: "jpn-tani-kosei",
      name: "谷晃生",
      position: "GK" as SquadPosition,
    age: 25,
    club: "FC町田ゼルビア",
    stats: {
      appearances: 3,
      goals: 0,
    },
    },
    {
      id: "jpn-kokubo-reo-brian",
      name: "小久保玲央ブライアン",
      position: "GK" as SquadPosition,
    age: 25,
    club: "シント＝トロイデンVV",
    stats: {
      appearances: 0,
      goals: 0,
    },
    },
    {
      id: "jpn-nozawa-taishi-brandon",
      name: "野澤大志ブランドン",
      position: "GK" as SquadPosition,
    age: 23,
    club: "ロイヤル・アントワープFC",
    stats: {
      appearances: 0,
      goals: 0,
    },
    },
    {
      id: "jpn-taniguchi-shogo",
      name: "谷口彰悟",
      position: "DF" as SquadPosition,
    age: 34,
    club: "シント＝トロイデンVV",
    stats: {
      appearances: 37,
      goals: 1,
    },
    },
    {
      id: "jpn-seko-ayumu",
      name: "瀬古歩夢",
      position: "DF" as SquadPosition,
    age: 25,
    club: "ル・アーヴルAC",
    stats: {
      appearances: 13,
      goals: 0,
    },
    },
    {
      id: "jpn-sugawara-yukinari",
      name: "菅原由勢",
      position: "DF" as SquadPosition,
    age: 25,
    club: "SVヴェルダー・ブレーメン",
    stats: {
      appearances: 20,
      goals: 2,
    },
    },
    {
      id: "jpn-hashioka-daiki",
      name: "橋岡大樹",
      position: "DF" as SquadPosition,
    age: 26,
    club: "KAAヘント",
    stats: {
      appearances: 12,
      goals: 0,
    },
    },
    {
      id: "jpn-ito-hiroki",
      name: "伊藤洋輝",
      position: "DF" as SquadPosition,
    age: 26,
    club: "FCバイエルン・ミュンヘン",
    stats: {
      appearances: 23,
      goals: 1,
    },
    },
    {
      id: "jpn-watanabe-tsuyoshi",
      name: "渡辺剛",
      position: "DF" as SquadPosition,
    age: 29,
    club: "フェイエノールト・ロッテルダム",
    stats: {
      appearances: 10,
      goals: 0,
    },
    },
    {
      id: "jpn-suzuki-junnosuke",
      name: "鈴木淳之介",
      position: "DF" as SquadPosition,
    age: 22,
    club: "FCコペンハーゲン",
    stats: {
      appearances: 6,
      goals: 0,
    },
    },
    {
      id: "jpn-itakura-ko",
      name: "板倉滉",
      position: "DF" as SquadPosition,
    age: 29,
    club: "アヤックス・アムステルダム",
    stats: {
      appearances: 39,
      goals: 2,
    },
    },
    {
      id: "jpn-machida-koki",
      name: "町田浩樹",
      position: "DF" as SquadPosition,
    age: 28,
    club: "TSG1899ホッフェンハイム",
    stats: {
      appearances: 17,
      goals: 0,
    },
    },
    {
      id: "jpn-araki-hayato",
      name: "荒木隼人",
      position: "DF" as SquadPosition,
    age: 29,
    club: "サンフレッチェ広島",
    stats: {
      appearances: 4,
      goals: 0,
    },
    },
    {
      id: "jpn-takai-kota",
      name: "高井幸大",
      position: "DF" as SquadPosition,
    age: 21,
    club: "ボルシア・メンヒェングラートバッハ",
    stats: {
      appearances: 4,
      goals: 0,
    },
    },
    {
      id: "jpn-ando-tomoya",
      name: "安藤智哉",
      position: "DF" as SquadPosition,
    age: 27,
    club: "FCザンクトパウリ",
    stats: {
      appearances: 3,
      goals: 0,
    },
    },
    {
      id: "jpn-nagatomo-yuto",
      name: "長友佑都",
      position: "DF" as SquadPosition,
    age: 39,
    club: "FC東京",
    stats: {
      appearances: 144,
      goals: 4,
    },
    },
    {
      id: "jpn-sekine-daiki",
      name: "関根大輝",
      position: "DF" as SquadPosition,
    age: 23,
    club: "スタッド・ランス",
    stats: {
      appearances: 3,
      goals: 0,
    },
    },
    {
      id: "jpn-hatate-reo",
      name: "旗手怜央",
      position: "MF" as SquadPosition,
    age: 28,
    club: "セルティックFC",
    stats: {
      appearances: 11,
      goals: 0,
    },
    },
    {
      id: "jpn-morita-hidemasa",
      name: "守田英正",
      position: "MF" as SquadPosition,
    age: 30,
    club: "スポルティングCP",
    stats: {
      appearances: 40,
      goals: 6,
    },
    },
    {
      id: "jpn-endo-wataru",
      name: "遠藤航",
      position: "MF" as SquadPosition,
    age: 33,
    club: "リヴァプールFC",
    stats: {
      appearances: 72,
      goals: 4,
    },
    },
    {
      id: "jpn-ito-junya",
      name: "伊東純也",
      position: "MF" as SquadPosition,
    age: 33,
    club: "KRCヘンク",
    stats: {
      appearances: 68,
      goals: 15,
    },
    },
    {
      id: "jpn-kamada-daichi",
      name: "鎌田大地",
      position: "MF" as SquadPosition,
    age: 29,
    club: "クリスタル・パレスFC",
    stats: {
      appearances: 49,
      goals: 12,
    },
    },
    {
      id: "jpn-doan-ritsu",
      name: "堂安律",
      position: "MF" as SquadPosition,
    age: 27,
    club: "アイントラハト・フランクフルト",
    stats: {
      appearances: 64,
      goals: 11,
    },
    },
    {
      id: "jpn-nakamura-keito",
      name: "中村敬斗",
      position: "MF" as SquadPosition,
    age: 25,
    club: "スタッド・ランス",
    stats: {
      appearances: 24,
      goals: 10,
    },
    },
    {
      id: "jpn-tanaka-ao",
      name: "田中碧",
      position: "MF" as SquadPosition,
    age: 27,
    club: "リーズ・ユナイテッド",
    stats: {
      appearances: 37,
      goals: 8,
    },
    },
    {
      id: "jpn-matsuki-kurusei",
      name: "松木玖生",
      position: "MF" as SquadPosition,
    age: 22,
    club: "サウサンプトン",
    stats: {
      appearances: 0,
      goals: 0,
    },
    },
    {
      id: "jpn-mitoma-kaoru",
      name: "三笘薫",
      position: "MF" as SquadPosition,
    age: 28,
    club: "ブライトン&ホーヴ・アルビオン",
    stats: {
      appearances: 31,
      goals: 9,
    },
    },
    {
      id: "jpn-sano-kaishu",
      name: "佐野海舟",
      position: "MF" as SquadPosition,
    age: 25,
    club: "1.FSVマインツ05",
    stats: {
      appearances: 12,
      goals: 0,
    },
    },
    {
      id: "jpn-fujita-joru-chima",
      name: "藤田譲瑠チマ",
      position: "MF" as SquadPosition,
    age: 24,
    club: "FCザンクトパウリ",
    stats: {
      appearances: 8,
      goals: 0,
    },
    },
    {
      id: "jpn-suzuki-yuito",
      name: "鈴木唯人",
      position: "MF" as SquadPosition,
    age: 24,
    club: "SCフライブルク",
    stats: {
      appearances: 6,
      goals: 0,
    },
    },
    {
      id: "jpn-sano-kodai",
      name: "佐野航大",
      position: "MF" as SquadPosition,
    age: 22,
    club: "NECナイメヘン",
    stats: {
      appearances: 2,
      goals: 0,
    },
    },
    {
      id: "jpn-sato-ryunosuke",
      name: "佐藤龍之介",
      position: "MF" as SquadPosition,
    age: 19,
    club: "FC東京",
    stats: {
      appearances: 5,
      goals: 0,
    },
    },
    {
      id: "jpn-kitano-sota",
      name: "北野颯太",
      position: "MF" as SquadPosition,
    age: 21,
    club: "レッドブル・ザルツブルク",
    stats: {
      appearances: 1,
      goals: 0,
    },
    },
    {
      id: "jpn-morishita-tatsuya",
      name: "森下龍矢",
      position: "MF" as SquadPosition,
    age: 29,
    club: "ブラックバーン・ローヴァーズ",
    stats: {
      appearances: 3,
      goals: 1,
    },
    },
    {
      id: "jpn-minamino-takumi",
      name: "南野拓実",
      position: "MF" as SquadPosition,
    age: 31,
    club: "ASモナコ",
    stats: {
      appearances: 73,
      goals: 26,
    },
    },
    {
      id: "jpn-saito-koki",
      name: "斉藤光毅",
      position: "MF" as SquadPosition,
    age: 24,
    club: "クイーンズ・パーク・レンジャーズ",
    stats: {
      appearances: 1,
      goals: 0,
    },
    },
    {
      id: "jpn-ogawa-koki",
      name: "小川航基",
      position: "FW" as SquadPosition,
    age: 28,
    club: "NECナイメヘン",
    stats: {
      appearances: 14,
      goals: 10,
    },
    },
    {
      id: "jpn-asano-takuma",
      name: "浅野拓磨",
      position: "FW" as SquadPosition,
    age: 29,
    club: "RCDマジョルカ",
    stats: {
      appearances: 53,
      goals: 9,
    },
    },
    {
      id: "jpn-maeda-daizen",
      name: "前田大然",
      position: "FW" as SquadPosition,
    age: 28,
    club: "セルティックFC",
    stats: {
      appearances: 27,
      goals: 4,
    },
    },
    {
      id: "jpn-ueda-ayase",
      name: "上田綺世",
      position: "FW" as SquadPosition,
    age: 27,
    club: "フェイエノールト・ロッテルダム",
    stats: {
      appearances: 38,
      goals: 16,
    },
    },
    {
      id: "jpn-machino-shuto",
      name: "町野修斗",
      position: "FW" as SquadPosition,
    age: 26,
    club: "ボルシア・メンヒェングラートバッハ",
    stats: {
      appearances: 14,
      goals: 5,
    },
    },
    {
      id: "jpn-goto-keisuke",
      name: "後藤啓介",
      position: "FW" as SquadPosition,
    age: 20,
    club: "シント＝トロイデンVV",
    stats: {
      appearances: 3,
      goals: 0,
    },
    },
    {
      id: "jpn-shiogai-kento",
      name: "塩貝健人",
      position: "FW" as SquadPosition,
    age: 21,
    club: "VfLヴォルフスブルク",
    stats: {
      appearances: 1,
      goals: 0,
    },
    },
    {
      id: "jpn-hyotsumitate-kota",
      name: "俵積田晃太",
      position: "FW" as SquadPosition,
    age: 21,
    club: "FC東京",
    stats: {
      appearances: 3,
      goals: 0,
    },
    },
    {
      id: "jpn-kubo-takefusa",
      name: "久保建英",
      position: "FW" as SquadPosition,
    age: 24,
    club: "レアル・ソシエダ",
    stats: {
      appearances: 48,
      goals: 7,
    },
    },
    {
      id: "jpn-soma-yuki",
      name: "相馬勇紀",
      position: "FW" as SquadPosition,
    age: 29,
    club: "FC町田ゼルビア",
    stats: {
      appearances: 19,
      goals: 5,
    },
    },
    {
      id: "jpn-furuhashi-kyogo",
      name: "古橋亨梧",
      position: "FW" as SquadPosition,
    age: 31,
    club: "バーミンガム・シティ",
    stats: {
      appearances: 23,
      goals: 5,
    },
    },
    {
      id: "jpn-hosoya-mao",
      name: "細谷真大",
      position: "FW" as SquadPosition,
    age: 24,
    club: "柏レイソル",
    stats: {
      appearances: 9,
      goals: 3,
    },
    },
  ],
  eng: [

  ],
  bra: [

  ],
  ger: [

  ],
  fra: [

  ],
  esp: [

  ],
};

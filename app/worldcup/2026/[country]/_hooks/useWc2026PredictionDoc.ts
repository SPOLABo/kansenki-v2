'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  LegacySquadStatus,
  SquadPlayerPrediction,
  SquadPosition,
  SquadPredictionDoc,
  SquadStatus,
} from '@/types/worldcup';
import { sanitizePlayersForFirestore, toNewStatus } from '../wc2026PredictionUtils';

type UseWc2026PredictionDocArgs = {
  userUid: string | null;
  countrySlug: string;
};

export function useWc2026PredictionDoc({ userUid, countrySlug }: UseWc2026PredictionDocArgs) {
  const [players, setPlayers] = useState<SquadPlayerPrediction[]>([]);
  const [predictionComment, setPredictionComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const docRef = useMemo(() => {
    if (!userUid || !countrySlug) return null;
    return doc(db, 'users', userUid, 'wc2026SquadPredictions', countrySlug);
  }, [countrySlug, userUid]);

  const publicDocRef = useMemo(() => {
    if (!userUid || !countrySlug) return null;
    return doc(db, 'wc2026PublicSquadPredictions', `${countrySlug}_${userUid}`);
  }, [countrySlug, userUid]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setStatusMessage(null);
      if (!userUid || !docRef) {
        setPlayers([]);
        setPredictionComment('');
        return;
      }
      try {
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          if (!cancelled) setPlayers([]);
          if (!cancelled) setPredictionComment('');
          return;
        }
        const data = snap.data() as SquadPredictionDoc;
        const loadedRaw = Array.isArray(data?.players) ? data.players : [];
        const loaded: SquadPlayerPrediction[] = loadedRaw
          .filter((p: any) => p && typeof p.id === 'string' && typeof p.name === 'string')
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            position: p.position as SquadPosition,
            status: toNewStatus(p.status as SquadStatus | LegacySquadStatus),
            note: typeof p.note === 'string' ? p.note : undefined,
          }));
        if (!cancelled) setPlayers(loaded);
        if (!cancelled) setPredictionComment(typeof data?.comment === 'string' ? data.comment : '');
      } catch {
        if (!cancelled) setStatusMessage('読み込みに失敗しました');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [docRef, userUid]);

  const save = async () => {
    if (!docRef) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const trimmedComment = predictionComment.trim().slice(0, 500);
      const sanitizedPlayers = sanitizePlayersForFirestore(players);
      const payload: SquadPredictionDoc = {
        schemaVersion: 1,
        countrySlug,
        tournamentId: 'wc2026',
        players: sanitizedPlayers,
        updatedAt: serverTimestamp(),
      };
      if (trimmedComment) payload.comment = trimmedComment;
      await setDoc(docRef, payload, { merge: true });

      if (publicDocRef) {
        await setDoc(
          publicDocRef,
          {
            schemaVersion: 1,
            countrySlug,
            tournamentId: 'wc2026',
            players: sanitizedPlayers,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (e: any) {
      const code = typeof e?.code === 'string' ? e.code : '';
      const msg = typeof e?.message === 'string' ? e.message : '';
      setStatusMessage(`保存に失敗しました${code || msg ? `：${code || msg}` : ''}`);
    } finally {
      setSaving(false);
    }
  };

  return {
    players,
    setPlayers,
    predictionComment,
    setPredictionComment,
    saving,
    save,
    statusMessage,
    setStatusMessage,
  };
}

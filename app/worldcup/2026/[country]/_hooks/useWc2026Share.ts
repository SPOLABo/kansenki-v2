'use client';

import { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { toPng } from 'html-to-image';
import { db, storage } from '@/lib/firebase';
import type { SquadPlayerPrediction } from '@/types/worldcup';
import { randomId, sanitizePlayersForFirestore } from '../wc2026PredictionUtils';

type UseWc2026ShareArgs = {
  userUid: string | null;
  countrySlug: string;
  countryNameJa: string;
  players: SquadPlayerPrediction[];
  predictionComment: string;
  setStatusMessage: (v: string | null) => void;
};

export function useWc2026Share({
  userUid,
  countrySlug,
  countryNameJa,
  players,
  predictionComment,
  setStatusMessage,
}: UseWc2026ShareArgs) {
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const share = async () => {
    if (!userUid || !countrySlug) return;
    setShareLink(null);

    const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
    const popup = canNativeShare ? null : window.open('about:blank', '_blank', 'noopener,noreferrer');

    setSharing(true);
    setStatusMessage(null);
    try {
      const shareId = randomId();
      const shareRef = doc(db, 'wc2026PredictionShares', shareId);
      const trimmedComment = predictionComment.trim().slice(0, 500);
      const sanitizedPlayers = sanitizePlayersForFirestore(players);
      const snapshotJson = JSON.stringify({ countrySlug, players: sanitizedPlayers, comment: trimmedComment || undefined });

      let ogImageUrl: string | undefined;
      try {
        const el = document.getElementById('wc2026-pitch-ogp-capture');
        if (el) {
          const dataUrl = await toPng(el, {
            cacheBust: true,
            pixelRatio: 1,
            width: 1200,
            height: 630,
            backgroundColor: '#020617',
          });
          const objectRef = ref(storage, `wc2026PredictionShareOgp/${countrySlug}/${shareId}.png`);
          await uploadString(objectRef, dataUrl, 'data_url');
          ogImageUrl = await getDownloadURL(objectRef);
        }
      } catch {
        // ignore
      }

      await setDoc(
        shareRef,
        {
          schemaVersion: 1,
          tournamentId: 'wc2026',
          countrySlug,
          snapshotJson,
          ogImageUrl: ogImageUrl || null,
          createdByUid: userUid,
          createdAt: serverTimestamp(),
        },
        { merge: false }
      );

      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kansenki.footballtop.net';
      const url = `${origin}/worldcup/2026/${countrySlug}/share/${shareId}`;
      const title = `${countryNameJa}：W杯2026 予想`;
      const text = encodeURIComponent(title);
      const hashtags = encodeURIComponent('みんなの現地観戦記,footballtop');
      const shareUrl = `https://x.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;

      if (canNativeShare) {
        try {
          await (navigator as any).share({ title, text: title, url });
          return;
        } catch {
          // fallback
        }
      }

      if (popup) {
        popup.location.href = shareUrl;
      } else {
        setShareLink(url);
        setStatusMessage('共有リンクをコピーしてXで貼り付けてください');
      }
    } catch {
      if (popup) popup.close();
      setStatusMessage('共有リンクの作成に失敗しました');
    } finally {
      setSharing(false);
    }
  };

  return {
    sharing,
    share,
    shareLink,
    setShareLink,
  };
}

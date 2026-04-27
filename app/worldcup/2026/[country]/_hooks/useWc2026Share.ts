'use client';

import { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { toPng } from 'html-to-image';
import { db, storage } from '@/lib/firebase';
import type { SquadPlayerPrediction } from '@/types/worldcup';
import type { FormationSlotKey } from '../wc2026PredictionUtils';
import { randomId, sanitizePlayersForFirestore } from '../wc2026PredictionUtils';

type UseWc2026ShareArgs = {
  userUid: string | null;
  countrySlug: string;
  countryNameJa: string;
  players: SquadPlayerPrediction[];
  pitchOverrideBySlot: Partial<Record<FormationSlotKey, string>>;
  predictionComment: string;
  setStatusMessage: (v: string | null) => void;
};

export function useWc2026Share({
  userUid,
  countrySlug,
  countryNameJa,
  players,
  pitchOverrideBySlot,
  predictionComment,
  setStatusMessage,
}: UseWc2026ShareArgs) {
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const share = async () => {
    if (!userUid || !countrySlug) return;
    setShareLink(null);

    const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iP(hone|od|ad)/.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isMobile = isIOS || isAndroid;

    const popup = !isMobile && canNativeShare ? null : !isMobile ? window.open('about:blank', '_blank') : null;

    setSharing(true);
    setStatusMessage(null);
    try {
      const shareId = randomId();
      const shareRef = doc(db, 'wc2026PredictionShares', shareId);
      const trimmedComment = predictionComment.trim().slice(0, 500);
      const sanitizedPlayers = sanitizePlayersForFirestore(players);
      const snapshotJson = JSON.stringify({
        countrySlug,
        players: sanitizedPlayers,
        pitchOverrideBySlot,
        formation: '3-4-2-1',
        comment: trimmedComment || undefined,
      });

      let ogImageUrl: string | undefined;
      try {
        const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        if (isLocalhost) throw new Error('skip_og_upload_on_localhost');
        const el = document.getElementById('wc2026-pitch-ogp-capture');
        if (el) {
          const dataUrl = await toPng(el, {
            cacheBust: true,
            pixelRatio: 1,
            width: 1200,
            height: 630,
            backgroundColor: '#020617',
            style: {
              opacity: '1',
              transform: 'none',
            },
            onClone: (doc: Document) => {
              try {
                const cloned = doc.getElementById('wc2026-pitch-ogp-capture') as HTMLElement | null;
                if (!cloned) return;
                cloned.style.opacity = '1';
                cloned.style.transform = 'none';
                cloned.style.left = '0px';
                cloned.style.top = '0px';
                cloned.style.zIndex = '0';
              } catch {
                // ignore
              }
            },
          } as any);
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
          commentCount: 0,
          createdByUid: userUid,
          createdAt: serverTimestamp(),
        },
        { merge: false }
      );

      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kansenki.footballtop.net';
      const url = `${origin}/worldcup/2026/${countrySlug}/share/${shareId}`;
      const title = `${countryNameJa}：W杯2026 予想`;
      const text = encodeURIComponent(title);
      const rawHashtags = 'SAMURAIBLUE,ワールドカップ,W杯2026,スポカレ,代表メンバー予想';
      const hashtags = encodeURIComponent(rawHashtags);
      const shareUrl = `https://x.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;

      const hashtagText = rawHashtags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => `#${t}`)
        .join(' ');
      const appUrl = `twitter://post?message=${encodeURIComponent(`${title}\n${url}\n\n${hashtagText}`)}`;

      const androidIntentUrl = `intent://post?message=${encodeURIComponent(
        `${title}\n${url}\n\n${hashtagText}`
      )}#Intent;scheme=twitter;package=com.twitter.android;end`;

      if (isAndroid) {
        const startedAt = Date.now();
        window.location.href = androidIntentUrl;
        window.setTimeout(() => {
          const stillHere = document.visibilityState === 'visible' && Date.now() - startedAt >= 700;
          if (!stillHere) return;
          window.location.href = shareUrl;
        }, 800);

        setShareLink(url);
        setStatusMessage('Xアプリが開かない場合は、共有リンクをコピーして貼り付けてください');
        return;
      }

      if (isIOS) {
        const startedAt = Date.now();
        window.location.href = appUrl;
        window.setTimeout(() => {
          const stillHere = document.visibilityState === 'visible' && Date.now() - startedAt >= 700;
          if (!stillHere) return;
          if (popup) {
            popup.location.href = shareUrl;
          } else {
            const opened = window.open(shareUrl, '_blank');
            if (!opened) window.location.href = shareUrl;
          }
        }, 800);

        setShareLink(url);
        setStatusMessage('Xアプリが開かない場合は、共有リンクをコピーして貼り付けてください');
        return;
      }

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
        const opened = window.open(shareUrl, '_blank');
        if (!opened) {
          window.location.href = shareUrl;
        }
        setShareLink(url);
        setStatusMessage('Xの画面が開かない場合は、共有リンクをコピーして貼り付けてください');
      }
    } catch (e: any) {
      if (popup) popup.close();
      const code = typeof e?.code === 'string' ? e.code : '';
      const msg = typeof e?.message === 'string' ? e.message : '';
      setStatusMessage(`共有リンクの作成に失敗しました${code || msg ? `：${code || msg}` : ''}`);
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

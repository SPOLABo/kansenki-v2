'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

type ShareComment = {
  id: string;
  text: string;
  createdAt?: any;
  createdByUid?: string;
  createdByName?: string;
};

export function ShareComments({ shareId }: { shareId: string }) {
  const { user, userProfile, loading } = useAuth();

  const [comments, setComments] = useState<ShareComment[]>([]);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [deletingById, setDeletingById] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const commentsRef = useMemo(() => collection(db, 'wc2026PredictionShares', shareId, 'comments'), [shareId]);

  useEffect(() => {
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const out: ShareComment[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          const t = typeof data?.text === 'string' ? data.text : '';
          if (!t) return;
          out.push({
            id: d.id,
            text: t,
            createdAt: data?.createdAt,
            createdByUid: typeof data?.createdByUid === 'string' ? data.createdByUid : undefined,
            createdByName: typeof data?.createdByName === 'string' ? data.createdByName : undefined,
          });
        });
        setComments(out);
      },
      () => {
        setStatusMessage('コメントの読み込みに失敗しました');
      }
    );
    return () => unsub();
  }, [commentsRef]);

  const canPost = Boolean(user);

  const remove = async (commentId: string) => {
    if (!user) return;
    if (!window.confirm('コメントを削除しますか？')) return;

    setDeletingById((prev) => ({ ...prev, [commentId]: true }));
    setStatusMessage(null);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'wc2026PredictionShares', shareId, 'comments', commentId));
      batch.set(doc(db, 'wc2026PredictionShares', shareId), { commentCount: increment(-1) }, { merge: true });
      await batch.commit();
    } catch (e: any) {
      const code = typeof e?.code === 'string' ? e.code : '';
      const msg = typeof e?.message === 'string' ? e.message : '';
      setStatusMessage(`削除に失敗しました${code || msg ? `：${code || msg}` : ''}`);
    } finally {
      setDeletingById((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const submit = async () => {
    if (!canPost) return;
    const trimmed = text.trim().slice(0, 300);
    if (!trimmed) return;

    setPosting(true);
    setStatusMessage(null);
    try {
      const name =
        (typeof userProfile?.nickname === 'string' && userProfile.nickname.trim()) ||
        (typeof userProfile?.displayName === 'string' && userProfile.displayName.trim()) ||
        (typeof user?.displayName === 'string' && user.displayName.trim()) ||
        '匿名';

      const batch = writeBatch(db);
      const commentRef = doc(commentsRef);
      batch.set(commentRef, {
        text: trimmed,
        createdAt: serverTimestamp(),
        createdByUid: user?.uid ?? null,
        createdByName: name,
      });
      batch.set(doc(db, 'wc2026PredictionShares', shareId), { commentCount: increment(1) }, { merge: true });
      await batch.commit();
      setText('');
    } catch (e: any) {
      const code = typeof e?.code === 'string' ? e.code : '';
      const msg = typeof e?.message === 'string' ? e.message : '';
      setStatusMessage(`投稿に失敗しました${code || msg ? `：${code || msg}` : ''}`);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mt-4 px-1">
      <div className="text-sm font-bold text-white">コメント</div>

      <div className="mt-3 space-y-2">
        {comments.length === 0 ? <div className="text-xs text-white/60">まだコメントはありません</div> : null}
        {comments.map((c) => (
          <div key={c.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] text-white/60">{c.createdByName || '匿名'}</div>
              {user && c.createdByUid && c.createdByUid === user.uid ? (
                <button
                  type="button"
                  disabled={Boolean(deletingById[c.id])}
                  onClick={() => remove(c.id)}
                  className="text-[11px] text-white/60 underline disabled:opacity-50"
                >
                  {deletingById[c.id] ? '削除中...' : '削除'}
                </button>
              ) : null}
            </div>
            <div className="mt-1 text-[12px] text-white/85 whitespace-pre-wrap break-words">{c.text}</div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        {!loading && !user ? (
          <div className="flex items-center justify-center">
            <Link
              href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}
              className="rounded-2xl px-6 py-3 text-sm font-bold bg-orange-500 text-white border border-white/10 hover:bg-orange-400 transition-colors"
            >
              ログインしてコメントする
            </Link>
          </div>
        ) : null}

        {user ? (
          <div>
            <textarea
              value={text}
              maxLength={300}
              disabled={posting}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none disabled:opacity-50"
              rows={3}
              placeholder="コメントを書く（最大300文字）"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="text-[11px] text-white/60">{text.length}/300</div>
              <button
                type="button"
                disabled={posting || text.trim().length === 0}
                onClick={submit}
                className="rounded-xl px-4 py-2 text-xs bg-sky-600 text-white border border-white/10 hover:bg-sky-500 transition-colors disabled:opacity-50"
              >
                {posting ? '投稿中...' : '投稿'}
              </button>
            </div>
          </div>
        ) : null}

        {statusMessage ? <div className="mt-2 text-xs text-red-200/90">{statusMessage}</div> : null}
      </div>
    </div>
  );
}

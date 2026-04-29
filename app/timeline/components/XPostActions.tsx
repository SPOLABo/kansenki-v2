'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { FaRegComment, FaRetweet, FaHeart, FaRegHeart, FaChartBar } from 'react-icons/fa';

export default function XPostActions(props: {
  postId: string;
  collectionName: string;
  initialLikeCount?: number;
  initialCommentCount?: number;
  initialRepostCount?: number;
  initialViewCount?: number;
}) {
  const { postId, collectionName } = props;

  const [user, setUser] = useState<User | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  const [likeCount, setLikeCount] = useState<number>(() => (typeof props.initialLikeCount === 'number' ? props.initialLikeCount : 0));

  const commentCount = useMemo(
    () => (typeof props.initialCommentCount === 'number' ? props.initialCommentCount : 0),
    [props.initialCommentCount]
  );
  const repostCount = useMemo(
    () => (typeof props.initialRepostCount === 'number' ? props.initialRepostCount : 0),
    [props.initialRepostCount]
  );
  const viewCount = useMemo(
    () => (typeof props.initialViewCount === 'number' ? props.initialViewCount : 0),
    [props.initialViewCount]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLiked(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!collectionName || !postId) return;
        const ref = doc(db, collectionName, postId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const data: any = snap.data();
        const c = typeof data?.likeCount === 'number' ? data.likeCount : 0;
        if (!cancelled) setLikeCount(c);
      } catch {
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [collectionName, postId]);

  const checkLikeStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const likeRef = doc(db, 'users', user.uid, 'likes', postId);
      const docSnap = await getDoc(likeRef);
      setLiked(docSnap.exists());
    } catch {
      return;
    } finally {
      setLoading(false);
    }
  }, [postId, user]);

  useEffect(() => {
    if (user) void checkLikeStatus();
  }, [checkLikeStatus, user]);

  const handleToggleLike = async () => {
    if (!collectionName || !postId) return;

    if (!user) {
      alert('いいねするにはログインが必要です。');
      return;
    }

    if (loading) return;

    setLoading(true);

    const likeRef = doc(db, 'users', user.uid, 'likes', postId);
    const postRef = doc(db, collectionName, postId);

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((prev) => {
      const base = typeof prev === 'number' ? prev : 0;
      const next = base + (nextLiked ? 1 : -1);
      return next < 0 ? 0 : next;
    });

    try {
      if (nextLiked) {
        await setDoc(likeRef, { postId, createdAt: serverTimestamp() });
        await updateDoc(postRef, { likeCount: increment(1) });
      } else {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likeCount: increment(-1) });
      }
    } catch {
      setLiked((v) => !v);
      setLikeCount((prev) => {
        const base = typeof prev === 'number' ? prev : 0;
        const next = base + (nextLiked ? -1 : 1);
        return next < 0 ? 0 : next;
      });
      alert('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const iconBase = 'w-4 h-4';

  return (
    <div className="mt-2 flex items-center justify-between text-sm text-white/60">
      <button type="button" className="inline-flex items-center gap-2 hover:text-white/80 transition-colors" aria-label="返信">
        <FaRegComment className={iconBase} />
        <span className="text-xs">{commentCount}</span>
      </button>

      <button type="button" className="inline-flex items-center gap-2 hover:text-white/80 transition-colors" aria-label="リポスト">
        <FaRetweet className={iconBase} />
        <span className="text-xs">{repostCount}</span>
      </button>

      <button
        type="button"
        onClick={handleToggleLike}
        disabled={loading}
        className={
          'inline-flex items-center gap-2 transition-colors ' +
          (liked ? 'text-pink-400 hover:text-pink-300' : 'hover:text-white/80') +
          (loading ? ' opacity-60 cursor-not-allowed' : '')
        }
        aria-label="いいね"
      >
        {liked ? <FaHeart className={iconBase} /> : <FaRegHeart className={iconBase} />}
        <span className="text-xs">{likeCount}</span>
      </button>

      <button type="button" className="inline-flex items-center gap-2 hover:text-white/80 transition-colors" aria-label="表示回数">
        <FaChartBar className={iconBase} />
        <span className="text-xs">{viewCount}</span>
      </button>
    </div>
  );
}

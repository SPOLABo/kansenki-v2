'use client';

import LikeButton from '@/components/LikeButton';
import ThanksButton from '@/components/ThanksButton';
import BookmarkButton from '@/components/BookmarkButton';

export default function PostActions3(props: { postId: string; collectionName: string }) {
  const { postId, collectionName } = props;

  return (
    <div className="pt-2">
      <div className="flex items-center justify-around">
        <div className="flex flex-col items-center gap-1">
          <LikeButton postId={postId} collectionName={collectionName} size="sm" />
          <div className="text-[11px] text-gray-500 dark:text-gray-400">いいね</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ThanksButton postId={postId} collectionName={collectionName} size="sm" />
          <div className="text-[11px] text-gray-500 dark:text-gray-400">参考になった</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <BookmarkButton postId={postId} collectionName={collectionName} size="sm" />
          <div className="text-[11px] text-gray-500 dark:text-gray-400">保存</div>
        </div>
      </div>
    </div>
  );
}

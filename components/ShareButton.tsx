'use client';

import { FaXTwitter } from 'react-icons/fa6';

interface ShareButtonProps {
  title: string;
  url: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ title, url }) => {
  const handleShare = () => {
    const text = encodeURIComponent(title);
    // ハッシュタグを追加
    const hashtags = 'SAMURAIBLUE,ワールドカップ,日本代表,W杯2026,スポカレ,代表メンバー予想';
    const hashtagText = hashtags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => `#${t}`)
      .join(' ');
    const encodedUrl = encodeURIComponent(url);
    const webIntentUrl = `https://x.com/intent/tweet?text=${text}&url=${encodedUrl}&hashtags=${encodeURIComponent(hashtags)}`;
    const appUrl = `twitter://post?message=${encodeURIComponent(`${title}\n${url}\n\n${hashtagText}`)}`;

    const startedAt = Date.now();
    window.location.href = appUrl;

    window.setTimeout(() => {
      const stillHere = document.visibilityState === 'visible' && Date.now() - startedAt >= 700;
      if (!stillHere) return;
      window.open(webIntentUrl, '_blank', 'noopener,noreferrer');
    }, 800);
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
      aria-label="Xでシェア"
    >
      <FaXTwitter />
      <span className="text-sm font-semibold">シェア</span>
    </button>
  );
};

export default ShareButton;

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
    const shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=${hashtags}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
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

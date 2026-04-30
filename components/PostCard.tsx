import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { UnifiedPost } from '@/types/post';
// import LikeButton from './LikeButton';

interface PostCardProps {
  post: UnifiedPost;
  priority?: boolean;
  footer?: React.ReactNode;
  variant?: 'default' | 'timeline';
}

const PostCard: React.FC<PostCardProps> = ({ post, priority = false, footer = null, variant = 'default' }) => {
  if (post.imageUrls && post.imageUrls.length > 0) {
    console.log('PostCard Image URL:', post.imageUrls[0]);
  }
  const authorImage = post.authorImage || '/default-avatar.svg';
  const getSafeDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (typeof date.toDate === 'function') return date.toDate();
    return null;
  };

  const safeCreatedAt = getSafeDate(post.createdAt);
  const postDate = safeCreatedAt ? format(safeCreatedAt, 'yyyy.MM.dd') : '';

  const userTitle = post.originalData?.title?.trim();
  const homeTeam = post.originalData?.match?.homeTeam || post.originalData?.homeTeam;
  const awayTeam = post.originalData?.match?.awayTeam || post.originalData?.awayTeam;

  let displayTitle: string = post.title || '投稿';
  let displaySubtext: string | null = post.subtext;

  // Handle display logic for match-related posts
  if (homeTeam && awayTeam) {
    const matchCardString = `${homeTeam} vs ${awayTeam}`;
    // Case 1: 'posts' collection with a user-defined title.
    if (post.collectionName === 'posts' && userTitle) {
      displayTitle = userTitle;
      displaySubtext = matchCardString; // Match card becomes the subtext
    } 
    // Case 2: 'simple-posts' or 'posts' without a user-defined title.
    else {
      displayTitle = matchCardString; // Match card is the main title
      displaySubtext = post.subtext; // Subtext is the stadium name passed from page.tsx
    }
  }
  const href = post.href || '/'; // Fallback to root if href is missing

  const getCategoryLabel = (p: UnifiedPost): string | null => {
    // Prioritize league name from any possible source within the original data.
    const leagueFromOriginal = p.originalData?.match?.competition || p.originalData?.match?.league || p.originalData?.league || p.originalData?.matches?.[0]?.competition;
    if (leagueFromOriginal && typeof leagueFromOriginal === 'string' && leagueFromOriginal.trim() !== '') {
      return leagueFromOriginal;
    }

    // Fallback to the unified league prop
    if (p.league && p.league.trim() !== '') {
      return p.league;
    }
    
    // Fallback to category
    if (p.category && p.category.trim() !== '') {
      return p.category;
    }

    // Final fallback based on post type
    switch (p.postType) {
      case 'simple-travel':
        return '旅行記';
      case 'post':
      case 'simple-post':
        return '観戦記録';
      case 'spot':
        return 'スポット';
      default:
        return null;
    }
  };

  const categoryLabel = getCategoryLabel(post);

  const imageAspectClassName = variant === 'timeline' ? 'aspect-[16/9]' : 'aspect-[4/3]';
  const contentPaddingClassName = variant === 'timeline' ? 'p-4' : 'p-2';
  const titleClassName =
    variant === 'timeline'
      ? 'text-base font-bold text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug mb-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
      : 'text-sm font-bold text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight h-10 mb-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors';
  const subtextClassName = variant === 'timeline' ? 'text-sm text-gray-500 dark:text-gray-400 line-clamp-1' : 'text-xs text-gray-500 dark:text-gray-400 line-clamp-1 h-4';
  const metaClassName = variant === 'timeline' ? 'mt-auto flex items-center text-sm text-gray-500 dark:text-gray-400 pt-3' : 'mt-auto flex items-center text-xs text-gray-500 dark:text-gray-400 pt-2';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col h-full relative">
      <Link href={href} className="no-underline">
        <div className={`w-full ${imageAspectClassName} relative`}>
          {post.imageUrls && post.imageUrls.length > 0 ? (
            <Image
              src={post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls[0] : '/default-avatar.svg'}
              alt={displayTitle || 'Post image'}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority={priority}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-500">No Image</span>
            </div>
          )}
          {categoryLabel && (
            <div className="absolute top-1.5 left-1.5 bg-black bg-opacity-60 text-white text-[10px] px-2 py-0.5 rounded z-10">
              {categoryLabel}
            </div>
          )}
        </div>
      </Link>
      <div className={`${contentPaddingClassName} flex flex-col flex-grow`}>
        <Link href={href} className="no-underline">
          <p className={titleClassName}>
            {displayTitle}
          </p>
          <p className={subtextClassName}>
            {displaySubtext}
          </p>
        </Link>
        <div className={metaClassName}>
          <Link href={`/user/${post.authorId}`} className="flex items-center gap-2 truncate no-underline text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors z-10">
            <div className="relative w-5 h-5 rounded-full overflow-hidden">
              <Image
                src={post.authorImage || '/default-avatar.svg'}
                alt={post.authorName || 'avatar'}
                fill
                sizes="20px"
                className="object-cover"
              />
            </div>
            <span className="truncate">{post.authorName || '名無し'}</span>
          </Link>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <span>{postDate}</span>
          </div>
        </div>

        {footer ? <div className="pt-2">{footer}</div> : null}

      </div>
    </div>
  );
};

export default PostCard;

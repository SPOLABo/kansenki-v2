import type { Metadata, ResolvingMetadata } from 'next';
import { headers } from 'next/headers';
import { doc, getDoc } from 'firebase/firestore';
import { getServerDb } from '@/lib/firebaseServer';

type Props = {
  params: { shareId: string };
};

export const runtime = 'nodejs';

function getBaseUrlFromHeaders() {
  try {
    const h = headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'https';
    if (host) return `${proto}://${host}`;
  } catch {
    // ignore
  }
  return 'https://kansenki.footballtop.net';
}

export async function generateMetadata({ params }: Props, _parent: ResolvingMetadata): Promise<Metadata> {
  const { shareId } = params;

  const baseUrl = getBaseUrlFromHeaders();
  const pageUrl = `${baseUrl}/events/premier-league-final-table/share/${encodeURIComponent(shareId)}`;
  const ogApiImageUrl = `${baseUrl}/api/pl-final-table-og/${encodeURIComponent(shareId)}`;

  const fallbackTitle = 'Premier League 最終順位予想';

  const db = getServerDb();
  if (!db) {
    return {
      title: fallbackTitle,
      openGraph: { title: fallbackTitle, images: [{ url: ogApiImageUrl, width: 1200, height: 630 }], url: pageUrl },
      twitter: { card: 'summary_large_image', title: fallbackTitle, images: [ogApiImageUrl] },
    };
  }

  try {
    const ref = doc(db, 'plFinalTablePredictionShares', shareId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { title: '共有ページが見つかりません' };
    }

    const title = fallbackTitle;
    const description = 'Premier League 最終順位予想';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: ogApiImageUrl, width: 1200, height: 630, alt: title }],
        type: 'article',
        url: pageUrl,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogApiImageUrl],
      },
    };
  } catch {
    return {
      title: fallbackTitle,
    };
  }
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

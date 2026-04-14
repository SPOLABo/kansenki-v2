import type { Metadata, ResolvingMetadata } from 'next';
import { headers } from 'next/headers';
import { doc, getDoc } from 'firebase/firestore';
import { getServerDb } from '@/lib/firebaseServer';
import { getWc2026CountryBySlug } from '@/lib/worldcup/wc2026Countries';

type Props = {
  params: { country: string; shareId: string };
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

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { country: countrySlug, shareId } = params;
  const country = getWc2026CountryBySlug(countrySlug);

  const fallbackTitle = country ? `${country.nameJa}：W杯2026 予想` : 'W杯2026 予想';
  const baseUrl = getBaseUrlFromHeaders();
  const fixedImageUrl = `${baseUrl}/${encodeURIComponent('wc2026-japan-pitch (1).png')}`;

  const db = getServerDb();
  if (!db) {
    const pageUrl = `${baseUrl}/worldcup/2026/${countrySlug}/share/${shareId}`;
    return {
      title: fallbackTitle,
      openGraph: { title: fallbackTitle, images: [{ url: fixedImageUrl, width: 1200, height: 630 }], url: pageUrl },
      twitter: { card: 'summary_large_image', title: fallbackTitle, images: [fixedImageUrl] },
    };
  }

  try {
    const ref = doc(db, 'wc2026PredictionShares', shareId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { title: '共有ページが見つかりません' };
    }

    const title = fallbackTitle;
    const description = 'W杯2026 予想メンバー';
    const pageUrl = `${baseUrl}/worldcup/2026/${countrySlug}/share/${shareId}`;
    const data = snap.data() as any;
    const storedOg = typeof data?.ogImageUrl === 'string' && data.ogImageUrl.trim() ? data.ogImageUrl.trim() : null;
    const imageUrl = fixedImageUrl;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
        type: 'article',
        url: pageUrl,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
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

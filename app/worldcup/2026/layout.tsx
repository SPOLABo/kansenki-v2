import type { Metadata } from 'next';
import { headers } from 'next/headers';

type Props = {
  children: React.ReactNode;
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

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getBaseUrlFromHeaders();
  const pageUrl = `${baseUrl}/worldcup/2026`;
  const ogImageUrl = `${baseUrl}/${encodeURIComponent('選考予想OGP.png')}`;

  const title = 'W杯 2026 メンバー予想';
  const description = 'ログインして国別に自分の予想を作成できます';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function Wc2026Layout({ children }: Props) {
  return <>{children}</>;
}

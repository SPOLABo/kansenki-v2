'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export function Wc2026LoginCta(props: { redirectTo: string }) {
  const { user, loading } = useAuth();
  const { redirectTo } = props;

  if (loading) return null;
  if (user) return null;

  const redirect = redirectTo.startsWith('/') ? redirectTo : '/worldcup/2026';

  return (
    <div className="mt-4 flex justify-center">
      <Link
        href={`/login?redirect=${encodeURIComponent(redirect)}`}
        className="flex w-full max-w-[320px] items-center justify-center rounded-2xl px-4 py-3 text-sm bg-orange-500 text-white font-semibold hover:bg-orange-400 transition-colors"
      >
        ログインして予想する
      </Link>
    </div>
  );
}

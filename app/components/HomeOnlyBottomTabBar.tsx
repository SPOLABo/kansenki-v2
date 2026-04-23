'use client';

import { usePathname } from 'next/navigation';
import BottomTabBar from './BottomTabBar';

export default function HomeOnlyBottomTabBar() {
  const pathname = usePathname();

  const show =
    pathname === '/top-next' ||
    pathname.startsWith('/top-next/') ||
    pathname === '/worldcup/2026' ||
    pathname.startsWith('/worldcup/2026/') ||
    pathname === '/home' ||
    pathname.startsWith('/home/') ||
    pathname === '/timeline' ||
    pathname.startsWith('/timeline/') ||
    pathname === '/players' ||
    pathname.startsWith('/players/') ||
    pathname === '/events' ||
    pathname.startsWith('/events/') ||
    pathname === '/mypage' ||
    pathname.startsWith('/mypage/');

  if (!show) return null;

  return <BottomTabBar />;
}

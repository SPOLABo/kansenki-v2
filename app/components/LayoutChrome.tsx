'use client';

import { usePathname } from 'next/navigation';
import MenuDrawer from './MenuDrawer';
import HomeOnlyBottomTabBar from './HomeOnlyBottomTabBar';

export default function LayoutChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideGlobalHeader = Boolean(pathname && pathname.startsWith('/worldcup/2026/')) && pathname !== '/worldcup/2026';
  const mainClassName = hideGlobalHeader ? 'pb-24' : 'pt-16 pb-24';

  return (
    <div className="relative min-h-screen">
      {!hideGlobalHeader ? <MenuDrawer /> : null}
      <main className={mainClassName}>{children}</main>
      <HomeOnlyBottomTabBar />
    </div>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import MenuDrawer from './MenuDrawer';
import HomeOnlyBottomTabBar from './HomeOnlyBottomTabBar';

export default function LayoutChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideGlobalHeader = Boolean(pathname && pathname.startsWith('/worldcup/2026/')) && pathname !== '/worldcup/2026';
  const hideGlobalFooter = pathname === '/events/premier-league-final-table';
  const mainClassName = `${hideGlobalHeader ? '' : 'pt-16'}${hideGlobalFooter ? '' : ' pb-24'}`.trim();

  return (
    <div className="relative min-h-screen">
      {!hideGlobalHeader ? <MenuDrawer /> : null}
      <main className={mainClassName}>{children}</main>
      {!hideGlobalFooter ? <HomeOnlyBottomTabBar /> : null}
    </div>
  );
}

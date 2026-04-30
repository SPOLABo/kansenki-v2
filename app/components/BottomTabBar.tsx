'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, User } from 'lucide-react';
import type { ComponentType } from 'react';

type TabItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  external?: boolean;
};

const tabs: TabItem[] = [
  { label: '新着', href: '/top-next', icon: Home },
  { label: 'タイムライン', href: '/timeline', icon: LayoutGrid },
  { label: 'マイページ', href: '/mypage', icon: User },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const visibleTabs = tabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-auto touch-manipulation border-t border-white/10 bg-slate-950/80 backdrop-blur">
      <div
        className="mx-auto grid max-w-xl px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, visibleTabs.length)}, minmax(0, 1fr))` }}
      >
        {visibleTabs.map((t) => {
          const active =
            !t.external && (pathname === t.href || (t.href !== '/' && pathname?.startsWith(`${t.href}/`)));
          const Icon = t.icon;

          return (
            t.external ? (
              <a
                key={t.href}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  `flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition-colors ` +
                  'text-white/60 hover:bg-white/5 hover:text-white/80'
                }
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold leading-none">{t.label}</span>
              </a>
            ) : (
              <Link
                key={t.href}
                href={t.href}
                className={
                  `flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition-colors ` +
                  (active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/80')
                }
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold leading-none">{t.label}</span>
              </Link>
            )
          );
        })}
      </div>
    </nav>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

// 型定義を明確化
interface MenuItem {
  label: string;
  href: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
  isSingleLink?: boolean;
  href?: string;
}

const menuConfig: MenuSection[] = [
  {
    title: 'マイページ',
    items: [],
    isSingleLink: true,
    href: '/mypage',
  },
  {
    title: '観戦記を探す',
    items: [
      { label: 'イングランド', href: '/category/england' },
      { label: 'スペイン', href: '/category/spain' },
      { label: 'イタリア', href: '/category/italy' },
      { label: 'フランス', href: '/category/france' },
      { label: 'ドイツ', href: '/category/germany' },
      { label: 'クラブワールドカップ', href: '/category/club-world-cup' },
      { label: 'ジャパンツアー', href: '/category/japan-tour' },
      { label: 'その他', href: '/category/other' },
    ],
  },
  {
    title: '現地観戦情報',
    items: [
      { label: '試合チケット情報', href: '/ticket-info' },
      { label: 'おススメスポット', href: '#' },
      { label: 'スタジアム・ホテル地図', href: '/map' },
    ],
  },
  {
    title: 'SNS',
    items: [
      { label: 'Note', href: '#' },
      { label: 'X', href: 'https://x.com/FOOTBALLTOP2024' },
      { label: 'Youtube', href: '#' },
    ],
  },
  {
    title: 'W杯',
    items: [
      { label: '関連記事', href: '/worldcup/2026' },
      { label: '予想', href: '/worldcup/2026' },
    ],
  },
  {
    title: 'アップデート情報',
    items: [{ label: '更新履歴', href: '/updates' }],
  },
  {
    title: 'FOOTBALLTOP',
    items: [
      { label: 'FOOTBALL TOP', href: 'https://www.locofootball.com/' },
      { label: '利用規約', href: '/terms' },
      { label: 'プライバシーポリシー', href: '/privacy' },
      { label: 'ご利用ガイド', href: '/guide' },
    ],
  },
];

const wc2026MenuConfig: MenuSection[] = [
  {
    title: 'マイページ',
    items: [],
    isSingleLink: true,
    href: '/mypage',
  },
];

const topNextMenuConfig: MenuSection[] = [
  {
    title: 'マイページ',
    items: [],
    isSingleLink: true,
    href: '/mypage',
  },
  {
    title: 'プライバシーポリシー',
    items: [],
    isSingleLink: true,
    href: '/privacy',
  },
];

export default function MenuDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  useTheme();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const isWc2026 = pathname === '/worldcup/2026';
  const isWc2026Path = pathname.startsWith('/worldcup/2026');
  const isTopNext = pathname === '/top-next';
  const isTopNextPath = pathname.startsWith('/top-next');
  const isPrivacyPath = pathname.startsWith('/privacy');
  const isTermsPath = pathname.startsWith('/terms');
  const isTimelinePath = pathname.startsWith('/timeline');
  const isEventsPath = pathname.startsWith('/events');
  const isPlFinalTablePath = pathname.startsWith('/events/premier-league-final-table');

  const activeMenuConfig = isTopNextPath || isPrivacyPath || isTermsPath ? topNextMenuConfig : isWc2026Path ? wc2026MenuConfig : menuConfig;
  const isSpocaleHeader = isWc2026 || isTopNext || isEventsPath || isPrivacyPath || isTermsPath || isTimelinePath;
  const isSpocaleLogoWide = isTopNext || isPrivacyPath || isTermsPath || isTimelinePath;

  const toggleMenu = () => setIsOpen(!isOpen);
  const handleSectionClick = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const shouldHideHamburgerMenu = isPrivacyPath || isTermsPath || isTopNextPath || isTimelinePath || isWc2026 || isPlFinalTablePath;

  return (
    <>
      <header
        className={
          `fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-center px-4 border-b ` +
          (isSpocaleHeader
            ? 'bg-black border-white/10'
            : 'bg-white dark:bg-black border-gray-200 dark:border-gray-800')
        }
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="cursor-default">
            {isSpocaleHeader ? (
              <Image
                src={isTopNextPath ? '/スクリーンショット%202026-04-27%2015.30.23.jpg' : '/スポカレロゴ.png'}
                alt="スポカレ"
                width={isTopNextPath ? 220 : isSpocaleLogoWide ? 168 : 140}
                height={isTopNextPath ? 52 : isSpocaleLogoWide ? 48 : 40}
                priority
                style={{ width: 'auto', height: 'auto' }}
                sizes={isTopNextPath ? '220px' : isSpocaleLogoWide ? '168px' : '140px'}
              />
            ) : (
              <>
                <div className="dark:hidden">
                  <Image
                    src="/footballtop-logo-12.png"
                    alt="Football Top Logo"
                    width={140}
                    height={40}
                    priority
                    style={{ height: 'auto' }}
                    sizes="140px"
                  />
                </div>
                <div className="hidden dark:block">
                  <Image
                    src="/footballtop-logo-13.png"
                    alt="Football Top Logo"
                    width={140}
                    height={40}
                    priority
                    style={{ height: 'auto' }}
                    sizes="140px"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {isWc2026 || isPlFinalTablePath ? (
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => router.push('/top-next')}
              className="text-sm font-bold text-white/90 hover:text-white"
            >
              ← 戻る
            </button>
          </div>
        ) : null}

        {!shouldHideHamburgerMenu ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <button onClick={toggleMenu} className="focus:outline-none">
              <svg
                className={
                  `w-6 h-6 ` +
                  (isWc2026 ? 'text-white/90' : 'text-gray-700 dark:text-gray-300')
                }
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              </svg>
            </button>
          </div>
        ) : null}
      </header>

      {!shouldHideHamburgerMenu ? (
        <>
          {isOpen && <div className="fixed inset-0 z-[9999]" onClick={toggleMenu} />}

          <aside
            className={`fixed top-0 right-0 w-[70vw] h-screen z-[10000] bg-white dark:bg-gray-900 transition-transform duration-300 ease-in-out transform ${
              isOpen ? 'translate-x-0' : 'translate-x-full'
            } ${!isOpen ? 'invisible' : ''}`}
          >
            <div className="h-full overflow-y-auto pb-8 text-black dark:text-white font-sans">
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
                <button
                  onClick={toggleMenu}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors duration-200 focus:outline-none"
                  aria-label="メニューを閉じる"
                >
                  <svg
                    className="w-6 h-6 text-gray-700 dark:text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                {activeMenuConfig.map((section) => (
                  <div key={section.title} className="border-b border-gray-200 dark:border-gray-700">
                    {section.isSingleLink ? (
                      <Link href={section.href!} onClick={toggleMenu} className="block w-full px-4 py-3 text-left text-base font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors duration-200 rounded-md">
                        {section.title}
                      </Link>
                    ) : (
                      <>
                        <button onClick={() => handleSectionClick(section.title)} className="w-full flex justify-between items-center px-4 py-3 text-left text-base font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors duration-200 rounded-md">
                          <span>{section.title}</span>
                          <svg className={`w-5 h-5 transform transition-transform duration-200 ${openSection === section.title ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        {openSection === section.title && (
                          <div className="pl-4 mt-2 mb-3 space-y-2">
                            {section.items.map((item) => (
                              <Link key={item.label} href={item.href} onClick={toggleMenu} className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200">
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
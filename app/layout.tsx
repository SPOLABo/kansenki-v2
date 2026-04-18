import './globals.css';
import LayoutChrome from './components/LayoutChrome';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { LoadingAnimationWrapper } from '@/components/ui/LoadingAnimationWrapper';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>FOOTBALLTOP</title>
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <LoadingAnimationWrapper>
              <LayoutChrome>
                {children}
                <Analytics />
              </LayoutChrome>
            </LoadingAnimationWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

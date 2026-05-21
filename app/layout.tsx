import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import Navigation from '../components/Navigation';
import ThemeToggle from '../components/ThemeToggle';
import { CreditCard } from 'lucide-react';

const beVietnamPro = Be_Vietnam_Pro({
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin', 'vietnamese'],
  variable: '--font-be-vietnam-pro',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Fund Buddy - Quản Lý Quỹ Nhóm Tiện Lợi',
  description: 'Ghi nhật ký ăn chơi, chia hóa đơn tự động và nhắc nợ Zalo cực nhanh cùng bạn bè.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fund Buddy',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) { console.log('SW registered:', reg.scope); },
                    function(err) { console.log('SW registration failed:', err); }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body className="h-full bg-zinc-100 dark:bg-zinc-950 font-sans transition-colors duration-200" suppressHydrationWarning>
        {/* Mobile Viewport Container */}
        <div className="w-full max-w-md mx-auto min-h-screen bg-zinc-50 dark:bg-zinc-900 shadow-2xl dark:shadow-black/50 border-x border-zinc-200/50 dark:border-zinc-800/50 flex flex-col relative pb-32">
          
          {/* Header */}
          <header className="sticky top-0 z-40 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
                <CreditCard className="w-5.5 h-5.5" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                  Fund Buddy
                </h1>
                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">
                  Quản lý quỹ nhóm
                </p>
              </div>
            </div>
            <ThemeToggle />
          </header>

          {/* Main Content */}
          <main className="flex-1 px-4 py-6 overflow-y-auto">
            {children}
          </main>

          {/* Bottom Floating Navigation */}
          <Navigation />
        </div>
      </body>
    </html>
  );
}

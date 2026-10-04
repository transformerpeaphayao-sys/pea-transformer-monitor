import type { Metadata, Viewport } from 'next';
import './globals.css';
import TopNavbar from '@/components/TopNavbar';

export const metadata: Metadata = {
  title: 'ระบบบันทึกและตรวจสอบโหลดหม้อแปลง PEA',
  description: 'PEA Transformer Load Monitoring & Analytics System (Next.js 15 PWA)',
  manifest: '/manifest.json',
  icons: {
    icon: '/pea-logo.png',
    apple: '/pea-logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#741b77',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="light scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Prompt:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 antialiased font-sans" suppressHydrationWarning>
        {/* PEA Brand Accent Stripe */}
        <div className="h-1 bg-gradient-to-r from-[#741b77] via-[#8e24aa] to-[#f39c12]" />

        {/* Top Header Navigation */}
        <TopNavbar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-h-0">{children}</main>

        {/* Client Service Worker Registration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('[PWA] ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('[PWA] ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

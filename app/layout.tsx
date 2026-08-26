import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Suspense } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { localeAlternates } from '@/lib/locale-metadata';
import LocaleDocumentLanguage from '@/components/LocaleDocumentLanguage';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'SafeUnfollow – Private Instagram Data Analyzer',
  description:
    'Analyze your official Instagram Data ZIP for non-followers, mutuals, followers-only accounts, and follower changes. No login, OAuth, API, or account connection.',
  keywords: [
    'instagram unfollower tracker',
    'who unfollowed me instagram',
    'instagram unfollow checker',
    'instagram followers tracker',
    'see who unfollowed me instagram',
    'instagram data analyzer',
    'instagram data export analyzer',
  ],
  metadataBase: new URL('https://safeunfollow.com'),
  openGraph: {
    title: 'SafeUnfollow – Private Instagram Data Analyzer',
    description: 'Turn your official Instagram Data ZIP into useful relationship insights. No login or account connection.',
    url: 'https://safeunfollow.com',
    siteName: 'SafeUnfollow',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SafeUnfollow – Private Instagram Data Analyzer',
    description: 'Analyze non-followers, mutuals, followers-only accounts, and changes from your Instagram Data ZIP.',
  },
  robots: { index: true, follow: true },
  alternates: localeAlternates(),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} data-scroll-behavior="smooth">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-8QW7KP3MZ7"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-8QW7KP3MZ7');
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50">
        <LocaleDocumentLanguage />
        <Suspense>
          <Header />
        </Suspense>
        <main className="flex-1 flex flex-col">{children}</main>
        <Suspense>
          <Footer />
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}

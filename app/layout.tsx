import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Suspense } from 'react';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'SafeUnfollow – See Who Unfollowed You on Instagram | Free & Safe',
  description:
    'Track who unfollowed you on Instagram safely. No login required, no ban risk. 100% client-side processing.',
  keywords: [
    'instagram unfollower tracker',
    'who unfollowed me instagram',
    'instagram unfollow checker',
    'instagram followers tracker',
    'see who unfollowed me instagram',
  ],
  metadataBase: new URL('https://safeunfollow.com'),
  openGraph: {
    title: 'SafeUnfollow – See Who Unfollowed You on Instagram',
    description: 'Track who unfollowed you on Instagram. No login required. 100% private.',
    url: 'https://safeunfollow.com',
    siteName: 'SafeUnfollow',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SafeUnfollow – Instagram Unfollow Tracker',
    description: 'Track who unfollowed you on Instagram. No login required. 100% private.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
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
        <Suspense>
          <Header />
        </Suspense>
        <main className="flex-1 flex flex-col">{children}</main>
        <Suspense>
          <Footer />
        </Suspense>
      </body>
    </html>
  );
}

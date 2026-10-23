import type { Metadata } from 'next';

// Static 1200x630 share images in public/og. Every page sets both Open Graph and
// Twitter fields so a page never inherits the homepage title or image on X/Threads.
export const DEFAULT_OG_IMAGE = '/og/default.png';
export const PAGE_OG_IMAGES: Record<string, string> = {
  'threads-unfollow-checker': '/og/threads.png',
  'tiktok-unfollow-checker': '/og/tiktok.png',
};

export function socialMetadata({ title, description, url, locale, image = DEFAULT_OG_IMAGE, publishedTime }: {
  title: string;
  description: string;
  url: string;
  locale?: string;
  image?: string;
  publishedTime?: string;
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const images = [{ url: image, width: 1200, height: 630, alt: title }];
  const base = { title, description, url, siteName: 'SafeUnfollow', images, ...(locale ? { locale } : {}) };
  return {
    openGraph: publishedTime ? { ...base, type: 'article', publishedTime } : { ...base, type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

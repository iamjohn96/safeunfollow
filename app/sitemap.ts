import type { MetadataRoute } from 'next';
import { getMarkdownDocuments } from '@/lib/markdown-content';

const BASE_URL = 'https://safeunfollow.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/upload', '/guide', '/snapshots', '/privacy', '/terms'];
  const locales = ['pt', 'ru', 'es'];

  const staticEntries: MetadataRoute.Sitemap = routes.map(route => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' || route === '/blog' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/upload' || route === '/guide' ? 0.8 : 0.5,
  }));

  const localizedEntries: MetadataRoute.Sitemap = locales.flatMap(locale => routes.map(route => ({
    url: `${BASE_URL}/${locale}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' as const : 'monthly' as const,
    priority: route === '' ? 0.9 : route === '/upload' || route === '/guide' ? 0.8 : 0.5,
  })));

  staticEntries.push({ url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 });

  const contentEntries: MetadataRoute.Sitemap = (['blog', 'pillars'] as const).flatMap(section =>
    getMarkdownDocuments(section).map(({ data }) => ({
      url: `${BASE_URL}/${section}/${data.slug}`,
      lastModified: new Date(data.date),
      changeFrequency: 'monthly' as const,
      priority: section === 'pillars' ? 0.8 : 0.7,
    })),
  );

  return [...staticEntries, ...localizedEntries, ...contentEntries];
}

import type { MetadataRoute } from 'next';
import { getMarkdownDocuments } from '@/lib/markdown-content';

const BASE_URL = 'https://safeunfollow.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/upload', '/guide', '/snapshots', '/privacy', '/terms', '/blog'];

  const staticEntries: MetadataRoute.Sitemap = routes.map(route => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' || route === '/blog' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/upload' || route === '/guide' ? 0.8 : 0.5,
  }));

  const contentEntries: MetadataRoute.Sitemap = (['blog', 'pillars'] as const).flatMap(section =>
    getMarkdownDocuments(section).map(({ data }) => ({
      url: `${BASE_URL}/${section}/${data.slug}`,
      lastModified: new Date(data.date),
      changeFrequency: 'monthly' as const,
      priority: section === 'pillars' ? 0.8 : 0.7,
    })),
  );

  return [...staticEntries, ...contentEntries];
}

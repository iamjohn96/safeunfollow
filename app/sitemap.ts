import type { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BASE_URL = 'https://safeunfollow.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/upload', '/guide', '/snapshots', '/privacy', '/terms'];

  const staticEntries: MetadataRoute.Sitemap = routes.map(route => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/upload' || route === '/guide' ? 0.8 : 0.5,
  }));

  const blogDir = path.join(process.cwd(), 'content/blog');
  const blogEntries: MetadataRoute.Sitemap = fs
    .readdirSync(blogDir)
    .filter(f => f.endsWith('.md'))
    .map(file => {
      const raw = fs.readFileSync(path.join(blogDir, file), 'utf-8');
      const { data } = matter(raw);
      return {
        url: `${BASE_URL}/blog/${data.slug}`,
        lastModified: new Date(data.date),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      };
    });

  return [...staticEntries, ...blogEntries];
}

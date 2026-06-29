import type { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BASE_URL = 'https://safeunfollow.com';
const CONTENT_ROOT = path.join(process.cwd(), 'content');

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/upload', '/guide', '/snapshots', '/privacy', '/terms'];

  const staticEntries: MetadataRoute.Sitemap = routes.map(route => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/upload' || route === '/guide' ? 0.8 : 0.5,
  }));

  const contentDirs = [path.join(CONTENT_ROOT, 'blog'), path.join(CONTENT_ROOT, 'pillars')];
  const blogEntries: MetadataRoute.Sitemap = contentDirs.flatMap(directory => fs
    .readdirSync(directory)
    .filter(f => f.endsWith('.md') && f !== 'index.md')
    .map(file => {
      const raw = fs.readFileSync(path.join(directory, file), 'utf-8');
      const { data } = matter(raw);
      return {
        url: `${BASE_URL}/blog/${data.slug}`,
        lastModified: new Date(data.date),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      };
    }));

  return [...staticEntries, ...blogEntries];
}

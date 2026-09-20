import type { MetadataRoute } from 'next';
import { getMarkdownDocuments, availableDocumentLangs, type ContentLang } from '@/lib/markdown-content';

const BASE_URL = 'https://safeunfollow.com';
const localeCodes = ['en', 'pt', 'ru', 'es'] as const;

function languageAlternates(route: string) {
  return Object.fromEntries(localeCodes.map(locale => [
    locale,
    locale === 'en' ? `${BASE_URL}${route}` : `${BASE_URL}/${locale}${route}`,
  ]));
}

function blogUrl(slug: string, lang: ContentLang): string {
  return lang === 'en' ? `${BASE_URL}/blog/${slug}` : `${BASE_URL}/${lang}/blog/${slug}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/upload', '/guide', '/snapshots', '/privacy', '/terms', '/blog'];
  const locales = ['pt', 'ru', 'es'];

  const staticEntries: MetadataRoute.Sitemap = routes.map(route => ({
    url: `${BASE_URL}${route}`,
    changeFrequency: route === '' || route === '/blog' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/upload' || route === '/guide' ? 0.8 : route === '/blog' ? 0.5 : 0.5,
    alternates: { languages: languageAlternates(route) },
  }));

  const localizedEntries: MetadataRoute.Sitemap = locales.flatMap(locale => routes.map(route => ({
    url: `${BASE_URL}/${locale}${route}`,
    changeFrequency: route === '' || route === '/blog' ? 'weekly' as const : 'monthly' as const,
    priority: route === '' ? 0.9 : route === '/upload' || route === '/guide' ? 0.8 : 0.5,
    alternates: { languages: languageAlternates(route) },
  })));

  const pillarEntries: MetadataRoute.Sitemap = getMarkdownDocuments('pillars').map(({ data }) => ({
    url: `${BASE_URL}/pillars/${data.slug}`,
    lastModified: new Date(data.date),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const blogEntries: MetadataRoute.Sitemap = getMarkdownDocuments('blog').flatMap(({ data }) => {
    const langs = availableDocumentLangs('blog', data.slug);
    const alternates = Object.fromEntries(langs.map(lang => [lang, blogUrl(data.slug, lang)]));
    return langs.map(lang => {
      const document = getMarkdownDocuments('blog', lang).find(item => item.data.slug === data.slug);
      return {
        url: blogUrl(data.slug, lang),
        lastModified: new Date(document?.data.date ?? data.date),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
        alternates: { languages: { 'x-default': blogUrl(data.slug, 'en'), ...alternates } },
      };
    });
  });

  return [...staticEntries, ...localizedEntries, ...pillarEntries, ...blogEntries];
}

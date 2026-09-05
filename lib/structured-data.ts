import type { Lang } from '@/utils/i18n';

const BASE_URL = 'https://safeunfollow.com';

const descriptions: Record<Lang, string> = {
  en: 'Analyze mutuals, one-way follows, and follower changes locally from your official Instagram Data ZIP. No Instagram login or account connection.',
  pt: 'Analise conexões mútuas, relações unilaterais e mudanças de seguidores localmente usando o ZIP oficial do Instagram, sem login ou conexão da conta.',
  ru: 'Локально анализируйте взаимные и односторонние подписки и изменения подписчиков из официального ZIP Instagram, без входа и подключения аккаунта.',
  es: 'Analiza relaciones mutuas, unidireccionales y cambios de seguidores localmente desde el ZIP oficial de Instagram, sin login ni conexión de cuenta.',
};

export function homeStructuredData(lang: Lang) {
  const localizedUrl = lang === 'en' ? BASE_URL : `${BASE_URL}/${lang}`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: BASE_URL,
        name: 'SafeUnfollow',
        inLanguage: lang,
      },
      {
        '@type': 'WebApplication',
        '@id': `${BASE_URL}/#application`,
        name: 'SafeUnfollow',
        url: localizedUrl,
        description: descriptions[lang],
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any device with a modern web browser',
        browserRequirements: 'Requires JavaScript and a modern web browser',
        isAccessibleForFree: true,
        inLanguage: lang,
        featureList: [
          'Mutual follower analysis',
          'One-way follow analysis',
          'Follower snapshot comparison',
          'Local browser processing',
          'No Instagram login or account connection',
        ],
      },
    ],
  };
}

export function articleStructuredData(article: {
  title: string;
  description: string;
  date: string;
  slug: string;
}) {
  const url = `${BASE_URL}/blog/${article.slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.date,
    mainEntityOfPage: url,
    url,
    author: { '@type': 'Organization', name: 'SafeUnfollow', url: BASE_URL },
    publisher: { '@type': 'Organization', name: 'SafeUnfollow', url: BASE_URL },
  };
}

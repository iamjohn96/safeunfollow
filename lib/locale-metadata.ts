import type { Metadata } from 'next';
import type { Lang } from '@/utils/i18n';
import { landingSeo } from '@/lib/platform-landing-copy';
import { PAGE_OG_IMAGES, socialMetadata } from '@/lib/social-metadata';

export const PUBLIC_LOCALES = ['pt', 'ru', 'es'] as const;
export type PublicLocale = typeof PUBLIC_LOCALES[number];

export function isPublicLocale(value: string): value is PublicLocale {
  return PUBLIC_LOCALES.includes(value as PublicLocale);
}

const seo = {
  en: { title: 'Private Instagram Data Analyzer', description: 'Analyze mutuals, one-way follows, and follower changes locally from your official Instagram Data ZIP.' },
  pt: { title: 'Analisador privado de dados do Instagram', description: 'Analise conexões mútuas, relações unilaterais e mudanças de seguidores localmente usando o ZIP oficial do Instagram.' },
  ru: { title: 'Приватный анализатор данных Instagram', description: 'Локально анализируйте взаимные и односторонние подписки и изменения подписчиков из официального ZIP Instagram.' },
  es: { title: 'Analizador privado de datos de Instagram', description: 'Analiza relaciones mutuas, unidireccionales y cambios de seguidores localmente desde el ZIP oficial de Instagram.' },
} satisfies Record<Lang, { title: string; description: string }>;

const openGraphLocales: Record<Lang, string> = {
  en: 'en_US', pt: 'pt_BR', ru: 'ru_RU', es: 'es_ES',
};

const pageNames: Record<string, Record<Lang, string>> = {
  upload: { en: 'Upload Instagram Data ZIP', pt: 'Enviar ZIP de dados do Instagram', ru: 'Загрузить ZIP с данными Instagram', es: 'Subir ZIP de datos de Instagram' },
  guide: { en: 'Instagram Data Download Guide', pt: 'Guia para baixar dados do Instagram', ru: 'Как скачать данные Instagram', es: 'Guía para descargar datos de Instagram' },
  snapshots: { en: 'Instagram Snapshot History', pt: 'Histórico de capturas do Instagram', ru: 'История снимков Instagram', es: 'Historial de instantáneas de Instagram' },
  privacy: { en: 'Privacy Policy', pt: 'Política de Privacidade', ru: 'Политика конфиденциальности', es: 'Política de Privacidad' },
  terms: { en: 'Terms of Service', pt: 'Termos de Serviço', ru: 'Условия использования', es: 'Términos del Servicio' },
  cancel: { en: 'Cancel Premium', pt: 'Cancelar Premium', ru: 'Отменить Премиум', es: 'Cancelar Premium' },
  blog: { en: 'Instagram Data Analyzer Guide', pt: 'Guia do analisador de dados do Instagram', ru: 'Гид по анализатору данных Instagram', es: 'Guía del analizador de datos de Instagram' },
  'threads-unfollow-checker': landingSeo.threads.name,
  'tiktok-unfollow-checker': landingSeo.tiktok.name,
};

// Pages whose search snippet must describe something other than the Instagram analyzer.
const pageDescriptions: Partial<Record<string, Record<Lang, string>>> = {
  guide: {
    en: 'Step-by-step guide to download your Instagram data as JSON (Followers and following, All time), plus the Threads and TikTok export settings.',
    pt: 'Guia passo a passo para baixar seus dados do Instagram em JSON (Seguidores e seguindo, Todo o período), além das configurações do Threads e do TikTok.',
    ru: 'Пошаговая инструкция: как скачать данные Instagram в JSON (подписчики и подписки, за всё время), а также настройки экспорта Threads и TikTok.',
    es: 'Guía paso a paso para descargar tus datos de Instagram en JSON (Seguidores y seguidos, Todo el período), más los ajustes de Threads y TikTok.',
  },
  upload: {
    en: 'Upload your official Instagram, Threads, or TikTok data export to see who doesn\'t follow you back, fans, and mutuals. Analyzed in your browser, no login.',
    pt: 'Envie a exportação oficial do Instagram, Threads ou TikTok e veja quem não segue você de volta, fãs e mútuos. Análise no navegador, sem login.',
    ru: 'Загрузите официальный экспорт Instagram, Threads или TikTok и узнайте, кто не подписан на вас в ответ. Анализ в браузере, без входа.',
    es: 'Sube la exportación oficial de Instagram, Threads o TikTok y mira quién no te sigue de vuelta, fans y mutuos. Análisis en el navegador, sin login.',
  },
  blog: {
    en: 'Learn how to analyze an official Instagram data export for mutuals, one-way follows, and follower changes without sharing your login.',
    pt: 'Aprenda a analisar a exportação oficial de dados do Instagram para ver conexões mútuas, relações unilaterais e mudanças de seguidores sem login.',
    ru: 'Как анализировать официальный экспорт данных Instagram: взаимные и односторонние подписки и изменения подписчиков без передачи пароля.',
    es: 'Aprende a analizar la exportación oficial de datos de Instagram: relaciones mutuas, unidireccionales y cambios de seguidores sin compartir tu login.',
  },
  'threads-unfollow-checker': landingSeo.threads.description,
  'tiktok-unfollow-checker': landingSeo.tiktok.description,
};

export function localeAlternates(path = ''): Metadata['alternates'] {
  return {
    canonical: path || '/',
    languages: {
      'x-default': path || '/', en: path || '/', pt: `/pt${path}`, ru: `/ru${path}`, es: `/es${path}`,
    },
  };
}

export function localizedMetadata(lang: Lang, page?: keyof typeof pageNames): Metadata {
  // Route params are untrusted at runtime. Invalid first path segments still run
  // generateMetadata before the locale layout turns them into a normal 404.
  const safeLang: Lang = lang in seo ? lang : 'en';
  const base = seo[safeLang];
  const suffix = page ? `/${page}` : '';
  const canonical = safeLang === 'en' ? (suffix || '/') : `/${safeLang}${suffix}`;
  const title = page ? `${pageNames[page][safeLang]} | SafeUnfollow` : `SafeUnfollow – ${base.title}`;
  const description = (page && pageDescriptions[page]?.[safeLang]) || base.description;
  return {
    title, description, alternates: { ...localeAlternates(suffix), canonical },
    ...socialMetadata({ title, description, url: canonical, locale: openGraphLocales[safeLang], image: page ? PAGE_OG_IMAGES[page] : undefined }),
  };
}

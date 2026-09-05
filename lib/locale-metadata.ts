import type { Metadata } from 'next';
import type { Lang } from '@/utils/i18n';

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
  return {
    title, description: base.description, alternates: { ...localeAlternates(suffix), canonical },
    openGraph: { title, description: base.description, url: canonical, siteName: 'SafeUnfollow', type: 'website', locale: openGraphLocales[safeLang] },
  };
}

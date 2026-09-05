'use client';

import { translations, type Lang, type TranslationKey } from './translations';

const SUPPORTED_LANGS: Lang[] = ['en', 'pt', 'ru', 'es'];

export function langFromPathname(pathname: string): Lang {
  const pathLang = pathname.split('/').filter(Boolean)[0];
  return SUPPORTED_LANGS.includes(pathLang as Lang) ? pathLang as Lang : 'en';
}

export function detectLang(searchParams?: URLSearchParams): Lang {
  if (typeof window === 'undefined') return 'en';

  const urlLang = searchParams?.get('lang') ?? new URLSearchParams(window.location.search).get('lang');
  if (urlLang && SUPPORTED_LANGS.includes(urlLang as Lang)) {
    return urlLang as Lang;
  }

  const pathLang = langFromPathname(window.location.pathname);
  if (pathLang !== 'en' || window.location.pathname.split('/').filter(Boolean)[0] === 'en') return pathLang;

  const browserLang = navigator.language.slice(0, 2).toLowerCase();
  if (SUPPORTED_LANGS.includes(browserLang as Lang)) {
    return browserLang as Lang;
  }

  return 'en';
}

export function localizedPath(path: string, lang: Lang): string {
  if (lang === 'en') return path;
  return `/${lang}${path === '/' ? '' : path}`;
}

export function t(key: TranslationKey, lang: Lang, vars?: Record<string, string | number>): string {
  const text = translations[lang][key] ?? translations['en'][key] ?? key;
  if (!vars) return text;
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), text);
}

export type { Lang, TranslationKey };

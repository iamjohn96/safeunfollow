'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const supportedLocales = new Set(['en', 'pt', 'ru', 'es']);

export default function LocaleDocumentLanguage() {
  const pathname = usePathname();

  useEffect(() => {
    const locale = pathname.split('/').filter(Boolean)[0] ?? 'en';
    document.documentElement.lang = supportedLocales.has(locale) ? locale : 'en';
  }, [pathname]);

  return null;
}

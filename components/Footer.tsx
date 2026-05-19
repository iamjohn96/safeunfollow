'use client';

import Link from 'next/link';
import { t, detectLang, type Lang } from '@/utils/i18n';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const LANGS = ['en', 'ko', 'ja', 'es'] as const;
const LANG_LABELS: Record<string, string> = { en: 'EN', ko: '한국어', ja: '日本語', es: 'ES' };

export function Footer() {
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    setLang(detectLang(searchParams));
  }, [searchParams]);

  const langParam = (l: string) => l !== 'en' ? `?lang=${l}` : '';

  return (
    <footer className="border-t border-zinc-100 bg-white mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-zinc-400">
          <span className="font-semibold text-zinc-700">Safe<span className="text-pink-600">Unfollow</span></span>
          <span className="hidden sm:inline">—</span>
          <span>{t('footer.tagline', lang)}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link href={`/privacy${langParam(lang)}`} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            {t('footer.privacy', lang)}
          </Link>
          <Link href={`/terms${langParam(lang)}`} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            {t('footer.terms', lang)}
          </Link>
          <Link href={`/guide${langParam(lang)}`} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            {t('footer.guide', lang)}
          </Link>
          <Link href="/cancel" className="text-zinc-400 hover:text-zinc-700 transition-colors">
            구독 취소
          </Link>
        </div>

        {/* Language switcher */}
        <div className="flex items-center gap-2 text-xs">
          {LANGS.map(l => (
            <a
              key={l}
              href={`/?lang=${l}`}
              className={`px-2 py-1 rounded transition-colors ${l === lang ? 'bg-pink-50 text-pink-600 font-semibold' : 'text-zinc-400 hover:text-zinc-700'}`}
            >
              {LANG_LABELS[l]}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

'use client';

import Link from 'next/link';
import { t, langFromPathname, localizedPath } from '@/utils/i18n';
import { usePathname } from 'next/navigation';
import { SentenceLines } from '@/components/SentenceLines';

const LANGS = ['en', 'pt', 'ru', 'es'] as const;
const LANG_LABELS: Record<string, string> = { en: 'EN', pt: 'PT', ru: 'RU', es: 'ES' };

export function Footer() {
  const pathname = usePathname();
  const lang = langFromPathname(pathname);
  const links = [
    { href: '/privacy', label: t('footer.privacy', lang) },
    { href: '/terms', label: t('footer.terms', lang) },
    { href: '/guide', label: t('footer.guide', lang) },
    { href: '/cancel', label: t('footer.cancel', lang) },
  ];

  return (
    <footer className="border-t border-zinc-100 bg-white mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col items-center gap-5 text-center">
        {/* Row 1: brand and tagline, one sentence per line */}
        <div className="space-y-1">
          <p className="font-semibold text-zinc-700">Safe<span className="text-pink-600">Unfollow</span></p>
          <p className="text-sm text-zinc-400 leading-relaxed"><SentenceLines text={t('footer.tagline', lang)} /></p>
        </div>

        {/* Row 2: links on a single line (wraps only on narrow screens) */}
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          {links.map(link => (
            <Link key={link.href} href={localizedPath(link.href, lang)} className="whitespace-nowrap text-zinc-400 hover:text-zinc-700 transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Row 3: language switcher */}
        <div className="flex items-center gap-2 text-xs">
          {LANGS.map(l => (
            <a
              key={l}
              href={localizedPath('/', l)}
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

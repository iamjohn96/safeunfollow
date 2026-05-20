'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { t, detectLang, type Lang } from '@/utils/i18n';
import { useState, useEffect } from 'react';

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<Lang>('en');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setLang(detectLang(searchParams));
  }, [searchParams]);

  const langParam = lang !== 'en' ? `?lang=${lang}` : '';

  const navLinks = [
    { href: `/guide${langParam}`, label: t('nav.guide', lang) },
    { href: `/snapshots${langParam}`, label: t('nav.snapshots', lang) },
    { href: '/blog', label: 'Blog' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-zinc-100">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={`/${langParam}`} className="font-bold text-zinc-900 text-base tracking-tight hover:text-pink-600 transition-colors">
          Safe<span className="text-pink-600">Unfollow</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6" aria-label="Main navigation">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${pathname.startsWith(link.href.split('?')[0]) ? 'text-pink-600' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={`/upload${langParam}`}
            className="text-sm font-semibold bg-pink-600 hover:bg-pink-700 text-white px-4 py-1.5 rounded-full transition-colors"
          >
            {t('nav.upload', lang)}
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          className="sm:hidden p-2 text-zinc-500 hover:text-zinc-900"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="sm:hidden border-t border-zinc-100 bg-white px-4 pb-4 pt-2 flex flex-col gap-3" aria-label="Mobile navigation">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-zinc-700 hover:text-pink-600 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={`/upload${langParam}`}
            className="text-sm font-semibold bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-full text-center transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            {t('nav.upload', lang)}
          </Link>
        </nav>
      )}
    </header>
  );
}

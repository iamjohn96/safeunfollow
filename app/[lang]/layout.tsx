import { notFound } from 'next/navigation';
import { isPublicLocale, PUBLIC_LOCALES } from '@/lib/locale-metadata';

export function generateStaticParams() { return PUBLIC_LOCALES.map(lang => ({ lang })); }

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isPublicLocale(lang)) notFound();
  return <div lang={lang}>{children}</div>;
}

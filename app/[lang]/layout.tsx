import { notFound } from 'next/navigation';
import { PUBLIC_LOCALES } from '@/lib/locale-metadata';

export function generateStaticParams() { return PUBLIC_LOCALES.map(lang => ({ lang })); }

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!PUBLIC_LOCALES.includes(lang as (typeof PUBLIC_LOCALES)[number])) notFound();
  return <div lang={lang}>{children}</div>;
}

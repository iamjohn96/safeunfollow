import type { Metadata } from 'next';
import { localeAlternates, localizedMetadata } from '@/lib/locale-metadata';

export const metadata: Metadata = {
  ...localizedMetadata('en', 'guide'),
  alternates: localeAlternates('/guide'),
};

export default function GuideLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

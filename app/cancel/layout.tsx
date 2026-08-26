import type { Metadata } from 'next';
import { localeAlternates, localizedMetadata } from '@/lib/locale-metadata';

export const metadata: Metadata = {
  ...localizedMetadata('en', 'cancel'),
  alternates: localeAlternates('/cancel'),
};

export default function CancelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

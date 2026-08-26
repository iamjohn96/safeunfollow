import type { Metadata } from 'next';
import { localeAlternates, localizedMetadata } from '@/lib/locale-metadata';

export const metadata: Metadata = {
  ...localizedMetadata('en', 'snapshots'),
  alternates: localeAlternates('/snapshots'),
};

export default function SnapshotsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

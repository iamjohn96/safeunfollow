import type { Metadata } from 'next';
import { localeAlternates } from '@/lib/locale-metadata';

export const metadata: Metadata = {
  title: 'Terms of Service | SafeUnfollow',
  description: 'Terms for using the privacy-first SafeUnfollow Instagram data analyzer.',
  alternates: localeAlternates('/terms'),
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

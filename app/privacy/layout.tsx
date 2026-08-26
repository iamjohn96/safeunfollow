import type { Metadata } from 'next';
import { localeAlternates } from '@/lib/locale-metadata';

export const metadata: Metadata = {
  title: 'Privacy Policy | SafeUnfollow',
  description: 'How SafeUnfollow processes Instagram relationship data locally in your browser and handles Premium account information.',
  alternates: localeAlternates('/privacy'),
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

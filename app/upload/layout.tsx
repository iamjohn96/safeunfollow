import type { Metadata } from 'next';
import { localeAlternates } from '@/lib/locale-metadata';

export const metadata: Metadata = {
  title: 'Upload Instagram Data ZIP | SafeUnfollow Analyzer',
  description: 'Analyze mutuals, one-way follows, and follower changes locally from your official Instagram Data ZIP. No login or account connection.',
  alternates: localeAlternates('/upload'),
};

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return children;
}

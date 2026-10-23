import type { Metadata } from 'next';
import { PlatformLanding } from '../_components/platform-landing';
import { localizedMetadata } from '@/lib/locale-metadata';

export const metadata: Metadata = localizedMetadata('en', 'tiktok-unfollow-checker');

export default function TiktokLandingPage() {
  return <PlatformLanding platform="tiktok" lang="en" />;
}

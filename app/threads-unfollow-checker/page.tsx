import type { Metadata } from 'next';
import { PlatformLanding } from '../_components/platform-landing';
import { localizedMetadata } from '@/lib/locale-metadata';

export const metadata: Metadata = localizedMetadata('en', 'threads-unfollow-checker');

export default function ThreadsLandingPage() {
  return <PlatformLanding platform="threads" lang="en" />;
}

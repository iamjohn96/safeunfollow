import { PlatformLanding } from '../../_components/platform-landing';
import { localizedMetadata, type PublicLocale } from '@/lib/locale-metadata';

export async function generateMetadata({ params }: { params: Promise<{ lang: PublicLocale }> }) { return localizedMetadata((await params).lang, 'threads-unfollow-checker'); }
export default async function LocalizedThreadsLandingPage({ params }: { params: Promise<{ lang: PublicLocale }> }) { return <PlatformLanding platform="threads" lang={(await params).lang} />; }

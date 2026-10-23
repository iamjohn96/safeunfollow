import { PlatformLanding } from '../../_components/platform-landing';
import { localizedMetadata, type PublicLocale } from '@/lib/locale-metadata';

export async function generateMetadata({ params }: { params: Promise<{ lang: PublicLocale }> }) { return localizedMetadata((await params).lang, 'tiktok-unfollow-checker'); }
export default async function LocalizedTiktokLandingPage({ params }: { params: Promise<{ lang: PublicLocale }> }) { return <PlatformLanding platform="tiktok" lang={(await params).lang} />; }

import Page from '../../privacy/page';
import { localizedMetadata, type PublicLocale } from '@/lib/locale-metadata';
export async function generateMetadata({ params }: { params: Promise<{ lang: PublicLocale }> }) { return localizedMetadata((await params).lang, 'privacy'); }
export default async function LocalizedPrivacyPage({ params }: { params: Promise<{ lang: PublicLocale }> }) { return <Page initialLang={(await params).lang} />; }

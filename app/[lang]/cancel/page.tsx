import Page from '../../cancel/page';
import { localizedMetadata, type PublicLocale } from '@/lib/locale-metadata';
export async function generateMetadata({ params }: { params: Promise<{ lang: PublicLocale }> }) { return localizedMetadata((await params).lang, 'cancel'); }
export default async function LocalizedCancelPage({ params }: { params: Promise<{ lang: PublicLocale }> }) { return <Page initialLang={(await params).lang} />; }

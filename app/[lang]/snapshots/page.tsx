import Page from '../../snapshots/page';
import { localizedMetadata, type PublicLocale } from '@/lib/locale-metadata';
export async function generateMetadata({ params }: { params: Promise<{ lang: PublicLocale }> }) { return localizedMetadata((await params).lang, 'snapshots'); }
export default async function LocalizedSnapshotsPage({ params }: { params: Promise<{ lang: PublicLocale }> }) { return <Page initialLang={(await params).lang} />; }

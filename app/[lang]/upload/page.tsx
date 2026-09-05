import Page from '../../upload/page';
import { localizedMetadata, type PublicLocale } from '@/lib/locale-metadata';
export async function generateMetadata({ params }: { params: Promise<{ lang: PublicLocale }> }) { return localizedMetadata((await params).lang, 'upload'); }
export default async function LocalizedUploadPage({ params }: { params: Promise<{ lang: PublicLocale }> }) { return <Page initialLang={(await params).lang} />; }

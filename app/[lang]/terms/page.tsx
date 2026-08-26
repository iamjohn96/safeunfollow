import Page from '../../terms/page';
import { localizedMetadata, type PublicLocale } from '@/lib/locale-metadata';
export async function generateMetadata({ params }: { params: Promise<{ lang: PublicLocale }> }) { return localizedMetadata((await params).lang, 'terms'); }
export default Page;

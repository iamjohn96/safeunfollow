import HomePage from '../page';
import { localizedMetadata, type PublicLocale } from '@/lib/locale-metadata';
export async function generateMetadata({ params }: { params: Promise<{ lang: PublicLocale }> }) { return localizedMetadata((await params).lang); }
export default async function LocalizedHomePage({ params }: { params: Promise<{ lang: PublicLocale }> }) {
  return <HomePage initialLang={(await params).lang} />;
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MarkdownArticle from '@/app/_components/markdown-article';
import { getMarkdownDocument, getMarkdownDocuments, availableDocumentLangs } from '@/lib/markdown-content';
import { JsonLd } from '@/components/JsonLd';
import { articleStructuredData } from '@/lib/structured-data';
import { t } from '@/utils/i18n';
import { isPublicLocale, type PublicLocale } from '@/lib/locale-metadata';

const BASE_URL = 'https://safeunfollow.com';

export function generateStaticParams() {
  return getMarkdownDocuments('blog').map(({ data }) => ({ slug: data.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: PublicLocale; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isPublicLocale(lang)) return {};
  const post = getMarkdownDocument('blog', slug, lang);
  if (!post) return {};

  const langs = availableDocumentLangs('blog', slug);
  const languages = Object.fromEntries(langs.map(l => [
    l, l === 'en' ? `${BASE_URL}/blog/${slug}` : `${BASE_URL}/${l}/blog/${slug}`,
  ]));

  return {
    title: `${post.data.title} | SafeUnfollow Blog`,
    description: post.data.description,
    keywords: post.data.keywords,
    alternates: {
      canonical: `${BASE_URL}/${lang}/blog/${slug}`,
      languages: { 'x-default': `${BASE_URL}/blog/${slug}`, ...languages },
    },
    openGraph: {
      title: post.data.title,
      description: post.data.description,
      url: `${BASE_URL}/${lang}/blog/${slug}`,
      type: 'article',
      publishedTime: post.data.date,
    },
  };
}

export default async function LocalizedBlogPostPage({
  params,
}: {
  params: Promise<{ lang: PublicLocale; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isPublicLocale(lang)) notFound();
  const post = getMarkdownDocument('blog', slug, lang);
  if (!post) notFound();

  return (
    <>
      <JsonLd data={articleStructuredData(post.data, `/${lang}/blog/`)} />
      <MarkdownArticle document={post} backHref={`/${lang}/blog`} backLabel={t('blog.back', lang)} lang={lang} />
    </>
  );
}

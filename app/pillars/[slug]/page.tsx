import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MarkdownArticle from '@/app/_components/markdown-article';
import { getMarkdownDocument, getMarkdownDocuments } from '@/lib/markdown-content';

const BASE_URL = 'https://safeunfollow.com';

export function generateStaticParams() {
  return getMarkdownDocuments('pillars').map(({ data }) => ({ slug: data.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pillar = getMarkdownDocument('pillars', slug);
  if (!pillar) return {};

  return {
    title: `${pillar.data.title} | SafeUnfollow`,
    description: pillar.data.description,
    keywords: pillar.data.keywords,
    alternates: {
      canonical: `${BASE_URL}/pillars/${slug}`,
    },
    openGraph: {
      title: pillar.data.title,
      description: pillar.data.description,
      url: `${BASE_URL}/pillars/${slug}`,
      type: 'article',
      publishedTime: pillar.data.date,
    },
  };
}

export default async function PillarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pillar = getMarkdownDocument('pillars', slug);

  if (!pillar) notFound();

  return <MarkdownArticle document={pillar} backHref="/blog" backLabel="Back to Blog" />;
}

import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import MarkdownArticle from '@/app/_components/markdown-article';
import { getMarkdownDocument, getMarkdownDocuments } from '@/lib/markdown-content';

const BASE_URL = 'https://safeunfollow.com';

export function generateStaticParams() {
  return getMarkdownDocuments('blog').map(({ data }) => ({ slug: data.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const post = getMarkdownDocument('blog', slug);
  if (!post) return {};

  return {
    title: `${post.data.title} | SafeUnfollow Blog`,
    description: post.data.description,
    keywords: post.data.keywords,
    alternates: {
      canonical: `${BASE_URL}/blog/${slug}`,
    },
    openGraph: {
      title: post.data.title,
      description: post.data.description,
      url: `${BASE_URL}/blog/${slug}`,
      type: 'article',
      publishedTime: post.data.date,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params;
  const post = getMarkdownDocument('blog', slug);

  if (!post && getMarkdownDocument('pillars', slug)) {
    permanentRedirect(`/pillars/${slug}`);
  }

  if (!post) notFound();

  return <MarkdownArticle document={post} backHref="/blog" backLabel="Back to Blog" />;
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const BASE_URL = 'https://safeunfollow.com';
const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const PILLAR_DIR = path.join(process.cwd(), 'content', 'pillars');

function markdownFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter(file => file.endsWith('.md') && file !== 'index.md')
    .map(file => path.join(directory, file));
}

function getContentFiles(): string[] {
  return [...markdownFiles(BLOG_DIR), ...markdownFiles(PILLAR_DIR)];
}

function getPost(slug: string) {
  for (const file of getContentFiles()) {
    const raw = fs.readFileSync(file, 'utf-8');
    const { data, content } = matter(raw);
    if (data.slug === slug) {
      return { data, content };
    }
  }
  return null;
}

export async function generateStaticParams() {
  return getContentFiles().map(file => {
    const raw = fs.readFileSync(file, 'utf-8');
    const { data } = matter(raw);
    return { slug: data.slug as string };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
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

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  const processedContent = await remark().use(html).process(post.content);
  const contentHtml = processedContent.toString();

  return (
    <article className="max-w-2xl mx-auto px-4 py-16">
      <Link
        href="/blog"
        className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors inline-block mb-8"
      >
        ← Back to Blog
      </Link>

      <header className="mb-10">
        <time className="text-xs text-zinc-400">
          {new Date(post.data.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
        <h1 className="text-3xl font-bold text-zinc-900 mt-2 leading-tight">
          {post.data.title}
        </h1>
        <p className="text-zinc-500 mt-3 leading-relaxed">{post.data.description}</p>
      </header>

      <div
        className="prose prose-zinc prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      <section className="mt-16 bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-bold text-zinc-900 mb-2">
          Ready to see who unfollowed you?
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          No login required. 100% private. Results in seconds.
        </p>
        <a
          href="https://safeunfollow.com/upload"
          className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors shadow-lg shadow-pink-200"
        >
          Try SafeUnfollow Free →
        </a>
      </section>
    </article>
  );
}

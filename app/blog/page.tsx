import type { Metadata } from 'next';
import Link from 'next/link';
import { getMarkdownDocuments } from '@/lib/markdown-content';
import { t, localizedPath, type Lang } from '@/utils/i18n';

import { SentenceLines } from '@/components/SentenceLines';
export const metadata: Metadata = {
  title: 'Instagram Data Analyzer Guide | SafeUnfollow',
  description: 'Learn how to analyze an official Instagram data export for mutuals, one-way follows, and follower changes without sharing your login.',
};

const DATE_LOCALES: Record<Lang, string> = {
  en: 'en-US', pt: 'pt-BR', ru: 'ru-RU', es: 'es-ES',
};

function BlogListContent({ initialLang }: { initialLang: Lang }) {
  const lang = initialLang;
  const posts = getMarkdownDocuments('blog', lang)
    .slice()
    .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

  return (
    <section className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-zinc-900 mb-2">{t('blog.title', lang)}</h1>
      <p className="text-sm text-zinc-400 mb-10"><SentenceLines text={t('blog.subtitle', lang)} /></p>

      <div className="space-y-6">
        {posts.map(post => (
          <article
            key={post.data.slug}
            className="bg-white border border-zinc-100 rounded-2xl p-6 hover:border-pink-200 hover:shadow-sm transition-all"
          >
            <time className="text-xs text-zinc-400">
              {new Date(post.data.date).toLocaleDateString(DATE_LOCALES[lang], {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            <h3 className="text-lg font-semibold text-zinc-900 mt-2 mb-2">
              <Link
                href={localizedPath(`/blog/${post.data.slug}`, lang)}
                className="hover:text-pink-600 transition-colors"
              >
                {post.data.title}
              </Link>
            </h3>
            <p className="text-sm text-zinc-500 leading-relaxed mb-4"><SentenceLines text={post.data.description} /></p>
            <Link
              href={localizedPath(`/blog/${post.data.slug}`, lang)}
              className="text-sm font-medium text-pink-600 hover:text-pink-700 transition-colors"
            >
              {t('blog.readMore', lang)} →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function BlogPage({ initialLang = 'en' }: { initialLang?: Lang }) {
  return <BlogListContent initialLang={initialLang} />;
}

import Link from 'next/link';
import type { MarkdownDocument } from '@/lib/markdown-content';
import { renderMarkdown } from '@/lib/markdown-rendering';
import styles from './markdown-article.module.css';

export default async function MarkdownArticle({
  document,
  backHref,
  backLabel,
}: {
  document: MarkdownDocument;
  backHref: string;
  backLabel: string;
}) {
  const processedContent = await renderMarkdown(document.content);

  return (
    <article className="max-w-2xl mx-auto px-4 py-16">
      <Link
        href={backHref}
        className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors inline-block mb-8"
      >
        ← {backLabel}
      </Link>

      <header className="mb-10">
        <time className="text-xs text-zinc-400">
          {new Date(document.data.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
        <h1 className="text-3xl font-bold text-zinc-900 mt-2 leading-tight">
          {document.data.title}
        </h1>
        <p className="text-zinc-500 mt-3 leading-relaxed">{document.data.description}</p>
      </header>

      <div
        className={styles.content}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />

      <section className="mt-16 bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-bold text-zinc-900 mb-2">
          Ready to see who unfollowed you?
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Use your Instagram data export. No login, OAuth, or direct account access.
        </p>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors shadow-lg shadow-pink-200"
        >
          Try SafeUnfollow Free →
        </Link>
      </section>
    </article>
  );
}

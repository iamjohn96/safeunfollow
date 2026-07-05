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

      <section className={styles.ctaCard} aria-labelledby="article-cta-title">
        <h2 id="article-cta-title" className={styles.ctaHeading}>
          Ready to discover who unfollowed you on Instagram the safe and private way?
        </h2>
        <p className={styles.ctaCopy}>
          <span>Upload your Instagram Data Download to SafeUnfollow.</span>
          <span>No login. No OAuth. No Instagram API.</span>
        </p>
        <Link
          href="/upload"
          className={styles.ctaButton}
        >
          Upload Instagram Data
        </Link>
      </section>
    </article>
  );
}

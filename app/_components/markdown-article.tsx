import Link from 'next/link';
import type { MarkdownDocument } from '@/lib/markdown-content';
import { renderMarkdown } from '@/lib/markdown-rendering';
import { t, type Lang } from '@/utils/i18n';
import styles from './markdown-article.module.css';

import { SentenceLines } from '@/components/SentenceLines';

const DATE_LOCALES: Record<Lang, string> = {
  en: 'en-US', pt: 'pt-BR', ru: 'ru-RU', es: 'es-ES',
};

export default async function MarkdownArticle({
  document,
  backHref,
  backLabel,
  lang = 'en',
}: {
  document: MarkdownDocument;
  backHref: string;
  backLabel: string;
  lang?: Lang;
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
          {new Date(document.data.date).toLocaleDateString(DATE_LOCALES[lang], {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
        <h1 className="text-3xl font-bold text-zinc-900 mt-2 leading-tight">
          {document.data.title}
        </h1>
        <p className="text-zinc-500 mt-3 leading-relaxed"><SentenceLines text={document.data.description} /></p>
      </header>

      <div
        className={styles.content}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />

      <section className={styles.ctaCard} aria-labelledby="article-cta-title">
        <h2 id="article-cta-title" className={styles.ctaHeading}>
          {t('blog.cta.heading', lang)}
        </h2>
        <p className={styles.ctaCopy}>
          <span>{t('blog.cta.line1', lang)}</span>
          <span>{t('blog.cta.line2', lang)}</span>
        </p>
        <Link
          href={lang === 'en' ? '/upload' : `/${lang}/upload`}
          className={styles.ctaButton}
        >
          {t('hero.cta', lang)}
        </Link>
      </section>
    </article>
  );
}

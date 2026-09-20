import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export type ContentSection = 'blog' | 'pillars';
export type ContentLang = 'en' | 'pt' | 'ru' | 'es';

const LOCALIZABLE_LANGS: ContentLang[] = ['pt', 'ru', 'es'];

export interface MarkdownDocument {
  data: {
    title: string;
    description: string;
    date: string;
    slug: string;
    keywords?: string[];
  };
  content: string;
}

function contentDirectory(section: ContentSection, lang?: ContentLang): string {
  if (lang && LOCALIZABLE_LANGS.includes(lang)) {
    return path.join(process.cwd(), 'content', section, lang);
  }
  return path.join(process.cwd(), 'content', section);
}

function normalizeDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? '');
}

function readDocuments(directory: string): MarkdownDocument[] {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory)
    .filter(file => file.endsWith('.md') && file !== 'index.md')
    .map(file => {
      const raw = fs.readFileSync(path.join(directory, file), 'utf8');
      const { data, content } = matter(raw);

      return {
        data: {
          title: data.title as string,
          description: data.description as string,
          date: normalizeDate(data.date),
          slug: data.slug as string,
          keywords: data.keywords as string[] | undefined,
        },
        content,
      };
    });
}

/**
 * Returns documents for a section in the given language.
 * Non-English content lives under content/<section>/<lang>/*.md; any slug
 * without a translated file falls back to the English version, mirroring
 * the fallback already used by utils/i18n.ts#t() for UI strings.
 */
export function getMarkdownDocuments(section: ContentSection, lang: ContentLang = 'en'): MarkdownDocument[] {
  const english = readDocuments(contentDirectory(section));
  if (lang === 'en') return english;

  const localized = readDocuments(contentDirectory(section, lang));
  const localizedBySlug = new Map(localized.map(document => [document.data.slug, document]));
  return english.map(document => localizedBySlug.get(document.data.slug) ?? document);
}

export function getMarkdownDocument(
  section: ContentSection,
  slug: string,
  lang: ContentLang = 'en',
): MarkdownDocument | null {
  return getMarkdownDocuments(section, lang).find(document => document.data.slug === slug) ?? null;
}

/** Languages that actually have a translated file for this slug (English is always available as the fallback). */
export function availableDocumentLangs(section: ContentSection, slug: string): ContentLang[] {
  const langs: ContentLang[] = ['en'];
  for (const lang of LOCALIZABLE_LANGS) {
    const directory = contentDirectory(section, lang);
    if (fs.existsSync(path.join(directory, `${slug}.md`))) langs.push(lang);
  }
  return langs;
}

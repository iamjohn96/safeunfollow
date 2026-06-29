import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export type ContentSection = 'blog' | 'pillars';

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

function contentDirectory(section: ContentSection): string {
  return path.join(process.cwd(), 'content', section);
}

export function getMarkdownDocuments(section: ContentSection): MarkdownDocument[] {
  const directory = contentDirectory(section);
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
          date: data.date as string,
          slug: data.slug as string,
          keywords: data.keywords as string[] | undefined,
        },
        content,
      };
    });
}

export function getMarkdownDocument(
  section: ContentSection,
  slug: string,
): MarkdownDocument | null {
  return getMarkdownDocuments(section).find(document => document.data.slug === slug) ?? null;
}

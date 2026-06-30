import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';

interface KeywordEntry {
  keyword: string;
  slug: string;
  published: boolean;
  published_at: string | null;
  last_attempt: string | null;
  source?: string;
  cluster?: string;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  avg_position?: number | null;
  last_seen_in_gsc?: string | null;
  discovered_at?: string;
}

interface ExistingDocument {
  slug: string;
  title: string;
  keyword: string;
  cluster: string;
  publishedAt: string;
}

interface ReconciliationResult {
  entries: KeywordEntry[];
  matchedBySlug: string[];
  matchedByKeyword: string[];
  added: string[];
}

function normalize(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

function publicationTimestamp(value: unknown): string {
  const date = value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? `${date}T00:00:00.000Z`
    : new Date().toISOString();
}

function loadDocuments(directory: string): ExistingDocument[] {
  return fs.readdirSync(directory)
    .filter(file => file.endsWith('.md') && file !== 'index.md')
    .map(file => {
      const parsed = matter(fs.readFileSync(path.join(directory, file), 'utf8'));
      const keywords = Array.isArray(parsed.data.keywords) ? parsed.data.keywords.map(String) : [];
      return {
        slug: String(parsed.data.slug || path.basename(file, '.md')),
        title: String(parsed.data.title || path.basename(file, '.md')),
        keyword: keywords[0] || String(parsed.data.title || path.basename(file, '.md')),
        cluster: String(parsed.data.cluster || ''),
        publishedAt: publicationTimestamp(parsed.data.date),
      };
    });
}

function reconcileContent(
  currentEntries: KeywordEntry[],
  documents: ExistingDocument[],
): ReconciliationResult {
  const entries = currentEntries.map(entry => ({ ...entry }));
  const matchedBySlug: string[] = [];
  const matchedByKeyword: string[] = [];
  const added: string[] = [];
  const claimedEntries = new Set<KeywordEntry>();

  for (const document of documents) {
    let entry = entries.find(candidate => candidate.slug === document.slug);
    if (entry) {
      matchedBySlug.push(document.slug);
    } else {
      entry = entries.find(candidate =>
        !claimedEntries.has(candidate) && normalize(candidate.keyword) === normalize(document.keyword),
      );
      if (entry) {
        entry.slug = document.slug;
        matchedByKeyword.push(document.slug);
      }
    }

    if (!entry) {
      entry = {
        keyword: normalize(document.keyword),
        slug: document.slug,
        published: true,
        published_at: document.publishedAt,
        last_attempt: null,
        source: 'existing_content',
        cluster: document.cluster,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        avg_position: null,
        last_seen_in_gsc: null,
        discovered_at: document.publishedAt.slice(0, 10),
      };
      entries.push(entry);
      added.push(document.slug);
    }

    claimedEntries.add(entry);
    entry.published = true;
    entry.published_at ||= document.publishedAt;
    if (!entry.cluster && document.cluster) entry.cluster = document.cluster;
  }

  return { entries, matchedBySlug, matchedByKeyword, added };
}

function main(): void {
  const supported = new Set(['--write']);
  const unknown = process.argv.slice(2).filter(arg => !supported.has(arg));
  if (unknown.length) throw new Error(`Unknown option(s): ${unknown.join(', ')}`);

  const registryPath = path.join('automation', 'keywords.json');
  const entries = JSON.parse(fs.readFileSync(registryPath, 'utf8')) as KeywordEntry[];
  const result = reconcileContent(entries, loadDocuments(path.join('content', 'blog')));
  console.log(JSON.stringify({
    matched_by_slug: result.matchedBySlug,
    matched_by_keyword: result.matchedByKeyword,
    added: result.added,
  }, null, 2));

  if (process.argv.includes('--write')) {
    fs.writeFileSync(registryPath, `${JSON.stringify(result.entries, null, 2)}\n`, 'utf8');
    console.log('Keyword registry updated.');
  } else {
    console.log('Read-only reconciliation report. Pass --write to update the registry.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();

export { loadDocuments, normalize, reconcileContent };
export type { ExistingDocument, KeywordEntry, ReconciliationResult };

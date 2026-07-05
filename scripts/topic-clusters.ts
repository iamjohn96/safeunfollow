import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const RELATED_START = '<!-- AUTO:RELATED_START -->';
const RELATED_END = '<!-- AUTO:RELATED_END -->';

interface TopicCluster {
  pillar: string;
  keywords: string[];
}

type TopicClusters = Record<string, TopicCluster>;

interface ClusterKeywordEntry {
  keyword: string;
  slug: string;
  published: boolean;
  cluster?: string;
  impressions?: number;
  clicks?: number;
  ctr?: number;
}

interface ClusterAssignment {
  cluster: string;
  clusters: TopicClusters;
  created: boolean;
}

interface ArticleRecord {
  slug: string;
  title: string;
  cluster: string;
  source: string;
  content: string;
  filePath: string;
  impressions: number;
  clicks: number;
  isPillar: boolean;
}

interface OrphanFinding {
  slug: string;
  reasons: string[];
  recommendations: string[];
}

interface ClusterHealth {
  cluster: string;
  label: string;
  articles: number;
  clicks: number;
  impressions: number;
  ctr: number;
  coverage: number;
  weakAreas: string[];
}

interface SyncResult {
  articles: ArticleRecord[];
  health: ClusterHealth[];
  orphans: OrphanFinding[];
  updatedPillars: string[];
  relatedCounts: Record<string, number>;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'best', 'can', 'does', 'for', 'guide', 'how', 'i', 'in',
  'is', 'it', 'me', 'my', 'of', 'on', 'per', 'the', 'to', 'what', 'who',
  'why', 'with', 'you', 'your', '2026',
]);

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

function slugify(value: string): string {
  return normalize(value).replace(/\s+/g, '-').replace(/^-|-$/g, '') || 'topic';
}

function tokens(value: string): Set<string> {
  return new Set(normalize(value).split(/\s+/).map(token => {
    if (/^unfollow(?:ed|ers?|ing)?$/.test(token)) return 'unfollow';
    if (/^followers?$/.test(token)) return 'follower';
    if (/^safe(?:st|ly)?$/.test(token)) return 'safe';
    return token;
  }).filter(token => token && !STOP_WORDS.has(token)));
}

function similarity(left: string, right: string): number {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter(token => b.has(token)).length;
  return intersection / Math.sqrt(a.size * b.size);
}

function labelFromSlug(slug: string): string {
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function uniqueClusterSlug(keyword: string, clusters: TopicClusters): string {
  const significant = [...tokens(keyword)].slice(0, 3).join('-');
  const base = significant || slugify(keyword);
  let candidate = base;
  let suffix = 2;
  while (clusters[candidate]) candidate = `${base}-${suffix++}`;
  return candidate;
}

function assignKeywordCluster(keyword: string, current: TopicClusters): ClusterAssignment {
  const normalized = normalize(keyword);
  for (const [cluster, definition] of Object.entries(current)) {
    if (definition.keywords.some(candidate => normalize(candidate) === normalized)) {
      return { cluster, clusters: current, created: false };
    }
  }

  let bestCluster = '';
  let bestScore = 0;
  for (const [cluster, definition] of Object.entries(current)) {
    const score = Math.max(
      similarity(keyword, cluster),
      similarity(keyword, definition.pillar),
      ...definition.keywords.map(candidate => similarity(keyword, candidate)),
    );
    if (score > bestScore) {
      bestScore = score;
      bestCluster = cluster;
    }
  }

  if (bestCluster && bestScore >= 0.45) {
    const keywords = current[bestCluster].keywords;
    if (!keywords.some(candidate => normalize(candidate) === normalized)) keywords.push(keyword);
    return { cluster: bestCluster, clusters: current, created: false };
  }

  const cluster = uniqueClusterSlug(keyword, current);
  current[cluster] = { pillar: `${cluster}-guide`, keywords: [keyword] };
  return { cluster, clusters: current, created: true };
}

function assignRegistryClusters(entries: ClusterKeywordEntry[], clusters: TopicClusters): TopicClusters {
  for (const entry of entries) {
    if (entry.cluster && clusters[entry.cluster]) {
      const keywords = clusters[entry.cluster].keywords;
      if (!keywords.some(keyword => normalize(keyword) === normalize(entry.keyword))) keywords.push(entry.keyword);
      continue;
    }
    const assignment = assignKeywordCluster(entry.keyword, clusters);
    entry.cluster = assignment.cluster;
  }
  return clusters;
}

function parseInternalSlugs(source: string): string[] {
  const slugs = [...source.matchAll(/\[[^\]]+\]\(\/(?:blog|pillars)\/([a-z0-9-]+)(?:[?#][^)]*)?\)/gi)]
    .map(match => match[1]);
  return [...new Set(slugs)];
}

function upsertMarkerBlock(source: string, generated: string): string {
  const block = `${RELATED_START}\n${generated.trim()}\n${RELATED_END}`;
  const start = source.indexOf(RELATED_START);
  const end = source.indexOf(RELATED_END);
  if (start !== -1 && end > start) {
    return `${source.slice(0, start)}${block}${source.slice(end + RELATED_END.length)}`;
  }
  return `${source.trimEnd()}\n\n${block}\n`;
}

function rankRelated(article: ArticleRecord, candidates: ArticleRecord[]): ArticleRecord[] {
  const contentWithoutGeneratedRelated = article.content.replace(
    /<!-- AUTO:RELATED_START -->[\s\S]*?<!-- AUTO:RELATED_END -->/g,
    '',
  );
  const existingDestinations = new Set(parseInternalSlugs(contentWithoutGeneratedRelated));
  return candidates
    .filter(candidate =>
      !candidate.isPillar && candidate.slug !== article.slug && candidate.cluster === article.cluster &&
      !existingDestinations.has(candidate.slug),
    )
    .sort((a, b) => {
      const scoreA = similarity(article.title, a.title) * 100 + Math.log1p(a.impressions) * 8;
      const scoreB = similarity(article.title, b.title) * 100 + Math.log1p(b.impressions) * 8;
      return scoreB - scoreA || a.title.localeCompare(b.title);
    });
}

function buildRelatedSection(
  article: ArticleRecord,
  articles: ArticleRecord[],
  pillarSlug?: string,
): { markdown: string; count: number } {
  const related = rankRelated(article, articles).slice(0, 5);
  const lines = related.map(item => `- [${item.title}](/blog/${item.slug})`);
  const existingDestinations = new Set(parseInternalSlugs(article.content));
  return {
    markdown: [
      ...(pillarSlug && pillarSlug !== article.slug && !existingDestinations.has(pillarSlug)
        ? [`Start with the [${labelFromSlug(article.cluster)} complete guide](/pillars/${pillarSlug}) for the full topic overview.`, '']
        : []),
      '## Related Articles',
      '',
      ...(lines.length ? lines : ['More supporting guides are coming soon.']),
    ].join('\n'),
    count: related.length,
  };
}

function insertInternalLinks(
  body: string,
  article: Pick<ArticleRecord, 'slug' | 'title' | 'cluster'>,
  articles: ArticleRecord[],
  pillarSlug: string,
): string {
  const existing = new Set(parseInternalSlugs(body));
  const links: Array<{ title: string; slug: string; section: 'blog' | 'pillars' }> = [];
  if (pillarSlug !== article.slug && !existing.has(pillarSlug)) {
    links.push({
      title: `${labelFromSlug(article.cluster)} complete guide`,
      slug: pillarSlug,
      section: 'pillars',
    });
  }
  for (const candidate of rankRelated({ ...article, source: '', content: '', filePath: '', impressions: 0, clicks: 0, isPillar: false }, articles)) {
    if (links.length >= 2) break;
    if (!existing.has(candidate.slug) && !links.some(link => link.slug === candidate.slug)) {
      links.push({ title: candidate.title, slug: candidate.slug, section: 'blog' });
    }
  }
  for (const candidate of articles
    .filter(item => !item.isPillar && item.slug !== article.slug)
    .sort((a, b) => b.impressions - a.impressions || similarity(article.title, b.title) - similarity(article.title, a.title))) {
    if (links.length >= 2) break;
    if (!existing.has(candidate.slug) && !links.some(link => link.slug === candidate.slug)) {
      links.push({ title: candidate.title, slug: candidate.slug, section: 'blog' });
    }
  }
  if (!links.length) return body;

  const sentence = `Continue with ${links.map(link => `[${link.title}](/${link.section}/${link.slug})`).join(', ')} for more context.`;
  const faqIndex = body.search(/^##\s+.*(?:FAQ|Frequently Asked Questions)/im);
  return faqIndex === -1
    ? `${body.trimEnd()}\n\n${sentence}`
    : `${body.slice(0, faqIndex).trimEnd()}\n\n${sentence}\n\n${body.slice(faqIndex)}`;
}

function articleFromFile(
  filePath: string,
  entriesBySlug: Map<string, ClusterKeywordEntry>,
  isPillar: boolean,
  fallbackCluster = '',
): ArticleRecord | null {
  const source = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(source);
  const slug = String(parsed.data.slug || path.basename(filePath, '.md'));
  const entry = entriesBySlug.get(slug);
  const cluster = String(parsed.data.cluster || entry?.cluster || fallbackCluster);
  if (!slug || !cluster) return null;
  return {
    slug,
    title: String(parsed.data.title || labelFromSlug(slug)),
    cluster,
    source,
    content: parsed.content,
    filePath,
    impressions: Number(entry?.impressions || 0),
    clicks: Number(entry?.clicks || 0),
    isPillar,
  };
}

function loadArticles(
  blogDirectory: string,
  pillarDirectory: string,
  entries: ClusterKeywordEntry[],
  clusters: TopicClusters,
): ArticleRecord[] {
  const entriesBySlug = new Map(entries.map(entry => [entry.slug, entry]));
  const articles: ArticleRecord[] = [];
  if (fs.existsSync(blogDirectory)) {
    for (const file of fs.readdirSync(blogDirectory).filter(name => name.endsWith('.md') && name !== 'index.md')) {
      const article = articleFromFile(path.join(blogDirectory, file), entriesBySlug, false);
      if (article) articles.push(article);
    }
  }
  if (fs.existsSync(pillarDirectory)) {
    for (const [cluster, definition] of Object.entries(clusters)) {
      const filePath = path.join(pillarDirectory, `${definition.pillar}.md`);
      if (!fs.existsSync(filePath)) continue;
      const article = articleFromFile(filePath, entriesBySlug, true, cluster);
      if (article) articles.push(article);
    }
  }
  return articles;
}

function pillarTemplate(cluster: string, definition: TopicCluster): string {
  const title = `${labelFromSlug(cluster)} Guide`;
  return [
    '---',
    `title: "${title}"`,
    `description: "A complete SafeUnfollow guide to ${labelFromSlug(cluster).toLowerCase()}, privacy, and practical next steps."`,
    `date: "${new Date().toISOString().slice(0, 10)}"`,
    `slug: "${definition.pillar}"`,
    `cluster: "${cluster}"`,
    'keywords:',
    ...definition.keywords.map(keyword => `  - "${keyword.replace(/"/g, '\\"')}"`),
    '---',
    '',
    `This pillar explains ${labelFromSlug(cluster).toLowerCase()} from first principles and connects every SafeUnfollow supporting guide in one place.`,
    '',
    'SafeUnfollow uses Instagram data downloads instead of account credentials, OAuth, or the Instagram API. That keeps the workflow privacy-first and avoids account-access risk.',
    '',
    '## How to Use This Topic Hub',
    '',
    'Begin with the overview on this page, then choose a supporting article for the exact question you need to solve. The supporting library covers definitions, limits, safety tradeoffs, and step-by-step workflows without repeating the same advice.',
    '',
    '## Privacy-First Workflow',
    '',
    'Request your information from Instagram, download the ZIP archive, and review the relevant follower data with a tool that does not ask for account access. Keep the original export private and request a fresh copy whenever you need a current comparison.',
    '',
    '## Choosing the Right Next Step',
    '',
    'Use the guides below to distinguish follower changes from account limits, understand the risks of login-based services, and select the safest workflow for your goal. The list updates automatically as the cluster grows.',
    '',
  ].join('\n');
}

function updatePillars(
  pillarDirectory: string,
  clusters: TopicClusters,
  articles: ArticleRecord[],
): string[] {
  fs.mkdirSync(pillarDirectory, { recursive: true });
  const updated: string[] = [];
  for (const [cluster, definition] of Object.entries(clusters)) {
    const filePath = path.join(pillarDirectory, `${definition.pillar}.md`);
    const original = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : pillarTemplate(cluster, definition);
    const related = articles
      .filter(article => !article.isPillar && article.cluster === cluster)
      .sort((a, b) => b.impressions - a.impressions || a.title.localeCompare(b.title));
    const generated = [
      '## Supporting Articles',
      '',
      ...(related.length
        ? related.map(article => `- [${article.title}](/blog/${article.slug})`)
        : ['Supporting articles are planned for this cluster.']),
    ].join('\n');
    const next = upsertMarkerBlock(original, generated);
    if (next !== original) {
      fs.writeFileSync(filePath, next, 'utf8');
      updated.push(definition.pillar);
    }
  }
  return updated;
}

function detectOrphans(articles: ArticleRecord[], clusters: TopicClusters): OrphanFinding[] {
  const inbound = new Map(articles.map(article => [article.slug, 0]));
  for (const source of articles) {
    for (const slug of parseInternalSlugs(source.source)) {
      if (slug !== source.slug && inbound.has(slug)) inbound.set(slug, (inbound.get(slug) || 0) + 1);
    }
  }

  return articles.filter(article => !article.isPillar).flatMap(article => {
    const reasons: string[] = [];
    const recommendations: string[] = [];
    const pillar = clusters[article.cluster]?.pillar;
    if ((inbound.get(article.slug) || 0) === 0) {
      reasons.push('no inbound internal links');
      recommendations.push('Link to it from the pillar or a related high-impression article.');
    }
    const relatedBlock = article.content.match(/^##\s+Related Articles\s*\n([\s\S]*?)(?=^##\s+|$)/im)?.[1] || '';
    const relatedSlugs = parseInternalSlugs(relatedBlock).filter(slug => slug !== pillar);
    if (!/^##\s+Related Articles/im.test(article.content) || relatedSlugs.length === 0) {
      reasons.push('no related articles section');
      recommendations.push('Generate the related article marker block.');
    }
    if (!pillar || !parseInternalSlugs(article.source).includes(pillar)) {
      reasons.push('no pillar reference');
      recommendations.push('Add a contextual link to the cluster pillar.');
    }
    return reasons.length ? [{ slug: article.slug, reasons, recommendations }] : [];
  });
}

function buildClusterHealth(
  clusters: TopicClusters,
  articles: ArticleRecord[],
  orphans: OrphanFinding[],
): ClusterHealth[] {
  return Object.entries(clusters).map(([cluster, definition]) => {
    const supporting = articles.filter(article => !article.isPillar && article.cluster === cluster);
    const clicks = supporting.reduce((sum, article) => sum + article.clicks, 0);
    const impressions = supporting.reduce((sum, article) => sum + article.impressions, 0);
    const weakAreas: string[] = [];
    if (supporting.length <= 1) weakAreas.push('Cluster has only one supporting article.');
    if (supporting.length < 3) weakAreas.push('Pillar needs at least three supporting pages.');
    const orphanCount = orphans.filter(orphan => supporting.some(article => article.slug === orphan.slug)).length;
    if (orphanCount) weakAreas.push(`${orphanCount} orphan article${orphanCount === 1 ? '' : 's'} need internal links.`);
    return {
      cluster,
      label: labelFromSlug(cluster),
      articles: supporting.length,
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : 0,
      coverage: definition.keywords.length ? Math.min(1, supporting.length / definition.keywords.length) : 0,
      weakAreas,
    };
  });
}

function generateRoadmap(
  clusters: TopicClusters,
  entries: ClusterKeywordEntry[],
  articles: ArticleRecord[],
): string {
  const articleSlugs = new Set(articles.filter(article => !article.isPillar).map(article => article.slug));
  const entryByKeyword = new Map(entries.map(entry => [normalize(entry.keyword), entry]));
  const sections = Object.entries(clusters).map(([cluster, definition]) => {
    const rows = definition.keywords.map(keyword => {
      const entry = entryByKeyword.get(normalize(keyword));
      const complete = Boolean(entry && articleSlugs.has(entry.slug)) || articles.some(article =>
        !article.isPillar && article.cluster === cluster && similarity(keyword, article.title) >= 0.5,
      );
      return `${complete ? '✓' : '○'} ${labelFromSlug(slugify(keyword))}`;
    });
    const missingImpressions = definition.keywords.reduce((sum, keyword) => {
      const entry = entryByKeyword.get(normalize(keyword));
      return sum + (entry && !articleSlugs.has(entry.slug) ? Number(entry.impressions || 0) : 0);
    }, 0);
    const stars = Math.min(5, Math.max(1, Math.ceil(Math.log10(missingImpressions + 1)) + (rows.some(row => row.startsWith('○')) ? 1 : 0)));
    return [
      `## ${labelFromSlug(cluster)}`,
      '',
      '✓ Pillar',
      ...rows,
      '',
      `Priority score: ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`,
    ].join('\n');
  });
  return ['# SafeUnfollow Content Roadmap', '', ...sections].join('\n\n') + '\n';
}

function generateNavigation(clusters: TopicClusters, articles: ArticleRecord[]): string {
  const sections = Object.entries(clusters).map(([cluster, definition]) => {
    const supporting = articles
      .filter(article => !article.isPillar && article.cluster === cluster)
      .sort((a, b) => b.impressions - a.impressions || a.title.localeCompare(b.title));
    return [
      `## ${labelFromSlug(cluster)}`,
      '',
      `- [${labelFromSlug(cluster)} Guide](/pillars/${definition.pillar})`,
      ...supporting.map(article => `- [${article.title}](/blog/${article.slug})`),
    ].join('\n');
  });
  return ['# SafeUnfollow Blog Topics', '', ...sections].join('\n\n') + '\n';
}

function syncClusterContent(options: {
  clusters: TopicClusters;
  entries: ClusterKeywordEntry[];
  blogDirectory: string;
  pillarDirectory: string;
  roadmapPath: string;
  navigationPath?: string;
  updateArticleRelated?: boolean;
}): SyncResult {
  let articles = loadArticles(options.blogDirectory, options.pillarDirectory, options.entries, options.clusters);
  const updatedPillars = updatePillars(options.pillarDirectory, options.clusters, articles);
  articles = loadArticles(options.blogDirectory, options.pillarDirectory, options.entries, options.clusters);
  const relatedCounts: Record<string, number> = {};
  if (options.updateArticleRelated !== false) {
    for (const article of articles.filter(item => !item.isPillar)) {
      const related = buildRelatedSection(article, articles, options.clusters[article.cluster]?.pillar);
      relatedCounts[article.slug] = related.count;
      const next = upsertMarkerBlock(article.source, related.markdown);
      if (next !== article.source) fs.writeFileSync(article.filePath, next, 'utf8');
    }
    articles = loadArticles(options.blogDirectory, options.pillarDirectory, options.entries, options.clusters);
  }
  const orphans = detectOrphans(articles, options.clusters);
  const health = buildClusterHealth(options.clusters, articles, orphans);
  fs.mkdirSync(path.dirname(options.roadmapPath), { recursive: true });
  fs.writeFileSync(options.roadmapPath, generateRoadmap(options.clusters, options.entries, articles), 'utf8');
  if (options.navigationPath) {
    fs.writeFileSync(options.navigationPath, generateNavigation(options.clusters, articles), 'utf8');
  }
  return { articles, health, orphans, updatedPillars, relatedCounts };
}

export {
  RELATED_END,
  RELATED_START,
  assignKeywordCluster,
  assignRegistryClusters,
  buildClusterHealth,
  buildRelatedSection,
  detectOrphans,
  generateNavigation,
  generateRoadmap,
  insertInternalLinks,
  labelFromSlug,
  loadArticles,
  parseInternalSlugs,
  similarity,
  syncClusterContent,
  upsertMarkerBlock,
};
export type {
  ArticleRecord,
  ClusterAssignment,
  ClusterHealth,
  ClusterKeywordEntry,
  OrphanFinding,
  SyncResult,
  TopicCluster,
  TopicClusters,
};

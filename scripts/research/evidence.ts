import type { CrawlPage, EvidenceSource, ResearchArtifact, SerpResearch } from './types';

function decodeHtml(value: string): string {
  const entities: Record<string, string> = {
    amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (_match, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return entities[entity.toLowerCase()] ?? `&${entity};`;
  });
}

function plainText(value: string): string {
  return decodeHtml(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? decodeHtml(match[1] ?? match[2] ?? match[3] ?? '') : null;
}

function metaContent(html: string, names: string[]): string {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const key = attribute(tag, 'name') ?? attribute(tag, 'property') ?? attribute(tag, 'itemprop');
    if (key && names.includes(key.toLowerCase())) return attribute(tag, 'content')?.trim() ?? '';
  }
  return '';
}

function tagTexts(html: string, tagName: string): string[] {
  const expression = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  return [...html.matchAll(expression)].map(match => plainText(match[1])).filter(Boolean);
}

function parseJsonLd(html: string): unknown[] {
  const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return blocks.flatMap(match => {
    try {
      const parsed = JSON.parse(decodeHtml(match[1]).trim()) as unknown;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  });
}

function schemaNodes(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.flatMap(schemaNodes);
  if (!value || typeof value !== 'object') return [];
  const object = value as Record<string, unknown>;
  return [object, ...schemaNodes(object['@graph'])];
}

function schemaTypes(raw: unknown[]): string[] {
  const types = raw.flatMap(schemaNodes).flatMap(node => {
    const value = node['@type'];
    return Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
  });
  return [...new Set(types)];
}

function extractFaq(raw: unknown[], headings: string[]): string[] {
  const fromSchema = raw.flatMap(schemaNodes).flatMap(node => {
    if (String(node['@type']).toLowerCase() !== 'question') return [];
    return typeof node.name === 'string' ? [node.name.trim()] : [];
  });
  const fromHeadings = headings.filter(value => value.endsWith('?'));
  return [...new Set([...fromSchema, ...fromHeadings])].filter(Boolean);
}

function internalLinks(html: string, pageUrl: string): string[] {
  const origin = new URL(pageUrl).origin;
  const links = [...html.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi)]
    .map(match => match[1] ?? match[2])
    .flatMap(href => {
      try {
        const url = new URL(href, pageUrl);
        url.hash = '';
        return url.origin === origin ? [url.toString()] : [];
      } catch {
        return [];
      }
    });
  return [...new Set(links)].slice(0, 100);
}

function canonicalUrl(html: string, pageUrl: string): string | null {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const canonical = tags.find(tag => (attribute(tag, 'rel') ?? '').toLowerCase().split(/\s+/).includes('canonical'));
  const href = canonical ? attribute(canonical, 'href') : null;
  if (!href) return null;
  try { return new URL(href, pageUrl).toString(); } catch { return null; }
}

function schemaDate(raw: unknown[]): string | null {
  for (const node of raw.flatMap(schemaNodes)) {
    for (const key of ['dateModified', 'datePublished']) {
      if (typeof node[key] === 'string' && node[key]) return node[key] as string;
    }
  }
  return null;
}

function extractLastUpdated(html: string, raw: unknown[]): string | null {
  const meta = metaContent(html, ['article:modified_time', 'date', 'datemodified', 'last-modified']);
  if (meta) return meta;
  const time = html.match(/<time\b[^>]*datetime\s*=\s*["']([^"']+)["'][^>]*>/i)?.[1];
  return time ? decodeHtml(time) : schemaDate(raw);
}

function wordCount(markdown: string, html: string): number {
  const text = markdown
    ? markdown.replace(/```[\s\S]*?```/g, ' ').replace(/!?(?:\[[^\]]*\])?\([^)]*\)/g, ' ').replace(/[#*_>`~-]/g, ' ')
    : plainText(html);
  return text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

function buildObservations(source: Omit<EvidenceSource, 'seoObservations'>): string[] {
  const observations: string[] = [];
  if (!source.description) observations.push('Missing meta description');
  else if (source.description.length > 160) observations.push('Meta description exceeds 160 characters');
  if (source.headings.h1.length !== 1) observations.push(`H1 count is ${source.headings.h1.length}`);
  if (!source.canonical) observations.push('Missing canonical URL');
  if (source.faq.length === 0) observations.push('No FAQ questions detected');
  if (source.schema.types.length === 0) observations.push('No JSON-LD schema detected');
  if (!source.lastUpdated) observations.push('No visible update date detected');
  if (source.wordCount < 800) observations.push('Content is shorter than 800 words');
  return observations;
}

function extractEvidence(page: CrawlPage, position: number, fallback: { title: string; description: string }): EvidenceSource {
  const title = tagTexts(page.html, 'title')[0] ?? fallback.title;
  const description = metaContent(page.html, ['description', 'og:description']) || fallback.description;
  const h1 = tagTexts(page.html, 'h1');
  const h2 = tagTexts(page.html, 'h2');
  const markdownH1 = [...page.markdown.matchAll(/^#\s+(.+)$/gm)].map(match => match[1].trim());
  const markdownH2 = [...page.markdown.matchAll(/^##\s+(.+)$/gm)].map(match => match[1].trim());
  const questionHeadings = [h1, h2, ...['h3', 'h4', 'h5', 'h6'].map(tag => tagTexts(page.html, tag))].flat();
  const raw = parseJsonLd(page.html);
  const source = {
    source: new URL(page.url).hostname,
    url: page.url,
    position,
    crawlTime: page.crawledAt,
    title,
    description,
    summary: description || plainText(page.markdown).slice(0, 320),
    headings: { h1: h1.length ? h1 : markdownH1, h2: h2.length ? h2 : markdownH2 },
    faq: extractFaq(raw, questionHeadings.length ? questionHeadings : [...markdownH1, ...markdownH2]),
    schema: { types: schemaTypes(raw), raw },
    internalLinks: internalLinks(page.html, page.url),
    lastUpdated: extractLastUpdated(page.html, raw),
    canonical: canonicalUrl(page.html, page.url),
    wordCount: wordCount(page.markdown, page.html),
  };
  return { ...source, seoObservations: buildObservations(source) };
}

function normalizedTopic(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function analyzeCompetitors(sources: EvidenceSource[], serp: SerpResearch): ResearchArtifact['competitorAnalysis'] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const source of sources) {
    const seen = new Set<string>();
    for (const heading of source.headings.h2) {
      const key = normalizedTopic(heading);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const current = counts.get(key);
      counts.set(key, { label: current?.label ?? heading, count: (current?.count ?? 0) + 1 });
    }
  }
  const ordered = [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const commonTopics = ordered.filter(item => item.count >= Math.max(2, Math.ceil(sources.length / 2))).map(item => item.label);
  const covered = new Set(ordered.map(item => normalizedTopic(item.label)));
  const missingTopics = serp.peopleAlsoAsk.filter(question => ![...covered].some(topic => {
    const words = topic.split(' ').filter(word => word.length > 3);
    return words.length > 0 && words.every(word => normalizedTopic(question).includes(word));
  }));
  return {
    commonTopics: commonTopics.slice(0, 12),
    missingTopics: missingTopics.slice(0, 10),
    averageWordCount: sources.length
      ? Math.round(sources.reduce((total, source) => total + source.wordCount, 0) / sources.length)
      : 0,
    pagesWithFaq: sources.filter(source => source.faq.length > 0).length,
    pagesWithSchema: sources.filter(source => source.schema.types.length > 0).length,
  };
}

function renderResearchMarkdown(artifact: ResearchArtifact): string {
  const lines = [
    `# Research: ${artifact.keyword}`,
    '',
    `Generated: ${artifact.generatedAt}`,
    `Cache expires: ${artifact.expiresAt}`,
    '',
    '## Competitor Analysis',
    '',
    `- Average word count: ${artifact.competitorAnalysis.averageWordCount}`,
    `- Pages with FAQ: ${artifact.competitorAnalysis.pagesWithFaq}/${artifact.sources.length}`,
    `- Pages with schema: ${artifact.competitorAnalysis.pagesWithSchema}/${artifact.sources.length}`,
    '',
    '### Common Topics',
    '',
    ...artifact.competitorAnalysis.commonTopics.map(topic => `- ${topic}`),
    '',
    '### Missing Topics',
    '',
    ...artifact.competitorAnalysis.missingTopics.map(topic => `- ${topic}`),
  ];
  for (const source of artifact.sources) {
    lines.push('', `## ${source.position}. ${source.title}`, '', `Source: ${source.url}`, `Crawled: ${source.crawlTime}`, '', source.summary, '', '### H2', '', ...source.headings.h2.map(value => `- ${value}`), '', '### SEO Observations', '', ...source.seoObservations.map(value => `- ${value}`));
  }
  return `${lines.join('\n')}\n`;
}

export { analyzeCompetitors, extractEvidence, renderResearchMarkdown };

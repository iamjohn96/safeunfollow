import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import matter from 'gray-matter';
import {
  assignRegistryClusters,
  buildRelatedSection,
  insertInternalLinks,
  loadArticles,
  upsertMarkerBlock,
} from './topic-clusters';
import type { ArticleRecord, TopicClusters } from './topic-clusters';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

type PipelineStage = 'Generation' | 'Validation';

type LogName = 'generation' | 'validation' | 'publish' | 'cluster';

interface KeywordEntry {
  keyword: string;
  slug: string;
  published: boolean;
  published_at: string | null;
  last_attempt: string | null;
  cluster?: string;
  impressions?: number;
  clicks?: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface ClusterValidationContext {
  knownSlugs: Set<string>;
  pillarSlug: string;
}

interface GeneratedPost {
  body: string;
  model: string;
  durationMs: number;
}

class PipelineError extends Error {
  constructor(
    readonly stage: PipelineStage,
    message: string,
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

// All operational and content-policy constants live in this section.
const CONFIG = {
  paths: {
    keywordRegistry: path.join('automation', 'keywords.json'),
    topicClusters: path.join('automation', 'topic-clusters.json'),
    blogDirectory: path.join('content', 'blog'),
    pillarDirectory: path.join('content', 'pillars'),
    logDirectory: path.join(os.homedir(), '.hermes', 'logs', 'safeunfollow'),
  },
  generation: {
    apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    models: [
      process.env.SAFEUNFOLLOW_BLOG_MODEL || 'google/gemini-2.5-flash',
      'google/gemini-2.5-flash',
      'openai/gpt-oss-120b:free',
    ].filter((model, index, models) => models.indexOf(model) === index),
    maxTokens: 2600,
    temperature: 0.5,
    retryDelayMs: 15_000,
    retryableStatuses: [429, 503],
    wordRange: '700-900',
  },
  site: {
    name: 'SafeUnfollow',
    domain: 'SafeUnfollow.com',
    blogUrl: process.env.SAFEUNFOLLOW_BLOG_URL || 'https://safeunfollow.com/blog',
    ctaUrl: process.env.SAFEUNFOLLOW_CTA_URL || 'https://safeunfollow.com/upload',
  },
  validation: {
    maxDescriptionLength: 160,
    keywordWordWindow: 100,
    minimumH2Count: 2,
    frontmatterFields: ['title', 'description', 'date', 'slug', 'keywords', 'cluster'],
    bannedPhrases: [
      'connect your Instagram account',
      'connect an Instagram account',
      'log in with Instagram',
      'login with Instagram',
      'sign in with Instagram',
      'account syncing',
      'account linking',
      '30 scans/month',
      'engagement score',
      'inactive follower alerts',
    ],
    requiredMessages: [
      { label: 'No Login', pattern: /\bno[ -]?login(?: required)?\b/i },
      { label: 'No OAuth', pattern: /\bno OAuth\b/i },
      { label: 'No API', pattern: /\bno (?:Instagram )?API\b/i },
      { label: 'Privacy', pattern: /\bprivac(?:y|y-first)\b/i },
      { label: 'Instagram Data Download', pattern: /\bInstagram(?:'s)? data (?:download|export)\b/i },
      { label: 'Upload ZIP', pattern: /\bupload\b[^.\n]{0,80}\bZIP\b|\bZIP\b[^.\n]{0,80}\bupload\b/i },
    ],
    faqHeading: /^##\s+.*(?:FAQ|Frequently Asked Questions)/im,
    ctaLanguage: /\b(?:try|use|visit|upload|check|start|see|discover)\b/i,
  },
  frontmatter: {
    descriptionTemplate: (keyword: string) =>
      `Learn ${keyword} using SafeUnfollow's privacy-first data-file method. No login, no OAuth, no API, and zero ban risk.`,
    secondaryKeywords: [
      'Instagram unfollow tracker',
      'No login Instagram tracker',
      'SafeUnfollow',
    ],
  },
  notifications: {
    noKeywords: 'No unpublished keywords remaining.',
  },
} as const;

const SYSTEM_PROMPT = `You are the official SEO content writer for ${CONFIG.site.domain}.

Write only the markdown body of a ${CONFIG.generation.wordRange} word SEO blog post.

Do not include YAML frontmatter or an H1 heading. The application renders the H1 from frontmatter.
Do not include title metadata, date metadata, slug metadata, or keywords metadata.
Do not use code fences.
Start with a short introduction paragraph, then use H2 sections.
Use the exact primary keyword naturally in the introduction and within the first 100 words.
Use the exact product phrase "Instagram Data Download" at least once.
Never link to the same internal /blog/ or /pillars/ destination more than once.

SafeUnfollow product facts:
- SafeUnfollow helps users check who unfollowed them on Instagram.
- SafeUnfollow does not require Instagram login.
- SafeUnfollow does not require account connection.
- SafeUnfollow does not use Instagram OAuth.
- SafeUnfollow does not use the Instagram API.
- Users request their Instagram data from Instagram.
- Users download the Instagram ZIP file.
- Users upload the downloaded Instagram data file to SafeUnfollow.
- SafeUnfollow analyzes followers and following data from that uploaded file.
- Premium is $3.99/month or $19.99/year.
- Premium includes unlimited snapshots, CSV export, and change history timeline.

Required usage flow:
1. Request Instagram data.
2. Download the Instagram ZIP file.
3. Upload the file to SafeUnfollow.
4. Review the results.

Required positioning:
- No Login Required
- No OAuth
- No API
- Zero Ban Risk
- Privacy First

Forbidden wording:
${CONFIG.validation.bannedPhrases.map(phrase => `- ${phrase}`).join('\n')}

Do not invent features. Explain why the data-file method is safer than login-based tracker apps.
Include at least two H2 sections, including an H2 FAQ section.
Mention ${CONFIG.site.domain} naturally and finish with a clear markdown-link CTA to ${CONFIG.site.ctaUrl}.`;

const BANNED_PHRASE_REPLACEMENTS: Record<string, string> = {
  'connect your Instagram account': 'grant SafeUnfollow access to your Instagram account',
  'connect an Instagram account': 'grant SafeUnfollow access to an Instagram account',
  'log in with Instagram': 'share Instagram credentials',
  'login with Instagram': 'share Instagram credentials',
  'sign in with Instagram': 'share Instagram credentials',
  'account syncing': 'file analysis',
  'account linking': 'file upload',
  '30 scans/month': 'a fixed scan allowance',
  'engagement score': 'follower comparison',
  'inactive follower alerts': 'change history',
};

function nowIso(): string {
  return new Date().toISOString();
}

function todayLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function writeLog(
  name: LogName,
  keyword: string,
  stage: PipelineStage,
  durationMs: number,
  status: 'success' | 'failure' | 'skipped',
  error: string | null = null,
): void {
  fs.mkdirSync(CONFIG.paths.logDirectory, { recursive: true });
  const entry = { timestamp: nowIso(), keyword, stage, duration_ms: durationMs, status, error };
  fs.appendFileSync(
    path.join(CONFIG.paths.logDirectory, `${name}.log`),
    `${JSON.stringify(entry)}\n`,
    'utf8',
  );
}

function loadKeywords(): KeywordEntry[] {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(CONFIG.paths.keywordRegistry, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error('registry root must be an array');
    for (const [index, entry] of parsed.entries()) {
      if (
        typeof entry !== 'object' || entry === null ||
        typeof (entry as KeywordEntry).keyword !== 'string' ||
        typeof (entry as KeywordEntry).slug !== 'string' ||
        typeof (entry as KeywordEntry).published !== 'boolean'
      ) {
        throw new Error(`invalid entry at index ${index}`);
      }
    }
    return parsed as KeywordEntry[];
  } catch (error) {
    throw new PipelineError('Generation', `Unable to load keyword registry: ${errorMessage(error)}`);
  }
}

function saveKeywords(entries: KeywordEntry[]): void {
  fs.writeFileSync(CONFIG.paths.keywordRegistry, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}

function loadTopicClusters(): TopicClusters {
  const parsed: unknown = JSON.parse(fs.readFileSync(CONFIG.paths.topicClusters, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new PipelineError('Generation', 'Topic cluster registry root must be an object');
  }
  return parsed as TopicClusters;
}

function saveTopicClusters(clusters: TopicClusters): void {
  fs.writeFileSync(CONFIG.paths.topicClusters, `${JSON.stringify(clusters, null, 2)}\n`, 'utf8');
}

function writeClusterLog(keyword: string, event: string, details: Record<string, unknown>): void {
  fs.mkdirSync(CONFIG.paths.logDirectory, { recursive: true });
  fs.appendFileSync(path.join(CONFIG.paths.logDirectory, 'cluster.log'), `${JSON.stringify({
    timestamp: nowIso(), keyword, event, ...details,
  })}\n`, 'utf8');
}

function selectKeyword(entries: KeywordEntry[]): KeywordEntry | null {
  for (const entry of entries) {
    if (entry.published) continue;
    const articlePath = path.join(CONFIG.paths.blogDirectory, `${entry.slug}.md`);
    if (fs.existsSync(articlePath)) continue;
    return entry;
  }
  return null;
}

function titleFromKeyword(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map(word => {
      const lower = word.toLowerCase();
      if (lower === 'instagram') return 'Instagram';
      if (lower === 'api') return 'API';
      if (lower === 'oauth') return 'OAuth';
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function escapeYaml(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildPost(entry: KeywordEntry, body: string, date: string): string {
  const title = titleFromKeyword(entry.keyword);
  const description = CONFIG.frontmatter.descriptionTemplate(entry.keyword);
  const keywords = [entry.keyword, ...CONFIG.frontmatter.secondaryKeywords];
  return [
    '---',
    `title: "${escapeYaml(title)}"`,
    `description: "${escapeYaml(description)}"`,
    `date: "${date}"`,
    `slug: "${escapeYaml(entry.slug)}"`,
    `cluster: "${escapeYaml(entry.cluster || '')}"`,
    'keywords:',
    ...keywords.map(keyword => `  - "${escapeYaml(keyword)}"`),
    '---',
    '',
    body.trim(),
    '',
  ].join('\n');
}

function markdownWords(markdown: string): string[] {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_`>|~-]/g, ' ')
    .split(/\s+/)
    .map(word => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function deduplicateInternalLinks(markdown: string): string {
  const seen = new Set<string>();
  return markdown.replace(
    /\[([^\]]+)\]\(\/(blog|pillars)\/([a-z0-9-]+)(?:[?#][^)]*)?\)/gi,
    (link, label: string, _section: string, slug: string) => {
      const normalizedSlug = slug.toLowerCase();
      if (seen.has(normalizedSlug)) return label;
      seen.add(normalizedSlug);
      return link;
    },
  );
}

function repairGeneratedBody(body: string, keyword: string): string {
  let repaired = body.trim();

  for (const phrase of CONFIG.validation.bannedPhrases) {
    repaired = repaired.replace(
      new RegExp(escapeRegExp(phrase), 'gi'),
      BANNED_PHRASE_REPLACEMENTS[phrase],
    );
  }

  const firstWords = markdownWords(repaired)
    .slice(0, CONFIG.validation.keywordWordWindow)
    .join(' ')
    .toLowerCase();
  if (!firstWords.includes(keyword.toLowerCase())) {
    repaired = `Understanding **${keyword}** starts with a method that keeps account access under your control.\n\n${repaired}`;
  }

  if (CONFIG.validation.requiredMessages.some(requirement => !requirement.pattern.test(repaired))) {
    const positioning = 'SafeUnfollow uses a Privacy First, file-based workflow: complete an Instagram Data Download, keep the ZIP intact, and upload it to SafeUnfollow. No Login Required, No OAuth, and no Instagram API means SafeUnfollow never receives your credentials or direct account access.';
    const firstH2 = repaired.search(/^##(?!#)\s+/m);
    repaired = firstH2 === -1
      ? `${repaired}\n\n${positioning}`
      : `${repaired.slice(0, firstH2).trimEnd()}\n\n${positioning}\n\n${repaired.slice(firstH2)}`;
  }

  return deduplicateInternalLinks(repaired);
}

function validatePost(
  source: string,
  entry: KeywordEntry,
  clusterContext?: ClusterValidationContext,
): ValidationResult {
  const errors: string[] = [];
  let parsed: matter.GrayMatterFile<string>;

  try {
    parsed = matter(source);
  } catch (error) {
    return { valid: false, errors: [`Invalid YAML frontmatter: ${errorMessage(error)}`] };
  }

  const { data, content } = parsed;
  for (const field of CONFIG.validation.frontmatterFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Missing frontmatter field: ${field}`);
    }
  }

  if (typeof data.title !== 'string') errors.push('Frontmatter title must be a string');
  if (typeof data.description !== 'string') {
    errors.push('Meta description must be a string');
  } else if (data.description.length > CONFIG.validation.maxDescriptionLength) {
    errors.push(`Meta description exceeds ${CONFIG.validation.maxDescriptionLength} characters`);
  }
  if (data.slug !== entry.slug) errors.push('Frontmatter slug does not match keyword registry');
  if (!Array.isArray(data.keywords) || data.keywords.length === 0) {
    errors.push('Frontmatter keywords must be a non-empty array');
  }
  if (typeof data.cluster !== 'string' || !data.cluster.trim()) {
    errors.push('Cluster metadata must be a non-empty string');
  } else if (entry.cluster && data.cluster !== entry.cluster) {
    errors.push('Frontmatter cluster does not match keyword registry');
  }
  const dateValue = data.date instanceof Date
    ? data.date.toISOString().slice(0, 10)
    : String(data.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) errors.push('Frontmatter date must use YYYY-MM-DD');

  const bodyH1Count = (content.match(/^#(?!#)\s+.+$/gm) || []).length;
  const renderedH1Count = (typeof data.title === 'string' && data.title.trim() ? 1 : 0) + bodyH1Count;
  if (renderedH1Count !== 1) {
    errors.push(`Expected exactly one rendered H1; found ${renderedH1Count}`);
  }

  const h2Count = (content.match(/^##(?!#)\s+.+$/gm) || []).length;
  if (h2Count < CONFIG.validation.minimumH2Count) {
    errors.push(`Expected at least ${CONFIG.validation.minimumH2Count} H2 headings; found ${h2Count}`);
  }
  if (!CONFIG.validation.faqHeading.test(content)) errors.push('Missing FAQ section');

  const firstWords = markdownWords(content).slice(0, CONFIG.validation.keywordWordWindow).join(' ').toLowerCase();
  if (!firstWords.includes(entry.keyword.toLowerCase())) {
    errors.push(`Keyword is missing from the first ${CONFIG.validation.keywordWordWindow} words`);
  }
  if (!/\bSafeUnfollow(?:\.com)?\b/i.test(content)) errors.push('SafeUnfollow is not mentioned');

  for (const requirement of CONFIG.validation.requiredMessages) {
    if (!requirement.pattern.test(content)) errors.push(`Missing product message: ${requirement.label}`);
  }

  const ctaLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/gi;
  const hasCta = [...content.matchAll(ctaLinkPattern)].some(match => {
    const label = match[1];
    const url = match[2];
    const configuredHost = new URL(CONFIG.site.ctaUrl).hostname.toLowerCase();
    return url.toLowerCase().includes(configuredHost) && CONFIG.validation.ctaLanguage.test(label);
  });
  if (!hasCta) errors.push('Missing CTA link directing users to SafeUnfollow');

  if (!/^##\s+Related Articles/im.test(content)) errors.push('Missing Related Articles section');
  const internalLinkOccurrences = [...content.matchAll(/\[[^\]]+\]\(\/(?:blog|pillars)\/([a-z0-9-]+)(?:[?#][^)]*)?\)/gi)]
    .map(match => match[1])
    .filter(slug => slug !== entry.slug);
  const internalSlugs = [...new Set(internalLinkOccurrences)];
  if (internalSlugs.length < 2) errors.push('Expected at least 2 unique internal links');
  if (internalLinkOccurrences.length !== internalSlugs.length) errors.push('Duplicate internal links found');
  if (clusterContext) {
    if (!internalSlugs.includes(clusterContext.pillarSlug)) errors.push('Missing cluster pillar link');
    for (const slug of internalSlugs) {
      if (!clusterContext.knownSlugs.has(slug)) errors.push(`Broken internal link slug: ${slug}`);
    }
  }

  const lowerSource = source.toLowerCase();
  for (const phrase of CONFIG.validation.bannedPhrases) {
    if (lowerSource.includes(phrase.toLowerCase())) errors.push(`Banned phrase found: "${phrase}"`);
  }

  return { valid: errors.length === 0, errors };
}

async function callGenerationApi(model: string, keyword: string): Promise<string> {
  const apiKey = process.env[CONFIG.generation.apiKeyEnv];
  if (!apiKey) throw new Error(`${CONFIG.generation.apiKeyEnv} is not set`);

  const response = await fetch(CONFIG.generation.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': CONFIG.site.blogUrl,
      'X-Title': `${CONFIG.site.name} Blog Automation`,
    },
    body: JSON.stringify({
      model,
      max_tokens: CONFIG.generation.maxTokens,
      temperature: CONFIG.generation.temperature,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            `Primary keyword: "${keyword}"`,
            `Include that exact phrase naturally within the first ${CONFIG.validation.keywordWordWindow} words.`,
            'Include the exact phrase "Instagram Data Download".',
            'Follow every SafeUnfollow positioning and forbidden-wording rule from the system prompt.',
          ].join('\n'),
        },
      ],
    }),
  });

  if (CONFIG.generation.retryableStatuses.includes(response.status as 429 | 503)) {
    throw new Error(`RETRYABLE:${response.status}`);
  }
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Generation API returned no content');
  return content.replace(/^```(?:markdown|md)?\s*/i, '').replace(/```\s*$/, '').trim();
}

function sleep(durationMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, durationMs));
}

async function generatePost(keyword: string): Promise<GeneratedPost> {
  const startedAt = Date.now();
  const failures: string[] = [];

  for (const model of CONFIG.generation.models) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        console.log(`Trying model: ${model}${attempt === 2 ? ' (retry)' : ''}`);
        const body = await callGenerationApi(model, keyword);
        return { body, model, durationMs: elapsedMs(startedAt) };
      } catch (error) {
        const reason = errorMessage(error);
        failures.push(`${model} attempt ${attempt}: ${reason}`);
        if (!reason.startsWith('RETRYABLE:') || attempt === 2) break;
        await sleep(CONFIG.generation.retryDelayMs);
      }
    }
  }

  throw new PipelineError('Generation', `All models failed: ${failures.join('; ')}`);
}

async function main(): Promise<void> {
  let activeKeyword = 'N/A';
  let articlePath: string | null = null;
  let articleCreated = false;
  let stageStartedAt = Date.now();
  let failureAlreadyLogged = false;

  try {
    const entries = loadKeywords();
    const clusters = loadTopicClusters();
    assignRegistryClusters(entries, clusters);
    const entry = selectKeyword(entries);
    if (!entry) {
      console.log(CONFIG.notifications.noKeywords);
      writeLog('generation', activeKeyword, 'Generation', 0, 'skipped', CONFIG.notifications.noKeywords);
      return;
    }

    activeKeyword = entry.keyword;
    if (!entry.cluster) throw new PipelineError('Generation', 'Selected keyword has no topic cluster');
    writeClusterLog(entry.keyword, 'cluster selected', { cluster: entry.cluster });
    entry.last_attempt = nowIso();
    articlePath = path.join(CONFIG.paths.blogDirectory, `${entry.slug}.md`);

    stageStartedAt = Date.now();
    const generated = await generatePost(entry.keyword);
    writeLog('generation', entry.keyword, 'Generation', generated.durationMs, 'success');

    const publicationDate = todayLocal();
    const definition = clusters[entry.cluster];
    if (!definition) throw new PipelineError('Generation', `Unknown topic cluster: ${entry.cluster}`);
    const existingArticles = loadArticles(
      CONFIG.paths.blogDirectory,
      CONFIG.paths.pillarDirectory,
      entries,
      clusters,
    );
    const repairedBody = repairGeneratedBody(generated.body, entry.keyword);
    const linkedBody = insertInternalLinks(
      repairedBody,
      { slug: entry.slug, title: titleFromKeyword(entry.keyword), cluster: entry.cluster },
      existingArticles,
      definition.pillar,
    );
    const draftArticle: ArticleRecord = {
      slug: entry.slug,
      title: titleFromKeyword(entry.keyword),
      cluster: entry.cluster,
      source: '',
      content: linkedBody,
      filePath: articlePath,
      impressions: Number(entry.impressions || 0),
      clicks: Number(entry.clicks || 0),
      isPillar: false,
    };
    const related = buildRelatedSection(draftArticle, [...existingArticles, draftArticle], definition.pillar);
    const finalBody = deduplicateInternalLinks(upsertMarkerBlock(linkedBody, related.markdown));
    const source = buildPost(entry, finalBody, publicationDate);
    fs.mkdirSync(CONFIG.paths.blogDirectory, { recursive: true });
    fs.writeFileSync(articlePath, source, { encoding: 'utf8', flag: 'wx' });
    articleCreated = true;

    const validationStartedAt = Date.now();
    const knownSlugs = new Set([
      ...existingArticles.map(article => article.slug),
      ...Object.values(clusters).map(cluster => cluster.pillar),
      entry.slug,
    ]);
    const validation = validatePost(source, entry, { knownSlugs, pillarSlug: definition.pillar });
    if (!validation.valid) {
      const reason = validation.errors.join('; ');
      writeLog('validation', entry.keyword, 'Validation', elapsedMs(validationStartedAt), 'failure', reason);
      failureAlreadyLogged = true;
      fs.unlinkSync(articlePath);
      articleCreated = false;
      throw new PipelineError('Validation', reason);
    }
    writeLog('validation', entry.keyword, 'Validation', elapsedMs(validationStartedAt), 'success');

    entry.published = true;
    entry.published_at = nowIso();
    saveKeywords(entries);
    saveTopicClusters(clusters);
    writeClusterLog(entry.keyword, 'article prepared', { count: related.count, slug: entry.slug });
    console.log(`Prepared article: ${entry.slug} (${generated.model})`);
  } catch (error) {
    const pipelineError = error instanceof PipelineError
      ? error
      : new PipelineError('Generation', errorMessage(error));

    if (!failureAlreadyLogged && pipelineError.stage === 'Generation') {
      writeLog(
        'generation', activeKeyword, pipelineError.stage,
        elapsedMs(stageStartedAt), 'failure', pipelineError.message,
      );
    }

    if (articleCreated && articlePath && fs.existsSync(articlePath)) {
      fs.unlinkSync(articlePath);
    }
    console.error(`${pipelineError.stage}: ${pipelineError.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main();
}

export {
  CONFIG,
  buildPost,
  deduplicateInternalLinks,
  repairGeneratedBody,
  selectKeyword,
  titleFromKeyword,
  validatePost,
};

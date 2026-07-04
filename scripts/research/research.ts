import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { createContentBrief, renderContentBrief } from './brief';
import { Crawl4AIUnavailableError, crawlPage } from './crawl4ai';
import { analyzeCompetitors, extractEvidence, renderResearchMarkdown } from './evidence';
import { searchGoogleSerp } from './serp';
import type { ContentBrief, CrawlPage, ResearchArtifact, SerpResearch } from './types';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

interface KeywordEntry {
  keyword: string;
  slug?: string;
  published?: boolean;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  avg_position?: number | null;
  cluster?: string;
}

interface ResearchPaths {
  researchDirectory: string;
  briefsDirectory: string;
  keywordsFile: string;
}

interface RunResearchOptions {
  paths?: Partial<ResearchPaths>;
  ttlDays?: number;
  topN?: number;
  force?: boolean;
  dryRun?: boolean;
  now?: Date;
  search?: (keyword: string) => Promise<SerpResearch>;
  crawl?: (url: string) => Promise<CrawlPage>;
  logger?: Pick<Console, 'log' | 'warn'>;
  lockDirectory?: string;
}

interface ResearchRunResult {
  keyword: string;
  slug: string;
  cacheHit: boolean;
  dryRun: boolean;
  artifact: ResearchArtifact | null;
  artifactPath: string;
  briefPath: string;
}

interface ResearchLock {
  lockPath: string;
  release: () => void;
}

class ResearchLockError extends Error {
  constructor(keyword: string, lockPath: string) {
    super(`Research is already running for "${keyword}" (${lockPath}).`);
    this.name = 'ResearchLockError';
  }
}

const CONFIG = {
  paths: {
    researchDirectory: 'research',
    briefsDirectory: path.join('automation', 'content-briefs'),
    keywordsFile: path.join('automation', 'keywords.json'),
  },
  cacheTtlDays: 7,
  topN: 5,
  ownHosts: ['safeunfollow.com', 'www.safeunfollow.com'],
} as const;

function normalizeKeyword(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

function slugify(value: string): string {
  return normalizeKeyword(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function resolvePaths(overrides: Partial<ResearchPaths> = {}): ResearchPaths {
  return { ...CONFIG.paths, ...overrides };
}

function processRunning(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function acquireResearchLock(keyword: string, lockDirectory = os.tmpdir()): ResearchLock {
  const normalized = normalizeKeyword(keyword);
  const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 20);
  const lockPath = path.join(lockDirectory, `safeunfollow-research-${hash}.lock`);
  const owner = { pid: process.pid, keyword: normalized, token: crypto.randomUUID(), acquiredAt: new Date().toISOString() };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      fs.mkdirSync(lockDirectory, { recursive: true });
      fs.writeFileSync(lockPath, `${JSON.stringify(owner)}\n`, { flag: 'wx' });
      return {
        lockPath,
        release: () => {
          try {
            const current = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as { token?: string };
            if (current.token === owner.token) fs.unlinkSync(lockPath);
          } catch { /* already released */ }
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      let pid = 0;
      try { pid = Number((JSON.parse(fs.readFileSync(lockPath, 'utf8')) as { pid?: number }).pid); } catch { /* stale */ }
      if (processRunning(pid)) throw new ResearchLockError(keyword, lockPath);
      fs.unlinkSync(lockPath);
    }
  }
  throw new ResearchLockError(keyword, lockPath);
}

function readKeywords(filePath: string): KeywordEntry[] {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as KeywordEntry[];
}

function priorityScore(entry: KeywordEntry): number {
  const impressions = Math.max(0, entry.impressions ?? 0);
  const ctr = Math.max(0, entry.ctr ?? 0);
  const position = entry.avg_position ?? 100;
  const positionOpportunity = position >= 5 && position <= 30 ? 100 - position : 0;
  return (entry.published ? 0 : 10_000) + impressions * 10 + positionOpportunity + Math.max(0, 0.05 - ctr) * 1_000;
}

function selectPrioritizedKeyword(entries: KeywordEntry[]): KeywordEntry {
  const candidates = entries.filter(entry => normalizeKeyword(entry.keyword).length > 0);
  if (candidates.length === 0) throw new Error('No keywords are available in automation/keywords.json.');
  return [...candidates].sort((a, b) => {
    if (Boolean(a.published) !== Boolean(b.published)) return a.published ? 1 : -1;
    return priorityScore(b) - priorityScore(a);
  })[0];
}

function cacheIsFresh(artifact: ResearchArtifact, keyword: string, now: Date): boolean {
  return artifact.schemaVersion === 1
    && normalizeKeyword(artifact.keyword) === normalizeKeyword(keyword)
    && Number.isFinite(Date.parse(artifact.expiresAt))
    && Date.parse(artifact.expiresAt) > now.getTime();
}

function readFreshCache(filePath: string, keyword: string, now: Date): ResearchArtifact | null {
  try {
    const artifact = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ResearchArtifact;
    return cacheIsFresh(artifact, keyword, now) ? artifact : null;
  } catch {
    return null;
  }
}

function writeAtomic(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, value, 'utf8');
  fs.renameSync(temporary, filePath);
}

function suggestedInternalLinks(keyword: string, entries: KeywordEntry[]): string[] {
  const current = entries.find(entry => normalizeKeyword(entry.keyword) === normalizeKeyword(keyword));
  const sameCluster = current?.cluster
    ? entries.filter(entry => entry.cluster === current.cluster && normalizeKeyword(entry.keyword) !== normalizeKeyword(keyword))
    : [];
  const words = new Set(normalizeKeyword(keyword).split(' ').filter(word => word.length > 3));
  const related = [...sameCluster, ...entries.filter(entry => {
    const candidate = normalizeKeyword(entry.keyword);
    return [...words].some(word => candidate.includes(word));
  })];
  return [...new Set(related.map(entry => `/blog/${entry.slug || slugify(entry.keyword)}`))].slice(0, 6);
}

function writeBrief(artifact: ResearchArtifact, entries: KeywordEntry[], briefPath: string): ContentBrief {
  const brief = createContentBrief(artifact, suggestedInternalLinks(artifact.keyword, entries));
  writeAtomic(briefPath, renderContentBrief(brief));
  return brief;
}

async function runResearch(keyword: string, options: RunResearchOptions = {}): Promise<ResearchRunResult> {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) throw new Error('A non-empty keyword is required.');
  const slug = slugify(normalized);
  if (!slug) throw new Error(`Unable to create a safe slug for keyword "${keyword}".`);
  const paths = resolvePaths(options.paths);
  const artifactPath = path.join(paths.researchDirectory, `${slug}.json`);
  const markdownPath = path.join(paths.researchDirectory, `${slug}.md`);
  const briefPath = path.join(paths.briefsDirectory, `${slug}.md`);
  const now = options.now ?? new Date();
  const resultBase = { keyword: normalized, slug, artifactPath, briefPath };
  if (options.dryRun) return { ...resultBase, cacheHit: false, dryRun: true, artifact: null };

  const lock = acquireResearchLock(normalized, options.lockDirectory);
  try {
    const entries = readKeywords(paths.keywordsFile);
    if (!options.force) {
      const cached = readFreshCache(artifactPath, normalized, now);
      if (cached) {
        if (!fs.existsSync(markdownPath)) writeAtomic(markdownPath, renderResearchMarkdown(cached));
        if (!fs.existsSync(briefPath)) writeBrief(cached, entries, briefPath);
        return { ...resultBase, cacheHit: true, dryRun: false, artifact: cached };
      }
    }

    const search = options.search ?? (value => searchGoogleSerp(value, { limit: 10 }));
    const crawl = options.crawl ?? (url => crawlPage(url));
    const serp = await search(normalized);
    const candidates = serp.results.filter(result => {
      try { return !CONFIG.ownHosts.some(host => host === new URL(result.url).hostname); } catch { return false; }
    }).slice(0, options.topN ?? CONFIG.topN);
    const sources = [];
    for (const candidate of candidates) {
      try {
        const page = await crawl(candidate.url);
        sources.push(extractEvidence(page, candidate.position, candidate));
      } catch (error) {
        if (error instanceof Crawl4AIUnavailableError) throw error;
        options.logger?.warn(`Skipping ${candidate.url}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (sources.length === 0) throw new Error(`No crawlable competitor evidence was collected for "${normalized}".`);
    const ttlDays = options.ttlDays ?? CONFIG.cacheTtlDays;
    const expiresAt = new Date(now.getTime() + ttlDays * 86_400_000).toISOString();
    const artifact: ResearchArtifact = {
      schemaVersion: 1,
      keyword: normalized,
      slug,
      generatedAt: now.toISOString(),
      expiresAt,
      cacheTtlDays: ttlDays,
      serp,
      sources,
      competitorAnalysis: analyzeCompetitors(sources, serp),
    };
    writeAtomic(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
    writeAtomic(markdownPath, renderResearchMarkdown(artifact));
    writeBrief(artifact, entries, briefPath);
    return { ...resultBase, cacheHit: false, dryRun: false, artifact };
  } finally {
    lock.release();
  }
}

function rebuildBriefs(keyword: string | undefined, options: Pick<RunResearchOptions, 'paths' | 'dryRun'> = {}): string[] {
  const paths = resolvePaths(options.paths);
  const entries = readKeywords(paths.keywordsFile);
  const files = keyword
    ? [path.join(paths.researchDirectory, `${slugify(keyword)}.json`)]
    : fs.existsSync(paths.researchDirectory)
      ? fs.readdirSync(paths.researchDirectory).filter(file => file.endsWith('.json')).map(file => path.join(paths.researchDirectory, file))
      : [];
  if (files.length === 0) throw new Error('No research JSON artifacts were found. Run npm run research first.');
  const outputs: string[] = [];
  for (const file of files) {
    if (!fs.existsSync(file)) throw new Error(`Research artifact not found: ${file}`);
    const artifact = JSON.parse(fs.readFileSync(file, 'utf8')) as ResearchArtifact;
    const briefPath = path.join(paths.briefsDirectory, `${artifact.slug}.md`);
    outputs.push(briefPath);
    if (!options.dryRun) writeBrief(artifact, entries, briefPath);
  }
  return outputs;
}

function parseCli(argv: string[]): { command: 'run' | 'keyword' | 'brief'; keyword?: string; force: boolean; dryRun: boolean } {
  const commandValue = argv[0] ?? 'run';
  if (!['run', 'keyword', 'brief'].includes(commandValue)) throw new Error(`Unknown research command: ${commandValue}`);
  const flags = new Set(argv.slice(1).filter(value => value.startsWith('--')));
  const keyword = argv.slice(1).filter(value => !value.startsWith('--')).join(' ').trim() || undefined;
  return { command: commandValue as 'run' | 'keyword' | 'brief', keyword, force: flags.has('--force'), dryRun: flags.has('--dry-run') };
}

async function main(): Promise<void> {
  try {
    const flags = parseCli(process.argv.slice(2));
    if (flags.command === 'brief') {
      const outputs = rebuildBriefs(flags.keyword, { dryRun: flags.dryRun });
      console.log(`${flags.dryRun ? 'Would generate' : 'Generated'} ${outputs.length} content brief(s).`);
      return;
    }
    const entries = readKeywords(CONFIG.paths.keywordsFile);
    const keyword = flags.command === 'keyword'
      ? flags.keyword
      : flags.keyword ?? selectPrioritizedKeyword(entries).keyword;
    if (!keyword) throw new Error('Usage: npm run research:keyword -- "<keyword>"');
    const result = await runResearch(keyword, { force: flags.force, dryRun: flags.dryRun, logger: console });
    if (result.dryRun) console.log(`Read-only research plan: ${result.keyword} -> ${result.artifactPath}`);
    else console.log(`${result.cacheHit ? 'Reused cached' : 'Generated'} research: ${result.artifactPath}\nContent brief: ${result.briefPath}`);
  } catch (error) {
    console.error(`Research failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) void main();

export {
  CONFIG,
  ResearchLockError,
  acquireResearchLock,
  cacheIsFresh,
  parseCli,
  priorityScore,
  rebuildBriefs,
  runResearch,
  selectPrioritizedKeyword,
  slugify,
};
export type { KeywordEntry, ResearchRunResult, RunResearchOptions };

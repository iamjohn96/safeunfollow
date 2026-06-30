import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { acquirePublishLock } from './publish-lock';
import { sendTelegram } from './search-console-report';

interface KeywordEntry {
  keyword: string;
  slug: string;
  published: boolean;
}

const CONFIG = {
  remote: process.env.SAFEUNFOLLOW_GIT_REMOTE || 'origin',
  branch: process.env.SAFEUNFOLLOW_GIT_BRANCH || 'main',
  blogUrl: process.env.SAFEUNFOLLOW_BLOG_URL || 'https://safeunfollow.com/blog',
  deploymentAttempts: Number(process.env.SAFEUNFOLLOW_DEPLOY_ATTEMPTS || 18),
  deploymentIntervalMs: Number(process.env.SAFEUNFOLLOW_DEPLOY_INTERVAL_MS || 10_000),
  deploymentTimeoutMs: 10_000,
  registryPath: path.join('automation', 'keywords.json'),
  logPath: path.join(os.homedir(), '.hermes', 'logs', 'safeunfollow', 'publish.log'),
  seoPaths: [path.join('automation', 'keywords.json'), path.join('automation', 'topic-clusters.json')],
  publicationPaths: [
    path.join('automation', 'keywords.json'),
    path.join('automation', 'topic-clusters.json'),
    path.join('automation', 'content-roadmap.md'),
    path.join('content', 'blog'),
    path.join('content', 'pillars'),
  ],
} as const;

function writePublishLog(stage: string, status: 'success' | 'failure' | 'skipped', error: string | null = null): void {
  fs.mkdirSync(path.dirname(CONFIG.logPath), { recursive: true });
  fs.appendFileSync(CONFIG.logPath, `${JSON.stringify({
    timestamp: new Date().toISOString(),
    stage,
    status,
    error,
  })}\n`, 'utf8');
}

function run(command: string, args: string[], capture = false): string {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    stdio: capture ? 'pipe' : 'inherit',
  });
  if (result.status !== 0) {
    const reason = (result.error?.message || result.stderr || result.stdout || `${command} exited ${result.status}`).trim();
    throw new Error(reason);
  }
  return capture ? result.stdout.trim() : '';
}

function git(args: string[], capture = true): string {
  return run('git', args, capture);
}

function hasChanges(paths: readonly string[]): boolean {
  return Boolean(git(['status', '--porcelain', '--untracked-files=all', '--', ...paths]));
}

function ensureCleanTree(): void {
  const status = git(['status', '--porcelain', '--untracked-files=all']);
  if (status) throw new Error(`Refusing to publish from a dirty worktree:\n${status}`);
}

function rollback(paths: readonly string[]): void {
  spawnSync('git', ['restore', '--staged', '--worktree', '--', ...paths], { stdio: 'ignore' });
  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z', '--', ...paths]);
  for (const filePath of untracked.split('\0').filter(Boolean)) fs.rmSync(filePath, { force: true });
}

function commitIfChanged(paths: readonly string[], message: string): string | null {
  if (!hasChanges(paths)) return null;
  git(['add', '--', ...paths], false);
  git(['commit', '-m', message, '--', ...paths], false);
  return git(['rev-parse', '--short', 'HEAD']);
}

function push(): void {
  git(['push', CONFIG.remote, `HEAD:${CONFIG.branch}`], false);
}

function pushPendingCommits(): boolean {
  const result = spawnSync('git', ['rev-list', '--count', '@{upstream}..HEAD'], { encoding: 'utf8' });
  if (result.status === 0 && Number(result.stdout.trim()) > 0) {
    const subjects = git(['log', '@{upstream}..HEAD', '--format=%s']).split('\n');
    console.log('Pushing commit(s) left by an earlier interrupted publication.');
    push();
    return subjects.some(subject => subject.startsWith('feat(blog): publish '));
  }
  return false;
}

function loadRegistry(): KeywordEntry[] {
  return JSON.parse(fs.readFileSync(CONFIG.registryPath, 'utf8')) as KeywordEntry[];
}

function newlyPublished(before: Set<string>, entries: KeywordEntry[]): KeywordEntry | null {
  return entries.find(entry => entry.published && !before.has(entry.slug)) || null;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function waitForDeployment(url: string): Promise<void> {
  let reason = 'deployment did not become available';
  for (let attempt = 1; attempt <= CONFIG.deploymentAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(CONFIG.deploymentTimeoutMs),
      });
      if (response.ok) return;
      reason = `HTTP ${response.status}`;
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }
    if (attempt < CONFIG.deploymentAttempts) await sleep(CONFIG.deploymentIntervalMs);
  }
  throw new Error(`Deployment check failed for ${url}: ${reason}`);
}

async function notify(message: string): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.warn('Telegram skipped: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are not both set.');
    return;
  }
  await sendTelegram(message);
}

function parseFlags(args: string[]): { dryRun: boolean } {
  const unknown = args.filter(arg => arg !== '--dry-run');
  if (unknown.length) throw new Error(`Unknown option(s): ${unknown.join(', ')}`);
  return { dryRun: args.includes('--dry-run') };
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const lock = acquirePublishLock();
  let committedPublication = false;
  let stage = 'Initialization';

  try {
    if (flags.dryRun) {
      console.log([
        'Dry run: publication lock acquired.',
        'Workflow: Search Console update → SEO commit/push → article generation → cluster sync → publication commit/push.',
        'No repository files, network services, Git history, or notifications were changed.',
      ].join('\n'));
      return;
    }

    ensureCleanTree();
    if (pushPendingCommits()) {
      console.log('Recovered a pending publication push; no second article will be generated in this run.');
      writePublishLog('Git Push Recovery', 'success');
      return;
    }

    try {
      stage = 'Search Console';
      run(process.execPath, ['--import', 'tsx', 'scripts/search-console-report.ts', '--update-keywords']);
      const seoCommit = commitIfChanged(CONFIG.seoPaths, 'chore(seo): refresh Search Console keyword data');
      if (seoCommit) push();
      writePublishLog(stage, 'success');
    } catch (error) {
      rollback(CONFIG.seoPaths);
      throw error;
    }

    const publishedBefore = new Set(
      loadRegistry().filter(entry => entry.published).map(entry => entry.slug),
    );

    try {
      stage = 'Generation';
      run(process.execPath, ['--import', 'tsx', 'scripts/generate-post.ts']);
      const entry = newlyPublished(publishedBefore, loadRegistry());
      if (!entry) {
        console.log('No unpublished keywords remaining; cluster sync and publication commit skipped.');
        writePublishLog(stage, 'skipped', 'No unpublished keywords remaining.');
        return;
      }

      stage = 'Cluster Sync';
      run(process.execPath, ['--import', 'tsx', 'scripts/sync-topic-clusters.ts']);
      stage = 'Git Commit';
      const commit = commitIfChanged(
        CONFIG.publicationPaths,
        `feat(blog): publish "${entry.keyword}"`,
      );
      if (!commit) throw new Error('Publication produced no commit-ready changes.');
      committedPublication = true;
      stage = 'Git Push';
      push();

      const url = `${CONFIG.blogUrl.replace(/\/$/, '')}/${entry.slug}`;
      stage = 'Deployment';
      await waitForDeployment(url);
      stage = 'Notification';
      await notify([
        '✅ SafeUnfollow Blog Published',
        '',
        `Keyword: ${entry.keyword}`,
        `URL: ${url}`,
        `Commit: ${commit}`,
      ].join('\n'));
      writePublishLog('Publication', 'success');
      console.log(`Published: ${url} (${commit})`);
    } catch (error) {
      if (!committedPublication) rollback(CONFIG.publicationPaths);
      throw error;
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    try {
      writePublishLog(stage, 'failure', reason);
    } catch (logError) {
      console.error(`Unable to write publication log: ${String(logError)}`);
    }
    console.error(`Blog publication failed: ${reason}`);
    try {
      await notify(`❌ SafeUnfollow Blog Publication Failed\n\n${reason}`);
    } catch (notificationError) {
      console.error(`Failure notification failed: ${String(notificationError)}`);
    }
    process.exitCode = 1;
  } finally {
    lock.release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main();
}

export { CONFIG, ensureCleanTree, hasChanges, parseFlags, rollback };

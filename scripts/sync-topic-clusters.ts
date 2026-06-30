import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assignRegistryClusters, syncClusterContent } from './topic-clusters';
import type { ClusterKeywordEntry, TopicClusters } from './topic-clusters';

const paths = {
  clusters: path.join('automation', 'topic-clusters.json'),
  keywords: path.join('automation', 'keywords.json'),
  roadmap: path.join('automation', 'content-roadmap.md'),
  blog: path.join('content', 'blog'),
  pillars: path.join('content', 'pillars'),
  navigation: path.join('content', 'blog', 'index.md'),
  log: path.join(os.homedir(), '.hermes', 'logs', 'safeunfollow', 'cluster.log'),
};

const clusters = JSON.parse(fs.readFileSync(paths.clusters, 'utf8')) as TopicClusters;
const entries = JSON.parse(fs.readFileSync(paths.keywords, 'utf8')) as ClusterKeywordEntry[];
assignRegistryClusters(entries, clusters);
fs.writeFileSync(paths.clusters, `${JSON.stringify(clusters, null, 2)}\n`, 'utf8');
fs.writeFileSync(paths.keywords, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');

const result = syncClusterContent({
  clusters,
  entries,
  blogDirectory: paths.blog,
  pillarDirectory: paths.pillars,
  roadmapPath: paths.roadmap,
  navigationPath: process.argv.includes('--navigation') ? paths.navigation : undefined,
});

fs.mkdirSync(path.dirname(paths.log), { recursive: true });
fs.appendFileSync(paths.log, `${JSON.stringify({
  timestamp: new Date().toISOString(),
  event: 'cluster sync',
  clusters: Object.keys(clusters).length,
  articles: result.articles.filter(article => !article.isPillar).length,
  pillars_updated: result.updatedPillars,
  related_articles_inserted: result.relatedCounts,
  roadmap_updated: paths.roadmap,
  orphans: result.orphans.map(orphan => orphan.slug),
})}\n`, 'utf8');

console.log(`Synced ${Object.keys(clusters).length} clusters and ${result.articles.length} pages.`);

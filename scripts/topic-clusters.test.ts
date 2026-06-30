import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  RELATED_START,
  assignKeywordCluster,
  buildRelatedSection,
  detectOrphans,
  generateRoadmap,
  insertInternalLinks,
  loadArticles,
  parseInternalSlugs,
  syncClusterContent,
  upsertMarkerBlock,
} from './topic-clusters';
import type { ArticleRecord, ClusterKeywordEntry, TopicClusters } from './topic-clusters';

const clusters = (): TopicClusters => ({
  'instagram-unfollow': {
    pillar: 'instagram-unfollow-guide',
    keywords: ['who unfollowed me instagram', 'instagram data download'],
  },
  'ghost-followers': {
    pillar: 'ghost-followers-guide',
    keywords: ['instagram ghost followers'],
  },
});

function article(slug: string, title: string, impressions = 0): ArticleRecord {
  return {
    slug,
    title,
    cluster: 'instagram-unfollow',
    source: '',
    content: '',
    filePath: `${slug}.md`,
    impressions,
    clicks: 0,
    isPillar: false,
  };
}

function markdown(slug: string, title: string, cluster: string, body = ''): string {
  return `---\ntitle: "${title}"\ndescription: "Test"\ndate: "2026-06-29"\nslug: "${slug}"\ncluster: "${cluster}"\nkeywords: ["test"]\n---\n\n${body}\n`;
}

test('assigns exact and semantic keywords, then creates a genuinely new cluster', () => {
  const config = clusters();
  assert.equal(assignKeywordCluster('WHO UNFOLLOWED ME INSTAGRAM', config).cluster, 'instagram-unfollow');
  assert.equal(assignKeywordCluster('instagram unfollower data download guide', config).cluster, 'instagram-unfollow');
  const created = assignKeywordCluster('tiktok profile analytics', config);
  assert.equal(created.created, true);
  assert(config[created.cluster].keywords.includes('tiktok profile analytics'));
});

test('pillar marker updates preserve manual prose', () => {
  const original = `Manual introduction.\n\n${RELATED_START}\nOld generated links\n<!-- AUTO:RELATED_END -->\n\nManual ending.`;
  const updated = upsertMarkerBlock(original, '## Supporting Articles\n\n- [New](/blog/new)');
  assert.match(updated, /Manual introduction/);
  assert.match(updated, /Manual ending/);
  assert.doesNotMatch(updated, /Old generated links/);
});

test('related article ranking excludes self and prevents duplicate destinations', () => {
  const current = article('current', 'Instagram Data Download');
  const result = buildRelatedSection(current, [
    current,
    article('popular', 'Instagram Data Export', 500),
    article('specific', 'Download Instagram Followers', 20),
  ]);
  assert.equal(result.count, 2);
  assert(!result.markdown.includes('/blog/current'));
  assert.equal(parseInternalSlugs(result.markdown).length, 2);
});

test('internal linking adds a pillar and related guides without duplicates', () => {
  const body = 'Intro.\n\n## FAQ\n\nAnswer.';
  const linked = insertInternalLinks(body, article('current', 'Instagram Data Download'), [
    article('related', 'Instagram Export Guide', 100),
    article('related-two', 'Find Unfollowers', 50),
  ], 'instagram-unfollow-guide');
  const slugs = parseInternalSlugs(linked);
  assert(slugs.includes('instagram-unfollow-guide'));
  assert(slugs.includes('related'));
  assert.equal(slugs.length, new Set(slugs).size);
});

test('orphan detection reports missing inbound, related, and pillar links', () => {
  const isolated = article('isolated', 'Isolated Article');
  isolated.source = markdown('isolated', isolated.title, isolated.cluster, 'No links.');
  isolated.content = 'No links.';
  const findings = detectOrphans([isolated], clusters());
  assert.deepEqual(findings[0].reasons, [
    'no inbound internal links',
    'no related articles section',
    'no pillar reference',
  ]);
});

test('roadmap combines completion state and Search Console priority', () => {
  const entries: ClusterKeywordEntry[] = [{
    keyword: 'who unfollowed me instagram', slug: 'published', published: true,
    cluster: 'instagram-unfollow', impressions: 100,
  }, {
    keyword: 'instagram data download', slug: 'missing', published: false,
    cluster: 'instagram-unfollow', impressions: 1000,
  }];
  const roadmap = generateRoadmap(clusters(), entries, [article('published', 'Published')]);
  assert.match(roadmap, /✓ Who Unfollowed Me Instagram/);
  assert.match(roadmap, /○ Instagram Data Download/);
  assert.match(roadmap, /Priority score: ★/);
});

test('cluster sync creates pillars, related sections, navigation, and roadmap from mocked files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'safeunfollow-clusters-'));
  const blog = path.join(root, 'blog');
  const pillars = path.join(root, 'pillars');
  fs.mkdirSync(blog);
  fs.writeFileSync(path.join(blog, 'one.md'), markdown(
    'one', 'One', 'instagram-unfollow',
    '[Pillar](/pillars/instagram-unfollow-guide)\n\n## Related Articles\n\n- [Two](/blog/two)',
  ));
  fs.writeFileSync(path.join(blog, 'two.md'), markdown(
    'two', 'Two', 'instagram-unfollow',
    '[Pillar](/pillars/instagram-unfollow-guide)\n\n## Related Articles\n\n- [One](/blog/one)',
  ));
  const entries: ClusterKeywordEntry[] = [
    { keyword: 'who unfollowed me instagram', slug: 'one', published: true, cluster: 'instagram-unfollow' },
    { keyword: 'instagram data download', slug: 'two', published: true, cluster: 'instagram-unfollow' },
  ];
  const result = syncClusterContent({
    clusters: clusters(), entries, blogDirectory: blog, pillarDirectory: pillars,
    roadmapPath: path.join(root, 'roadmap.md'), navigationPath: path.join(blog, 'index.md'),
  });
  assert(fs.existsSync(path.join(pillars, 'instagram-unfollow-guide.md')));
  assert.match(fs.readFileSync(path.join(blog, 'one.md'), 'utf8'), /## Related Articles/);
  assert.match(fs.readFileSync(path.join(root, 'roadmap.md'), 'utf8'), /Content Roadmap/);
  assert.match(fs.readFileSync(path.join(blog, 'index.md'), 'utf8'), /Instagram Unfollow Guide/);
  assert(result.health.some(cluster => cluster.cluster === 'instagram-unfollow'));
  assert.equal(loadArticles(blog, pillars, entries, clusters()).filter(item => !item.isPillar).length, 2);
});

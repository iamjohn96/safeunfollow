import type { Metadata } from 'next';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export const metadata: Metadata = {
  title: 'Blog | SafeUnfollow',
  description: 'Tips and guides for managing your Instagram followers safely. Learn how to find unfollowers, remove ghost followers, and protect your account.',
};

interface PostMeta {
  title: string;
  description: string;
  date: string;
  slug: string;
  cluster: string;
}

interface TopicCluster { pillar: string; keywords: string[] }

function getPosts(): PostMeta[] {
  const dir = path.join(process.cwd(), 'content/blog');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'index.md');

  return files
    .map(filename => {
      const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
      const { data } = matter(raw);
      return {
        title: data.title as string,
        description: data.description as string,
        date: data.date as string,
        slug: data.slug as string,
        cluster: data.cluster as string,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default function BlogPage() {
  const posts = getPosts();
  const clusters = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'automation/topic-clusters.json'), 'utf8'),
  ) as Record<string, TopicCluster>;

  return (
    <section className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-zinc-900 mb-2">Blog</h1>
      <p className="text-sm text-zinc-400 mb-10">
        Tips and guides for Instagram privacy and account management.
      </p>

      <div className="space-y-12">
        {Object.entries(clusters).map(([cluster, definition]) => {
          const clusterPosts = posts.filter(post => post.cluster === cluster);
          if (!clusterPosts.length) return null;
          const label = cluster.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          return <section key={cluster}>
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 className="text-xl font-bold text-zinc-900">{label}</h2>
              <Link href={`/pillars/${definition.pillar}`} className="text-sm font-medium text-pink-600 hover:text-pink-700">
                Complete guide →
              </Link>
            </div>
            <div className="space-y-6">
              {clusterPosts.map(post => (
          <article
            key={post.slug}
            className="bg-white border border-zinc-100 rounded-2xl p-6 hover:border-pink-200 hover:shadow-sm transition-all"
          >
            <time className="text-xs text-zinc-400">
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            <h3 className="text-lg font-semibold text-zinc-900 mt-2 mb-2">
              <Link
                href={`/blog/${post.slug}`}
                className="hover:text-pink-600 transition-colors"
              >
                {post.title}
              </Link>
            </h3>
            <p className="text-sm text-zinc-500 leading-relaxed mb-4">{post.description}</p>
            <Link
              href={`/blog/${post.slug}`}
              className="text-sm font-medium text-pink-600 hover:text-pink-700 transition-colors"
            >
              Read more →
            </Link>
          </article>
              ))}
            </div>
          </section>;
        })}
      </div>
    </section>
  );
}

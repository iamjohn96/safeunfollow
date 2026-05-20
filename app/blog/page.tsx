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
}

function getPosts(): PostMeta[] {
  const dir = path.join(process.cwd(), 'content/blog');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  return files
    .map(filename => {
      const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
      const { data } = matter(raw);
      return {
        title: data.title as string,
        description: data.description as string,
        date: data.date as string,
        slug: data.slug as string,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default function BlogPage() {
  const posts = getPosts();

  return (
    <section className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-zinc-900 mb-2">Blog</h1>
      <p className="text-sm text-zinc-400 mb-10">
        Tips and guides for Instagram privacy and account management.
      </p>

      <div className="space-y-6">
        {posts.map(post => (
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
            <h2 className="text-lg font-semibold text-zinc-900 mt-2 mb-2">
              <Link
                href={`/blog/${post.slug}`}
                className="hover:text-pink-600 transition-colors"
              >
                {post.title}
              </Link>
            </h2>
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
    </section>
  );
}

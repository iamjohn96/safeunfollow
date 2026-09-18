import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: ['OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'GPTBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'],
        allow: '/',
      },
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: 'https://safeunfollow.com/sitemap.xml',
    host: 'https://safeunfollow.com',
  };
}

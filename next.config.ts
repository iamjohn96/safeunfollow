import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://api.resend.com https://api.dodopayments.com https://www.google-analytics.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
];

const nextConfig: NextConfig = {
  async redirects() {
    const retiredBlogSlugs = [
      'does-follow-unfollow-still-work-on-instagram-2026',
      'how-many-people-can-i-unfollow-on-instagram',
      'how-many-people-can-you-unfollow-on-instagram',
      'how-to-find-instagram-unfollowers-2026',
      'how-to-see-recently-unfollowed-accounts-on-instagram-2026',
      'ig-unfollow-limit',
      'instagram-data-download-unfollowers',
      'instagram-ghost-followers-guide',
      'instagram-unfollow-limit-2026',
      'instagram-unfollow-limit-per-day-2026',
      'instagram-unfollow-limit-per-day',
      'instagram-unfollow-limits-2026-safe-daily-amount',
      'instagram-unfollow-tracker-no-login',
      'instagram-unfollowing-limit',
      'is-who-unfollowed-me-safe',
      'safe-unfollow',
      'unfollow-limit-instagram',
      'who-stopped-following-me-on-instagram',
      'who-unfollowed-me-instagram-checker',
      'who-unfollowed-me-on-instagram-safely',
    ];

    return retiredBlogSlugs.map(slug => ({
      source: `/blog/${slug}`,
      destination: '/blog/how-to-analyze-instagram-data-export',
      permanent: true,
    }));
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

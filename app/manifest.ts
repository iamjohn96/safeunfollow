import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SafeUnfollow – Instagram Data Analyzer',
    short_name: 'SafeUnfollow',
    description: 'Analyze your Instagram Data ZIP without login, OAuth, API access, or account connection.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#db2777',
    icons: [
      {
        src: '/safeunfollow-app-icon.png',
        sizes: '1170x1170',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}

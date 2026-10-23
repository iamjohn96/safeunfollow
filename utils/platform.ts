// Platforms whose official relationship export SafeUnfollow can read.
// Instagram data saved before Threads support has no platform field, so absent means Instagram.
export type Platform = 'instagram' | 'threads' | 'tiktok';

export function platformOf(data: { platform?: Platform }): Platform {
  return data.platform ?? 'instagram';
}

export function platformName(platform: Platform): string {
  return platform === 'threads' ? 'Threads' : platform === 'tiktok' ? 'TikTok' : 'Instagram';
}

export function profileUrl(platform: Platform, username: string): string {
  if (platform === 'threads') return `https://www.threads.com/@${username}`;
  if (platform === 'tiktok') return `https://www.tiktok.com/@${username}`;
  return `https://instagram.com/${username}`;
}

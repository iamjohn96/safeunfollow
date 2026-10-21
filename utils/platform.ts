// Platforms whose official relationship export SafeUnfollow can read.
// Instagram data saved before Threads support has no platform field, so absent means Instagram.
export type Platform = 'instagram' | 'threads';

export function platformOf(data: { platform?: Platform }): Platform {
  return data.platform ?? 'instagram';
}

export function platformName(platform: Platform): string {
  return platform === 'threads' ? 'Threads' : 'Instagram';
}

export function profileUrl(platform: Platform, username: string): string {
  return platform === 'threads' ? `https://www.threads.com/@${username}` : `https://instagram.com/${username}`;
}

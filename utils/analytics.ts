import type { Lang } from './i18n';

type FunnelEvent = 'home_upload_click' | 'guide_upload_click' | 'upload_started' | 'analysis_completed' | 'premium_opened' | 'premium_checkout_click';

declare global {
  interface Window { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[]; }
}

export function trackFunnel(event: FunnelEvent, lang: Lang, details: Record<string, string | number> = {}) {
  if (typeof window === 'undefined') return;
  const parameters = { language: lang, ...details };
  if (window.gtag) window.gtag('event', event, parameters);
  else {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(['event', event, parameters]);
  }
}

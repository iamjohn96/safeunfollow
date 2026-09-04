import type { Lang } from './i18n';

type FunnelEvent = 'home_upload_click' | 'guide_upload_click' | 'upload_started' | 'upload_failed' | 'analysis_completed' | 'snapshot_save_started' | 'snapshot_saved' | 'snapshot_save_failed' | 'premium_opened' | 'premium_checkout_click';

export function uploadFailureReason(error: unknown): string {
  const reasons: Record<string, string> = {
    'invalid-relationship-file': 'invalid_relationship_data',
    'missing-relationship-files': 'missing_relationship_files',
    'missing-relationship-part': 'missing_relationship_part',
    'unsupported-format': 'unsupported_format',
  };
  // Never send arbitrary exception messages: they may contain export contents.
  return error instanceof Error && Object.hasOwn(reasons, error.message) ? reasons[error.message] : 'parse_failed';
}

declare global {
  interface Window { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[]; }
}

export function trackFunnel(event: FunnelEvent, lang: Lang, details: Record<string, string | number> = {}) {
  if (typeof window === 'undefined') return;
  const parameters = { language: lang, ...details };
  try {
    if (window.gtag) window.gtag('event', event, parameters);
    else {
      window.dataLayer = window.dataLayer ?? [];
      // GA's command queue expects Arguments objects, just like its gtag stub.
      // eslint-disable-next-line prefer-rest-params
      function enqueue(...args: unknown[]) { void args; window.dataLayer!.push(arguments); }
      enqueue('event', event, parameters);
    }
  } catch { /* Measurement must never interrupt analysis or saving. */ }
}

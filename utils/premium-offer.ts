import type { Lang } from './translations';

// One-time "Lifetime Access" product in the live Dodo Payments store.
// Product IDs and hosted checkout links are public identifiers, not secrets.
// Environment overrides exist only for Dodo test mode.
const DEFAULT_LIFETIME_PRODUCT_ID = 'pdt_0NnnAFSCBOcQrM32OLj5p';

export const LIFETIME_PRODUCT_ID =
  (process.env.NEXT_PUBLIC_DODO_LIFETIME_PRODUCT_ID ?? '').trim() || DEFAULT_LIFETIME_PRODUCT_ID;

export const LIFETIME_PRICE_LABEL = '$3.99';

// Free users see this many accounts per relationship list and cleanup list.
export const FREE_PREVIEW_LIMIT = 20;

const CHECKOUT_BASE = 'https://checkout.dodopayments.com/buy/';
const APP_ORIGIN = 'https://safeunfollow.com';

export function lifetimeCheckoutUrl(lang: Lang, productId = LIFETIME_PRODUCT_ID): string {
  const localePrefix = lang === 'en' ? '' : `/${lang}`;
  const redirect = `${APP_ORIGIN}${localePrefix}/upload?premium=purchased`;
  return `${CHECKOUT_BASE}${encodeURIComponent(productId)}?quantity=1&redirect_url=${encodeURIComponent(redirect)}`;
}

export function previewAccounts<T>(accounts: readonly T[], unlocked: boolean, limit = FREE_PREVIEW_LIMIT): { visible: T[]; hidden: number } {
  if (unlocked) return { visible: [...accounts], hidden: 0 };
  const safeLimit = Math.max(0, Math.floor(limit));
  return { visible: accounts.slice(0, safeLimit), hidden: Math.max(0, accounts.length - safeLimit) };
}

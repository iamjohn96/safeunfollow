// Anonymous product feedback. No email or account identifier is collected —
// consistent with SafeUnfollow's local-first, no-login product.

export type FeedbackContext = 'purchase' | 'analysis';

export interface FeedbackInput {
  context: FeedbackContext;
  rating?: number;
  comment?: string;
  publicOptIn: boolean;
  lang: string;
}

export interface FeedbackEntry extends FeedbackInput {
  id: string;
  createdAt: number;
}

const MAX_COMMENT_LENGTH = 500;
const VALID_CONTEXTS: FeedbackContext[] = ['purchase', 'analysis'];
const VALID_LANGS = ['en', 'pt', 'ru', 'es'];

// Throws on malformed input; never trusts the client for shape or ranges.
export function sanitizeFeedbackInput(body: unknown): FeedbackInput {
  if (typeof body !== 'object' || body === null) throw new Error('invalid-body');
  const b = body as Record<string, unknown>;

  if (!VALID_CONTEXTS.includes(b.context as FeedbackContext)) throw new Error('invalid-context');
  const context = b.context as FeedbackContext;

  let rating: number | undefined;
  if (b.rating !== undefined && b.rating !== null) {
    const r = Number(b.rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) throw new Error('invalid-rating');
    rating = r;
  }

  let comment: string | undefined;
  if (b.comment !== undefined && b.comment !== null) {
    if (typeof b.comment !== 'string') throw new Error('invalid-comment');
    const trimmed = b.comment.trim().slice(0, MAX_COMMENT_LENGTH);
    comment = trimmed.length > 0 ? trimmed : undefined;
  }

  // Require at least one signal so empty submissions don't fill the store.
  if (rating === undefined && !comment) throw new Error('empty-feedback');

  const publicOptIn = b.publicOptIn === true;
  const lang = VALID_LANGS.includes(b.lang as string) ? (b.lang as string) : 'en';

  return { context, rating, comment, publicOptIn, lang };
}

export function buildFeedbackEntry(input: FeedbackInput): FeedbackEntry {
  return {
    ...input,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
}

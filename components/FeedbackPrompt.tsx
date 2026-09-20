'use client';

import { useEffect, useState } from 'react';
import { t, type Lang } from '@/utils/i18n';
import { trackFunnel } from '@/utils/analytics';
import { SentenceLines } from '@/components/SentenceLines';

type FeedbackContext = 'purchase' | 'analysis';

interface FeedbackPromptProps {
  lang: Lang;
  context: FeedbackContext;
}

const SUBMITTED_KEY = 'feedback_submitted';
const skippedKey = (context: FeedbackContext) => `feedback_skipped_${context}`;

function alreadyHandled(context: FeedbackContext): boolean {
  try {
    return localStorage.getItem(SUBMITTED_KEY) === 'true' || localStorage.getItem(skippedKey(context)) === 'true';
  } catch {
    // If storage is unavailable, err on the side of not nagging the user.
    return true;
  }
}

// Lightweight, skippable, opt-in feedback capture. No account or email is
// attached — SafeUnfollow does not otherwise track who its users are.
export function FeedbackPrompt({ lang, context }: FeedbackPromptProps) {
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [publicOptIn, setPublicOptIn] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    if (alreadyHandled(context)) return;
    // Visibility depends on localStorage, only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    trackFunnel('feedback_shown', lang, { context });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function skip() {
    try { localStorage.setItem(skippedKey(context), 'true'); } catch { /* best effort */ }
    trackFunnel('feedback_skipped', lang, { context });
    setVisible(false);
  }

  async function submit() {
    if (rating === null && comment.trim() === '') return;
    setState('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, rating: rating ?? undefined, comment, publicOptIn, lang }),
      });
      if (!res.ok) throw new Error('request-failed');
      try { localStorage.setItem(SUBMITTED_KEY, 'true'); } catch { /* best effort */ }
      trackFunnel('feedback_submitted', lang, { context, rating: rating ?? 0 });
      setState('sent');
      setTimeout(() => setVisible(false), 2500);
    } catch {
      setState('error');
    }
  }

  if (!visible) return null;

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4">
      {state === 'sent' ? (
        <p className="text-sm text-green-700 text-center font-medium">{t('feedback.thanks', lang)}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-zinc-800">
              <SentenceLines text={t(context === 'purchase' ? 'feedback.purchase_title' : 'feedback.analysis_title', lang)} />
            </p>
            <button
              onClick={skip}
              aria-label={t('common.close', lang)}
              className="text-zinc-400 hover:text-zinc-600 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-1">{t('feedback.rating_label', lang)}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  aria-label={t('feedback.star_aria', lang, { n })}
                  aria-pressed={rating === n}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                    rating !== null && n <= rating ? 'bg-amber-400 text-white' : 'bg-white border border-zinc-200 text-zinc-400'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={t('feedback.comment_placeholder', lang)}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />

          <label className="flex items-start gap-2 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={publicOptIn}
              onChange={e => setPublicOptIn(e.target.checked)}
              className="mt-0.5"
            />
            <span>{t('feedback.public_optin', lang)}</span>
          </label>

          {state === 'error' && (
            <p className="text-xs text-red-500">{t('feedback.error', lang)}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={state === 'sending' || (rating === null && comment.trim() === '')}
              className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
            >
              {state === 'sending' ? '…' : t('feedback.submit', lang)}
            </button>
            <button
              onClick={skip}
              className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              {t('feedback.skip', lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

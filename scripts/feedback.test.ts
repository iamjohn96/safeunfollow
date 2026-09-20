import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeFeedbackInput, buildFeedbackEntry } from '../lib/feedback';

test('accepts a valid rating-only or comment-only submission', () => {
  const ratingOnly = sanitizeFeedbackInput({ context: 'purchase', rating: 5, publicOptIn: false, lang: 'en' });
  assert.equal(ratingOnly.rating, 5);
  assert.equal(ratingOnly.comment, undefined);

  const commentOnly = sanitizeFeedbackInput({ context: 'analysis', comment: '  Loved it  ', publicOptIn: true, lang: 'pt' });
  assert.equal(commentOnly.comment, 'Loved it');
  assert.equal(commentOnly.publicOptIn, true);
});

test('rejects malformed context, rating, comment, or an entirely empty submission', () => {
  assert.throws(() => sanitizeFeedbackInput({ context: 'refund', publicOptIn: false, lang: 'en' }));
  assert.throws(() => sanitizeFeedbackInput({ context: 'purchase', rating: 0, publicOptIn: false, lang: 'en' }));
  assert.throws(() => sanitizeFeedbackInput({ context: 'purchase', rating: 6, publicOptIn: false, lang: 'en' }));
  assert.throws(() => sanitizeFeedbackInput({ context: 'purchase', rating: 3.5, publicOptIn: false, lang: 'en' }));
  assert.throws(() => sanitizeFeedbackInput({ context: 'purchase', comment: 42, publicOptIn: false, lang: 'en' }));
  assert.throws(() => sanitizeFeedbackInput({ context: 'purchase', comment: '   ', publicOptIn: false, lang: 'en' }));
  assert.throws(() => sanitizeFeedbackInput(null));
  assert.throws(() => sanitizeFeedbackInput('not an object'));
});

test('truncates oversized comments instead of rejecting them, and falls back to English for an unsupported language', () => {
  const longComment = 'a'.repeat(2000);
  const result = sanitizeFeedbackInput({ context: 'analysis', comment: longComment, publicOptIn: false, lang: 'de' });
  assert.equal(result.comment?.length, 500);
  assert.equal(result.lang, 'en');
});

test('never trusts client-declared publicOptIn unless it is exactly true', () => {
  const result = sanitizeFeedbackInput({ context: 'purchase', rating: 4, publicOptIn: 'true', lang: 'en' });
  assert.equal(result.publicOptIn, false);
});

test('every entry gets a unique id and a creation timestamp', () => {
  const input = sanitizeFeedbackInput({ context: 'purchase', rating: 5, publicOptIn: false, lang: 'en' });
  const a = buildFeedbackEntry(input);
  const b = buildFeedbackEntry(input);
  assert.notEqual(a.id, b.id);
  assert.ok(a.createdAt > 0);
});

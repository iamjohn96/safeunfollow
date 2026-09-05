import assert from 'node:assert/strict';
import test from 'node:test';
import { isPublicLocale, localizedMetadata } from '../lib/locale-metadata';
import type { Lang } from '../utils/i18n';

test('recognizes only public localized route segments', () => {
  assert.equal(isPublicLocale('pt'), true);
  assert.equal(isPublicLocale('ru'), true);
  assert.equal(isPublicLocale('es'), true);
  assert.equal(isPublicLocale('en'), false);
  assert.equal(isPublicLocale('.env'), false);
});

test('invalid runtime locale metadata falls back safely before the route becomes a 404', () => {
  const metadata = localizedMetadata('.env' as Lang);
  assert.equal(metadata.title, 'SafeUnfollow – Private Instagram Data Analyzer');
  assert.equal(metadata.openGraph && 'locale' in metadata.openGraph ? metadata.openGraph.locale : undefined, 'en_US');
});

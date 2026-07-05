import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFlags } from './blog-publish';

test('publication flags preserve the default Search Console workflow', () => {
  assert.deepEqual(parseFlags([]), { dryRun: false, skipSearchConsole: false });
  assert.deepEqual(parseFlags(['--dry-run']), { dryRun: true, skipSearchConsole: false });
});

test('publication flags can skip Search Console independently or during a dry run', () => {
  assert.deepEqual(parseFlags(['--skip-search-console']), {
    dryRun: false,
    skipSearchConsole: true,
  });
  assert.deepEqual(parseFlags(['--dry-run', '--skip-search-console']), {
    dryRun: true,
    skipSearchConsole: true,
  });
  assert.throws(() => parseFlags(['--unknown']), /Unknown option/);
});

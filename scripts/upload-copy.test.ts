import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { t } from '../utils/i18n';

test('upload trust badges are translated in every public locale, not hardcoded English', () => {
  const page = fs.readFileSync('app/upload/page.tsx', 'utf8');
  assert.doesNotMatch(page, /<\/span> No server upload/);
  for (const key of ['upload.badge.login', 'upload.badge.server', 'upload.badge.browser'] as const) {
    assert.match(page, new RegExp(`t\\('${key.replace(/\./g, '\\.')}', lang\\)`));
    const en = t(key, 'en');
    for (const lang of ['pt', 'ru', 'es'] as const) {
      assert.notEqual(t(key, lang), en, `${key} is untranslated in ${lang}`);
    }
  }
  assert.equal(t('upload.badge.browser', 'pt'), 'Analisado no seu navegador');
});

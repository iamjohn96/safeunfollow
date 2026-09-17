import assert from 'node:assert/strict';
import test from 'node:test';
import { splitSentences } from '../utils/sentences';

test('sentence splitting puts each sentence on its own line without breaking prices or abbreviations', () => {
  assert.deepEqual(splitSentences('100% private. No login required.'), ['100% private.', 'No login required.']);
  assert.deepEqual(splitSentences('Privado. Sem login.'), ['Privado.', 'Sem login.']);
  assert.deepEqual(splitSentences('Pay $3.99 once'), ['Pay $3.99 once']);
  assert.deepEqual(splitSentences('Pagar US$ 3,99 uma vez. Sem assinatura!'), ['Pagar US$ 3,99 uma vez.', 'Sem assinatura!']);
  assert.deepEqual(splitSentences('Use a JSON export, e.g. from the app. Then upload it?'), ['Use a JSON export, e.g. from the app.', 'Then upload it?']);
  assert.deepEqual(splitSentences('100%プライベート。ログイン不要。'), ['100%プライベート。', 'ログイン不要。']);
  assert.deepEqual(splitSentences('Visit https://safeunfollow.com/upload today.'), ['Visit https://safeunfollow.com/upload today.']);
  assert.deepEqual(splitSentences('  '), []);
  assert.deepEqual(splitSentences('One sentence only'), ['One sentence only']);
});

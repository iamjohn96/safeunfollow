import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { trackFunnel, uploadFailureReason } from '../utils/analytics';

test('failure categories never expose arbitrary exception contents', () => {
  assert.equal(uploadFailureReason(new Error('missing-relationship-files')), 'missing_relationship_files');
  assert.equal(uploadFailureReason(new Error('missing-relationship-part')), 'missing_relationship_part');
  assert.equal(uploadFailureReason(new Error('invalid-relationship-file')), 'invalid_relationship_data');
  assert.equal(uploadFailureReason(new Error('secret_profile export.json')), 'parse_failed');
  assert.equal(uploadFailureReason(null), 'parse_failed');
  assert.equal(uploadFailureReason(new Error('__proto__')), 'parse_failed');
});

test('GA direct and queued commands match and failures do not escape', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    const calls: unknown[][] = [];
    const fake: { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] } = { gtag: (...args) => { calls.push(args); } };
    Object.defineProperty(globalThis, 'window', { configurable: true, value: fake });
    trackFunnel('snapshot_saved', 'pt');
    assert.deepEqual(calls[0], ['event', 'snapshot_saved', { language: 'pt' }]);
    delete fake.gtag;
    trackFunnel('upload_failed', 'en', { failure_reason: 'parse_failed' });
    const queued = fake.dataLayer![0] as IArguments;
    assert.equal(Object.prototype.toString.call(queued), '[object Arguments]');
    assert.deepEqual(Array.from(queued), ['event', 'upload_failed', { language: 'en', failure_reason: 'parse_failed' }]);
    fake.gtag = () => { throw new Error('blocked'); };
    assert.doesNotThrow(() => trackFunnel('snapshot_saved', 'es'));
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('snapshot success is emitted only after storage write and failure exit', () => {
  const source = readFileSync(new URL('../components/Dashboard.tsx', import.meta.url), 'utf8');
  const write = source.indexOf("localStorage.setItem('snapshots'");
  const failure = source.indexOf('catch {', write);
  const success = source.indexOf("trackFunnel('snapshot_saved'");
  assert.ok(write > 0 && failure > write && success > failure);
  assert.equal(source.match(/trackFunnel\('snapshot_saved'/g)?.length, 1);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { PublishLockError, acquirePublishLock } from './publish-lock';

test('publication lock rejects overlap and can be reacquired after release', () => {
  const lockPath = path.join(os.tmpdir(), `safeunfollow-lock-${process.pid}-${Date.now()}`);
  const first = acquirePublishLock(lockPath);
  try {
    assert.throws(() => acquirePublishLock(lockPath), PublishLockError);
  } finally {
    first.release();
  }

  const second = acquirePublishLock(lockPath);
  second.release();
  assert.equal(fs.existsSync(lockPath), false);
});

test('publication lock replaces stale owner data', () => {
  const lockPath = path.join(os.tmpdir(), `safeunfollow-stale-lock-${process.pid}-${Date.now()}`);
  fs.writeFileSync(lockPath, JSON.stringify({ pid: 999_999_999, token: 'stale' }), 'utf8');
  const lock = acquirePublishLock(lockPath);
  lock.release();
  assert.equal(fs.existsSync(lockPath), false);
});

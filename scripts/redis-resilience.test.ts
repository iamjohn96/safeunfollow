import assert from 'node:assert/strict';
import test from 'node:test';
import { withRedisFallback } from '../lib/redis-resilience';

test('withRedisFallback returns a safe value when Redis is unavailable', async () => {
  const messages: unknown[][] = [];
  const logger = {
    error: (...args: unknown[]) => messages.push(args),
  };

  const result = await withRedisFallback(
    async () => {
      throw new Error('mock Redis unavailable');
    },
    false,
    'Premium status lookup unavailable',
    logger,
  );

  assert.equal(result, false);
  assert.equal(messages.length, 1);
  assert.match(String(messages[0][0]), /using safe fallback/);
});

test('withRedisFallback preserves a successful Redis result', async () => {
  const result = await withRedisFallback(async () => true, false, 'unused');
  assert.equal(result, true);
});

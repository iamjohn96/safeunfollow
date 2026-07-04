import assert from 'node:assert/strict';
import test from 'node:test';
import { runRedisMonitor } from './redis-monitor';

function createLogger() {
  const logs: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  return {
    logs,
    warnings,
    errors,
    logger: {
      log: (message: string) => logs.push(message),
      warn: (message: string) => warnings.push(message),
      error: (message: string) => errors.push(message),
    },
  };
}

const fixedNow = () => new Date('2026-07-04T01:00:00.000Z');

test('healthy Redis sends the expected Telegram message', async () => {
  const output = createLogger();
  let payload = '';

  const exitCode = await runRedisMonitor({
    env: {
      KV_REST_API_URL: 'https://example.upstash.io',
      KV_REST_API_TOKEN: 'redis-token',
      TELEGRAM_BOT_TOKEN: 'telegram-token',
      TELEGRAM_CHAT_ID: '12345',
    },
    logger: output.logger,
    now: fixedNow,
    redisPing: async () => 'PONG',
    telegramRequest: async (_endpoint, body) => {
      payload = body;
      return { ok: true, status: 200, body: '{"ok":true}' };
    },
  });

  assert.equal(exitCode, 0);
  assert.match(output.logs[0], /✅ SafeUnfollow Redis healthy/);
  assert.match(output.logs[0], /Timestamp: 2026-07-04T01:00:00\.000Z/);
  assert.match(JSON.parse(payload).text, /✅ SafeUnfollow Redis healthy/);
  assert.deepEqual(output.warnings, []);
  assert.deepEqual(output.errors, []);
});

test('unhealthy Redis sends the failure reason and exits nonzero', async () => {
  const output = createLogger();
  let telegramText = '';

  const exitCode = await runRedisMonitor({
    env: {
      KV_REST_API_URL: 'https://example.upstash.io',
      KV_REST_API_TOKEN: 'redis-token',
      TELEGRAM_BOT_TOKEN: 'telegram-token',
      TELEGRAM_CHAT_ID: '12345',
    },
    logger: output.logger,
    now: fixedNow,
    redisPing: async () => { throw new Error('database is archived'); },
    telegramRequest: async (_endpoint, body) => {
      telegramText = JSON.parse(body).text;
      return { ok: true, status: 200, body: '{"ok":true}' };
    },
  });

  assert.equal(exitCode, 1);
  assert.match(output.logs[0], /❌ SafeUnfollow Redis unhealthy/);
  assert.match(output.logs[0], /Reason: database is archived/);
  assert.equal(telegramText, output.logs[0]);
});

test('missing Redis environment is reported clearly without attempting Redis', async () => {
  const output = createLogger();
  let redisCalled = false;
  let telegramText = '';

  const exitCode = await runRedisMonitor({
    env: {
      TELEGRAM_BOT_TOKEN: 'telegram-token',
      TELEGRAM_CHAT_ID: '12345',
    },
    logger: output.logger,
    now: fixedNow,
    redisPing: async () => {
      redisCalled = true;
      return 'PONG';
    },
    telegramRequest: async (_endpoint, body) => {
      telegramText = JSON.parse(body).text;
      return { ok: true, status: 200, body: '{"ok":true}' };
    },
  });

  assert.equal(exitCode, 1);
  assert.equal(redisCalled, false);
  assert.match(output.logs[0], /Missing Redis environment variables: KV_REST_API_URL, KV_REST_API_TOKEN/);
  assert.equal(telegramText, output.logs[0]);
});

test('missing Telegram environment warns but does not fail a healthy Redis check', async () => {
  const output = createLogger();
  let telegramCalled = false;

  const exitCode = await runRedisMonitor({
    env: {
      KV_REST_API_URL: 'https://example.upstash.io',
      KV_REST_API_TOKEN: 'redis-token',
    },
    logger: output.logger,
    now: fixedNow,
    redisPing: async () => 'PONG',
    telegramRequest: async () => {
      telegramCalled = true;
      return { ok: true, status: 200, body: '{"ok":true}' };
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(telegramCalled, false);
  assert.match(output.logs[0], /✅ SafeUnfollow Redis healthy/);
  assert.match(output.warnings[0], /TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID/);
});

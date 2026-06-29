import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MissingCredentialsError,
  TelegramApiError,
  TelegramDeliveryError,
  buildSeoReport,
  createGoogleAuth,
  detectOpportunities,
  fetchSearchConsoleData,
  formatTelegramReport,
  parseTelegramEnvironment,
  sendTelegram,
  updateKeywordRegistry,
} from './search-console-report';
import type { DateRange, KeywordEntry, QueryExecutor, SearchConsoleRow } from './search-console-report';

const range: DateRange = {
  startDate: '2026-06-01',
  endDate: '2026-06-28',
  label: 'Last 28 days',
};

function row(
  key: string,
  impressions: number,
  ctr: number,
  position: number,
  clicks = impressions * ctr,
): SearchConsoleRow {
  return { keys: [key], impressions, ctr, position, clicks };
}

test('detects only queries inside every opportunity threshold', () => {
  const candidates = [
    row('instagram unfollow checker', 100, 0.01, 12),
    row('too few impressions', 19, 0.01, 12),
    row('ctr too high', 100, 0.02, 12),
    row('position too high', 100, 0.01, 31),
    row('position too low', 100, 0.01, 4.9),
  ];

  assert.deepEqual(detectOpportunities(candidates).map(item => item.keys[0]), [
    'instagram unfollow checker',
  ]);
});

test('collects summary, query, page, and query+page dimensions from mocked responses', async () => {
  const requestedDimensions: string[] = [];
  const execute: QueryExecutor = async dimensions => {
    requestedDimensions.push(dimensions.join('+') || 'summary');
    if (dimensions.length === 0) return [row('summary', 1000, 0.04, 8, 40)];
    if (dimensions.join('+') === 'query') return [row('instagram unfollow tracker', 500, 0.01, 10, 5)];
    if (dimensions.join('+') === 'page') return [row('https://safeunfollow.com/blog/test', 400, 0.03, 7, 12)];
    return [{ ...row('instagram unfollow tracker', 300, 0.01, 9, 3), keys: ['instagram unfollow tracker', 'https://safeunfollow.com/blog/test'] }];
  };

  const data = await fetchSearchConsoleData(execute, range);

  assert.deepEqual(requestedDimensions.sort(), ['page', 'query', 'query+page', 'summary']);
  assert.equal(data.summary.clicks, 40);
  assert.equal(data.queries.length, 1);
  assert.equal(data.pages.length, 1);
  assert.equal(data.queryPages[0].keys.length, 2);
});

test('updates existing keyword metrics and deduplicates new registry candidates', () => {
  const registry: KeywordEntry[] = [{
    keyword: 'Instagram Unfollow Tracker',
    slug: 'instagram-unfollow-tracker',
    published: true,
    published_at: '2026-05-01T00:00:00.000Z',
    last_attempt: '2026-05-01T00:00:00.000Z',
  }];
  const queries = [row('instagram unfollow tracker', 80, 0.0125, 11, 1)];

  const update = updateKeywordRegistry(
    registry,
    queries,
    ['Instagram Unfollow Tracker', 'instagram ghost followers', 'INSTAGRAM GHOST FOLLOWERS'],
    range.endDate,
  );

  assert.equal(update.updatedExisting, 1);
  assert.equal(update.addedKeywords, 1);
  assert.equal(update.entries.length, 2);
  assert.equal(update.entries[0].impressions, 80);
  assert.equal(update.entries[0].clicks, 1);
  assert.equal(update.entries[0].last_seen_in_gsc, range.endDate);
  assert.deepEqual(update.entries[1], {
    keyword: 'instagram ghost followers',
    slug: 'instagram-ghost-followers',
    published: false,
    published_at: null,
    last_attempt: null,
    source: 'search_console',
    impressions: 0,
    clicks: 0,
    ctr: 0,
    avg_position: null,
    discovered_at: range.endDate,
  });
});

test('formats a concise Telegram report with recommendations', () => {
  const queries = [row('instagram unfollow checker', 100, 0.01, 12, 1)];
  const data = {
    summary: { clicks: 12, impressions: 500, ctr: 0.024, position: 9.4 },
    queries,
    pages: [row('https://safeunfollow.com/', 200, 0.05, 4, 10)],
    queryPages: [],
  };
  const report = buildSeoReport(data, range, []);
  const message = formatTelegramReport(report);

  assert(report.keywordIdeas.length >= 5 && report.keywordIdeas.length <= 10);
  assert.match(message, /📈 SafeUnfollow Weekly SEO/);
  assert.match(message, /Clicks\n12/);
  assert.match(message, /CTR\n2\.4%/);
  assert.match(message, /instagram unfollow checker — 100 imp/);
  assert.match(message, /Recommended Next Posts/);
  assert(message.length <= 4096);
});

test('missing credentials fail before any API request with setup instructions', () => {
  assert.throws(
    () => createGoogleAuth({}),
    (error: unknown) => {
      assert(error instanceof MissingCredentialsError);
      assert.match(error.message, /GOOGLE_CLIENT_EMAIL/);
      assert.match(error.message, /GOOGLE_APPLICATION_CREDENTIALS/);
      assert.match(error.message, /grant the service-account email access/);
      return true;
    },
  );
});

test('parses Telegram env values with whitespace and inline comments', () => {
  assert.deepEqual(parseTelegramEnvironment({
    TELEGRAM_BOT_TOKEN: '  test-token  ',
    TELEGRAM_CHAT_ID: '602408241                   # Default chat for cron delivery',
  }), {
    token: 'test-token',
    chatId: '602408241',
  });
});

test('sends a Telegram message successfully with fetch', async () => {
  let sentPayload = '';
  const logs: string[] = [];

  await sendTelegram('Weekly report', {
    TELEGRAM_BOT_TOKEN: 'test-token',
    TELEGRAM_CHAT_ID: '602408241',
  }, {
    logger: { log: message => logs.push(String(message)), error: message => logs.push(String(message)) },
    maxAttempts: 1,
    request: async (_endpoint, payload) => {
      sentPayload = payload;
      return { statusCode: 200, body: '{"ok":true}' };
    },
  });

  assert.deepEqual(JSON.parse(sentPayload), {
    chat_id: '602408241',
    text: 'Weekly report',
    disable_web_page_preview: true,
  });
  assert.deepEqual(logs, [
    'Telegram API response status: 200',
    'Telegram API response body: {"ok":true}',
  ]);
});

test('reports a Telegram API non-200 response with status and body', async () => {
  const errors: string[] = [];

  await assert.rejects(
    sendTelegram('Weekly report', {
      TELEGRAM_BOT_TOKEN: 'test-token',
      TELEGRAM_CHAT_ID: '602408241',
    }, {
      logger: { log: () => undefined, error: message => errors.push(String(message)) },
      maxAttempts: 1,
      request: async () => ({ statusCode: 400, body: '{"ok":false,"description":"Bad Request"}' }),
    }),
    (error: unknown) => {
      assert(error instanceof TelegramApiError);
      assert.equal(error.statusCode, 400);
      assert.match(error.responseBody, /Bad Request/);
      return true;
    },
  );
  assert.deepEqual(errors, [
    'Telegram API response status: 400',
    'Telegram API response body: {"ok":false,"description":"Bad Request"}',
  ]);
});

test('falls back to curl after fetch network failure', async () => {
  const logs: string[] = [];
  let curlPayload = '';

  await sendTelegram('Weekly report', {
    TELEGRAM_BOT_TOKEN: 'test-token',
    TELEGRAM_CHAT_ID: '602408241',
  }, {
    logger: { log: message => logs.push(String(message)), error: message => logs.push(String(message)) },
    maxAttempts: 1,
    request: async () => { throw new Error('socket hang up'); },
    curlRequest: async (_endpoint, payload) => {
      curlPayload = payload;
      return { exitCode: 0, statusCode: 200, body: '{"ok":true}', stderr: '' };
    },
  });

  assert.equal(JSON.parse(curlPayload).chat_id, '602408241');
  assert.deepEqual(logs, [
    'Telegram fetch network error (attempt 1/1): socket hang up',
    'Telegram fetch retries exhausted; falling back to curl.',
    'Telegram curl response status: 200',
    'Telegram curl response body: {"ok":true}',
  ]);
});

test('reports fetch and curl details when both transports fail', async () => {
  const errors: string[] = [];

  await assert.rejects(
    sendTelegram('Weekly report', {
      TELEGRAM_BOT_TOKEN: 'test-token',
      TELEGRAM_CHAT_ID: '602408241',
    }, {
      logger: { log: () => undefined, error: message => errors.push(String(message)) },
      maxAttempts: 1,
      request: async () => { throw new Error('fetch socket hang up'); },
      curlRequest: async () => ({
        exitCode: 7,
        statusCode: 0,
        body: 'partial response',
        stderr: 'curl: (7) connection refused',
      }),
    }),
    (error: unknown) => {
      assert(error instanceof TelegramDeliveryError);
      assert.match(error.message, /fetch network error: fetch socket hang up/i);
      assert.match(error.message, /curl failure \(exit code 7, HTTP status unavailable\)/);
      assert.match(error.message, /stderr: curl: \(7\) connection refused/);
      assert.match(error.message, /response body: partial response/);
      return true;
    },
  );
  assert.deepEqual(errors, [
    'Telegram fetch network error (attempt 1/1): fetch socket hang up',
    'Telegram fetch retries exhausted; falling back to curl.',
    'Telegram curl failure (exit code 7, HTTP status unavailable); stderr: curl: (7) connection refused; response body: partial response',
  ]);
});

test('redacts the bot token from fetch and curl error logs', async () => {
  const token = 'secret-bot-token';
  const errors: string[] = [];

  let thrownMessage = '';
  await assert.rejects(
    sendTelegram('Weekly report', {
      TELEGRAM_BOT_TOKEN: token,
      TELEGRAM_CHAT_ID: '602408241',
    }, {
      logger: { log: () => undefined, error: message => errors.push(String(message)) },
      maxAttempts: 1,
      request: async endpoint => { throw new Error(`fetch failed for ${endpoint}`); },
      curlRequest: async endpoint => ({
        exitCode: 6,
        statusCode: 0,
        body: `request rejected for ${endpoint}`,
        stderr: `could not resolve ${endpoint}`,
      }),
    }),
    (error: unknown) => {
      thrownMessage = String(error);
      return true;
    },
  );

  const output = `${errors.join('\n')}\n${thrownMessage}`;
  assert.doesNotMatch(output, new RegExp(token));
  assert.match(output, /\[REDACTED\]/);
});

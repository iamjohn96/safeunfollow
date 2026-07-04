import path from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

type Environment = Record<string, string | undefined>;

interface RedisHealthResult {
  healthy: boolean;
  timestamp: string;
  latencyMs?: number;
  reason?: string;
}

interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

interface TelegramResponse {
  ok: boolean;
  status: number;
  body: string;
}

type RedisPing = (url: string, token: string) => Promise<unknown>;
type TelegramRequest = (endpoint: string, payload: string) => Promise<TelegramResponse>;

interface MonitorDependencies {
  env?: Environment;
  logger?: Logger;
  now?: () => Date;
  redisPing?: RedisPing;
  telegramRequest?: TelegramRequest;
}

function readEnvironmentValue(env: Environment, name: string): string | undefined {
  const value = env[name]?.trim();
  return value || undefined;
}

function summarizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, ' ').trim().slice(0, 500) || 'Unknown Redis error';
}

async function defaultRedisPing(url: string, token: string): Promise<unknown> {
  return new Redis({ url, token }).ping();
}

async function defaultTelegramRequest(endpoint: string, payload: string): Promise<TelegramResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  return {
    ok: response.ok,
    status: response.status,
    body: await response.text(),
  };
}

async function checkRedisHealth(
  env: Environment,
  options: Pick<MonitorDependencies, 'now' | 'redisPing'> = {},
): Promise<RedisHealthResult> {
  const now = options.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const url = readEnvironmentValue(env, 'KV_REST_API_URL');
  const token = readEnvironmentValue(env, 'KV_REST_API_TOKEN');
  const missing = [
    !url ? 'KV_REST_API_URL' : null,
    !token ? 'KV_REST_API_TOKEN' : null,
  ].filter((name): name is string => name !== null);

  if (missing.length > 0) {
    return {
      healthy: false,
      timestamp,
      reason: `Missing Redis environment variable${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`,
    };
  }

  const startedAt = Date.now();
  try {
    const response = await (options.redisPing ?? defaultRedisPing)(url!, token!);
    if (response !== 'PONG') {
      throw new Error(`Unexpected Redis PING response: ${String(response)}`);
    }
    return {
      healthy: true,
      timestamp,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      healthy: false,
      timestamp,
      reason: summarizeError(error),
    };
  }
}

function formatRedisHealthMessage(result: RedisHealthResult): string {
  if (result.healthy) {
    return [
      '✅ SafeUnfollow Redis healthy',
      `Timestamp: ${result.timestamp}`,
      `Latency: ${result.latencyMs ?? 0} ms`,
    ].join('\n');
  }

  return [
    '❌ SafeUnfollow Redis unhealthy',
    `Reason: ${result.reason ?? 'Unknown Redis error'}`,
    `Timestamp: ${result.timestamp}`,
  ].join('\n');
}

async function sendTelegramMessage(
  message: string,
  token: string,
  chatId: string,
  request: TelegramRequest = defaultTelegramRequest,
): Promise<void> {
  const response = await request(
    `https://api.telegram.org/bot${token}/sendMessage`,
    JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    }),
  );

  if (!response.ok) {
    throw new Error(`Telegram API returned HTTP ${response.status}: ${response.body.slice(0, 300)}`);
  }
}

async function runRedisMonitor(dependencies: MonitorDependencies = {}): Promise<number> {
  const env = dependencies.env ?? process.env;
  const logger = dependencies.logger ?? console;
  const result = await checkRedisHealth(env, dependencies);
  const message = formatRedisHealthMessage(result);

  // Keep the result available to cron logs even when Telegram is unavailable.
  logger.log(message);

  const telegramToken = readEnvironmentValue(env, 'TELEGRAM_BOT_TOKEN');
  const telegramChatId = readEnvironmentValue(env, 'TELEGRAM_CHAT_ID');
  if (!telegramToken || !telegramChatId) {
    const missing = [
      !telegramToken ? 'TELEGRAM_BOT_TOKEN' : null,
      !telegramChatId ? 'TELEGRAM_CHAT_ID' : null,
    ].filter((name): name is string => name !== null);
    logger.warn(`Telegram notification skipped; missing environment variable${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`);
    return result.healthy ? 0 : 1;
  }

  try {
    await sendTelegramMessage(
      message,
      telegramToken,
      telegramChatId,
      dependencies.telegramRequest,
    );
  } catch (error) {
    logger.error(`Telegram notification failed: ${summarizeError(error)}`);
    return 1;
  }

  return result.healthy ? 0 : 1;
}

async function main(): Promise<void> {
  process.exitCode = await runRedisMonitor();
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main();
}

export {
  checkRedisHealth,
  formatRedisHealthMessage,
  runRedisMonitor,
  sendTelegramMessage,
  summarizeError,
};
export type { Environment, MonitorDependencies, RedisHealthResult, TelegramRequest };

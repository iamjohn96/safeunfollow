import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

type RedisCommand = 'health' | 'ping';

function getRequiredEnvironment(name: 'KV_REST_API_URL' | 'KV_REST_API_TOKEN'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Configure it in .env.local or the runtime environment.`);
  }
  return value;
}

async function main(): Promise<void> {
  const command = process.argv[2] as RedisCommand | undefined;
  if (command !== 'health' && command !== 'ping') {
    throw new Error('Usage: redis-ops.ts <health|ping>');
  }

  const redis = new Redis({
    url: getRequiredEnvironment('KV_REST_API_URL'),
    token: getRequiredEnvironment('KV_REST_API_TOKEN'),
  });
  const startedAt = Date.now();
  const response = await redis.ping();

  if (response !== 'PONG') {
    throw new Error(`Unexpected Redis PING response: ${String(response)}`);
  }

  if (command === 'health') {
    console.log(`Redis health: OK (${Date.now() - startedAt} ms)`);
    return;
  }

  console.log('PONG');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Redis ${process.argv[2] ?? 'command'} failed: ${message}`);
  process.exitCode = 1;
});

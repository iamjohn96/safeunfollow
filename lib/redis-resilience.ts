type RedisFallbackLogger = Pick<Console, 'error'>;

export async function withRedisFallback<T>(
  operation: () => Promise<T>,
  fallback: T,
  context: string,
  logger: RedisFallbackLogger = console,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`[redis] ${context}; using safe fallback`, error);
    return fallback;
  }
}

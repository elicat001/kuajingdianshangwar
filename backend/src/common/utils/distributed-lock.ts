import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

const logger = new Logger('DistributedLock');

/**
 * Acquire a distributed lock using Redis SET NX EX.
 * Returns a release function if the lock was acquired, or null if not.
 */
export async function acquireLock(
  redis: Redis,
  lockKey: string,
  ttlSeconds: number,
): Promise<(() => Promise<void>) | null> {
  const lockValue = `${process.pid}-${Date.now()}`;
  const result = await redis.set(lockKey, lockValue, 'EX', ttlSeconds, 'NX');

  if (result !== 'OK') {
    return null;
  }

  // Return a release function that only deletes if we still own the lock
  return async () => {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    try {
      await redis.eval(luaScript, 1, lockKey, lockValue);
    } catch (err) {
      logger.warn(`Failed to release lock ${lockKey}: ${(err as Error).message}`);
    }
  };
}

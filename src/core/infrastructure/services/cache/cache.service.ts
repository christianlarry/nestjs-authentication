import { Inject, Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { REDIS_CLIENT } from "src/core/infrastructure/persistence/redis/redis.module";

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL: number = 600; // Default TTL in seconds
  private readonly PREFIX: string = 'cache:'; // Default prefix for all keys

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) { }

  // Helper to prefix keys
  private getPrefixedKey(key: string): string {
    return `${this.PREFIX}${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(this.getPrefixedKey(key));
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL (in seconds)
   * @param key Cache key
   * @param value Value to store
   * @param ttl Time to live in seconds (default: DEFAULT_TTL)
   */
  async set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(this.getPrefixedKey(key), ttl, serialized);
      this.logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(this.getPrefixedKey(key));
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Delete menggunakan SCAN Redis
   * Untuk menghindari blocking pada Redis server
   */
  async delScan(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [newCursor, keys] = await this.redis.scan(cursor, 'MATCH', this.getPrefixedKey(pattern), 'COUNT', 100);
        cursor = newCursor;
        if (keys.length > 0) {
          await this.redis.unlink(...keys);
          this.logger.debug(`Cache deleted ${keys.length} keys matching: ${pattern}`);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.error(`Cache delete scan error for ${pattern}: ${error.message}`);
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(this.getPrefixedKey(pattern));
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Cache deleted ${keys.length} keys matching: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}: ${error.message}`);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(this.getPrefixedKey(key));
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(this.getPrefixedKey(key));
    } catch (error) {
      this.logger.error(`Cache TTL error for key ${key}: ${error.message}`);
      return -1;
    }
  }

  /**
   * Reset TTL for a key
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(this.getPrefixedKey(key), ttl);
      this.logger.debug(`Cache TTL updated: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache expire error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.log('Cache cleared');
    } catch (error) {
      this.logger.error(`Cache reset error: ${error.message}`);
    }
  }

  /**
   * Get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const prefixedKeys = keys.map(key => this.getPrefixedKey(key));
      const values = await this.redis.mget(...prefixedKeys);
      return values.map(val => val ? JSON.parse(val) as T : null);
    } catch (error) {
      this.logger.error(`Cache mget error: ${error.message}`);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys with same TTL
   */
  async mset(entries: Array<{ key: string; value: any }>, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      entries.forEach(({ key, value }) => {
        const serialized = JSON.stringify(value);
        pipeline.setex(this.getPrefixedKey(key), ttl, serialized);
      });

      await pipeline.exec();
      this.logger.debug(`Cache mset: ${entries.length} keys (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache mset error: ${error.message}`);
    }
  }

  /**
   * Wrap function with cache (cache-aside pattern), same as getOrSet
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`Cache hit: ${key}`);
      return cached;
    }

    // Cache miss - execute function
    this.logger.debug(`Cache miss: ${key}`);
    const result = await fn();

    // Store in cache, if not null or undefined
    if (result !== undefined && result !== null) {
      await this.set(key, result, ttl);
    }

    return result;
  }

  /**
   * Increment counter
   */
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const result = await this.redis.incr(this.getPrefixedKey(key));
      // Set TTL if it's the first increment
      if (ttl && result === 1) {
        await this.redis.expire(this.getPrefixedKey(key), ttl);
      }

      this.logger.debug(`Cache incr: ${key} = ${result} (TTL: ${ttl}s)`);

      return result;
    } catch (error) {
      this.logger.error(`Cache incr error for key ${key}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Decrement counter
   */
  async decr(key: string): Promise<number> {
    try {
      return await this.redis.decr(this.getPrefixedKey(key));
    } catch (error) {
      this.logger.error(`Cache decr error for key ${key}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(this.getPrefixedKey(pattern));
    } catch (error) {
      this.logger.error(`Cache keys error for pattern ${pattern}: ${error.message}`);
      return [];
    }
  }
}
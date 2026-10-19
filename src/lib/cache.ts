/**
 * In-Memory High-Performance Server Cache with Tag/Key Invalidation
 * Dramatically accelerates remote Hostinger MySQL data retrieval.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  tags?: string[];
}

class FastServerCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Retrieve cached data or execute fetcher and store result
   * @param key Unique cache key
   * @param ttlSeconds Time-to-live in seconds
   * @param fetcher Async function to fetch data if cache miss
   * @param tags Optional tags for group invalidation
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
    tags: string[] = []
  ): Promise<T> {
    const now = Date.now();
    const existing = this.cache.get(key);

    if (existing && existing.expiresAt > now) {
      return existing.data as T;
    }

    // Fetch fresh data
    const freshData = await fetcher();

    this.cache.set(key, {
      data: freshData,
      expiresAt: now + ttlSeconds * 1000,
      tags: [...tags, key],
    });

    return freshData;
  }

  /**
   * Invalidate one or more cache keys or tags
   */
  invalidate(keyOrTag: string | string[]) {
    const targets = Array.isArray(keyOrTag) ? keyOrTag : [keyOrTag];
    for (const target of targets) {
      this.cache.forEach((entry, key) => {
        if (key === target || (entry.tags && entry.tags.indexOf(target) !== -1)) {
          this.cache.delete(key);
        }
      });
    }
  }

  /**
   * Invalidate all cached data
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get current cached keys count
   */
  size(): number {
    return this.cache.size;
  }
}

// Global singleton across Next.js reloads
declare global {
  // eslint-disable-next-line no-var
  var __fastServerCache: FastServerCache | undefined;
}

export const serverCache = global.__fastServerCache || new FastServerCache();

if (process.env.NODE_ENV !== 'production') {
  global.__fastServerCache = serverCache;
}

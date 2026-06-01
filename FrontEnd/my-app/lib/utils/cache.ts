type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
  staleUntil?: number;
};

type StaleWhileRevalidateOptions<T> = {
  ttl?: number;
  staleTtl?: number;
  onRevalidate?: (data: T) => void;
};

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor(private defaultTTL: number = 5 * 60 * 1000) {} // Default 5 minutes

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const now = Date.now();
    const entry = this.cache.get(key);

    if (entry && entry.expiresAt > now) {
      return entry.data;
    }

    // Request deduplication
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = fetcher()
      .then((data) => {
        this.cache.set(key, {
          data,
          timestamp: now,
          expiresAt: now + (ttl || this.defaultTTL),
        });
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  async getStaleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: StaleWhileRevalidateOptions<T> = {}
  ): Promise<T> {
    const ttl = options.ttl ?? this.defaultTTL;
    const staleTtl = options.staleTtl ?? ttl;
    const now = Date.now();
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (entry && entry.expiresAt > now) {
      return entry.data;
    }

    if (entry && (entry.staleUntil ?? 0) > now) {
      this.revalidate(key, fetcher, ttl, staleTtl, options.onRevalidate);
      return entry.data;
    }

    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    return this.fetchAndCache(key, fetcher, ttl, staleTtl);
  }

  private revalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    staleTtl: number,
    onRevalidate?: (data: T) => void
  ): void {
    if (this.pendingRequests.has(key)) return;

    const promise = this.fetchAndCache(key, fetcher, ttl, staleTtl)
      .then((data) => {
        onRevalidate?.(data);
        return data;
      })
      .catch(() => {
        return this.cache.get(key)?.data;
      });

    this.pendingRequests.set(key, promise);
  }

  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    staleTtl?: number
  ): Promise<T> {
    const promise = fetcher()
      .then((data) => {
        const now = Date.now();
        this.cache.set(key, {
          data,
          timestamp: now,
          expiresAt: now + ttl,
          staleUntil: now + ttl + (staleTtl ?? 0),
        });
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cacheManager = new CacheManager();

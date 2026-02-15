/**
 * Core cache manager with LRU, persistence, and stale-while-revalidate
 */

import { LRUCache } from './lru';
import { createDefaultStorageAdapter } from './storage';
import type {
  CacheConfig,
  CacheDependency,
  CacheEntry,
  CacheEvent,
  CacheEventListener,
  CacheKeyFn,
  CacheResult,
  Fetcher,
  MutationOptions,
  PrefetchOptions,
  StorageAdapter,
  StoredCacheEntry,
} from './types';

// In-flight request tracking for deduplication and cancellation
interface InFlightRequest<TData> {
  promise: Promise<TData>;
  abortController: AbortController;
  refCount: number; // Number of consumers waiting for this request
}

export class BlitzCache<TData = any, TParams = any> {
  private lru: LRUCache<TData>;
  private storage: StorageAdapter;
  private config: Required<CacheConfig>;
  private cacheKeyFn: CacheKeyFn<TParams>;
  private storagePrefix: string;
  private listeners: Set<CacheEventListener> = new Set();

  // Track in-flight requests by cache key
  private inFlightRequests = new Map<string, InFlightRequest<TData>>();

  // Track active request keys per consumer (for cancellation on new requests)
  private activeRequestKeys = new Map<string, Set<string>>();

  // Dependency tracking: key -> dependencies
  private dependencies = new Map<string, CacheDependency[]>();

  // Reverse lookup: dependency type:id -> set of keys
  private dependencyIndex = new Map<string, Set<string>>();

  // Cleanup interval ID for proper teardown
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  // Track if the cache has been destroyed
  private isDestroyed = false;

  constructor(
    cacheKeyFn: CacheKeyFn<TParams>,
    config: CacheConfig = {}
  ) {
    this.cacheKeyFn = cacheKeyFn;

    // Apply defaults
    this.config = {
      maxEntries: config.maxEntries ?? 50,
      staleTime: config.staleTime ?? 5 * 60 * 1000, // 5 minutes
      cacheTime: config.cacheTime ?? 10 * 60 * 1000, // 10 minutes
      enablePersistence: config.enablePersistence ?? true,
      storageAdapter: config.storageAdapter ?? createDefaultStorageAdapter(),
      storagePrefix: config.storagePrefix ?? 'blitz-cache:',
      dedupeRequests: config.dedupeRequests ?? true,
      retryCount: config.retryCount ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      debug: config.debug ?? false,
    };

    this.lru = new LRUCache<TData>(this.config.maxEntries, this.config.debug);
    this.storage = this.config.storageAdapter;
    this.storagePrefix = this.config.storagePrefix;

    // Restore from storage on initialization
    if (this.config.enablePersistence) {
      this.restoreFromStorage();
    }

    // Set up periodic cleanup of expired entries
    this.startCleanupTimer();
  }

  /**
   * Fetch data with caching, deduplication, and race condition prevention
   */
  async fetch(
    params: TParams,
    fetcher: Fetcher<TData, TParams>,
    options: { consumerId?: string; force?: boolean } = {}
  ): Promise<CacheResult<TData>> {
    const cacheKey = this.cacheKeyFn(params);
    const { consumerId, force } = options;

    // Cancel any previous in-flight request from this consumer
    if (consumerId) {
      this.cancelPreviousRequests(consumerId, cacheKey);
    }

    // Check cache first (unless force refresh)
    if (!force) {
      const cached = this.lru.get(cacheKey);

      if (cached) {
        this.emit({ type: 'cache-hit', key: cacheKey });

        const isStale = this.lru.isStale(cacheKey, this.config.staleTime);

        // Stale-while-revalidate: return stale data, refresh in background
        if (isStale) {
          this.revalidateInBackground(cacheKey, params, fetcher, consumerId);
        }

        return {
          data: cached.data,
          error: null,
          isLoading: false,
          isStale,
          fromCache: true,
          timestamp: cached.timestamp,
        };
      }
    }

    this.emit({ type: 'cache-miss', key: cacheKey });

    // Check for in-flight request (deduplication)
    if (this.config.dedupeRequests && !force) {
      const inFlight = this.inFlightRequests.get(cacheKey);

      if (inFlight) {
        inFlight.refCount++;

        if (this.config.debug) {
          console.log(`[BlitzCache] Deduped request: ${cacheKey} (refs: ${inFlight.refCount})`);
        }

        try {
          const data = await inFlight.promise;
          return {
            data,
            error: null,
            isLoading: false,
            isStale: false,
            fromCache: false,
            timestamp: Date.now(),
          };
        } catch (error) {
          return {
            data: null,
            error: error as Error,
            isLoading: false,
            isStale: false,
            fromCache: false,
            timestamp: Date.now(),
          };
        }
      }
    }

    // No cache hit, no in-flight request - start new fetch
    return this.executeRequest(cacheKey, params, fetcher, consumerId);
  }

  /**
   * Execute the actual fetch request with retry logic
   */
  private async executeRequest(
    cacheKey: string,
    params: TParams,
    fetcher: Fetcher<TData, TParams>,
    consumerId?: string
  ): Promise<CacheResult<TData>> {
    const abortController = new AbortController();

    // Track this request
    const promise = this.fetchWithRetry(params, fetcher, abortController.signal);

    const inFlight: InFlightRequest<TData> = {
      promise,
      abortController,
      refCount: 1,
    };

    this.inFlightRequests.set(cacheKey, inFlight);

    // Track for this consumer
    if (consumerId) {
      if (!this.activeRequestKeys.has(consumerId)) {
        this.activeRequestKeys.set(consumerId, new Set());
      }
      this.activeRequestKeys.get(consumerId)!.add(cacheKey);
    }

    this.emit({ type: 'fetch-start', key: cacheKey });

    try {
      const data = await promise;

      // Store in cache
      this.set(cacheKey, data);

      this.emit({ type: 'fetch-success', key: cacheKey });

      return {
        data,
        error: null,
        isLoading: false,
        isStale: false,
        fromCache: false,
        timestamp: Date.now(),
      };
    } catch (error) {
      // Don't emit error if request was aborted (race condition cancellation)
      if ((error as Error).name !== 'AbortError') {
        this.emit({ type: 'fetch-error', key: cacheKey, error: error as Error });
      }

      return {
        data: null,
        error: error as Error,
        isLoading: false,
        isStale: false,
        fromCache: false,
        timestamp: Date.now(),
      };
    } finally {
      // Clean up in-flight tracking
      this.inFlightRequests.delete(cacheKey);

      if (consumerId) {
        this.activeRequestKeys.get(consumerId)?.delete(cacheKey);
      }
    }
  }

  /**
   * Fetch with exponential backoff retry
   */
  private async fetchWithRetry(
    params: TParams,
    fetcher: Fetcher<TData, TParams>,
    signal: AbortSignal
  ): Promise<TData> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
      // Check if aborted before retry
      if (signal.aborted) {
        throw new DOMException('Request aborted', 'AbortError');
      }

      try {
        return await fetcher(params, signal);
      } catch (error) {
        lastError = error as Error;

        // Don't retry if aborted
        if ((error as Error).name === 'AbortError') {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt < this.config.retryCount) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);

          if (this.config.debug) {
            console.log(`[BlitzCache] Retry ${attempt + 1}/${this.config.retryCount} after ${delay}ms`);
          }

          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Fetch failed');
  }

  /**
   * Cancel previous in-flight requests from a consumer (prevents race conditions)
   */
  private cancelPreviousRequests(consumerId: string, excludeKey?: string): void {
    const activeKeys = this.activeRequestKeys.get(consumerId);

    if (!activeKeys) return;

    for (const key of activeKeys) {
      if (key === excludeKey) continue;

      const inFlight = this.inFlightRequests.get(key);

      if (inFlight) {
        if (this.config.debug) {
          console.log(`[BlitzCache] Canceling stale request: ${key} (consumer: ${consumerId})`);
        }

        inFlight.abortController.abort();
        this.inFlightRequests.delete(key);
      }

      activeKeys.delete(key);
    }
  }

  /**
   * Revalidate stale data in the background
   */
  private revalidateInBackground(
    cacheKey: string,
    params: TParams,
    fetcher: Fetcher<TData, TParams>,
    consumerId?: string
  ): void {
    if (this.config.debug) {
      console.log(`[BlitzCache] Background revalidation: ${cacheKey}`);
    }

    // Fire and forget
    this.executeRequest(cacheKey, params, fetcher, consumerId).catch(() => {
      // Ignore errors in background revalidation
    });
  }

  /**
   * Set data in cache (manual cache update)
   */
  set(key: string, data: TData, timestamp?: number): void {
    this.lru.set(key, data, timestamp);

    // Persist to storage
    if (this.config.enablePersistence) {
      this.persistToStorage(key, data, timestamp);
    }

    this.emit({ type: 'cache-set', key });
  }

  /**
   * Get data from cache (manual cache read)
   */
  get(key: string): TData | null {
    const entry = this.lru.get(key);
    return entry ? entry.data : null;
  }

  /**
   * Mutate data with optimistic updates and rollback
   */
  async mutate(
    key: string,
    updater: (current: TData | null) => TData,
    options: MutationOptions<TData> = {}
  ): Promise<void> {
    const { optimisticData, rollbackOnError = true, revalidate = true } = options;

    // Get current data
    const currentData = this.get(key);
    const previousData = currentData;

    this.emit({ type: 'mutation-start', key });

    try {
      // Apply optimistic update
      if (optimisticData !== undefined) {
        this.set(key, optimisticData);
      }

      // Apply mutation
      const newData = updater(currentData);
      this.set(key, newData);

      this.emit({ type: 'mutation-success', key });
    } catch (error) {
      this.emit({ type: 'mutation-error', key, error: error as Error });

      // Rollback to previous data
      if (rollbackOnError && previousData !== null) {
        this.set(key, previousData);
      }

      throw error;
    }
  }

  /**
   * Invalidate cache entry (mark for refetch)
   */
  invalidate(key: string): void {
    this.lru.delete(key);

    if (this.config.enablePersistence) {
      // Handle async storage
      Promise.resolve(this.storage.removeItem(this.storagePrefix + key)).catch((error) => {
        if (this.config.debug) {
          console.error('[BlitzCache] Failed to remove from storage:', error);
        }
      });
    }

    // Clean up dependency tracking for this key
    const deps = this.dependencies.get(key);
    if (deps) {
      for (const dep of deps) {
        const depKey = this.getDependencyKey(dep);
        const affectedKeys = this.dependencyIndex.get(depKey);
        if (affectedKeys) {
          affectedKeys.delete(key);
          if (affectedKeys.size === 0) {
            this.dependencyIndex.delete(depKey);
          }
        }
      }
      this.dependencies.delete(key);
    }

    this.emit({ type: 'cache-invalidate', key });
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): void {
    const keys = this.lru.keys().filter((key) => pattern.test(key));

    for (const key of keys) {
      this.invalidate(key);
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.lru.clear();

    if (this.config.enablePersistence) {
      // Handle async storage
      Promise.resolve()
        .then(async () => {
          const keysResult = this.storage.getAllKeys?.() ?? [];
          const keys = await Promise.resolve(keysResult);

          for (const key of keys) {
            if (key.startsWith(this.storagePrefix)) {
              await Promise.resolve(this.storage.removeItem(key));
            }
          }
        })
        .catch((error) => {
          if (this.config.debug) {
            console.error('[BlitzCache] Failed to clear storage:', error);
          }
        });
    }
  }

  /**
   * Prefetch data into cache
   */
  async prefetch(
    params: TParams,
    fetcher: Fetcher<TData, TParams>,
    options: PrefetchOptions = {}
  ): Promise<void> {
    const { force = false, staleTime } = options;
    const cacheKey = this.cacheKeyFn(params);

    // Skip if already cached and not stale (unless forced)
    if (!force) {
      const cached = this.lru.get(cacheKey);

      if (cached) {
        const effectiveStaleTime = staleTime ?? this.config.staleTime;
        const isStale = this.lru.isStale(cacheKey, effectiveStaleTime);

        if (!isStale) {
          if (this.config.debug) {
            console.log(`[BlitzCache] Skipping prefetch (fresh): ${cacheKey}`);
          }
          return;
        }
      }
    }

    if (this.config.debug) {
      console.log(`[BlitzCache] Prefetching: ${cacheKey}`);
    }

    await this.fetch(params, fetcher, { force });
  }

  /**
   * Subscribe to cache events
   */
  subscribe(listener: CacheEventListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit cache event to all listeners
   */
  private emit(event: CacheEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[BlitzCache] Event listener error:', error);
      }
    }
  }

  /**
   * Restore cache from storage on initialization
   */
  private restoreFromStorage(): void {
    // Handle async storage (IndexedDB) by running restoration in background
    Promise.resolve()
      .then(async () => {
        try {
          const keysResult = this.storage.getAllKeys?.();
          const keys = keysResult ? await Promise.resolve(keysResult) : [];
          let restored = 0;

          for (const fullKey of keys) {
            if (!fullKey.startsWith(this.storagePrefix)) continue;

            const cacheKey = fullKey.slice(this.storagePrefix.length);
            const storedResult = this.storage.getItem(fullKey);
            const stored = await Promise.resolve(storedResult);

            if (!stored) continue;

            try {
              const entry: StoredCacheEntry<TData> = JSON.parse(stored);

              // Check if expired
              const age = Date.now() - entry.timestamp;

              if (age <= this.config.cacheTime) {
                this.lru.set(cacheKey, entry.data, entry.timestamp);
                restored++;
              } else {
                // Remove expired entry
                await Promise.resolve(this.storage.removeItem(fullKey));
              }
            } catch {
              // Invalid JSON, remove
              await Promise.resolve(this.storage.removeItem(fullKey));
            }
          }

          if (this.config.debug) {
            console.log(`[BlitzCache] Restored ${restored} entries from storage`);
          }
        } catch (error) {
          console.error('[BlitzCache] Failed to restore from storage:', error);
        }
      })
      .catch((error) => {
        console.error('[BlitzCache] Async restore error:', error);
      });
  }

  /**
   * Persist cache entry to storage (handles both sync and async storage)
   */
  private persistToStorage(key: string, data: TData, timestamp?: number): void {
    try {
      const entry: StoredCacheEntry<TData> = {
        data,
        timestamp: timestamp ?? Date.now(),
      };

      // Fire and forget - don't block on async storage
      Promise.resolve(this.storage.setItem(this.storagePrefix + key, JSON.stringify(entry))).catch(
        (error) => {
          if (this.config.debug) {
            console.error('[BlitzCache] Failed to persist to storage:', error);
          }
        }
      );
    } catch (error) {
      if (this.config.debug) {
        console.error('[BlitzCache] Failed to persist to storage:', error);
      }
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupTimer(): void {
    // Only start if not in SSR environment
    if (typeof setInterval === 'undefined') {
      return;
    }

    // Run cleanup every minute
    this.cleanupIntervalId = setInterval(() => {
      if (this.isDestroyed) return;

      const evicted = this.lru.evictExpired(this.config.cacheTime);

      if (this.config.debug && evicted > 0) {
        console.log(`[BlitzCache] Cleanup: evicted ${evicted} expired entries`);
      }
    }, 60 * 1000);
  }

  /**
   * Destroy the cache instance and clean up all resources
   * Call this when the cache is no longer needed to prevent memory leaks
   */
  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Clear cleanup interval
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }

    // Cancel all in-flight requests
    for (const [key, inFlight] of this.inFlightRequests) {
      inFlight.abortController.abort();
    }
    this.inFlightRequests.clear();

    // Clear all caches and tracking
    this.lru.clear();
    this.listeners.clear();
    this.activeRequestKeys.clear();
    this.dependencies.clear();
    this.dependencyIndex.clear();

    // Close IndexedDB if using it
    if (this.storage && 'close' in this.storage && typeof this.storage.close === 'function') {
      (this.storage as { close: () => Promise<void> }).close().catch(() => {
        // Ignore errors during cleanup
      });
    }

    if (this.config.debug) {
      console.log('[BlitzCache] Cache destroyed');
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.lru.getStats();
  }

  /**
   * Register dependencies for a cache key
   * This allows automatic invalidation when related data changes
   */
  setDependencies(key: string, deps: CacheDependency[]): void {
    // Store dependencies for this key
    this.dependencies.set(key, deps);

    // Update reverse index for fast lookup
    for (const dep of deps) {
      const depKey = this.getDependencyKey(dep);

      if (!this.dependencyIndex.has(depKey)) {
        this.dependencyIndex.set(depKey, new Set());
      }

      this.dependencyIndex.get(depKey)!.add(key);
    }

    if (this.config.debug) {
      console.log(`[BlitzCache] Registered ${deps.length} dependencies for: ${key}`);
    }
  }

  /**
   * Get dependencies for a cache key
   */
  getDependencies(key: string): CacheDependency[] {
    return this.dependencies.get(key) ?? [];
  }

  /**
   * Invalidate all cache entries that depend on a specific dependency
   */
  invalidateByDependency(dep: CacheDependency): void {
    const depKey = this.getDependencyKey(dep);
    const affectedKeys = this.dependencyIndex.get(depKey);

    if (!affectedKeys || affectedKeys.size === 0) {
      if (this.config.debug) {
        console.log(`[BlitzCache] No keys affected by dependency: ${depKey}`);
      }
      return;
    }

    if (this.config.debug) {
      console.log(`[BlitzCache] Invalidating ${affectedKeys.size} keys for dependency: ${depKey}`);
    }

    // Invalidate all affected keys
    for (const key of affectedKeys) {
      this.invalidate(key);
    }

    // Clean up dependency index
    this.dependencyIndex.delete(depKey);
  }

  /**
   * Invalidate all cache entries matching dependency criteria
   * Supports type, id, and pattern matching
   */
  invalidateRelated(criteria: {
    type?: string;
    id?: string | number;
    pattern?: RegExp;
  }): number {
    let invalidatedCount = 0;
    const keysToInvalidate = new Set<string>();

    // If type and/or id specified, use dependency index
    if (criteria.type !== undefined) {
      const depKey = criteria.id !== undefined
        ? `${criteria.type}:${criteria.id}`
        : criteria.type;

      const affectedKeys = this.dependencyIndex.get(depKey);

      if (affectedKeys) {
        affectedKeys.forEach(key => keysToInvalidate.add(key));
      }

      // Also check for wildcard dependency (just type, no id)
      if (criteria.id !== undefined) {
        const wildcardKeys = this.dependencyIndex.get(criteria.type);
        if (wildcardKeys) {
          wildcardKeys.forEach(key => keysToInvalidate.add(key));
        }
      }
    }

    // If pattern specified, match against all cache keys
    if (criteria.pattern) {
      const allKeys = this.lru.keys();
      for (const key of allKeys) {
        if (criteria.pattern.test(key)) {
          keysToInvalidate.add(key);
        }
      }
    }

    // Invalidate all collected keys
    for (const key of keysToInvalidate) {
      this.invalidate(key);
      invalidatedCount++;
    }

    if (this.config.debug) {
      console.log(`[BlitzCache] Invalidated ${invalidatedCount} related entries`);
    }

    return invalidatedCount;
  }

  /**
   * Generate dependency key for indexing
   */
  private getDependencyKey(dep: CacheDependency): string {
    if (dep.id !== undefined) {
      return `${dep.type}:${dep.id}`;
    }
    return dep.type;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

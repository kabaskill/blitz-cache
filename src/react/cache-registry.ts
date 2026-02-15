/**
 * Shared cache registry for React hooks
 * Ensures single cache instance per cache key function
 */

import { BlitzCache } from '../core/cache';
import type { CacheConfig, CacheKeyFn } from '../core/types';

// Global cache instances (one per cache key function)
const globalCaches = new WeakMap<CacheKeyFn<any>, BlitzCache<any, any>>();

/**
 * Get or create a cache instance for the given cache key function
 * Uses WeakMap to allow garbage collection when key function is no longer referenced
 */
export function getOrCreateCache<TData, TParams>(
  cacheKeyFn: CacheKeyFn<TParams>,
  config?: CacheConfig
): BlitzCache<TData, TParams> {
  let cache = globalCaches.get(cacheKeyFn);

  if (!cache) {
    cache = new BlitzCache<TData, TParams>(cacheKeyFn, config);
    globalCaches.set(cacheKeyFn, cache);
  }

  return cache;
}

/**
 * Get an existing cache instance without creating one
 * Useful for DevTools or external access
 */
export function getCache<TData, TParams>(
  cacheKeyFn: CacheKeyFn<TParams>
): BlitzCache<TData, TParams> | undefined {
  return globalCaches.get(cacheKeyFn);
}

/**
 * Remove a cache instance from the registry
 * The cache's destroy() method should be called separately
 */
export function removeCache(cacheKeyFn: CacheKeyFn<any>): boolean {
  return globalCaches.delete(cacheKeyFn);
}

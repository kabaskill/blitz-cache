/**
 * React bindings for blitz-cache
 */

export { useCache, useCacheSuspense } from './useCache';
export type { UseCacheOptions, UseCacheResult } from './useCache';

export { useInfiniteCache } from './useInfiniteCache';
export type { UseInfiniteCacheOptions, UseInfiniteCacheResult } from './useInfiniteCache';

export { getOrCreateCache, getCache, removeCache } from './cache-registry';

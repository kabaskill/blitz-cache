/**
 * blitz-cache - Lightning-fast data fetching and caching library
 *
 * @packageDocumentation
 */

// Core exports
export { BlitzCache, LRUCache } from './core';
export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
  IndexedDBAdapter,
  createDefaultStorageAdapter,
} from './core';
export type {
  CacheConfig,
  CacheDependency,
  CacheEntry,
  CacheEvent,
  CacheEventListener,
  CacheKeyFn,
  CacheResult,
  Fetcher,
  MutationOptions,
  PaginatedFetcher,
  PaginationState,
  PrefetchOptions,
  StorageAdapter,
  StoredCacheEntry,
  IndexedDBAdapterConfig,
} from './core';

// React hooks (optional - requires React peer dependency)
export { useCache, useCacheSuspense, useInfiniteCache } from './react';
export type {
  UseCacheOptions,
  UseCacheResult,
  UseInfiniteCacheOptions,
  UseInfiniteCacheResult,
} from './react';

// DevTools (optional - requires React peer dependency)
export { BlitzDevTools } from './devtools';
export type { BlitzDevToolsProps, CacheStats, CacheEventLog } from './devtools';

// Utilities
export {
  createPageKey,
  mergePaginatedData,
  shouldPrefetchNextPage,
  createOffsetPagination,
  createCursorPagination,
  createPageNumberPagination,
  debounce,
  throttle,
  generateId,
  deepEqual,
} from './utils';

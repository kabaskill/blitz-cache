/**
 * Core cache exports
 */

export { BlitzCache } from './cache';
export { LRUCache } from './lru';
export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
  IndexedDBAdapter,
  createDefaultStorageAdapter,
} from './storage';
export type { IndexedDBAdapterConfig } from './storage';
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
} from './types';

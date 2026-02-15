/**
 * Core type definitions for blitz-cache
 */

// Storage adapter interface for pluggable persistence
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
  getAllKeys?(): string[] | Promise<string[]>;
}

// Cache entry with LRU tracking
export interface CacheEntry<TData> {
  data: TData;
  timestamp: number;
  lastAccessed: number;
}

// Stored cache entry for persistence
export interface StoredCacheEntry<TData> {
  data: TData;
  timestamp: number;
}

// Pagination state for infinite scroll
export interface PaginationState {
  hasMore: boolean;
  nextCursor?: any;
  totalCount?: number;
}

// Dependency definition for invalidation tracking
export interface CacheDependency {
  type: string; // e.g., 'user', 'post', 'comment'
  id?: string | number; // Optional specific ID
  pattern?: RegExp; // Optional pattern for matching keys
}

// Cache configuration options
export interface CacheConfig {
  // Memory cache settings
  maxEntries?: number; // Default: 50

  // Time-based cache invalidation (milliseconds)
  staleTime?: number; // Default: 5 minutes - data considered stale after this
  cacheTime?: number; // Default: 10 minutes - data removed from cache after this

  // Storage persistence
  enablePersistence?: boolean; // Default: true
  storageAdapter?: StorageAdapter; // Default: localStorage
  storagePrefix?: string; // Default: 'blitz-cache:'

  // Request behavior
  dedupeRequests?: boolean; // Default: true - prevent duplicate in-flight requests
  retryCount?: number; // Default: 3
  retryDelay?: number; // Default: 1000ms

  // Logging
  debug?: boolean; // Default: false
}

// Fetcher function signature
export type Fetcher<TData, TParams = any> = (
  params: TParams,
  signal?: AbortSignal
) => Promise<TData>;

// Paginated fetcher for infinite scroll
export type PaginatedFetcher<TData, TParams = any> = (
  params: TParams & { cursor?: any },
  signal?: AbortSignal
) => Promise<{
  data: TData[];
  nextCursor?: any;
  hasMore: boolean;
  totalCount?: number;
}>;

// Cache operation result
export interface CacheResult<TData> {
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
  isStale: boolean;
  fromCache: boolean;
  timestamp: number;
}

// Mutation options
export interface MutationOptions<TData> {
  optimisticData?: TData;
  rollbackOnError?: boolean; // Default: true
  revalidate?: boolean; // Default: true - refetch after mutation
}

// Prefetch options
export interface PrefetchOptions {
  force?: boolean; // Ignore cache and force fetch
  staleTime?: number; // Override global staleTime for this prefetch
}

// Cache key generator
export type CacheKeyFn<TParams = any> = (params: TParams) => string;

// Default cache key generator (JSON stringify)
export const defaultCacheKey: CacheKeyFn = (params: any) => {
  if (typeof params === 'string') return params;
  if (params === null || params === undefined) return '';
  try {
    return JSON.stringify(params);
  } catch {
    return String(params);
  }
};

// Cache events for subscriptions
export type CacheEvent =
  | { type: 'cache-hit'; key: string }
  | { type: 'cache-miss'; key: string }
  | { type: 'cache-set'; key: string }
  | { type: 'cache-evict'; key: string }
  | { type: 'cache-invalidate'; key: string }
  | { type: 'fetch-start'; key: string }
  | { type: 'fetch-success'; key: string }
  | { type: 'fetch-error'; key: string; error: Error }
  | { type: 'mutation-start'; key: string }
  | { type: 'mutation-success'; key: string }
  | { type: 'mutation-error'; key: string; error: Error };

export type CacheEventListener = (event: CacheEvent) => void;

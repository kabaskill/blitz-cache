/**
 * React hook for infinite scroll / paginated data fetching
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BlitzCache } from '../core/cache';
import type { CacheConfig, CacheKeyFn, PaginatedFetcher } from '../core/types';
import { createPageKey, mergePaginatedData, shouldPrefetchNextPage, generateId } from '../utils/helpers';
import { getOrCreateCache } from './cache-registry';

export interface UseInfiniteCacheOptions<TParams> {
  // Cache configuration
  cacheKeyFn?: CacheKeyFn<TParams>;
  config?: CacheConfig;

  // Fetch behavior
  enabled?: boolean; // Default: true
  keepPreviousData?: boolean; // Default: false
  prefetchThreshold?: number; // Default: 10 - items from end to trigger prefetch

  // Callbacks
  onSuccess?: (data: any[]) => void;
  onError?: (error: Error) => void;
}

export interface UseInfiniteCacheResult<TData> {
  data: TData[];
  error: Error | null;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasMore: boolean;
  totalCount?: number;
  fetchNextPage: () => Promise<void>;
  refetch: () => Promise<void>;
  shouldPrefetch: (currentIndex: number) => boolean;
  invalidate: () => void;
  /** The underlying cache instance - useful for DevTools integration */
  cache: BlitzCache<TData[], any>;
}

export function useInfiniteCache<TData = any, TParams = any>(
  params: TParams,
  fetcher: PaginatedFetcher<TData, TParams>,
  options: UseInfiniteCacheOptions<TParams> = {}
): UseInfiniteCacheResult<TData> {
  const {
    cacheKeyFn,
    config,
    enabled = true,
    keepPreviousData = false,
    prefetchThreshold = 10,
    onSuccess,
    onError,
  } = options;

  // Create stable cache key function
  const stableCacheKeyFn = useRef(
    cacheKeyFn ?? ((p: TParams) => JSON.stringify(p))
  );

  // Get or create cache instance
  const cache = useRef(
    getOrCreateCache<TData[], TParams>(stableCacheKeyFn.current, config)
  );

  // Generate stable consumer ID
  const consumerId = useRef(generateId());

  // Compute base cache key (without cursor)
  const baseCacheKey = stableCacheKeyFn.current(params);

  // State
  const [pages, setPages] = useState<TData[][]>([]);
  const [cursors, setCursors] = useState<any[]>([undefined]); // Start with undefined for first page
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Track previous params
  const prevBaseCacheKeyRef = useRef(baseCacheKey);

  // Fetch a specific page
  const fetchPage = useCallback(
    async (cursor: any, isNextPage: boolean = false) => {
      if (isNextPage) {
        setIsFetchingNextPage(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const pageKey = createPageKey(baseCacheKey, cursor);

        const result = await cache.current.fetch(
          { ...params, cursor } as any,
          fetcher as any,
          { consumerId: consumerId.current }
        );

        if (!result.data) {
          throw new Error('No data returned from fetcher');
        }

        // The result.data is the paginated response: { data, nextCursor, hasMore, totalCount }
        const paginatedResult = result.data as unknown as {
          data: TData[];
          nextCursor?: any;
          hasMore: boolean;
          totalCount?: number;
        };

        const pageData = paginatedResult.data;

        // Update pages
        setPages((prev) => {
          if (isNextPage) {
            return [...prev, pageData];
          }

          // First page or refetch
          return [pageData];
        });

        // Extract pagination info from the paginated result
        setHasMore(paginatedResult.hasMore);
        setTotalCount(paginatedResult.totalCount);

        // Update cursors
        setCursors((prev) => {
          if (isNextPage) {
            return [...prev, paginatedResult.nextCursor];
          }
          return [undefined, paginatedResult.nextCursor];
        });

        if (onSuccess) {
          onSuccess(pageData);
        }
      } catch (err) {
        const errorObj = err as Error;
        setError(errorObj);

        if (onError) {
          onError(errorObj);
        }
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [baseCacheKey, params, fetcher, onSuccess, onError]
  );

  // Fetch first page
  const fetchFirstPage = useCallback(async () => {
    setPages([]);
    setCursors([undefined]);
    setHasMore(true);
    setTotalCount(undefined);

    await fetchPage(undefined, false);
  }, [fetchPage]);

  // Fetch next page
  const fetchNextPage = useCallback(async () => {
    if (!hasMore || isFetchingNextPage) return;

    const nextCursor = cursors[cursors.length - 1];
    await fetchPage(nextCursor, true);
  }, [hasMore, isFetchingNextPage, cursors, fetchPage]);

  // Refetch (reload first page)
  const refetch = useCallback(async () => {
    await fetchFirstPage();
  }, [fetchFirstPage]);

  // Should prefetch check
  const shouldPrefetch = useCallback(
    (currentIndex: number) => {
      const totalLoaded = mergePaginatedData(pages).length;
      return shouldPrefetchNextPage(currentIndex, totalLoaded, prefetchThreshold);
    },
    [pages, prefetchThreshold]
  );

  // Invalidate cache
  const invalidate = useCallback(() => {
    // Invalidate all pages for this query
    const allKeys = cache.current.getStats().entries.map((e) => e.key);
    const pattern = new RegExp(`^${baseCacheKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

    for (const key of allKeys) {
      if (pattern.test(key)) {
        cache.current.invalidate(key);
      }
    }

    setPages([]);
    setCursors([undefined]);
    setHasMore(true);
  }, [baseCacheKey]);

  // Effect: Fetch on mount or params change
  useEffect(() => {
    const paramsChanged = prevBaseCacheKeyRef.current !== baseCacheKey;
    prevBaseCacheKeyRef.current = baseCacheKey;

    if (enabled && paramsChanged) {
      fetchFirstPage();
    }
  }, [baseCacheKey, enabled, fetchFirstPage]);

  // Effect: Initial fetch on mount
  useEffect(() => {
    if (enabled && pages.length === 0) {
      fetchFirstPage();
    }
  }, [enabled]); // Only on mount

  // Merge all pages into flat array
  const allData = mergePaginatedData(pages);

  return {
    data: allData,
    error,
    isLoading,
    isFetchingNextPage,
    hasMore,
    totalCount,
    fetchNextPage,
    refetch,
    shouldPrefetch,
    invalidate,
    cache: cache.current,
  };
}

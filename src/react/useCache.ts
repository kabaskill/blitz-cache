/**
 * React hook for data fetching with caching
 */

import * as React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { BlitzCache } from '../core/cache';
import type { CacheConfig, CacheDependency, CacheKeyFn, CacheResult, Fetcher, MutationOptions } from '../core/types';
import { generateId } from '../utils/helpers';
import { getOrCreateCache } from './cache-registry';

export interface UseCacheOptions<TData, TParams> {
  // Cache configuration
  cacheKeyFn?: CacheKeyFn<TParams>;
  config?: CacheConfig;

  // Fetch behavior
  enabled?: boolean; // Default: true - set to false to disable auto-fetch
  keepPreviousData?: boolean; // Default: false - show stale data while fetching
  refetchOnMount?: boolean; // Default: true
  refetchOnFocus?: boolean; // Default: false
  refetchOnReconnect?: boolean; // Default: false
  refetchInterval?: number; // Polling interval in ms

  // Dependency tracking
  dependencies?: CacheDependency[]; // Dependencies for automatic invalidation

  // Callbacks
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

export interface UseCacheResult<TData> {
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
  isStale: boolean;
  isValidating: boolean; // True when refetching in background
  refetch: () => Promise<void>;
  mutate: (updater: (current: TData | null) => TData, options?: MutationOptions<TData>) => Promise<void>;
  invalidate: () => void;
  /** The underlying cache instance - useful for DevTools integration */
  cache: BlitzCache<TData, any>;
}

export function useCache<TData = any, TParams = any>(
  params: TParams,
  fetcher: Fetcher<TData, TParams>,
  options: UseCacheOptions<TData, TParams> = {}
): UseCacheResult<TData> {
  const {
    cacheKeyFn,
    config,
    enabled = true,
    keepPreviousData = false,
    refetchOnMount = true,
    refetchOnFocus = false,
    refetchOnReconnect = false,
    refetchInterval,
    dependencies,
    onSuccess,
    onError,
  } = options;

  // Create stable cache key function
  const stableCacheKeyFn = useRef(cacheKeyFn ?? ((p: TParams) => JSON.stringify(p)));

  // Get or create cache instance
  const cache = useRef(getOrCreateCache<TData, TParams>(stableCacheKeyFn.current, config));

  // Generate stable consumer ID for race condition prevention
  const consumerId = useRef(generateId());

  // Compute cache key
  const cacheKey = stableCacheKeyFn.current(params);

  // State
  const [result, setResult] = useState<CacheResult<TData>>(() => {
    // Initialize from cache if available
    const cached = cache.current.get(cacheKey);

    return {
      data: cached,
      error: null,
      isLoading: !cached && enabled,
      isStale: false,
      fromCache: !!cached,
      timestamp: Date.now(),
    };
  });

  const [isValidating, setIsValidating] = useState(false);

  // Track previous params to detect changes
  const prevParamsRef = useRef(params);
  const prevCacheKeyRef = useRef(cacheKey);

  // Fetch function
  // Note: useCallback used for React 18 compatibility
  // In React 19 with compiler, use 'blitz-cache/react-compiler' to skip this
  const fetchData = useCallback(
    async (force = false) => {
      if (!enabled) return;

      setIsValidating(true);

      try {
        const fetchResult = await cache.current.fetch(params, fetcher, {
          consumerId: consumerId.current,
          force,
        });

        // Only update state if this is the current request (not cancelled)
        setResult((prev) => {
          // Keep previous data if keepPreviousData is enabled and we're loading
          if (keepPreviousData && fetchResult.isLoading && prev.data) {
            return { ...fetchResult, data: prev.data };
          }

          return fetchResult;
        });

        if (fetchResult.data && onSuccess) {
          onSuccess(fetchResult.data);
        }

        if (fetchResult.error && onError) {
          onError(fetchResult.error);
        }
      } catch (error) {
        // Error already handled in cache, but catch for safety
        console.error('[useCache] Unexpected error:', error);
      } finally {
        setIsValidating(false);
      }
    },
    [params, fetcher, enabled, keepPreviousData, onSuccess, onError]
  );

  // Refetch function (force refresh)
  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Mutate function
  const mutate = useCallback(
    async (updater: (current: TData | null) => TData, mutateOptions?: MutationOptions<TData>) => {
      await cache.current.mutate(cacheKey, updater, mutateOptions);

      // Update local state
      const newData = cache.current.get(cacheKey);

      setResult((prev) => ({
        ...prev,
        data: newData,
        timestamp: Date.now(),
      }));
    },
    [cacheKey]
  );

  // Invalidate function
  const invalidate = useCallback(() => {
    cache.current.invalidate(cacheKey);

    setResult((prev) => ({
      ...prev,
      data: null,
      isStale: true,
    }));
  }, [cacheKey]);

  // Effect: Fetch on mount or params change
  useEffect(() => {
    const paramsChanged = prevCacheKeyRef.current !== cacheKey;
    prevCacheKeyRef.current = cacheKey;
    prevParamsRef.current = params;

    if (enabled && (refetchOnMount || paramsChanged)) {
      fetchData(paramsChanged); // Force refresh on params change
    }
  }, [cacheKey, enabled, refetchOnMount, fetchData]);

  // Effect: Refetch on window focus
  useEffect(() => {
    if (!refetchOnFocus || !enabled || typeof window === 'undefined') return;

    const handleFocus = () => {
      fetchData(false);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetchOnFocus, enabled, fetchData]);

  // Effect: Refetch on reconnect
  useEffect(() => {
    if (!refetchOnReconnect || !enabled || typeof window === 'undefined') return;

    const handleOnline = () => {
      fetchData(false);
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [refetchOnReconnect, enabled, fetchData]);

  // Effect: Polling interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(() => {
      fetchData(false);
    }, refetchInterval);

    return () => {
      clearInterval(interval);
    };
  }, [refetchInterval, enabled, fetchData]);

  // Effect: Register dependencies
  useEffect(() => {
    if (dependencies && dependencies.length > 0) {
      cache.current.setDependencies(cacheKey, dependencies);
    }
  }, [cacheKey, dependencies]);

  return {
    data: result.data,
    error: result.error,
    isLoading: result.isLoading,
    isStale: result.isStale,
    isValidating,
    refetch,
    mutate,
    invalidate,
    cache: cache.current,
  };
}

/**
 * React 19 Suspense-enabled cache hook
 * 
 * This hook leverages React 19's `use` hook for native Suspense integration.
 * It throws a promise that Suspense boundaries can catch.
 * 
 * @throws Error if used with React <19
 * @example
 * ```tsx
 * function UserProfile({ userId }: { userId: number }) {
 *   // No loading state needed - Suspense boundary handles it
 *   const { data } = useCacheSuspense({ userId }, fetchUser);
 *   return <div>{data.name}</div>;
 * }
 * 
 * // Wrap in Suspense boundary
 * <Suspense fallback={<Loading />}>
 *   <UserProfile userId={1} />
 * </Suspense>
 * ```
 */
export function useCacheSuspense<TData = any, TParams = any>(
  params: TParams,
  fetcher: Fetcher<TData, TParams>,
  options: Omit<UseCacheOptions<TData, TParams>, 'enabled' | 'refetchOnMount' | 'refetchOnFocus' | 'refetchOnReconnect' | 'refetchInterval'> = {}
): { data: TData; error: null; isLoading: false; isStale: boolean; refetch: () => Promise<void>; mutate: (updater: (current: TData | null) => TData, options?: MutationOptions<TData>) => Promise<void>; invalidate: () => void; cache: BlitzCache<TData, any> } {
  // Runtime detection of React 19
  const reactUse = (React as any).use;
  if (!reactUse) {
    throw new Error(
      '[useCacheSuspense] React 19+ is required. ' +
      'Use useCache() for React 18 and below.'
    );
  }

  const {
    cacheKeyFn,
    config,
    keepPreviousData = false,
    dependencies,
    onSuccess,
    onError,
  } = options;

  // Create stable cache key function
  const stableCacheKeyFn = useRef(cacheKeyFn ?? ((p: TParams) => JSON.stringify(p)));

  // Get or create cache instance
  const cache = useRef(getOrCreateCache<TData, TParams>(stableCacheKeyFn.current, config));

  // Generate stable consumer ID
  const consumerId = useRef(generateId());

  // Compute cache key
  const cacheKey = stableCacheKeyFn.current(params);

  // Track if we've already fetched in this render
  const hasFetchedRef = useRef(false);

  // Create the fetch promise
  const promiseRef = useRef<Promise<TData>>();

  // Check cache first
  const cached = cache.current.get(cacheKey);

  if (!cached && !promiseRef.current) {
    // Start fetch and store promise
    promiseRef.current = cache.current.fetch(params, fetcher, {
      consumerId: consumerId.current,
    }).then(result => {
      if (result.error) {
        throw result.error;
      }
      if (onSuccess && result.data) {
        onSuccess(result.data);
      }
      return result.data!;
    }).catch(error => {
      if (onError) {
        onError(error);
      }
      throw error;
    });
  }

  // Use React 19's use hook to suspend if needed
  const data = cached ?? reactUse(promiseRef.current!);

  // Reset promise ref after successful resolution
  useEffect(() => {
    promiseRef.current = undefined;
    hasFetchedRef.current = true;
  }, [cacheKey]);

  // Register dependencies
  useEffect(() => {
    if (dependencies && dependencies.length > 0) {
      cache.current.setDependencies(cacheKey, dependencies);
    }
  }, [cacheKey, dependencies]);

  // Refetch function (force refresh)
  const refetch = useCallback(async () => {
    await cache.current.fetch(params, fetcher, {
      consumerId: consumerId.current,
      force: true,
    });
  }, [params, fetcher]);

  // Mutate function
  const mutate = useCallback(
    async (updater: (current: TData | null) => TData, mutateOptions?: MutationOptions<TData>) => {
      await cache.current.mutate(cacheKey, updater, mutateOptions);
    },
    [cacheKey]
  );

  // Invalidate function
  const invalidate = useCallback(() => {
    cache.current.invalidate(cacheKey);
  }, [cacheKey]);

  // Check if data is stale
  const isStale = cache.current.getStats().entries.find(e => e.key === cacheKey)?.age ? 
    (cache.current.getStats().entries.find(e => e.key === cacheKey)!.age > (config?.staleTime ?? 5 * 60 * 1000)) : 
    false;

  return {
    data: data as TData,
    error: null,
    isLoading: false,
    isStale,
    refetch,
    mutate,
    invalidate,
    cache: cache.current,
  };
}

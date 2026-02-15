/**
 * Utility helpers for pagination and infinite scroll
 */

import type { PaginatedFetcher, PaginationState } from '../core/types';

/**
 * Create a paginated cache key
 */
export function createPageKey(baseKey: string, cursor: any): string {
  if (cursor === undefined || cursor === null) {
    return baseKey;
  }

  if (typeof cursor === 'number' || typeof cursor === 'string') {
    return `${baseKey}:${cursor}`;
  }

  return `${baseKey}:${JSON.stringify(cursor)}`;
}

/**
 * Extract base key from paginated key
 */
export function extractBaseKey(pageKey: string): string {
  const colonIndex = pageKey.indexOf(':');
  return colonIndex === -1 ? pageKey : pageKey.slice(0, colonIndex);
}

/**
 * Parse cursor from paginated key
 */
export function extractCursor(pageKey: string): any {
  const colonIndex = pageKey.indexOf(':');

  if (colonIndex === -1) {
    return undefined;
  }

  const cursorStr = pageKey.slice(colonIndex + 1);

  // Try to parse as number
  const asNumber = Number(cursorStr);

  if (!isNaN(asNumber)) {
    return asNumber;
  }

  // Try to parse as JSON
  try {
    return JSON.parse(cursorStr);
  } catch {
    return cursorStr;
  }
}

/**
 * Merge paginated results into a flat array
 */
export function mergePaginatedData<TData>(pages: TData[][]): TData[] {
  return pages.flat();
}

/**
 * Calculate if we should prefetch next page based on scroll position
 */
export function shouldPrefetchNextPage(
  currentIndex: number,
  totalLoaded: number,
  threshold: number = 10
): boolean {
  // Check if we're within threshold items from the end
  return currentIndex >= totalLoaded - threshold;
}

/**
 * Create offset-based pagination fetcher wrapper
 */
export function createOffsetPagination<TData, TParams = any>(
  baseFetcher: (params: TParams & { offset: number; limit: number }, signal?: AbortSignal) => Promise<{
    data: TData[];
    total?: number;
  }>,
  pageSize: number = 20
): PaginatedFetcher<TData, TParams> {
  return async (params, signal) => {
    const offset = (params.cursor as number) ?? 0;

    const result = await baseFetcher(
      { ...params, offset, limit: pageSize },
      signal
    );

    const nextOffset = offset + result.data.length;
    const hasMore = result.total ? nextOffset < result.total : result.data.length === pageSize;

    return {
      data: result.data,
      nextCursor: hasMore ? nextOffset : undefined,
      hasMore,
      totalCount: result.total,
    };
  };
}

/**
 * Create cursor-based pagination fetcher wrapper
 */
export function createCursorPagination<TData, TParams = any, TCursor = string>(
  baseFetcher: (params: TParams & { cursor?: TCursor; limit: number }, signal?: AbortSignal) => Promise<{
    data: TData[];
    nextCursor?: TCursor;
  }>,
  pageSize: number = 20
): PaginatedFetcher<TData, TParams> {
  return async (params, signal) => {
    const cursor = params.cursor as TCursor | undefined;

    const result = await baseFetcher(
      { ...params, cursor, limit: pageSize },
      signal
    );

    return {
      data: result.data,
      nextCursor: result.nextCursor,
      hasMore: !!result.nextCursor,
    };
  };
}

/**
 * Create page-number-based pagination fetcher wrapper
 */
export function createPageNumberPagination<TData, TParams = any>(
  baseFetcher: (params: TParams & { page: number; limit: number }, signal?: AbortSignal) => Promise<{
    data: TData[];
    totalPages?: number;
  }>,
  pageSize: number = 20
): PaginatedFetcher<TData, TParams> {
  return async (params, signal) => {
    const page = ((params.cursor as number) ?? 0) + 1; // 1-indexed pages

    const result = await baseFetcher(
      { ...params, page, limit: pageSize },
      signal
    );

    const nextPage = page + 1;
    const hasMore = result.totalPages ? nextPage <= result.totalPages : result.data.length === pageSize;

    return {
      data: result.data,
      nextCursor: hasMore ? page : undefined, // Return current page as cursor
      hasMore,
    };
  };
}

/**
 * Debounce function for search queries
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for scroll events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate unique ID for request tracking
 * Uses crypto.randomUUID() when available for cryptographic security
 */
export function generateId(): string {
  // Use crypto.randomUUID() if available (secure, standard UUID v4)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older environments using getRandomValues
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  // Last resort: improved Math.random() with more entropy
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Deep equal comparison for cache key generation
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (a.constructor !== b.constructor) return false;

    if (Array.isArray(a)) {
      const length = a.length;
      if (length !== b.length) return false;

      for (let i = 0; i < length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }

      return true;
    }

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    const keys = Object.keys(a);

    if (keys.length !== Object.keys(b).length) return false;

    for (const key of keys) {
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  return false;
}

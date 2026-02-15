# ⚡ blitz-cache

> Lightning-fast data fetching and caching library with built-in LRU, persistence, and pagination support

## Features

- **Blazing Fast** - LRU cache with O(1) operations
- **Built-in Persistence** - localStorage/sessionStorage support out of the box
- **Stale-While-Revalidate** - Return cached data instantly, refresh in background
- **Infinite Scroll** - First-class pagination and infinite loading support
- **Race Condition Prevention** - AbortController integration for request cancellation
- **Request Deduplication** - Prevent duplicate in-flight requests
- **Minimal Dependencies** - Core library has zero runtime dependencies; React support via optional peer dependency
- **TypeScript First** - Fully typed with generics
- **React Hooks** - `useCache` and `useInfiniteCache` for seamless integration
- **Pluggable Storage** - Custom storage adapters (memory, localStorage, sessionStorage, custom)

## Installation

```bash
# For React projects
npm install blitz-cache react
# or
yarn add blitz-cache react
# or
pnpm add blitz-cache react

# For framework-agnostic usage (vanilla JS, Vue, Svelte, etc.)
npm install blitz-cache
```

> **Note:** React is an optional peer dependency. The core caching functionality works without React, but React hooks require React 16.8+.

## Usage

```typescript
// React hooks (all versions)
import { useCache, useInfiniteCache } from 'blitz-cache/react';

// React 19 Suspense integration
import { useCacheSuspense } from 'blitz-cache/react';

// Core only (vanilla JS, Vue, Svelte, etc.)
import { BlitzCache } from 'blitz-cache/core';

// Utilities
import { debounce, throttle } from 'blitz-cache';
```

**React Support:** Works with React 16.8+ (any version with hooks). React 19 users get additional Suspense integration via `useCacheSuspense`.

## Quick Start

### Basic Usage (React)

```tsx
import { useCache } from 'blitz-cache/react';

interface User {
  id: number;
  name: string;
}

function UserProfile({ userId }: { userId: number }) {
  const { data, error, isLoading, refetch } = useCache(
    { userId },
    async ({ userId }, signal) => {
      const res = await fetch(`/api/users/${userId}`, { signal });
      return res.json() as Promise<User>;
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data?.name}</h1>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### React 19 Suspense Integration

For React 19+, use `useCacheSuspense` for native Suspense boundary support:

```tsx
import { useCacheSuspense } from 'blitz-cache/react';
import { Suspense } from 'react';

function UserProfile({ userId }: { userId: number }) {
  // No manual loading state needed - Suspense handles it!
  const { data, refetch } = useCacheSuspense(
    { userId },
    async ({ userId }, signal) => {
      const res = await fetch(`/api/users/${userId}`, { signal });
      return res.json() as Promise<User>;
    }
  );

  return (
    <div>
      <h1>{data.name}</h1>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}

// Wrap in Suspense boundary
function App() {
  return (
    <Suspense fallback={<div>Loading user...</div>}>
      <UserProfile userId={1} />
    </Suspense>
  );
}
```

### Infinite Scroll / Pagination

```tsx
import { useInfiniteCache } from 'blitz-cache/react';

interface Post {
  id: number;
  title: string;
}

function PostList() {
  const { data, fetchNextPage, hasMore, isFetchingNextPage } = useInfiniteCache(
    { category: 'tech' },
    async ({ category, cursor }, signal) => {
      const offset = cursor ?? 0;
      const res = await fetch(
        `/api/posts?category=${category}&offset=${offset}&limit=20`,
        { signal }
      );
      const json = await res.json();

      return {
        data: json.posts,
        nextCursor: offset + 20,
        hasMore: json.posts.length === 20,
        totalCount: json.total,
      };
    }
  );

  return (
    <div>
      {data.map((post) => (
        <div key={post.id}>{post.title}</div>
      ))}
      {hasMore && (
        <button onClick={fetchNextPage} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

## Core Concepts

### Race Condition Prevention

blitz-cache automatically cancels previous in-flight requests when new ones are made:

```tsx
// User types "pizza" then immediately "burger"
// The "pizza" request is automatically cancelled
const { data } = useCache(
  searchQuery,
  async (query, signal) => {
    // signal is automatically aborted if a new search starts
    const res = await fetch(`/api/search?q=${query}`, { signal });
    return res.json();
  }
);
```

### Stale-While-Revalidate

Get instant responses from cache while fetching fresh data in the background:

```tsx
const { data, isStale } = useCache(
  params,
  fetcher,
  {
    config: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  }
);

// Returns cached data immediately (even if stale)
// Refetches in background if stale
// isStale tells you if data is being revalidated
```

### Request Deduplication

Multiple components requesting the same data share a single request:

```tsx
// Component A
const { data: user1 } = useCache({ userId: 1 }, fetchUser);

// Component B (mounted at the same time)
const { data: user2 } = useCache({ userId: 1 }, fetchUser);

// Only ONE request is made, both components receive the same data
```

## API Reference

### `useCache<TData, TParams>(params, fetcher, options)`

Hook for basic data fetching with caching.

**Parameters:**
- `params: TParams` - Parameters for the fetch (used for cache key generation)
- `fetcher: (params: TParams, signal?: AbortSignal) => Promise<TData>` - Function to fetch data
- `options?: UseCacheOptions` - Configuration options

**Options:**
```typescript
{
  cacheKeyFn?: (params: TParams) => string; // Custom cache key generator
  config?: CacheConfig; // Cache configuration (staleTime, cacheTime, etc.)
  enabled?: boolean; // Enable/disable auto-fetch (default: true)
  keepPreviousData?: boolean; // Keep stale data while fetching (default: false)
  refetchOnMount?: boolean; // Refetch on component mount (default: true)
  refetchOnFocus?: boolean; // Refetch on window focus (default: false)
  refetchOnReconnect?: boolean; // Refetch on network reconnect (default: false)
  refetchInterval?: number; // Polling interval in ms
  onSuccess?: (data: TData) => void; // Success callback
  onError?: (error: Error) => void; // Error callback
}
```

**Returns:**
```typescript
{
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
  isStale: boolean;
  isValidating: boolean; // True when refetching in background
  refetch: () => Promise<void>;
  mutate: (updater, options?) => Promise<void>;
  invalidate: () => void;
  cache: BlitzCache<TData>; // Underlying cache instance for DevTools
}
```

### `useCacheSuspense<TData, TParams>(params, fetcher, options)` ⚡ React 19+

Suspense-enabled hook for React 19. Integrates with React's Suspense boundaries for automatic loading states.

**Requirements:** React 19+ (throws error if used with React 18 or below)

**Parameters:**
- `params: TParams` - Parameters for the fetch
- `fetcher: (params: TParams, signal?: AbortSignal) => Promise<TData>` - Function to fetch data
- `options?: UseCacheSuspenseOptions` - Configuration options (excludes polling/focus options)

**Options:**
```typescript
{
  cacheKeyFn?: (params: TParams) => string;
  config?: CacheConfig;
  keepPreviousData?: boolean;
  dependencies?: CacheDependency[];
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}
```

**Returns:**
```typescript
{
  data: TData; // Never null - Suspense ensures data is available
  error: null; // Errors are thrown to Error Boundaries
  isLoading: false; // Suspense handles loading
  isStale: boolean;
  refetch: () => Promise<void>;
  mutate: (updater, options?) => Promise<void>;
  invalidate: () => void;
  cache: BlitzCache<TData>;
}
```

### `useInfiniteCache<TData, TParams>(params, fetcher, options)`

Hook for infinite scroll and pagination.

**Parameters:**
- `params: TParams` - Base parameters (shared across all pages)
- `fetcher: PaginatedFetcher<TData, TParams>` - Paginated fetch function
- `options?: UseInfiniteCacheOptions` - Configuration options

**Fetcher Signature:**
```typescript
async (params: TParams & { cursor?: any }, signal?: AbortSignal) => {
  return {
    data: TData[]; // Page data
    nextCursor?: any; // Cursor for next page (undefined = no more pages)
    hasMore: boolean; // Whether there are more pages
    totalCount?: number; // Optional total item count
  };
}
```

**Returns:**
```typescript
{
  data: TData[]; // All loaded pages merged into flat array
  error: Error | null;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasMore: boolean;
  totalCount?: number;
  fetchNextPage: () => Promise<void>;
  refetch: () => Promise<void>;
  shouldPrefetch: (currentIndex: number) => boolean;
  invalidate: () => void;
  cache: BlitzCache<TData[]>; // Underlying cache instance for DevTools
}
```

### `BlitzCache` (Core Class)

For framework-agnostic usage:

```typescript
import { BlitzCache } from 'blitz-cache/core';

const cache = new BlitzCache<User, { userId: number }>(
  (params) => `user:${params.userId}`, // Cache key function
  {
    maxEntries: 100,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    debug: true,
  }
);

// Fetch with caching
const result = await cache.fetch(
  { userId: 1 },
  async ({ userId }, signal) => {
    const res = await fetch(`/api/users/${userId}`, { signal });
    return res.json();
  },
  { consumerId: 'my-component' }
);

// Manual cache operations
cache.set('user:1', userData);
const user = cache.get('user:1');
cache.invalidate('user:1');
cache.clear();

// Prefetch
await cache.prefetch({ userId: 2 }, fetcher);

// Subscribe to events
cache.subscribe((event) => {
  console.log('Cache event:', event);
});

// Get stats
const stats = cache.getStats();

// Clean up when done (prevents memory leaks)
cache.destroy();
```

## Configuration

### Global Cache Config

```typescript
const config: CacheConfig = {
  maxEntries: 50, // Max LRU cache entries (default: 50)
  staleTime: 5 * 60 * 1000, // 5 minutes - data is stale after this
  cacheTime: 10 * 60 * 1000, // 10 minutes - data is evicted after this
  enablePersistence: true, // Use localStorage (default: true)
  storageAdapter: new LocalStorageAdapter(), // Custom storage
  storagePrefix: 'blitz-cache:', // Storage key prefix
  dedupeRequests: true, // Deduplicate in-flight requests (default: true)
  retryCount: 3, // Number of retries on failure (default: 3)
  retryDelay: 1000, // Base retry delay in ms (exponential backoff)
  debug: false, // Enable debug logging
};
```

### Storage Adapters

```typescript
import {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
} from 'blitz-cache/core';

// localStorage (persists across sessions)
const cache = new BlitzCache(cacheKeyFn, {
  storageAdapter: new LocalStorageAdapter(),
});

// sessionStorage (cleared on tab close)
const cache = new BlitzCache(cacheKeyFn, {
  storageAdapter: new SessionStorageAdapter(),
});

// Memory only (no persistence)
const cache = new BlitzCache(cacheKeyFn, {
  storageAdapter: new MemoryStorageAdapter(),
});

// Disable persistence completely
const cache = new BlitzCache(cacheKeyFn, {
  enablePersistence: false,
  storageAdapter: new MemoryStorageAdapter(),
});

// Custom adapter
class CustomStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    // Your implementation
  }
  setItem(key: string, value: string): void {
    // Your implementation
  }
  removeItem(key: string): void {
    // Your implementation
  }
  getAllKeys(): string[] {
    // Your implementation
  }
}
```

## Advanced Usage

### Optimistic Updates

```tsx
const { data, mutate } = useCache({ userId: 1 }, fetchUser);

async function updateUserName(newName: string) {
  await mutate(
    (current) => ({ ...current, name: newName }),
    {
      optimisticData: { ...data, name: newName }, // Show immediately
      rollbackOnError: true, // Rollback if mutation fails
      revalidate: true, // Refetch after mutation
    }
  );
}
```

### Pagination Helpers

```typescript
import {
  createOffsetPagination,
  createCursorPagination,
  createPageNumberPagination,
} from 'blitz-cache/core';

// Offset-based (offset/limit)
const fetcher = createOffsetPagination(
  async ({ offset, limit }, signal) => {
    const res = await fetch(`/api/posts?offset=${offset}&limit=${limit}`, { signal });
    return res.json(); // { data: Post[], total: number }
  },
  20 // Page size
);

// Cursor-based
const fetcher = createCursorPagination(
  async ({ cursor, limit }, signal) => {
    const url = cursor
      ? `/api/posts?cursor=${cursor}&limit=${limit}`
      : `/api/posts?limit=${limit}`;
    const res = await fetch(url, { signal });
    return res.json(); // { data: Post[], nextCursor?: string }
  },
  20
);

// Page number-based
const fetcher = createPageNumberPagination(
  async ({ page, limit }, signal) => {
    const res = await fetch(`/api/posts?page=${page}&limit=${limit}`, { signal });
    return res.json(); // { data: Post[], totalPages: number }
  },
  20
);
```

### Prefetching

```tsx
import { useCache } from 'blitz-cache/react';

function UserList({ users }) {
  const cache = useCache({ userId: 1 }, fetchUser);

  // Prefetch on hover
  const handleMouseEnter = (userId: number) => {
    cache.prefetch({ userId }, fetchUser);
  };

  return users.map((user) => (
    <div key={user.id} onMouseEnter={() => handleMouseEnter(user.id)}>
      {user.name}
    </div>
  ));
}
```

### Cache Invalidation

```tsx
const { invalidate } = useCache(params, fetcher);

// Invalidate single entry
invalidate();

// Invalidate by pattern (using core BlitzCache)
cache.invalidatePattern(/^user:/);

// Clear all cache
cache.clear();
```

## Advanced Features

### IndexedDB Storage

For large datasets beyond localStorage's ~5MB limit:

```tsx
import { BlitzCache, IndexedDBAdapter } from 'blitz-cache/core';

const cache = new BlitzCache(cacheKeyFn, {
  storageAdapter: new IndexedDBAdapter({
    dbName: 'my-app-cache',
    storeName: 'queries',
    version: 1,
  }),
  maxEntries: 200,
});
```

### Dependency-Based Invalidation

Automatically invalidate related queries:

```tsx
// Define query with dependencies
const { data: user } = useCache(
  { userId: 1 },
  fetchUser,
  {
    dependencies: [{ type: 'user', id: 1 }],
  }
);

// User's posts depend on the user
const { data: posts } = useCache(
  { userId: 1 },
  fetchUserPosts,
  {
    dependencies: [
      { type: 'user', id: 1 },
      { type: 'posts' },
    ],
  }
);

// Invalidate all related queries at once
cache.invalidateRelated({ type: 'user', id: 1 });
// ✅ Invalidates user query + posts query + all other user:1 dependents
```

### DevTools

Real-time cache visualization and debugging:

```tsx
import { useCache } from 'blitz-cache/react';
import { BlitzDevTools } from 'blitz-cache/devtools';

function App() {
  const { data, cache } = useCache(params, fetcher);

  return (
    <>
      <YourApp />
      <BlitzDevTools cache={cache} position="bottom-right" />
    </>
  );
}
```

**DevTools Features:**
- Real-time cache hit/miss tracking
- View all cached entries with age/access time
- Manual cache invalidation
- Event log for debugging
- Cache statistics dashboard

## Why blitz-cache?

1. **Pagination-First Design** - Built for real-world apps with lists and infinite scroll
2. **Memory Efficient** - LRU cache prevents memory bloat in long-running apps
3. **Persistent by Default** - Instant loads on page refresh via localStorage
4. **No Race Conditions** - AbortController integration handles concurrent requests
5. **Simple API** - Familiar to useSWR/React Query users, but simpler
6. **Framework Agnostic Core** - Use with React, Vue, Svelte, or vanilla JS

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
# Basic Usage Examples

## Simple Data Fetching

```tsx
import { useCache } from 'blitz-cache/react';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

function TodoItem({ todoId }: { todoId: number }) {
  const { data, error, isLoading } = useCache(
    { todoId },
    async ({ todoId }, signal) => {
      const res = await fetch(
        `https://jsonplaceholder.typicode.com/todos/${todoId}`,
        { signal }
      );
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<Todo>;
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <div>
      <input type="checkbox" checked={data.completed} readOnly />
      <span>{data.title}</span>
    </div>
  );
}
```

## React 19 Suspense Integration

For React 19+, use `useCacheSuspense` for cleaner code with native Suspense boundaries:

```tsx
import { useCacheSuspense } from 'blitz-cache/react';
import { Suspense } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

function UserProfile({ userId }: { userId: number }) {
  // No need for isLoading check - Suspense handles it!
  const { data } = useCacheSuspense(
    { userId },
    async ({ userId }, signal) => {
      const res = await fetch(`/api/users/${userId}`, { signal });
      return res.json() as Promise<User>;
    }
  );

  // data is guaranteed to be defined here
  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
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

**Benefits:**
- No manual loading state management
- Data is non-nullable (TypeScript knows it's defined)
- Errors are caught by Error Boundaries
- Cleaner component code

## Search with Debouncing

```tsx
import { useCache } from 'blitz-cache/react';
import { useState } from 'react';
import { debounce } from 'blitz-cache';

interface SearchResult {
  id: number;
  name: string;
}

function SearchBox() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search input
  const handleSearch = debounce((value: string) => {
    setDebouncedQuery(value);
  }, 300);

  const { data, isLoading } = useCache(
    { query: debouncedQuery },
    async ({ query }, signal) => {
      if (!query) return [];

      const res = await fetch(`/api/search?q=${query}`, { signal });
      return res.json() as Promise<SearchResult[]>;
    },
    {
      enabled: debouncedQuery.length > 0, // Only fetch if query exists
      keepPreviousData: true, // Keep old results while fetching new ones
    }
  );

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          handleSearch(e.target.value);
        }}
        placeholder="Search..."
      />

      {isLoading && <div>Searching...</div>}

      {data?.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

## Infinite Scroll List

```tsx
import { useInfiniteCache } from 'blitz-cache/react';
import { useEffect, useRef } from 'react';

interface Post {
  id: number;
  title: string;
  body: string;
}

function InfinitePostList() {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasMore,
    fetchNextPage,
    shouldPrefetch,
  } = useInfiniteCache(
    {}, // No params needed for this example
    async ({ cursor }, signal) => {
      const offset = cursor ?? 0;
      const limit = 20;

      const res = await fetch(
        `https://jsonplaceholder.typicode.com/posts?_start=${offset}&_limit=${limit}`,
        { signal }
      );

      const posts = await res.json();

      return {
        data: posts,
        nextCursor: offset + limit,
        hasMore: posts.length === limit,
      };
    }
  );

  // Intersection Observer for auto-loading
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data.map((post, index) => (
        <div key={post.id} className="post">
          <h3>{post.title}</h3>
          <p>{post.body}</p>
        </div>
      ))}

      {hasMore && (
        <div ref={observerTarget} className="loading-trigger">
          {isFetchingNextPage ? 'Loading more...' : 'Scroll for more'}
        </div>
      )}
    </div>
  );
}
```

## Prefetching on Hover

```tsx
import { useCache } from 'blitz-cache/react';
import { BlitzCache } from 'blitz-cache/core';
import { useRef } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

const userCache = new BlitzCache<User, { userId: number }>(
  ({ userId }) => `user:${userId}`
);

const fetchUser = async ({ userId }: { userId: number }, signal?: AbortSignal) => {
  const res = await fetch(`/api/users/${userId}`, { signal });
  return res.json() as Promise<User>;
};

function UserCard({ userId }: { userId: number }) {
  const { data } = useCache({ userId }, fetchUser);

  return (
    <div>
      <strong>{data?.name}</strong>
      <p>{data?.email}</p>
    </div>
  );
}

function UserList({ userIds }: { userIds: number[] }) {
  const prefetchUser = (userId: number) => {
    userCache.prefetch({ userId }, fetchUser);
  };

  return (
    <div>
      {userIds.map((userId) => (
        <div
          key={userId}
          onMouseEnter={() => prefetchUser(userId)}
          className="user-preview"
        >
          User {userId}
          {/* Full card renders instantly when clicked due to prefetch */}
        </div>
      ))}
    </div>
  );
}
```

## Optimistic Updates

```tsx
import { useCache } from 'blitz-cache/react';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

function TodoItem({ todoId }: { todoId: number }) {
  const { data, mutate } = useCache({ todoId }, fetchTodo);

  const toggleComplete = async () => {
    const newCompleted = !data?.completed;

    await mutate(
      (current) => ({
        ...current!,
        completed: newCompleted,
      }),
      {
        // Show update immediately
        optimisticData: {
          ...data!,
          completed: newCompleted,
        },
        // Rollback if API call fails
        rollbackOnError: true,
      }
    );

    // Send to API
    await fetch(`/api/todos/${todoId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: newCompleted }),
    });
  };

  return (
    <div>
      <input
        type="checkbox"
        checked={data?.completed}
        onChange={toggleComplete}
      />
      <span>{data?.title}</span>
    </div>
  );
}
```

## Polling / Auto-Refresh

```tsx
import { useCache } from 'blitz-cache/react';

interface Stats {
  viewers: number;
  likes: number;
}

function LiveStats({ streamId }: { streamId: string }) {
  const { data, isValidating } = useCache(
    { streamId },
    async ({ streamId }, signal) => {
      const res = await fetch(`/api/streams/${streamId}/stats`, { signal });
      return res.json() as Promise<Stats>;
    },
    {
      refetchInterval: 5000, // Poll every 5 seconds
      refetchOnFocus: true, // Refetch when tab gains focus
      refetchOnReconnect: true, // Refetch when network reconnects
    }
  );

  return (
    <div>
      <div>
        👁️ {data?.viewers || 0} viewers
        {isValidating && ' (updating...)'}
      </div>
      <div>❤️ {data?.likes || 0} likes</div>
    </div>
  );
}
```

## Framework-Agnostic (Vanilla JS)

```typescript
import { BlitzCache } from 'blitz-cache/core';

interface Product {
  id: number;
  name: string;
  price: number;
}

// Create cache instance
const productCache = new BlitzCache<Product, { productId: number }>(
  ({ productId }) => `product:${productId}`,
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    debug: true,
  }
);

// Fetcher function
async function fetchProduct(params: { productId: number }, signal?: AbortSignal) {
  const res = await fetch(`/api/products/${params.productId}`, { signal });
  return res.json() as Promise<Product>;
}

// Fetch with caching
async function loadProduct(productId: number) {
  const result = await productCache.fetch(
    { productId },
    fetchProduct,
    { consumerId: 'product-page' }
  );

  if (result.error) {
    console.error('Failed to load product:', result.error);
    return;
  }

  console.log('Product:', result.data);
  console.log('From cache:', result.fromCache);
  console.log('Is stale:', result.isStale);
}

// Subscribe to cache events
productCache.subscribe((event) => {
  console.log('Cache event:', event.type, event);
});

// Load product
loadProduct(123);

// Get cache stats
console.log('Cache stats:', productCache.getStats());
```

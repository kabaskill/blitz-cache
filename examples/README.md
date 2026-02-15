# BlitzCache Examples

This directory contains example code demonstrating the advanced features of blitz-cache.

## Examples

### 1. Advanced Features Demo (`advanced-features-demo.tsx`)

A comprehensive example showing all three critical features:

- **IndexedDB Storage**: Large data persistence beyond localStorage limits
- **Query Invalidation by Relationship**: Automatic dependency tracking and batch invalidation
- **DevTools**: Real-time cache visualization and debugging

### 2. Individual Feature Examples

#### IndexedDB Storage

```tsx
import { BlitzCache, IndexedDBAdapter } from 'blitz-cache/core';

// Create cache with IndexedDB storage
const cache = new BlitzCache(
  (params) => JSON.stringify(params),
  {
    storageAdapter: new IndexedDBAdapter({
      dbName: 'my-app-cache',
      storeName: 'queries',
      version: 1,
    }),
    maxEntries: 200,
  }
);
```

**Benefits:**
- Supports ~50MB+ storage (vs localStorage's ~5MB)
- Async operations don't block the main thread
- Better for large datasets

#### Dependency-Based Invalidation

```tsx
import { useCache } from 'blitz-cache/react';

// Define query with dependencies
const { data: user } = useCache(
  { userId: 1 },
  fetchUser,
  {
    dependencies: [
      { type: 'user', id: 1 },
    ],
  }
);

// User's posts also depend on the user
const { data: posts } = useCache(
  { userId: 1 },
  fetchUserPosts,
  {
    dependencies: [
      { type: 'user', id: 1 }, // If user changes, refetch posts
      { type: 'posts' },       // If any posts change, refetch
    ],
  }
);

// Later, invalidate all related queries at once
cache.invalidateRelated({ type: 'user', id: 1 });
// ✅ Invalidates: user query, posts query, and any other user:1 dependents

cache.invalidateRelated({ type: 'posts' });
// ✅ Invalidates: all post-related queries

cache.invalidateRelated({ pattern: /^user:/ });
// ✅ Invalidates: all queries matching the pattern
```

**Benefits:**
- No manual tracking of related queries
- Batch invalidation in one call
- Prevents stale data across related queries

#### DevTools

```tsx
import { BlitzDevTools } from 'blitz-cache/devtools';

function App() {
  const cache = new BlitzCache(/* ... */);

  return (
    <>
      <YourApp />
      <BlitzDevTools
        cache={cache}
        position="bottom-right"
        initialIsOpen={false}
        showNotifications={true}
      />
    </>
  );
}
```

**Features:**
- Real-time cache hit/miss rate
- View all cached entries with age and last access time
- Manual cache invalidation for specific keys
- Event log showing all cache operations
- Cache statistics and utilization

## Running the Examples

These examples are TypeScript/React components. To use them in your project:

1. Install dependencies:
   ```bash
   npm install blitz-cache react react-dom
   ```

2. Import and use the example:
   ```tsx
   import { AdvancedFeaturesDemo } from './examples/advanced-features-demo';

   function App() {
     return <AdvancedFeaturesDemo />;
   }
   ```

3. Open your browser DevTools to see:
   - **Application → IndexedDB**: See persisted cache data
   - **BlitzCache DevTools** (floating button): Real-time cache inspection

## Key Takeaways

### When to Use IndexedDB vs localStorage

- **localStorage**: Good for small data (<5MB), synchronous access needed
- **IndexedDB**: Best for large data (>5MB), handles async operations better

### When to Use Dependencies

Use dependency tracking when:
- Queries are related (user → posts → comments)
- You need to invalidate multiple queries together
- You want to avoid manual cache key management

### When to Use DevTools

DevTools are essential for:
- Development and debugging
- Understanding cache performance
- Identifying cache hit/miss patterns
- Manual testing of cache invalidation

## Production Considerations

### IndexedDB
- Always handle quota exceeded errors
- Consider fallback to memory storage
- Test across browsers (Safari has limitations)

### Dependencies
- Keep dependency graphs shallow (avoid deep nesting)
- Use specific dependencies when possible (type + id)
- Wildcards (type only) should be used sparingly

### DevTools
- Only include in development builds
- Consider feature flags for production debugging
- DevTools add ~15KB to bundle size

## Further Reading

- [IndexedDB MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Basic Usage Examples](./basic-usage.md)
- [React Version Compatibility](./react-compiler-comparison.md)

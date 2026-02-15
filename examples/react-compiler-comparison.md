# React Version Compatibility

blitz-cache is designed to work seamlessly across all React versions from 16.8 through 19.

## Version Support

### React 16.8+ (Classic Mode)

Works out of the box with standard React hooks:

```tsx
import { useCache } from 'blitz-cache/react';

function MyComponent() {
  const { data, isLoading, error } = useCache(params, fetcher);
  // Component logic
}
```

**Features:**
- Full `useCallback` memoization for optimal performance
- Manual dependency arrays (standard React patterns)
- Compatible with all React 16.8+ features

### React 19 (Suspense Mode)

React 19 introduces the `use` hook and enhanced Suspense support. blitz-cache provides `useCacheSuspense` for first-class integration:

```tsx
import { useCacheSuspense } from 'blitz-cache/react';
import { Suspense } from 'react';

function UserProfile({ userId }: { userId: number }) {
  // No isLoading check needed - Suspense handles it!
  const { data } = useCacheSuspense({ userId }, fetchUser);
  
  return <div>{data.name}</div>;
}

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <UserProfile userId={1} />
    </Suspense>
  );
}
```

**Benefits of React 19 Suspense:**
- Data is guaranteed to be available (non-nullable)
- No manual loading state management
- Errors propagate to Error Boundaries automatically
- Cleaner component code

### React 19 + React Compiler

When using React 19 with the React Compiler (Babel plugin), the standard blitz-cache hooks automatically benefit from compiler optimizations:

```tsx
// No change needed - same import works with or without compiler
import { useCache } from 'blitz-cache/react';

function MyComponent() {
  // Compiler automatically optimizes memoization
  const { data } = useCache(params, fetcher);
  return <div>{data?.name}</div>;
}
```

**Compiler Benefits:**
- Automatic memoization without manual `useCallback`
- Build-time optimization (no runtime overhead)
- Smaller bundle size (no dependency arrays)

## Comparison

| Feature | React 16.8-18 | React 19 Classic | React 19 Suspense |
|---------|---------------|------------------|-------------------|
| **Import** | `blitz-cache/react` | `blitz-cache/react` | `blitz-cache/react` |
| **Hook** | `useCache` | `useCache` | `useCacheSuspense` |
| **Loading State** | Manual (`isLoading`) | Manual (`isLoading`) | Automatic (Suspense) |
| **Error Handling** | Manual (`error`) | Manual (`error`) | Error Boundaries |
| **Data Type** | `TData \| null` | `TData \| null` | `TData` (non-null) |
| **Compiler Support** | ❌ | ✅ Automatic | ✅ Automatic |

## Migration Guide

### From React 18 to React 19 (Classic Mode)

No changes needed! The same `useCache` hook works identically:

```tsx
// Works exactly the same in React 18 and React 19
import { useCache } from 'blitz-cache/react';

function MyComponent() {
  const { data, isLoading, error } = useCache(params, fetcher);
  // ...
}
```

### From Classic Mode to Suspense Mode

Update components to use `useCacheSuspense` and wrap with Suspense:

**Before (Classic):**
```tsx
import { useCache } from 'blitz-cache/react';

function UserProfile({ userId }: { userId: number }) {
  const { data, isLoading, error } = useCache({ userId }, fetchUser);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{data?.name}</div>;
}
```

**After (Suspense):**
```tsx
import { useCacheSuspense } from 'blitz-cache/react';
import { Suspense } from 'react';

function UserProfile({ userId }: { userId: number }) {
  const { data } = useCacheSuspense({ userId }, fetchUser);
  return <div>{data.name}</div>; // data is always defined
}

// Parent component handles loading/error states
function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorBoundary>
        <UserProfile userId={1} />
      </ErrorBoundary>
    </Suspense>
  );
}
```

## Best Practices

### Choose the Right Mode

**Use Classic Mode (`useCache`) when:**
- You need fine-grained control over loading states
- You want to show partial data while loading
- You're building a component library (max compatibility)
- Your app has complex loading UI requirements

**Use Suspense Mode (`useCacheSuspense`) when:**
- You're on React 19+
- You want cleaner component code
- You prefer declarative loading states via Suspense
- Your app already uses Suspense patterns

### Enabling React Compiler (React 19)

1. Install the compiler:
```bash
npm install babel-plugin-react-compiler
```

2. Configure Babel:
```javascript
// babel.config.js
module.exports = {
  plugins: [
    ['babel-plugin-react-compiler', {
      runtimeModule: 'react-compiler-runtime'
    }]
  ]
};
```

3. No code changes needed - blitz-cache hooks are automatically optimized!

## Performance Considerations

### React 18 vs React 19 (Classic Mode)

Performance is nearly identical - React 19 has internal optimizations but the API surface remains the same.

### Classic Mode vs Suspense Mode

- **Bundle Size:** Suspense mode is slightly smaller (no `isLoading`/`error` handling code)
- **Runtime Performance:** Suspense mode has less overhead (no state management for loading)
- **Memory:** Both modes use the same caching layer

### With React Compiler

- **Build Time:** Slightly longer (compiler analysis)
- **Bundle Size:** ~5-10% smaller (no manual memoization)
- **Runtime:** ~5% faster in high-frequency update scenarios

## Common Questions

**Q: Can I mix `useCache` and `useCacheSuspense` in the same app?**
A: Yes! They share the same underlying cache. Use the right tool for each component.

**Q: Do I need to enable the React Compiler to use React 19 features?**
A: No. The compiler is optional and provides additional optimizations beyond standard React 19.

**Q: Will `useCacheSuspense` work with React 18?**
A: No, it requires React 19+ for the native `use` hook support.

**Q: Can I migrate incrementally?**
A: Yes. Start with classic mode and migrate components to Suspense mode one at a time.

## Further Reading

- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [React Compiler Documentation](https://react.dev/learn/react-compiler)
- [Suspense for Data Fetching](https://react.dev/reference/react/Suspense)

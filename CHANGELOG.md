# Changelog

All notable changes to blitz-cache will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-12

### Added

- 🎉 Initial release of blitz-cache
- Core `BlitzCache` class with generic types
- LRU cache implementation with O(1) operations
- Storage adapters: localStorage, sessionStorage, memory, and no-op
- Stale-while-revalidate pattern
- Race condition prevention via AbortController
- Request deduplication for in-flight requests
- Automatic retry with exponential backoff
- React hooks: `useCache` and `useInfiniteCache`
- Pagination helpers: offset, cursor, and page-number based
- Prefetching support
- Optimistic updates with rollback
- Event subscription system
- Cache invalidation (single key and pattern-based)
- TypeScript with full generic support
- Zero dependencies (core library)
- Comprehensive documentation and examples

### Features

- **Cache Management**
  - LRU eviction strategy
  - Configurable stale time and cache time
  - Persistent storage with automatic restoration
  - Cache statistics and debugging

- **Request Handling**
  - Automatic AbortController for race prevention
  - Deduplication of concurrent requests
  - Retry logic with exponential backoff
  - Stale data served immediately with background refresh

- **React Integration**
  - `useCache` hook for simple data fetching
  - `useInfiniteCache` hook for pagination/infinite scroll
  - Automatic refetch on mount/focus/reconnect
  - Polling support via `refetchInterval`
  - Optimistic updates with automatic rollback

- **Developer Experience**
  - Full TypeScript support with generics
  - Debug mode with detailed logging
  - Event listeners for cache operations
  - Pluggable storage adapters
  - Framework-agnostic core

## [Unreleased]

### Planned

- Vue composables
- Svelte stores
- Automatic background revalidation
- DevTools extension for cache inspection
- SSR support with hydration
- Middleware/transform system
- More pagination helpers
- Query key matching utilities
- Mutation batching

---

## Version Numbering

- **Major** (x.0.0): Breaking changes
- **Minor** (0.x.0): New features, backwards compatible
- **Patch** (0.0.x): Bug fixes, backwards compatible

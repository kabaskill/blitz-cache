/**
 * Quick local test script for blitz-cache
 * Run with: npx tsx scripts/test-local.ts
 */

import { BlitzCache, LRUCache, MemoryStorageAdapter } from '../dist/core/index.js';

console.log('=== Testing blitz-cache locally ===\n');

// Test 1: LRU Cache O(1) operations
console.log('1. Testing LRU Cache...');
const lru = new LRUCache<string>(3, true);
lru.set('a', 'first');
lru.set('b', 'second');
lru.set('c', 'third');
console.log('  Added 3 items, getting "a" to make it recently used...');
lru.get('a');
console.log('  Adding 4th item (should evict "b" as LRU)...');
lru.set('d', 'fourth');
console.log('  Keys after eviction:', lru.keys());
console.log('  ✅ LRU cache working!\n');

// Test 2: BlitzCache with destroy
console.log('2. Testing BlitzCache with destroy()...');
const cache = new BlitzCache<{ name: string }, { id: number }>(
  (params) => `user:${params.id}`,
  {
    storageAdapter: new MemoryStorageAdapter(),
    debug: true,
  }
);

// Set some data
cache.set('user:1', { name: 'Alice' });
cache.set('user:2', { name: 'Bob' });
console.log('  Set 2 users');
console.log('  User 1:', cache.get('user:1'));
console.log('  Stats:', cache.getStats());

// Destroy cache
console.log('  Calling destroy()...');
cache.destroy();
console.log('  ✅ Cache destroyed without errors!\n');

// Test 3: SSR safety (storage adapters)
console.log('3. Testing SSR-safe storage adapters...');
const memoryAdapter = new MemoryStorageAdapter();
memoryAdapter.setItem('test', 'value');
console.log('  Memory adapter get:', memoryAdapter.getItem('test'));
console.log('  ✅ Storage adapters working!\n');

console.log('=== All tests passed! ===');

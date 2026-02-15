/**
 * LRU (Least Recently Used) Cache Implementation
 * True O(1) get/set/evict operations using Map + doubly-linked list
 */

import type { CacheEntry } from './types';

/**
 * Doubly-linked list node for O(1) LRU tracking
 */
interface LRUNode<TData> {
  key: string;
  entry: CacheEntry<TData>;
  prev: LRUNode<TData> | null;
  next: LRUNode<TData> | null;
}

export class LRUCache<TData> {
  // Map for O(1) key lookup
  private cache: Map<string, LRUNode<TData>>;
  private maxEntries: number;
  private debug: boolean;

  // Doubly-linked list head/tail for O(1) LRU tracking
  // head = most recently used, tail = least recently used
  private head: LRUNode<TData> | null = null;
  private tail: LRUNode<TData> | null = null;

  constructor(maxEntries: number = 50, debug: boolean = false) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
    this.debug = debug;
  }

  /**
   * Get entry from cache and move to front (most recently used)
   * O(1) time complexity
   */
  get(key: string): CacheEntry<TData> | null {
    const node = this.cache.get(key);

    if (!node) {
      if (this.debug) {
        console.log(`[LRU] Cache miss: ${key}`);
      }
      return null;
    }

    // Update last accessed time
    node.entry.lastAccessed = Date.now();

    // Move to front of list (most recently used)
    this.moveToFront(node);

    if (this.debug) {
      console.log(`[LRU] Cache hit: ${key}`);
    }

    return node.entry;
  }

  /**
   * Set entry in cache, evict LRU if at capacity
   * O(1) time complexity
   */
  set(key: string, data: TData, timestamp?: number): void {
    const now = Date.now();
    const existingNode = this.cache.get(key);

    if (existingNode) {
      // Update existing entry
      existingNode.entry = {
        data,
        timestamp: timestamp ?? now,
        lastAccessed: now,
      };
      this.moveToFront(existingNode);

      if (this.debug) {
        console.log(`[LRU] Updated cache: ${key} (size: ${this.cache.size}/${this.maxEntries})`);
      }
      return;
    }

    // If at capacity, evict LRU (tail)
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    // Create new node
    const entry: CacheEntry<TData> = {
      data,
      timestamp: timestamp ?? now,
      lastAccessed: now,
    };

    const newNode: LRUNode<TData> = {
      key,
      entry,
      prev: null,
      next: null,
    };

    // Add to cache
    this.cache.set(key, newNode);

    // Add to front of list
    this.addToFront(newNode);

    if (this.debug) {
      console.log(`[LRU] Set cache: ${key} (size: ${this.cache.size}/${this.maxEntries})`);
    }
  }

  /**
   * Check if key exists in cache
   * O(1) time complexity
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove specific entry from cache
   * O(1) time complexity
   */
  delete(key: string): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cache.delete(key);

    if (this.debug) {
      console.log(`[LRU] Deleted: ${key}`);
    }

    return true;
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;

    if (this.debug) {
      console.log('[LRU] Cache cleared');
    }
  }

  /**
   * Get all cache keys (ordered from most to least recently used)
   */
  keys(): string[] {
    const keys: string[] = [];
    let current = this.head;

    while (current) {
      keys.push(current.key);
      current = current.next;
    }

    return keys;
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Evict entries older than specified time
   * O(n) - must check all entries for expiration
   */
  evictExpired(expirationTime: number): number {
    const now = Date.now();
    let evictedCount = 0;
    const keysToEvict: string[] = [];

    // Collect keys to evict (can't modify while iterating)
    for (const [key, node] of this.cache.entries()) {
      if (now - node.entry.timestamp > expirationTime) {
        keysToEvict.push(key);
      }
    }

    // Evict collected keys
    for (const key of keysToEvict) {
      this.delete(key);
      evictedCount++;

      if (this.debug) {
        console.log(`[LRU] Evicted expired: ${key}`);
      }
    }

    return evictedCount;
  }

  /**
   * Check if entry is stale (but not expired)
   */
  isStale(key: string, staleTime: number): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return true;
    }

    const age = Date.now() - node.entry.timestamp;
    return age > staleTime;
  }

  /**
   * Evict the least recently used entry (tail)
   * O(1) time complexity
   */
  private evictOldest(): void {
    if (!this.tail) {
      return;
    }

    const oldestKey = this.tail.key;
    this.removeNode(this.tail);
    this.cache.delete(oldestKey);

    if (this.debug) {
      console.log(`[LRU] Evicted oldest: ${oldestKey}`);
    }
  }

  /**
   * Move a node to the front of the list (most recently used)
   * O(1) time complexity
   */
  private moveToFront(node: LRUNode<TData>): void {
    if (node === this.head) {
      return; // Already at front
    }

    this.removeNode(node);
    this.addToFront(node);
  }

  /**
   * Add a node to the front of the list
   * O(1) time complexity
   */
  private addToFront(node: LRUNode<TData>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Remove a node from the list
   * O(1) time complexity
   */
  private removeNode(node: LRUNode<TData>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxEntries: number;
    utilization: number;
    entries: Array<{ key: string; age: number; lastAccessedAgo: number }>;
  } {
    const now = Date.now();
    const entries: Array<{ key: string; age: number; lastAccessedAgo: number }> = [];

    // Iterate in LRU order (head = most recent, tail = least recent)
    let current = this.head;
    while (current) {
      entries.push({
        key: current.key,
        age: now - current.entry.timestamp,
        lastAccessedAgo: now - current.entry.lastAccessed,
      });
      current = current.next;
    }

    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      utilization: (this.cache.size / this.maxEntries) * 100,
      entries, // Already sorted by lastAccessedAgo (most to least recent)
    };
  }
}

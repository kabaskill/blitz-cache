/**
 * Storage adapters for cache persistence
 */

import type { StorageAdapter } from './types';

/**
 * Check if we're running in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * localStorage adapter (browser only)
 */
export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (!isBrowser()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (!isBrowser()) return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Quota exceeded or localStorage disabled
      if (this.isQuotaExceededError(error)) {
        console.warn('[blitz-cache] localStorage quota exceeded');
      }
    }
  }

  removeItem(key: string): void {
    if (!isBrowser()) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  }

  getAllKeys(): string[] {
    if (!isBrowser()) return [];
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  }

  private isQuotaExceededError(error: any): boolean {
    return (
      error instanceof DOMException &&
      (error.code === 22 ||
        error.code === 1014 ||
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    );
  }
}

/**
 * sessionStorage adapter (browser only)
 */
export class SessionStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (!isBrowser()) return null;
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (!isBrowser()) return;
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Ignore quota errors
    }
  }

  removeItem(key: string): void {
    if (!isBrowser()) return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  }

  getAllKeys(): string[] {
    if (!isBrowser()) return [];
    try {
      return Object.keys(sessionStorage);
    } catch {
      return [];
    }
  }
}

/**
 * In-memory adapter (works everywhere, no persistence)
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, string>();

  getItem(key: string): string | null {
    return this.storage.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  getAllKeys(): string[] {
    return Array.from(this.storage.keys());
  }

  clear(): void {
    this.storage.clear();
  }
}

/**
 * Auto-detect best available storage
 */
export function createDefaultStorageAdapter(): StorageAdapter {
  // Check if we're in a browser environment
  if (!isBrowser()) {
    return new MemoryStorageAdapter();
  }

  // Try localStorage first
  try {
    const testKey = '__blitz_cache_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return new LocalStorageAdapter();
  } catch {
    // localStorage not available, try sessionStorage
    try {
      const testKey = '__blitz_cache_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return new SessionStorageAdapter();
    } catch {
      // Fall back to memory
      return new MemoryStorageAdapter();
    }
  }
}

// Export IndexedDB adapter (factory function is internal-only)
export { IndexedDBAdapter } from './indexeddb-storage';
export type { IndexedDBAdapterConfig } from './indexeddb-storage';

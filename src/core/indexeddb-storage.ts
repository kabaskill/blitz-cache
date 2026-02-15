/**
 * IndexedDB storage adapter for large data persistence
 * Supports ~50MB+ storage (vs localStorage's ~5MB limit)
 */

import type { StorageAdapter } from './types';

export interface IndexedDBAdapterConfig {
  dbName?: string;
  storeName?: string;
  version?: number;
}

export class IndexedDBAdapter implements StorageAdapter {
  private dbName: string;
  private storeName: string;
  private version: number;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(config: IndexedDBAdapterConfig = {}) {
    this.dbName = config.dbName ?? 'blitz-cache-db';
    this.storeName = config.storeName ?? 'cache-store';
    this.version = config.version ?? 1;
  }

  /**
   * Initialize IndexedDB connection
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Get item from IndexedDB
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result ?? null);
        };
        request.onerror = () => {
          reject(new Error('Failed to get item from IndexedDB'));
        };
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] getItem error:', error);
      return null;
    }
  }

  /**
   * Set item in IndexedDB
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value, key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          reject(new Error('Failed to set item in IndexedDB'));
        };
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] setItem error:', error);
    }
  }

  /**
   * Remove item from IndexedDB
   */
  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          reject(new Error('Failed to remove item from IndexedDB'));
        };
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] removeItem error:', error);
    }
  }

  /**
   * Get all keys from IndexedDB
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result as string[]);
        };
        request.onerror = () => {
          reject(new Error('Failed to get keys from IndexedDB'));
        };
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] getAllKeys error:', error);
      return [];
    }
  }

  /**
   * Clear all items from this store
   */
  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          reject(new Error('Failed to clear IndexedDB store'));
        };
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] clear error:', error);
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.dbPromise) {
      const db = await this.dbPromise;
      db.close();
      this.dbPromise = null;
    }
  }
}

/**
 * Create IndexedDB adapter with default config
 * @internal - Use new IndexedDBAdapter() directly
 */
function createIndexedDBAdapter(config?: IndexedDBAdapterConfig): IndexedDBAdapter {
  return new IndexedDBAdapter(config);
}

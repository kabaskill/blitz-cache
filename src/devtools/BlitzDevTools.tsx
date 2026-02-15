/**
 * BlitzCache DevTools - Interactive cache visualization and debugging
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { BlitzCache } from '../core/cache';
import type { CacheEvent } from '../core/types';
import { DevToolsPanel } from './DevToolsPanel';
import { DevToolsToggle } from './DevToolsToggle';

export interface BlitzDevToolsProps {
  cache?: BlitzCache<any, any>;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  initialIsOpen?: boolean;
  showNotifications?: boolean;
}

export interface CacheStats {
  size: number;
  maxEntries: number;
  utilization: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  entries: Array<{
    key: string;
    age: number;
    lastAccessedAgo: number;
  }>;
}

export interface CacheEventLog {
  id: number;
  timestamp: number;
  event: CacheEvent;
}

/**
 * BlitzCache DevTools Component
 *
 * Provides real-time cache visualization, statistics, and debugging tools
 *
 * @example
 * ```tsx
 * import { BlitzDevTools } from 'blitz-cache/devtools';
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <BlitzDevTools position="bottom-right" />
 *     </>
 *   );
 * }
 * ```
 */
export function BlitzDevTools({
  cache,
  position = 'bottom-right',
  initialIsOpen = false,
  showNotifications = true,
}: BlitzDevToolsProps) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [eventLog, setEventLog] = useState<CacheEventLog[]>([]);
  const [hitCount, setHitCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [eventIdCounter, setEventIdCounter] = useState(0);

  // Subscribe to cache events
  useEffect(() => {
    if (!cache) return;

    const unsubscribe = cache.subscribe((event) => {
      // Track hits and misses
      if (event.type === 'cache-hit') {
        setHitCount((prev) => prev + 1);
      } else if (event.type === 'cache-miss') {
        setMissCount((prev) => prev + 1);
      }

      // Add to event log
      setEventIdCounter((prev) => {
        const id = prev + 1;
        setEventLog((log) => {
          const newLog = [{ id, timestamp: Date.now(), event }, ...log];
          // Keep only last 100 events
          return newLog.slice(0, 100);
        });
        return id;
      });
    });

    return unsubscribe;
  }, [cache]);

  // Update stats periodically
  useEffect(() => {
    if (!cache) return;

    const updateStats = () => {
      const cacheStats = cache.getStats();
      const hitRate = hitCount + missCount > 0
        ? (hitCount / (hitCount + missCount)) * 100
        : 0;

      setStats({
        ...cacheStats,
        hitCount,
        missCount,
        hitRate,
      });
    };

    // Initial update
    updateStats();

    // Update every second
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [cache, hitCount, missCount]);

  const handleClearCache = useCallback(() => {
    if (!cache) return;
    if (confirm('Are you sure you want to clear the entire cache?')) {
      cache.clear();
      setHitCount(0);
      setMissCount(0);
      setEventLog([]);
    }
  }, [cache]);

  const handleInvalidateKey = useCallback((key: string) => {
    if (!cache) return;
    cache.invalidate(key);
  }, [cache]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  if (!cache) {
    return null;
  }

  return (
    <>
      <DevToolsToggle
        isOpen={isOpen}
        onToggle={handleToggle}
        position={position}
        hitRate={stats?.hitRate ?? 0}
        showNotification={showNotifications && !isOpen}
      />

      {isOpen && (
        <DevToolsPanel
          stats={stats}
          eventLog={eventLog}
          position={position}
          onClose={() => setIsOpen(false)}
          onClearCache={handleClearCache}
          onInvalidateKey={handleInvalidateKey}
          onClearEventLog={() => setEventLog([])}
        />
      )}
    </>
  );
}

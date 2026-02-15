/**
 * DevTools Panel - Main UI for cache inspection
 */

import React, { useState } from 'react';
import type { CacheStats, CacheEventLog } from './BlitzDevTools';
import { styles } from './styles';

export interface DevToolsPanelProps {
  stats: CacheStats | null;
  eventLog: CacheEventLog[];
  position: string;
  onClose: () => void;
  onClearCache: () => void;
  onInvalidateKey: (key: string) => void;
  onClearEventLog: () => void;
}

type Tab = 'overview' | 'entries' | 'events';

export function DevToolsPanel({
  stats,
  eventLog,
  position,
  onClose,
  onClearCache,
  onInvalidateKey,
  onClearEventLog,
}: DevToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [searchFilter, setSearchFilter] = useState('');

  const filteredEntries = stats?.entries.filter((entry) =>
    entry.key.toLowerCase().includes(searchFilter.toLowerCase())
  ) ?? [];

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString();
  };

  const getEventColor = (type: string) => {
    if (type.includes('hit')) return '#10b981';
    if (type.includes('miss')) return '#f59e0b';
    if (type.includes('error')) return '#ef4444';
    if (type.includes('invalidate')) return '#8b5cf6';
    return '#6b7280';
  };

  return (
    <div style={styles.panel(position)}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>⚡ BlitzCache DevTools</h3>
        <button onClick={onClose} style={styles.closeButton}>
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('overview')}
          style={activeTab === 'overview' ? styles.tabActive : styles.tab}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('entries')}
          style={activeTab === 'entries' ? styles.tabActive : styles.tab}
        >
          Entries ({stats?.size ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          style={activeTab === 'events' ? styles.tabActive : styles.tab}
        >
          Events ({eventLog.length})
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'overview' && (
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Cache Statistics</h4>

            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Hit Rate</div>
                <div style={styles.statValue}>
                  {stats?.hitRate.toFixed(1) ?? 0}%
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statLabel}>Cache Hits</div>
                <div style={styles.statValue}>{stats?.hitCount ?? 0}</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statLabel}>Cache Misses</div>
                <div style={styles.statValue}>{stats?.missCount ?? 0}</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statLabel}>Utilization</div>
                <div style={styles.statValue}>
                  {stats?.utilization.toFixed(0) ?? 0}%
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statLabel}>Entries</div>
                <div style={styles.statValue}>
                  {stats?.size ?? 0} / {stats?.maxEntries ?? 0}
                </div>
              </div>
            </div>

            <div style={styles.actions}>
              <button onClick={onClearCache} style={styles.dangerButton}>
                Clear Cache
              </button>
            </div>
          </div>
        )}

        {activeTab === 'entries' && (
          <div style={styles.section}>
            <input
              type="text"
              placeholder="Filter by key..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={styles.searchInput}
            />

            <div style={styles.entriesList}>
              {filteredEntries.length === 0 ? (
                <div style={styles.emptyState}>
                  {searchFilter ? 'No matching entries' : 'No cache entries'}
                </div>
              ) : (
                filteredEntries.map((entry) => (
                  <div key={entry.key} style={styles.entryCard}>
                    <div style={styles.entryHeader}>
                      <code style={styles.entryKey}>{entry.key}</code>
                      <button
                        onClick={() => onInvalidateKey(entry.key)}
                        style={styles.invalidateButton}
                      >
                        Invalidate
                      </button>
                    </div>
                    <div style={styles.entryMeta}>
                      <span>Age: {formatTime(entry.age)}</span>
                      <span>Last accessed: {formatTime(entry.lastAccessedAgo)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div style={styles.section}>
            <div style={styles.actions}>
              <button onClick={onClearEventLog} style={styles.secondaryButton}>
                Clear Event Log
              </button>
            </div>

            <div style={styles.eventsList}>
              {eventLog.length === 0 ? (
                <div style={styles.emptyState}>No events logged</div>
              ) : (
                eventLog.map((log) => (
                  <div key={log.id} style={styles.eventCard}>
                    <div
                      style={{
                        ...styles.eventBadge,
                        backgroundColor: getEventColor(log.event.type),
                      }}
                    >
                      {log.event.type}
                    </div>
                    <div style={styles.eventTime}>
                      {formatTimestamp(log.timestamp)}
                    </div>
                    {'key' in log.event && (
                      <code style={styles.eventKey}>{log.event.key}</code>
                    )}
                    {'error' in log.event && log.event.error && (
                      <div style={styles.eventError}>
                        {log.event.error.message}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

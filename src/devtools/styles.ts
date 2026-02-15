/**
 * DevTools inline styles
 */

import type { CSSProperties } from 'react';

const getPositionStyles = (position: string): CSSProperties => {
  const positions: Record<string, CSSProperties> = {
    'top-left': { top: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
  };

  return positions[position] || positions['bottom-right'];
};

export const styles = {
  // Toggle Button
  toggleButton: (position: string): CSSProperties => ({
    position: 'fixed',
    ...getPositionStyles(position),
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
    cursor: 'pointer',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s',
    fontSize: '24px',
    outline: 'none',
  }),

  toggleContent: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as CSSProperties,

  toggleIcon: {
    fontSize: '28px',
  } as CSSProperties,

  toggleBadge: (bgColor: string): CSSProperties => ({
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: bgColor,
    color: 'white',
    borderRadius: '12px',
    padding: '2px 6px',
    fontSize: '10px',
    fontWeight: 'bold',
    minWidth: '20px',
    textAlign: 'center',
  }),

  // Panel
  panel: (position: string): CSSProperties => ({
    position: 'fixed',
    ...getPositionStyles(position),
    width: '420px',
    maxHeight: '600px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    zIndex: 9998,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '14px',
    color: '#1f2937',
  }),

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  } as CSSProperties,

  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  } as CSSProperties,

  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    outline: 'none',
  } as CSSProperties,

  // Tabs
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  } as CSSProperties,

  tab: {
    flex: 1,
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
    borderBottom: '2px solid transparent',
    transition: 'color 0.2s, border-color 0.2s',
    outline: 'none',
  } as CSSProperties,

  tabActive: {
    flex: 1,
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    color: '#8b5cf6',
    borderBottom: '2px solid #8b5cf6',
    transition: 'color 0.2s, border-color 0.2s',
    outline: 'none',
  } as CSSProperties,

  // Content
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
  } as CSSProperties,

  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  } as CSSProperties,

  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  } as CSSProperties,

  // Stats Grid
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  } as CSSProperties,

  statCard: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  } as CSSProperties,

  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  } as CSSProperties,

  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827',
  } as CSSProperties,

  // Actions
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  } as CSSProperties,

  dangerButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    outline: 'none',
  } as CSSProperties,

  secondaryButton: {
    padding: '8px 16px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    outline: 'none',
  } as CSSProperties,

  // Search
  searchInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  } as CSSProperties,

  // Entries List
  entriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '400px',
    overflow: 'auto',
  } as CSSProperties,

  entryCard: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  } as CSSProperties,

  entryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  } as CSSProperties,

  entryKey: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#8b5cf6',
    wordBreak: 'break-all',
    flex: 1,
  } as CSSProperties,

  entryMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '11px',
    color: '#6b7280',
  } as CSSProperties,

  invalidateButton: {
    padding: '4px 8px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    marginLeft: '8px',
    flexShrink: 0,
    outline: 'none',
  } as CSSProperties,

  // Events List
  eventsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '400px',
    overflow: 'auto',
  } as CSSProperties,

  eventCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    fontSize: '12px',
  } as CSSProperties,

  eventBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    color: 'white',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    flexShrink: 0,
  } as CSSProperties,

  eventTime: {
    color: '#6b7280',
    fontSize: '11px',
    flexShrink: 0,
  } as CSSProperties,

  eventKey: {
    fontFamily: 'monospace',
    color: '#8b5cf6',
    fontSize: '11px',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as CSSProperties,

  eventError: {
    color: '#ef4444',
    fontSize: '11px',
    flex: 1,
  } as CSSProperties,

  // Empty State
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#9ca3af',
    fontSize: '14px',
  } as CSSProperties,
};

/**
 * DevTools Toggle Button - Floating button to open/close DevTools
 */

import React from 'react';
import { styles } from './styles';

export interface DevToolsToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  position: string;
  hitRate: number;
  showNotification?: boolean;
}

export function DevToolsToggle({
  isOpen,
  onToggle,
  position,
  hitRate,
  showNotification = true,
}: DevToolsToggleProps) {
  if (isOpen) return null;

  const getHitRateColor = (rate: number) => {
    if (rate >= 80) return '#10b981'; // Green
    if (rate >= 50) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <button
      onClick={onToggle}
      style={styles.toggleButton(position)}
      title="Open BlitzCache DevTools"
    >
      <div style={styles.toggleContent}>
        <span style={styles.toggleIcon}>⚡</span>
        {showNotification && hitRate > 0 && (
          <div style={styles.toggleBadge(getHitRateColor(hitRate))}>
            {hitRate.toFixed(0)}%
          </div>
        )}
      </div>
    </button>
  );
}

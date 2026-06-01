'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface OfflineIndicatorProps {
  /** Whether the user is currently offline */
  isOffline: boolean;
  /** Optional custom message */
  message?: string;
  /** Auto-dismiss delay in milliseconds (0 = never auto-dismiss) */
  autoDismissDelay?: number;
  /** Callback when indicator is dismissed */
  onDismiss?: () => void;
}

/**
 * Offline Indicator Component
 * Displays a banner when the user loses connectivity.
 * Automatically shows a success message when connection is restored.
 *
 * Features:
 * - Accessible with proper ARIA labels
 * - Dismissible
 * - Auto-recovery feedback
 * - Keyboard navigable
 * - Dark mode support
 */
export function OfflineIndicator({
  isOffline,
  message = 'You appear to be offline. Some features may not work.',
  autoDismissDelay = 0,
  onDismiss,
}: OfflineIndicatorProps) {
  const [show, setShow] = useState(isOffline);
  const [showSuccess, setShowSuccess] = useState(false);

  // Handle offline state change
  useEffect(() => {
    if (isOffline) {
      setShow(true);
      setShowSuccess(false);
    } else if (show) {
      // Show success message when coming back online
      setShowSuccess(true);
      const successTimer = setTimeout(() => {
        setShowSuccess(false);
        setShow(false);
        onDismiss?.();
      }, 3000);
      return () => clearTimeout(successTimer);
    }
  }, [isOffline, show, onDismiss]);

  // Auto-dismiss handling
  useEffect(() => {
    if (!isOffline && autoDismissDelay > 0 && show && !showSuccess) {
      const timer = setTimeout(() => {
        setShow(false);
        onDismiss?.();
      }, autoDismissDelay);
      return () => clearTimeout(timer);
    }
  }, [isOffline, autoDismissDelay, show, showSuccess, onDismiss]);

  if (!show) return null;

  if (showSuccess) {
    return (
      <div
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-4 bg-green-50 px-4 py-3 text-green-900 dark:bg-green-900/20 dark:text-green-200 sm:px-6"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">Connection restored</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-4 bg-red-50 px-4 py-3 text-red-900 dark:bg-red-900/20 dark:text-red-200 sm:px-6"
      role="alert"
      aria-live="assertive"
      aria-label="Offline notification"
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={() => {
          setShow(false);
          onDismiss?.();
        }}
        className="inline-flex items-center gap-2 rounded px-3 py-1 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-800/40"
        aria-label="Dismiss offline notification"
      >
        Dismiss
      </button>
    </div>
  );
}
